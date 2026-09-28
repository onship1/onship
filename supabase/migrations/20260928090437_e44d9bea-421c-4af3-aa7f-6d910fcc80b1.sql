DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['service_requests','service_offers','missions','messages','notifications','provider_locations'] LOOP
    BEGIN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.update_my_location(_lat double precision, _lng double precision, _heading double precision DEFAULT NULL, _speed double precision DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid := get_provider_id(); _g geography;
BEGIN
  IF _pid IS NULL THEN RAISE EXCEPTION 'Profil prestataire requis'; END IF;
  _g := ST_SetSRID(ST_MakePoint(_lng, _lat), 4326)::geography;
  UPDATE provider_locations SET latitude=_lat, longitude=_lng, heading=_heading, speed=_speed, location=_g, updated_at=now() WHERE provider_id=_pid;
  IF NOT FOUND THEN
    INSERT INTO provider_locations(provider_id, latitude, longitude, heading, speed, location) VALUES (_pid, _lat, _lng, _heading, _speed, _g);
  END IF;
  UPDATE provider_profiles SET latitude=_lat, longitude=_lng, location=_g, updated_at=now() WHERE id=_pid;
END $$;

CREATE OR REPLACE FUNCTION public.get_mission_detail(_mission_id uuid)
RETURNS TABLE(mission_id uuid, conversation_id uuid, status mission_status, title text, address text, is_provider boolean,
  request_latitude double precision, request_longitude double precision,
  provider_latitude double precision, provider_longitude double precision, provider_updated_at timestamptz,
  other_name text, already_rated boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, c.id, m.status, sr.title, sr.address, (m.provider_id = get_provider_id()),
    sr.latitude, sr.longitude,
    CASE WHEN m.status IN ('confirmed','provider_on_way','started') THEN pl.latitude END,
    CASE WHEN m.status IN ('confirmed','provider_on_way','started') THEN pl.longitude END,
    pl.updated_at,
    CASE WHEN m.provider_id = get_provider_id()
      THEN trim(coalesce(cp.first_name,'')||' '||coalesce(cp.last_name,''))
      ELSE trim(coalesce(pr.first_name,'')||' '||coalesce(pr.last_name,'')) END,
    EXISTS(SELECT 1 FROM reviews rv WHERE rv.mission_id=m.id AND rv.reviewer_id=auth.uid())
  FROM missions m
  JOIN service_requests sr ON sr.id=m.request_id
  JOIN profiles cp ON cp.id=m.client_id
  JOIN provider_profiles pp ON pp.id=m.provider_id
  JOIN profiles pr ON pr.id=pp.user_id
  LEFT JOIN conversations c ON c.mission_id=m.id
  LEFT JOIN provider_locations pl ON pl.provider_id=m.provider_id
  WHERE m.id=_mission_id AND (m.client_id=auth.uid() OR m.provider_id=get_provider_id() OR is_admin())
$$;

CREATE OR REPLACE FUNCTION public.rate_mission(_mission_id uuid, _rating int, _comment text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _m record; _target uuid; _puser uuid;
BEGIN
  IF _rating < 1 OR _rating > 5 THEN RAISE EXCEPTION 'Note invalide'; END IF;
  SELECT * INTO _m FROM missions WHERE id=_mission_id;
  IF _m IS NULL OR _m.status <> 'completed' THEN RAISE EXCEPTION 'Mission non terminée'; END IF;
  SELECT user_id INTO _puser FROM provider_profiles WHERE id=_m.provider_id;
  IF _m.client_id = auth.uid() THEN _target := _puser;
  ELSIF _puser = auth.uid() THEN _target := _m.client_id;
  ELSE RAISE EXCEPTION 'Non autorisé'; END IF;
  IF EXISTS(SELECT 1 FROM reviews WHERE mission_id=_mission_id AND reviewer_id=auth.uid()) THEN RAISE EXCEPTION 'Déjà noté'; END IF;
  INSERT INTO reviews(mission_id, reviewer_id, reviewed_id, rating, comment) VALUES (_mission_id, auth.uid(), _target, _rating, nullif(trim(_comment),''));
  IF _target = _puser THEN
    UPDATE provider_profiles SET
      average_rating = (SELECT round(avg(rating)::numeric,2) FROM reviews WHERE reviewed_id=_puser),
      total_reviews = (SELECT count(*) FROM reviews WHERE reviewed_id=_puser)
    WHERE id=_m.provider_id;
  END IF;
  INSERT INTO notifications(user_id, type, title, body, data)
  VALUES (_target, 'review', 'Nouvelle note', _rating || '/5', jsonb_build_object('mission_id', _mission_id));
END $$;

CREATE OR REPLACE FUNCTION public.admin_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  RETURN jsonb_build_object(
    'users', (SELECT count(*) FROM profiles),
    'providers', (SELECT count(*) FROM provider_profiles),
    'pending_providers', (SELECT count(*) FROM provider_profiles WHERE verification_status IN ('pending','under_review')),
    'requests', (SELECT count(*) FROM service_requests),
    'missions', (SELECT count(*) FROM missions),
    'completed', (SELECT count(*) FROM missions WHERE status='completed'),
    'open_disputes', (SELECT count(*) FROM disputes WHERE status='open'));
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_providers()
RETURNS TABLE(provider_id uuid, name text, phone text, professional_title text, verification_status verification_status, average_rating numeric, completed_missions int, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  RETURN QUERY SELECT pp.id, trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,'')), p.phone, pp.professional_title,
    pp.verification_status, pp.average_rating, pp.completed_missions, pp.created_at
  FROM provider_profiles pp JOIN profiles p ON p.id=pp.user_id ORDER BY pp.created_at DESC LIMIT 200;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_verification(_provider_id uuid, _status verification_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _u uuid;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  UPDATE provider_profiles SET verification_status=_status, updated_at=now() WHERE id=_provider_id RETURNING user_id INTO _u;
  INSERT INTO audit_logs(user_id, action, entity_type, entity_id, new_data)
  VALUES (auth.uid(), 'set_verification', 'provider_profile', _provider_id, jsonb_build_object('status', _status));
  INSERT INTO notifications(user_id, type, title, body) VALUES (_u, 'verification', 'Statut de vérification', 'Votre profil est maintenant : ' || _status);
END $$;

REVOKE EXECUTE ON FUNCTION public.update_my_location(double precision,double precision,double precision,double precision), public.get_mission_detail(uuid), public.rate_mission(uuid,int,text), public.admin_stats(), public.admin_list_providers(), public.admin_set_verification(uuid,verification_status) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.update_my_location(double precision,double precision,double precision,double precision), public.get_mission_detail(uuid), public.rate_mission(uuid,int,text), public.admin_stats(), public.admin_list_providers(), public.admin_set_verification(uuid,verification_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
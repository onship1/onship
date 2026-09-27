
-- Matching
CREATE OR REPLACE FUNCTION public.match_service_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  IF NEW.status <> 'searching' THEN RETURN NEW; END IF;
  FOR r IN
    SELECT pp.id, pp.user_id FROM provider_profiles pp
    JOIN provider_categories pc ON pc.provider_id = pp.id AND pc.category_id = NEW.category_id
    WHERE pp.availability_status = 'available'
      AND pp.verification_status NOT IN ('rejected','suspended')
      AND pp.user_id <> NEW.client_id
      AND (NEW.location IS NULL OR pp.location IS NULL
           OR ST_DWithin(pp.location, NEW.location, NEW.search_radius_km * 1000))
    LIMIT 50
  LOOP
    INSERT INTO request_matches(request_id, provider_id, status, notified_at, expires_at)
    VALUES (NEW.id, r.id, 'notified', now(), now() + interval '2 hours');
    INSERT INTO notifications(user_id, type, title, body, data)
    VALUES (r.user_id, 'new_request', 'Nouvelle demande', NEW.title, jsonb_build_object('request_id', NEW.id));
  END LOOP;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.match_service_request() FROM anon, authenticated, public;
DROP TRIGGER IF EXISTS trg_match_service_request ON public.service_requests;
CREATE TRIGGER trg_match_service_request AFTER INSERT ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.match_service_request();

-- Provider: list matched requests
CREATE OR REPLACE FUNCTION public.get_provider_feed()
RETURNS TABLE(request_id uuid, title text, description text, category_name text, urgency urgency_type,
  proposed_price numeric, recommended_price numeric, currency text, duration_minutes integer,
  address text, scheduled_at timestamptz, created_at timestamptz, request_status request_status,
  my_offer_status offer_status, my_offer_price numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT sr.id, sr.title, sr.description, sc.name, sr.urgency, sr.proposed_price, sr.recommended_price,
    sr.currency, sr.duration_minutes, sr.address, sr.scheduled_at, sr.created_at, sr.status,
    so.status, so.price
  FROM request_matches rm
  JOIN service_requests sr ON sr.id = rm.request_id
  JOIN service_categories sc ON sc.id = sr.category_id
  LEFT JOIN service_offers so ON so.request_id = sr.id AND so.provider_id = rm.provider_id
  WHERE rm.provider_id = get_provider_id()
    AND sr.status IN ('searching','offers_received')
  ORDER BY sr.created_at DESC LIMIT 50
$$;

-- Submit offer (1 credit)
CREATE OR REPLACE FUNCTION public.submit_offer(_request_id uuid, _price numeric, _eta integer, _message text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pid uuid := get_provider_id(); _req record; _w record; _offer uuid;
BEGIN
  IF _pid IS NULL THEN RAISE EXCEPTION 'Profil prestataire requis'; END IF;
  IF _price IS NULL OR _price < 500 THEN RAISE EXCEPTION 'Prix invalide'; END IF;
  IF NOT EXISTS (SELECT 1 FROM request_matches WHERE request_id=_request_id AND provider_id=_pid) THEN
    RAISE EXCEPTION 'Demande non accessible'; END IF;
  SELECT * INTO _req FROM service_requests WHERE id=_request_id FOR UPDATE;
  IF _req.status NOT IN ('searching','offers_received') THEN RAISE EXCEPTION 'Demande plus disponible'; END IF;
  IF EXISTS (SELECT 1 FROM service_offers WHERE request_id=_request_id AND provider_id=_pid AND status='pending') THEN
    RAISE EXCEPTION 'Offre déjà envoyée'; END IF;
  SELECT * INTO _w FROM credit_wallets WHERE provider_id=_pid FOR UPDATE;
  IF _w IS NULL OR _w.balance < 1 THEN RAISE EXCEPTION 'Crédits insuffisants'; END IF;
  INSERT INTO service_offers(request_id, provider_id, price, currency, estimated_arrival_minutes, message, status, expires_at)
  VALUES (_request_id, _pid, _price, _req.currency, _eta, left(_message, 500), 'pending', now() + interval '1 hour')
  RETURNING id INTO _offer;
  UPDATE credit_wallets SET balance = balance - 1, total_consumed = total_consumed + 1, updated_at = now() WHERE id=_w.id;
  INSERT INTO credit_transactions(wallet_id, type, amount, balance_before, balance_after, reference, description)
  VALUES (_w.id, 'consumption', -1, _w.balance, _w.balance - 1, _offer::text, 'Envoi d''une offre');
  UPDATE service_requests SET status='offers_received', updated_at=now() WHERE id=_request_id AND status='searching';
  INSERT INTO notifications(user_id, type, title, body, data)
  VALUES (_req.client_id, 'new_offer', 'Nouvelle offre', 'Une offre à ' || _price || ' ' || _req.currency || ' pour « ' || _req.title || ' »',
    jsonb_build_object('request_id', _request_id, 'offer_id', _offer));
  RETURN _offer;
END $$;

-- Client: offers for a request
CREATE OR REPLACE FUNCTION public.get_request_offers(_request_id uuid)
RETURNS TABLE(offer_id uuid, price numeric, currency text, estimated_arrival_minutes integer, message text,
  status offer_status, created_at timestamptz, provider_name text, professional_title text,
  average_rating numeric, total_reviews integer, completed_missions integer, verification_status verification_status)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT so.id, so.price, so.currency, so.estimated_arrival_minutes, so.message, so.status, so.created_at,
    trim(coalesce(p.first_name,'') || ' ' || coalesce(left(p.last_name,1),'')), pp.professional_title,
    pp.average_rating, pp.total_reviews, pp.completed_missions, pp.verification_status
  FROM service_offers so
  JOIN service_requests sr ON sr.id = so.request_id
  JOIN provider_profiles pp ON pp.id = so.provider_id
  JOIN profiles p ON p.id = pp.user_id
  WHERE so.request_id = _request_id AND (sr.client_id = auth.uid() OR is_admin())
  ORDER BY so.price ASC
$$;

-- Accept offer
CREATE OR REPLACE FUNCTION public.accept_offer(_offer_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o record; _req record; _mission uuid; _puser uuid;
BEGIN
  SELECT * INTO _o FROM service_offers WHERE id=_offer_id FOR UPDATE;
  IF _o IS NULL THEN RAISE EXCEPTION 'Offre introuvable'; END IF;
  SELECT * INTO _req FROM service_requests WHERE id=_o.request_id FOR UPDATE;
  IF _req.client_id <> auth.uid() THEN RAISE EXCEPTION 'Non autorisé'; END IF;
  IF _req.status NOT IN ('searching','offers_received') THEN RAISE EXCEPTION 'Demande déjà attribuée'; END IF;
  IF _o.status <> 'pending' THEN RAISE EXCEPTION 'Offre plus valide'; END IF;
  UPDATE service_offers SET status='accepted', updated_at=now() WHERE id=_offer_id;
  UPDATE service_offers SET status='rejected', updated_at=now() WHERE request_id=_o.request_id AND id<>_offer_id AND status='pending';
  UPDATE service_requests SET status='provider_selected', updated_at=now() WHERE id=_o.request_id;
  INSERT INTO missions(request_id, offer_id, client_id, provider_id, agreed_price, currency, status)
  VALUES (_o.request_id, _offer_id, _req.client_id, _o.provider_id, _o.price, _o.currency, 'confirmed')
  RETURNING id INTO _mission;
  INSERT INTO conversations(mission_id, client_id, provider_id) VALUES (_mission, _req.client_id, _o.provider_id);
  UPDATE provider_profiles SET total_missions = total_missions + 1 WHERE id=_o.provider_id RETURNING user_id INTO _puser;
  INSERT INTO notifications(user_id, type, title, body, data)
  VALUES (_puser, 'offer_accepted', 'Offre acceptée !', _req.title, jsonb_build_object('mission_id', _mission));
  RETURN _mission;
END $$;

-- Cancel request (client, before selection)
CREATE OR REPLACE FUNCTION public.cancel_request(_request_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE service_requests SET status='cancelled', updated_at=now()
  WHERE id=_request_id AND client_id=auth.uid() AND status IN ('draft','searching','offers_received');
  IF NOT FOUND THEN RAISE EXCEPTION 'Annulation impossible'; END IF;
  UPDATE service_offers SET status='cancelled', updated_at=now() WHERE request_id=_request_id AND status='pending';
END $$;

-- Missions list
CREATE OR REPLACE FUNCTION public.get_my_missions()
RETURNS TABLE(mission_id uuid, request_id uuid, title text, category_name text, address text,
  agreed_price numeric, currency text, status mission_status, created_at timestamptz,
  is_provider boolean, other_name text, other_phone text, request_latitude double precision, request_longitude double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.request_id, sr.title, sc.name, sr.address, m.agreed_price, m.currency, m.status, m.created_at,
    (m.provider_id = get_provider_id()),
    CASE WHEN m.provider_id = get_provider_id()
      THEN trim(coalesce(cp.first_name,'') || ' ' || coalesce(cp.last_name,''))
      ELSE trim(coalesce(pr.first_name,'') || ' ' || coalesce(pr.last_name,'')) END,
    CASE WHEN m.status IN ('confirmed','provider_on_way','started') THEN
      CASE WHEN m.provider_id = get_provider_id() THEN cp.phone ELSE pr.phone END END,
    sr.latitude, sr.longitude
  FROM missions m
  JOIN service_requests sr ON sr.id = m.request_id
  JOIN service_categories sc ON sc.id = sr.category_id
  JOIN profiles cp ON cp.id = m.client_id
  JOIN provider_profiles pp ON pp.id = m.provider_id
  JOIN profiles pr ON pr.id = pp.user_id
  WHERE m.client_id = auth.uid() OR m.provider_id = get_provider_id()
  ORDER BY m.created_at DESC LIMIT 50
$$;

-- Mission status
CREATE OR REPLACE FUNCTION public.update_mission_status(_mission_id uuid, _status mission_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _m record; _is_provider boolean; _is_client boolean; _puser uuid; _notify uuid; _label text;
BEGIN
  SELECT * INTO _m FROM missions WHERE id=_mission_id FOR UPDATE;
  IF _m IS NULL THEN RAISE EXCEPTION 'Mission introuvable'; END IF;
  _is_provider := _m.provider_id = get_provider_id();
  _is_client := _m.client_id = auth.uid();
  SELECT user_id INTO _puser FROM provider_profiles WHERE id=_m.provider_id;
  IF _status = 'cancelled' THEN
    IF NOT (_is_provider OR _is_client) OR _m.status NOT IN ('confirmed','provider_on_way') THEN
      RAISE EXCEPTION 'Annulation impossible'; END IF;
  ELSIF NOT _is_provider OR NOT (
      (_m.status='confirmed' AND _status='provider_on_way') OR
      (_m.status IN ('confirmed','provider_on_way') AND _status='started') OR
      (_m.status='started' AND _status='completed')) THEN
    RAISE EXCEPTION 'Transition non autorisée';
  END IF;
  UPDATE missions SET status=_status,
    started_at = CASE WHEN _status='started' THEN now() ELSE started_at END,
    completed_at = CASE WHEN _status='completed' THEN now() ELSE completed_at END,
    cancelled_at = CASE WHEN _status='cancelled' THEN now() ELSE cancelled_at END
  WHERE id=_mission_id;
  UPDATE service_requests SET updated_at=now(), status = CASE _status
    WHEN 'started' THEN 'in_progress'::request_status WHEN 'completed' THEN 'completed'::request_status
    WHEN 'cancelled' THEN 'cancelled'::request_status ELSE status END
  WHERE id=_m.request_id;
  IF _status='completed' THEN
    UPDATE provider_profiles SET completed_missions = completed_missions + 1 WHERE id=_m.provider_id;
  ELSIF _status='cancelled' THEN
    UPDATE provider_profiles SET cancelled_missions = cancelled_missions + 1 WHERE id=_m.provider_id AND _is_provider;
  END IF;
  _notify := CASE WHEN _is_provider THEN _m.client_id ELSE _puser END;
  _label := CASE _status WHEN 'provider_on_way' THEN 'Le prestataire est en route'
    WHEN 'started' THEN 'La mission a démarré' WHEN 'completed' THEN 'Mission terminée'
    ELSE 'Mission annulée' END;
  INSERT INTO notifications(user_id, type, title, body, data)
  VALUES (_notify, 'mission_update', _label, 'Suivi de votre mission', jsonb_build_object('mission_id', _mission_id));
END $$;

REVOKE EXECUTE ON FUNCTION public.get_provider_feed(), public.submit_offer(uuid,numeric,integer,text),
  public.get_request_offers(uuid), public.accept_offer(uuid), public.cancel_request(uuid),
  public.get_my_missions(), public.update_mission_status(uuid, mission_status) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_provider_feed(), public.submit_offer(uuid,numeric,integer,text),
  public.get_request_offers(uuid), public.accept_offer(uuid), public.cancel_request(uuid),
  public.get_my_missions(), public.update_mission_status(uuid, mission_status) TO authenticated;

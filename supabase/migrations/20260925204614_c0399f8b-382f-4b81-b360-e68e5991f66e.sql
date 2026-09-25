-- 1. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, phone, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone',
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Allow a user to create their own provider profile
DROP POLICY IF EXISTS provider_profiles_insert_own ON public.provider_profiles;
CREATE POLICY provider_profiles_insert_own
ON public.provider_profiles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- 3. Auto-create credit wallet for each new provider profile
CREATE OR REPLACE FUNCTION public.handle_new_provider_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  w_id uuid;
BEGIN
  INSERT INTO public.credit_wallets (provider_id, balance, total_purchased, total_consumed)
  VALUES (NEW.id, 20, 0, 0)
  ON CONFLICT (provider_id) DO NOTHING
  RETURNING id INTO w_id;

  IF w_id IS NOT NULL THEN
    INSERT INTO public.credit_transactions (wallet_id, type, amount, balance_before, balance_after, description)
    VALUES (w_id, 'bonus', 20, 0, 20, 'Crédits de bienvenue');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_provider_profile_created ON public.provider_profiles;
CREATE TRIGGER on_provider_profile_created
AFTER INSERT ON public.provider_profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_new_provider_profile();

-- 4. Public read access to active service categories
GRANT SELECT ON public.service_categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.credit_wallets TO authenticated;

-- 5. Base service categories
INSERT INTO public.service_categories (name, description, icon, verification_level, is_active) VALUES
  ('Ménage', 'Nettoyage et entretien du domicile', 'Sparkles', 1, true),
  ('Garde d''enfants', 'Baby-sitting et garde à domicile', 'Baby', 3, true),
  ('Plomberie', 'Dépannage et installation sanitaire', 'Wrench', 2, true),
  ('Électricité', 'Dépannage et installation électrique', 'Zap', 2, true),
  ('Coiffure', 'Coiffure et beauté à domicile', 'Scissors', 1, true),
  ('Jardinage', 'Entretien des espaces verts', 'Leaf', 1, true),
  ('Déménagement', 'Transport et manutention', 'Truck', 1, true),
  ('Cours particuliers', 'Soutien scolaire et formation', 'GraduationCap', 2, true),
  ('Climatisation', 'Installation et entretien de climatiseurs', 'Wind', 2, true),
  ('Informatique', 'Dépannage informatique et réseaux', 'Laptop', 1, true)
ON CONFLICT DO NOTHING;

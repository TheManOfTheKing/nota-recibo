-- Use este script quando o projeto Supabase JA existe
-- e a tabela public.profiles ja foi criada anteriormente.
-- Ele aplica apenas os ajustes de role/RLS/trigger de forma segura.

BEGIN;

-- 1) Garantir colunas necessarias em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role VARCHAR(20),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'user';

UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL OR role NOT IN ('admin', 'user');

ALTER TABLE public.profiles
  ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user'));
END;
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2) Funcoes de autorizacao/role
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_profile_role_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_profiles BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_profiles FROM public.profiles;

  IF total_profiles = 0 THEN
    NEW.role := 'admin';
  ELSIF NOT public.current_user_is_admin() THEN
    NEW.role := 'user';
  END IF;

  NEW.created_at := COALESCE(NEW.created_at, NOW());
  NEW.updated_at := COALESCE(NEW.updated_at, NOW());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_profile_role_on_insert() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_profile_role_on_insert() TO authenticated;

-- 3) Policies (recria para garantir definicao alinhada)
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can select their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Admins can select all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles." ON public.profiles;

CREATE POLICY "Users can insert their own profile."
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can select their own profile."
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can select all profiles."
  ON public.profiles
  FOR SELECT
  USING (public.current_user_is_admin());

CREATE POLICY "Admins can update profiles."
  ON public.profiles
  FOR UPDATE
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- 4) Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_profile_role_on_insert ON public.profiles;
CREATE TRIGGER set_profile_role_on_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_role_on_insert();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 5) Backfill: se nao existir admin, promove o primeiro perfil
WITH first_profile AS (
  SELECT id
  FROM public.profiles
  ORDER BY created_at ASC NULLS LAST, id ASC
  LIMIT 1
)
UPDATE public.profiles p
SET role = 'admin'
WHERE p.id = (SELECT id FROM first_profile)
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE role = 'admin'
  );

COMMIT;

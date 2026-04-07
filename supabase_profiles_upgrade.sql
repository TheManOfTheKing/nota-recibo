-- Use este script quando o projeto Supabase JA existe
-- e a tabela public.profiles ja foi criada anteriormente.
-- Ele aplica o controle de aprovacao de contas + gestao de admin
-- de forma idempotente e segura para reexecucao.

BEGIN;

-- 1) Garantir colunas necessarias em profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role VARCHAR(20),
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_approved_by_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_approved_by_fkey
      FOREIGN KEY (approved_by)
      REFERENCES auth.users(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'user',
  ALTER COLUMN approval_status SET DEFAULT 'pending';

-- 2) Normalizacao de dados legados
UPDATE public.profiles p
SET email = COALESCE(p.email, u.email)
FROM auth.users u
WHERE u.id = p.id;

UPDATE public.profiles
SET role = 'user'
WHERE role IS NULL OR role NOT IN ('admin', 'user');

UPDATE public.profiles
SET approval_status = 'approved'
WHERE approval_status IS NULL OR approval_status NOT IN ('pending', 'approved');

UPDATE public.profiles
SET approved_at = COALESCE(approved_at, NOW()),
    updated_at = NOW()
WHERE approval_status = 'approved'
  AND approved_at IS NULL;

UPDATE public.profiles
SET approved_at = NULL,
    approved_by = NULL,
    updated_at = NOW()
WHERE approval_status = 'pending'
  AND (approved_at IS NOT NULL OR approved_by IS NOT NULL);

-- Garantir profile para usuarios auth existentes que ainda nao tenham row
INSERT INTO public.profiles (
  id,
  email,
  role,
  approval_status,
  approved_at,
  approved_by,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.email,
  'user',
  'approved',
  NOW(),
  NULL,
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN approval_status SET NOT NULL;

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
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('admin', 'user'));

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_approval_status_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_approval_status_check;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_approval_status_check
    CHECK (approval_status IN ('pending', 'approved'));
END;
$$;

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_approval_status ON public.profiles(approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3) Funcoes de autorizacao e aprovacao
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
      AND approval_status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_profile_role_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  NEW.role := 'user';
  NEW.approval_status := 'pending';
  NEW.approved_at := NULL;
  NEW.approved_by := NULL;

  IF NEW.email IS NULL THEN
    SELECT u.email INTO NEW.email
    FROM auth.users u
    WHERE u.id = NEW.id;
  END IF;

  NEW.created_at := COALESCE(NEW.created_at, NOW());
  NEW.updated_at := COALESCE(NEW.updated_at, NOW());
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_profile_role_on_insert() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_profile_role_on_insert() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    role,
    approval_status,
    approved_at,
    approved_by,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    'pending',
    NULL,
    NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = NOW();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_auth_user_created() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.handle_auth_user_email_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email,
      updated_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_auth_user_email_updated() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.admin_approve_user(target_user_id UUID, target_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Only admin users can approve accounts.';
  END IF;

  IF target_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Invalid role. Use admin or user.';
  END IF;

  UPDATE public.profiles
  SET role = target_role,
      approval_status = 'approved',
      approved_at = NOW(),
      approved_by = auth.uid(),
      updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found for target user.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_approve_user(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_approve_user(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id UUID, target_role TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_is_admin BOOLEAN;
  approved_admins_count BIGINT;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Only admin users can update roles.';
  END IF;

  IF target_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Invalid role. Use admin or user.';
  END IF;

  SELECT role = 'admin'
  INTO target_is_admin
  FROM public.profiles
  WHERE id = target_user_id
    AND approval_status = 'approved';

  IF target_is_admin IS NULL THEN
    RAISE EXCEPTION 'Approved profile not found for target user.';
  END IF;

  IF target_user_id = auth.uid() AND target_role <> 'admin' THEN
    RAISE EXCEPTION 'Cannot demote yourself.';
  END IF;

  IF target_is_admin AND target_role = 'user' THEN
    SELECT COUNT(*)
    INTO approved_admins_count
    FROM public.profiles
    WHERE role = 'admin'
      AND approval_status = 'approved';

    IF approved_admins_count <= 1 THEN
      RAISE EXCEPTION 'At least one approved admin must remain.';
    END IF;
  END IF;

  UPDATE public.profiles
  SET role = target_role,
      updated_at = NOW()
  WHERE id = target_user_id
    AND approval_status = 'approved';
END;
$$;

REVOKE ALL ON FUNCTION public.admin_update_user_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_user_role(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_and_remove_user(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_role TEXT;
  target_approval_status TEXT;
  approved_admins_count BIGINT;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Only admin users can remove accounts.';
  END IF;

  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove your own account.';
  END IF;

  SELECT role, approval_status
  INTO target_role, target_approval_status
  FROM public.profiles
  WHERE id = target_user_id;

  IF target_role IS NULL THEN
    RAISE EXCEPTION 'Profile not found for target user.';
  END IF;

  IF target_role = 'admin' AND target_approval_status = 'approved' THEN
    SELECT COUNT(*)
    INTO approved_admins_count
    FROM public.profiles
    WHERE role = 'admin'
      AND approval_status = 'approved';

    IF approved_admins_count <= 1 THEN
      RAISE EXCEPTION 'At least one approved admin must remain.';
    END IF;
  END IF;

  DELETE FROM auth.users
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found in auth.users.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_reject_and_remove_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_reject_and_remove_user(UUID) TO authenticated;

-- 4) Policies (recria para garantir definicao alinhada)
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

-- 5) Triggers
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_created();

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.handle_auth_user_email_updated();

COMMIT;

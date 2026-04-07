-- Schema SQL para Supabase (PostgreSQL) - PWA Gerador de Recibos e Notas Promissórias

-- Tabela para armazenar perfis de autenticação e autorização (admin/user)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved')),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização de busca
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_approval_status ON public.profiles(approval_status);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Habilitar RLS (Row Level Security) para a tabela de perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Função helper para verificar se o usuário atual é admin aprovado
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

-- Trigger de segurança para padronizar inserts diretos em profiles
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

-- Trigger para criar/sincronizar profile após criação em auth.users
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

-- Trigger para manter e-mail sincronizado entre auth.users e profiles
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

-- RPC: aprovar usuário e definir papel
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

-- RPC: atualizar papel de usuário aprovado
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

-- RPC: rejeitar e remover conta do usuário (com cascata de dados)
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

-- Políticas de RLS para a tabela de perfis
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can select their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can select all profiles." ON public.profiles FOR SELECT USING (public.current_user_is_admin());
CREATE POLICY "Admins can update profiles." ON public.profiles FOR UPDATE USING (public.current_user_is_admin()) WITH CHECK (public.current_user_is_admin());

-- Tabela para armazenar os dados dos emissores
CREATE TABLE public.emitters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cnpj_cpf VARCHAR(18) NOT NULL,
    address TEXT NOT NULL,
    logo_url TEXT, -- URL para o logotipo, pode ser armazenado no Supabase Storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização de busca
CREATE INDEX idx_emitters_user_id ON public.emitters(user_id);

-- Habilitar RLS (Row Level Security) para a tabela de emissores
ALTER TABLE public.emitters ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para a tabela de emissores
CREATE POLICY "Users can insert their own emitters." ON public.emitters FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select their own emitters." ON public.emitters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own emitters." ON public.emitters FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own emitters." ON public.emitters FOR DELETE USING (auth.uid() = user_id);

-- Tabela para armazenar os dados dos clientes
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(18) NOT NULL,
    phone VARCHAR(20),
    address TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização de busca
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_clients_name ON public.clients(name);
CREATE INDEX idx_clients_cpf_cnpj ON public.clients(cpf_cnpj);

-- Habilitar RLS (Row Level Security) para a tabela de clientes
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para a tabela de clientes
CREATE POLICY "Users can insert their own clients." ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select their own clients." ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients." ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients." ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- Tabela para armazenar os documentos gerados (recibos e notas promissórias)
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    emitter_id UUID REFERENCES public.emitters(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('receipt', 'promissory_note')),
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT, -- Para recibos: finalidade; para notas promissórias: descrição do débito
    pdf_url TEXT, -- URL para o PDF gerado, armazenado no Supabase Storage
    due_date DATE, -- Data de vencimento (obrigatória para promissória)
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    CHECK (document_type <> 'promissory_note' OR due_date IS NOT NULL),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização de busca
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_emitter_id ON public.documents(emitter_id);
CREATE INDEX idx_documents_client_id ON public.documents(client_id);
CREATE INDEX idx_documents_type_date ON public.documents(document_type, issue_date DESC);

-- Habilitar RLS (Row Level Security) para a tabela de documentos
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para a tabela de documentos
CREATE POLICY "Users can insert their own documents." ON public.documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select their own documents." ON public.documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents." ON public.documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents." ON public.documents FOR DELETE USING (auth.uid() = user_id);

-- Função para atualizar a coluna updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para as tabelas
CREATE TRIGGER set_profile_role_on_insert BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_profile_role_on_insert();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_created();
CREATE TRIGGER on_auth_user_email_updated AFTER UPDATE OF email ON auth.users FOR EACH ROW WHEN (OLD.email IS DISTINCT FROM NEW.email) EXECUTE FUNCTION public.handle_auth_user_email_updated();
CREATE TRIGGER update_emitters_updated_at BEFORE UPDATE ON public.emitters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

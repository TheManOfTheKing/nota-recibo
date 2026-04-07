-- Schema SQL para Supabase (PostgreSQL) - PWA Gerador de Recibos e Notas Promissórias

-- Tabela para armazenar perfis de autenticação e autorização (admin/user)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização de busca
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Habilitar RLS (Row Level Security) para a tabela de perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Função helper para verificar se o usuário atual é admin (evita lógica duplicada nas policies)
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

-- Trigger de segurança para definir a role corretamente no cadastro do perfil:
-- primeiro perfil => admin, demais => user (a menos que o inseridor já seja admin).
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
    document_type VARCHAR(50) NOT NULL, -- 'receipt' ou 'promissory_note'
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT, -- Para recibos: finalidade; para notas promissórias: descrição do débito
    pdf_url TEXT, -- URL para o PDF gerado, armazenado no Supabase Storage
    -- Campos específicos para Notas Promissórias
    due_date DATE, -- Data de vencimento
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
    -- Campos adicionais para metadados do documento, se necessário
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
CREATE TRIGGER update_emitters_updated_at BEFORE UPDATE ON public.emitters FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

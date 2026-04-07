# Supabase Integration Guide

Este guia padroniza a integração do PWA com Supabase para autenticação, sessão e dados.

## 1) Arquivos de referência na raiz

- `supabase_schema.sql`
- `supabase_profiles_upgrade.sql` (usar quando `profiles` ja existe)
- `supabase_documents_upgrade.sql` (usar quando `documents` ja existe e precisa alinhar constraints/status)
- `supabase_storage_setup.sql` (cria/atualiza buckets e policies de Storage)
- `supabase_integration_guide.md`
- `prompt_guide.md`
- `arquitetura_pwa_recibos.md`

## 2) Variáveis de ambiente (frontend Vite)

Use sempre:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Não usar `service_role` no frontend.

## 3) Tabela `public.profiles`, aprovação e papel de usuário

O schema define:

- `id uuid` (PK, referência para `auth.users.id`)
- `email text`
- `role` com valores permitidos: `admin | user`
- `approval_status` com valores permitidos: `pending | approved`
- `approved_at`, `approved_by`
- `created_at`, `updated_at`

Regras esperadas:

- Novo cadastro entra como `role = user` e `approval_status = pending`.
- Somente `approval_status = approved` pode acessar o app.
- O papel exibido na UI deve vir de `public.profiles.role`.
- Apenas `admin` aprovado pode aprovar contas, promover/rebaixar papéis e remover contas.

No schema atual isso é reforçado por:

- RLS na tabela `profiles`
- função `public.current_user_is_admin()`
- trigger em `auth.users` para criar profile pendente (`public.handle_auth_user_created()`)
- RPCs:
  - `public.admin_approve_user(target_user_id, target_role)`
  - `public.admin_update_user_role(target_user_id, target_role)`
  - `public.admin_reject_and_remove_user(target_user_id)`

Se o banco ja foi provisionado e voce receber erro como:
`relation "profiles" already exists`,
nao execute o bootstrap completo novamente. Execute apenas `supabase_profiles_upgrade.sql`.

## 4) Fluxo recomendado de autenticação

1. `signIn` / `signUp` via Supabase Auth.
2. Após autenticar, garantir perfil em `public.profiles` com `id = auth.user.id`.
3. Ler `approval_status` e `role` da tabela `profiles`.
4. Se `approval_status = pending`, mostrar tela de aguardo e bloquear acesso ao app.
5. Se `approval_status = approved`, renderizar navegação/status conforme sessão e papel.
6. Em `signOut`, limpar estado local e voltar para a tela de login.

## 5) Boas práticas para agentes

- Sempre consultar `public.profiles` para autorização de papel e aprovação.
- Evitar decisões de autorização no frontend; regras finais devem ficar protegidas no banco (RLS/RPC).
- Manter componentes acessíveis (labels, contraste, foco visível, botões com área de toque adequada).
- Em telas protegidas, redirecionar para login quando não houver sessão.

## 6) Emissores (`public.emitters`) e logotipos

- CRUD de emissores deve usar a tabela `public.emitters` com `user_id = auth.uid()`.
- Para logotipos, usar Supabase Storage com bucket `emitters-logos`.
- Fluxo recomendado:
1. Criar/atualizar registro de emissor.
2. Fazer upload do arquivo no Storage.
3. Salvar `logo_url` pública na tabela `emitters`.
- Se o bucket ainda não existir, criar no painel do Supabase e configurar políticas para usuários autenticados.

## 7) Clientes (`public.clients`) e auto-preenchimento

- CRUD de clientes deve usar a tabela `public.clients` com `user_id = auth.uid()`.
- Campos obrigatórios no app: `name`, `cpf_cnpj`, `phone`, `address`.
- Fluxo recomendado:
1. Buscar clientes do usuário logado.
2. Oferecer sugestões ao digitar nome ou CPF/CNPJ.
3. Ao selecionar sugestão, preencher automaticamente os dados do cliente no formulário/tela de geração.
4. Permitir edição e exclusão com feedback claro de sucesso/erro.

## 8) Recibos (`public.documents`) + PDF em Storage

- Para recibos, gerar PDF no frontend com `jsPDF`.
- Converter o documento para `Blob` e enviar ao bucket `documents-pdfs`.
- Salvar metadados em `public.documents` com:
  - `user_id`
  - `emitter_id`
  - `client_id`
  - `document_type = 'receipt'`
  - `issue_date`
  - `amount`
  - `description`
  - `pdf_url`
- A UI de histórico deve priorizar `pdf_url` para abrir/download da via já persistida.

## 9) Notas promissórias (`public.documents`) + PDF em Storage

- Para notas promissórias, reutilizar `jsPDF` no frontend e enviar o `Blob` para `documents-pdfs`.
- Salvar em `public.documents` com:
  - `document_type = 'promissory_note'`
  - `issue_date`
  - `due_date`
  - `status` (`pending`, `paid`, `cancelled`)
  - `amount`
  - `description`
  - `pdf_url`
- Em histórico, abrir preferencialmente o `pdf_url` salvo para garantir rastreabilidade e segunda via fiel.

### Erro comum

Se aparecer:
`Bucket de PDFs não encontrado. Crie o bucket "documents-pdfs" no Supabase Storage.`

Execute `supabase_storage_setup.sql` no SQL Editor do Supabase.

## 10) Upgrade idempotente de `public.documents`

Se a tabela `documents` ja existe e foi criada antes das regras atuais, execute:

- `supabase_documents_upgrade.sql`

Esse script:

- normaliza `document_type` para `receipt | promissory_note`
- normaliza `status` para `pending | paid | cancelled`
- adiciona constraints de integridade
- garante `due_date` obrigatoria para `promissory_note`
- recria policies RLS da tabela `documents`

## 11) Controle de contas (aprovação + admin)

Para ambientes existentes, execute:

- `supabase_profiles_upgrade.sql`

Esse script:

- adiciona e normaliza colunas de aprovação em `profiles`
- marca usuários já existentes como `approved` (para não bloquear uso atual)
- cria trigger em `auth.users` para novos cadastros iniciarem como `pending`
- remove promoção automática por "primeiro usuário"
- cria RPCs de aprovação, alteração de papel e remoção de conta
- aplica guardrails para impedir auto-remoção e remoção/rebaixamento do último admin aprovado

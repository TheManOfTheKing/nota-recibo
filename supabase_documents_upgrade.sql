-- Use este script quando o projeto Supabase ja existe
-- e a tabela public.documents ja foi criada anteriormente.
-- Ele aplica ajustes de integridade para recibos e notas promissorias
-- de forma idempotente e segura para reexecucao.

BEGIN;

-- 1) Garantir colunas esperadas (compatibilidade com bases antigas)
ALTER TABLE IF EXISTS public.documents
  ADD COLUMN IF NOT EXISTS document_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS due_date DATE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2) Normalizacao de dados legados (tipos e status)
UPDATE public.documents
SET document_type = CASE
  WHEN document_type IS NULL THEN 'receipt'
  WHEN lower(document_type) IN ('receipt', 'recibo') THEN 'receipt'
  WHEN lower(document_type) IN ('promissory_note', 'promissory-note', 'nota_promissoria', 'nota promissoria', 'promissoria', 'nota promissoria') THEN 'promissory_note'
  ELSE 'receipt'
END;

UPDATE public.documents
SET status = CASE
  WHEN status IS NULL THEN 'pending'
  WHEN lower(status) IN ('pending', 'emitido', 'pendente') THEN 'pending'
  WHEN lower(status) IN ('paid', 'pago', 'processado') THEN 'paid'
  WHEN lower(status) IN ('cancelled', 'canceled', 'cancelado') THEN 'cancelled'
  ELSE 'pending'
END;

UPDATE public.documents
SET issue_date = CURRENT_DATE
WHERE issue_date IS NULL;

UPDATE public.documents
SET due_date = issue_date
WHERE document_type = 'promissory_note'
  AND due_date IS NULL;

-- 3) Defaults e obrigatoriedades
ALTER TABLE public.documents
  ALTER COLUMN document_type SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL;

-- 4) Constraints (recria para garantir definicao alinhada)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_document_type_check'
      AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents DROP CONSTRAINT documents_document_type_check;
  END IF;

  ALTER TABLE public.documents
    ADD CONSTRAINT documents_document_type_check
    CHECK (document_type IN ('receipt', 'promissory_note'));

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_status_check'
      AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents DROP CONSTRAINT documents_status_check;
  END IF;

  ALTER TABLE public.documents
    ADD CONSTRAINT documents_status_check
    CHECK (status IN ('pending', 'paid', 'cancelled'));

  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'documents_promissory_due_date_check'
      AND conrelid = 'public.documents'::regclass
  ) THEN
    ALTER TABLE public.documents DROP CONSTRAINT documents_promissory_due_date_check;
  END IF;

  ALTER TABLE public.documents
    ADD CONSTRAINT documents_promissory_due_date_check
    CHECK (document_type <> 'promissory_note' OR due_date IS NOT NULL);
END;
$$;

-- 5) Indices auxiliares
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_emitter_id ON public.documents(emitter_id);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type_date ON public.documents(document_type, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_documents_due_date ON public.documents(due_date);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);

-- 6) RLS e policies da tabela documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own documents." ON public.documents;
DROP POLICY IF EXISTS "Users can select their own documents." ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents." ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents." ON public.documents;

CREATE POLICY "Users can insert their own documents."
  ON public.documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own documents."
  ON public.documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents."
  ON public.documents
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents."
  ON public.documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- 7) Trigger de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMIT;

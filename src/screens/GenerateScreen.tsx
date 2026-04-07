import { useEffect, useMemo, useState } from 'react';
import { Calendar, FileText, History, Search, Verified } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Customer, DocumentRecord, Emitter } from '../types';

interface CreateReceiptPayload {
  emitter: Emitter;
  customer: Customer;
  amount: number;
  description: string;
}

interface CreatePromissoryNotePayload {
  emitter: Emitter;
  customer: Customer;
  amount: number;
  description: string;
  dueDate: string;
  status: 'pending' | 'paid' | 'cancelled';
}

interface GenerateScreenProps {
  customers: Customer[];
  emitters: Emitter[];
  onCreateReceiptDocument: (payload: CreateReceiptPayload) => Promise<DocumentRecord>;
  onCreatePromissoryNoteDocument: (payload: CreatePromissoryNotePayload) => Promise<DocumentRecord>;
  onGoToHistory: () => void;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeDocument(value: string): string {
  return value.replace(/\D/g, '');
}

function matchesCustomer(customer: Customer, query: string): boolean {
  const queryText = normalizeText(query);
  const queryDoc = normalizeDocument(query);
  if (!queryText) {
    return false;
  }

  return (
    normalizeText(customer.name).includes(queryText) ||
    normalizeText(customer.cpfCnpj).includes(queryText) ||
    normalizeDocument(customer.cpfCnpj).includes(queryDoc)
  );
}

function buildDefaultDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return format(date, 'yyyy-MM-dd');
}

function toStatusLabel(status: 'pending' | 'paid' | 'cancelled'): string {
  if (status === 'paid') {
    return 'Pago';
  }

  if (status === 'cancelled') {
    return 'Cancelado';
  }

  return 'Pendente';
}

function parseCurrencyInput(value: string): number {
  const sanitized = value.replace(/\s/g, '');
  const normalized = sanitized.includes(',')
    ? sanitized.replace(/\./g, '').replace(',', '.')
    : sanitized;
  return Number(normalized);
}

export function GenerateScreen({
  customers,
  emitters,
  onCreateReceiptDocument,
  onCreatePromissoryNoteDocument,
  onGoToHistory,
}: GenerateScreenProps) {
  const [documentType, setDocumentType] = useState<'receipt' | 'promissory_note'>('receipt');
  const [selectedEmitterId, setSelectedEmitterId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(buildDefaultDueDate);
  const [status, setStatus] = useState<'pending' | 'paid' | 'cancelled'>('pending');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'error' | 'success'>('error');

  useEffect(() => {
    if (!emitters.length) {
      setSelectedEmitterId('');
      return;
    }

    if (!selectedEmitterId || !emitters.some((emitter) => emitter.id === selectedEmitterId)) {
      setSelectedEmitterId(emitters[0].id);
    }
  }, [emitters, selectedEmitterId]);

  const selectedEmitter = useMemo(
    () => emitters.find((emitter) => emitter.id === selectedEmitterId) ?? null,
    [emitters, selectedEmitterId],
  );

  const customerSuggestions = useMemo(() => {
    if (!clientSearch.trim()) {
      return [];
    }

    return customers.filter((customer) => matchesCustomer(customer, clientSearch)).slice(0, 6);
  }, [clientSearch, customers]);

  const handleClientSearch = (value: string) => {
    setClientSearch(value);
    setShowSuggestions(true);

    if (!value.trim()) {
      setSelectedClient(null);
      return;
    }

    const exactMatch = customers.find((customer) => {
      const queryText = normalizeText(value);
      const queryDoc = normalizeDocument(value);
      return (
        normalizeText(customer.name) === queryText ||
        normalizeText(customer.cpfCnpj) === queryText ||
        normalizeDocument(customer.cpfCnpj) === queryDoc
      );
    });

    if (exactMatch) {
      setSelectedClient(exactMatch);
      return;
    }

    if (selectedClient) {
      setSelectedClient(null);
    }
  };

  const handleSelectSuggestedCustomer = (customer: Customer) => {
    setSelectedClient(customer);
    setClientSearch(customer.name);
    setShowSuggestions(false);
  };

  const isPromissory = documentType === 'promissory_note';
  const screenTitle = isPromissory ? 'Gerar Nota Promissoria' : 'Gerar Recibo';

  const handleGenerateDocument = async () => {
    if (!selectedEmitter) {
      setFeedbackType('error');
      setFeedbackMessage('Selecione um emissor para gerar o documento.');
      return;
    }

    if (!selectedClient) {
      setFeedbackType('error');
      setFeedbackMessage('Selecione um cliente existente para gerar o documento.');
      return;
    }

    if (!amount.trim()) {
      setFeedbackType('error');
      setFeedbackMessage('Informe um valor valido.');
      return;
    }

    const normalizedAmount = parseCurrencyInput(amount);
    if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
      setFeedbackType('error');
      setFeedbackMessage('Informe um valor numerico maior que zero.');
      return;
    }

    if (!description.trim()) {
      setFeedbackType('error');
      setFeedbackMessage(isPromissory ? 'Informe a descricao da nota promissoria.' : 'Informe a descricao do recibo.');
      return;
    }

    if (isPromissory) {
      if (!dueDate) {
        setFeedbackType('error');
        setFeedbackMessage('Informe a data de vencimento.');
        return;
      }

      const parsedDueDate = new Date(`${dueDate}T00:00:00`);
      if (Number.isNaN(parsedDueDate.getTime())) {
        setFeedbackType('error');
        setFeedbackMessage('Data de vencimento invalida.');
        return;
      }
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      if (isPromissory) {
        await onCreatePromissoryNoteDocument({
          emitter: selectedEmitter,
          customer: selectedClient,
          amount: normalizedAmount,
          description: description.trim(),
          dueDate,
          status,
        });
        setFeedbackType('success');
        setFeedbackMessage('Nota promissoria gerada, enviada para o Storage e salva em documents.');
      } else {
        await onCreateReceiptDocument({
          emitter: selectedEmitter,
          customer: selectedClient,
          amount: normalizedAmount,
          description: description.trim(),
        });
        setFeedbackType('success');
        setFeedbackMessage('Recibo gerado, enviado para o Storage e salvo em documents.');
      }

      setAmount('');
      setDescription('');
      setDueDate(buildDefaultDueDate());
      setStatus('pending');
    } catch (error) {
      setFeedbackType('error');
      setFeedbackMessage(error instanceof Error ? error.message : 'Falha ao gerar documento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 mt-16 mb-24 px-6 py-8 max-w-2xl mx-auto w-full">
      <section className="space-y-8">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-5">
          <h2 className="font-headline text-xl font-black tracking-wide text-on-surface">{screenTitle}</h2>
          <p className="mt-2 text-sm font-medium text-on-surface-variant">
            Selecione emissor e cliente, preencha os dados e gere um PDF profissional salvo automaticamente no Supabase.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-container-high p-2" role="tablist" aria-label="Tipo de documento">
            <button
              type="button"
              id="tab-receipt"
              role="tab"
              aria-selected={documentType === 'receipt'}
              aria-controls="document-form-panel"
              onClick={() => setDocumentType('receipt')}
              className={`h-12 rounded-lg text-sm font-black uppercase tracking-wide transition-colors ${
                documentType === 'receipt'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Recibo
            </button>
            <button
              type="button"
              id="tab-promissory-note"
              role="tab"
              aria-selected={documentType === 'promissory_note'}
              aria-controls="document-form-panel"
              onClick={() => setDocumentType('promissory_note')}
              className={`h-12 rounded-lg text-sm font-black uppercase tracking-wide transition-colors ${
                documentType === 'promissory_note'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              Nota promissoria
            </button>
          </div>
        </div>

        <div
          id="document-form-panel"
          role="tabpanel"
          aria-labelledby={isPromissory ? 'tab-promissory-note' : 'tab-receipt'}
          className="space-y-8"
        >
          <div className="flex flex-col gap-3">
            <label
              htmlFor="emitter-select"
              className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]"
            >
              EMISSOR
            </label>
            <select
              id="emitter-select"
              value={selectedEmitterId}
              onChange={(event) => setSelectedEmitterId(event.target.value)}
              className="w-full rounded-xl border border-outline bg-surface-container-highest p-4 text-lg font-semibold text-on-surface focus:border-primary focus:outline-none"
              aria-label="Selecionar emissor"
            >
              {emitters.length === 0 && <option value="">Nenhum emissor cadastrado</option>}
              {emitters.map((emitter) => (
                <option key={emitter.id} value={emitter.id}>
                  {emitter.name} ({emitter.cnpjCpf})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">
              CLIENTE (NOME, CPF/CNPJ)
            </label>
            <div className="relative">
              <input
                id="customer-search"
                type="text"
                value={clientSearch}
                onChange={(event) => handleClientSearch(event.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
                className="w-full rounded-xl border border-outline bg-surface-container-highest p-5 pr-14 text-lg font-medium text-on-surface focus:border-primary focus:outline-none"
                placeholder="Buscar cliente cadastrado..."
                aria-label="Buscar cliente por nome ou CPF/CNPJ"
                aria-autocomplete="list"
                aria-haspopup="listbox"
                aria-expanded={showSuggestions && customerSuggestions.length > 0}
                aria-controls="customer-suggestions-list"
              />
              <span
                className="absolute right-4 top-1/2 -translate-y-1/2 text-primary p-2 bg-surface-container-high rounded-lg"
                aria-hidden="true"
              >
                <Search className="w-5 h-5" />
              </span>

              {showSuggestions && customerSuggestions.length > 0 && (
                <div className="absolute z-20 mt-2 w-full rounded-xl border border-outline-variant/30 bg-surface-container shadow-2xl">
                  <ul
                    id="customer-suggestions-list"
                    className="max-h-56 overflow-auto py-2"
                    role="listbox"
                    aria-label="Sugestoes de clientes"
                  >
                    {customerSuggestions.map((customer) => (
                      <li key={customer.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectSuggestedCustomer(customer)}
                          className="min-h-11 w-full px-4 py-3 text-left hover:bg-surface-container-high"
                          aria-label={`Selecionar cliente ${customer.name}`}
                        >
                          <p className="truncate text-sm font-bold text-on-surface">{customer.name}</p>
                          <p className="truncate text-xs font-semibold text-on-surface-variant">{customer.cpfCnpj}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {selectedClient && (
              <p className="text-xs font-semibold text-secondary">
                Cliente selecionado: {selectedClient.name} | {selectedClient.cpfCnpj}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">VALOR (R$)</label>
            <div className="bg-surface-container-highest rounded-xl p-4 flex items-center border border-outline">
              <span className="mr-2 text-2xl font-black text-primary">R$</span>
              <input
                type="text"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                className="bg-transparent border-none w-full text-3xl font-lexend font-bold p-0 focus:ring-0 text-on-surface placeholder:text-on-surface-variant"
                placeholder="0,00"
                aria-label="Valor do documento"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">
              {isPromissory ? 'DESCRICAO DA DIVIDA' : 'REFERENTE A (DESCRICAO)'}
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-xl border border-outline bg-surface-container-highest p-5 text-lg font-medium text-on-surface focus:border-primary focus:outline-none resize-none"
              placeholder={
                isPromissory
                  ? 'Ex: Compra parcelada de equipamentos.'
                  : 'Ex: Pagamento de servicos prestados no periodo...'
              }
              rows={4}
              aria-label={isPromissory ? 'Descricao da nota promissoria' : 'Descricao do recibo'}
            />
          </div>

          {isPromissory && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-3">
                <label
                  htmlFor="due-date"
                  className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]"
                >
                  DATA DE VENCIMENTO
                </label>
                <input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="h-14 w-full rounded-xl border border-outline bg-surface-container-highest px-4 text-base font-semibold text-on-surface focus:border-primary focus:outline-none"
                  aria-label="Data de vencimento da nota promissoria"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label
                  htmlFor="status-select"
                  className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]"
                >
                  STATUS
                </label>
                <select
                  id="status-select"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as 'pending' | 'paid' | 'cancelled')}
                  className="h-14 w-full rounded-xl border border-outline bg-surface-container-highest px-4 text-base font-semibold text-on-surface focus:border-primary focus:outline-none"
                  aria-label="Status da nota promissoria"
                >
                  <option value="pending">{toStatusLabel('pending')}</option>
                  <option value="paid">{toStatusLabel('paid')}</option>
                  <option value="cancelled">{toStatusLabel('cancelled')}</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-3">
              <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">
                DATA DE EMISSAO
              </label>
              <div className="bg-surface-container-highest rounded-xl p-5 text-lg font-bold flex items-center gap-3 border border-outline">
                <Calendar className="w-5 h-5 text-secondary" />
                <span>{format(new Date(), 'dd MMM, yyyy', { locale: ptBR })}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">RECENTES</label>
              <button
                type="button"
                onClick={onGoToHistory}
                aria-label="Ir para histórico de documentos"
                className="bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-xl p-5 text-lg font-bold flex items-center justify-center gap-3 text-secondary"
              >
                <History className="w-5 h-5" />
                <span>Historico</span>
              </button>
            </div>
          </div>
        </div>

        {feedbackMessage && (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-semibold ${
              feedbackType === 'success'
                ? 'border border-emerald-500/60 bg-emerald-950/40 text-emerald-300'
                : 'border border-red-500/60 bg-red-950/40 text-red-300'
            }`}
            role="status"
            aria-live="polite"
          >
            {feedbackMessage}
          </div>
        )}

        <div className="bg-surface-container-low rounded-2xl overflow-hidden p-6 flex items-center gap-6 border border-outline-variant/10">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center shrink-0">
            <Verified className="w-8 h-8 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-headline font-bold text-lg leading-tight">Emissao Digital Segura</h4>
            <p className="text-on-surface-variant text-sm font-medium opacity-80">
              O PDF sera salvo no Supabase Storage e os metadados serao registrados em <code>documents</code>.
            </p>
          </div>
        </div>
      </section>

      <div className="h-12" />

      <div className="fixed bottom-24 left-0 w-full px-6 z-40 pointer-events-none max-w-2xl mx-auto right-0">
        <button
          type="button"
          onClick={handleGenerateDocument}
          disabled={isSubmitting}
          aria-label={isPromissory ? 'Gerar nota promissória em PDF' : 'Gerar recibo em PDF'}
          className="pointer-events-auto w-full h-[72px] primary-gradient-btn rounded-2xl flex items-center justify-center gap-3 text-on-primary font-headline font-black text-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] active:scale-95 transition-transform disabled:cursor-not-allowed disabled:opacity-70"
        >
          <FileText className="w-6 h-6" />
          {isSubmitting
            ? 'GERANDO E ENVIANDO...'
            : isPromissory
              ? 'GERAR NOTA PROMISSORIA PDF'
              : 'GERAR RECIBO PDF'}
        </button>
      </div>
    </main>
  );
}

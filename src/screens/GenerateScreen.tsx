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

interface GenerateScreenProps {
  customers: Customer[];
  emitters: Emitter[];
  onCreateReceiptDocument: (payload: CreateReceiptPayload) => Promise<DocumentRecord>;
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

export function GenerateScreen({
  customers,
  emitters,
  onCreateReceiptDocument,
  onGoToHistory,
}: GenerateScreenProps) {
  const [selectedEmitterId, setSelectedEmitterId] = useState<string>('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
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

  const handleGenerateReceipt = async () => {
    if (!selectedEmitter) {
      setFeedbackType('error');
      setFeedbackMessage('Selecione um emissor para gerar o recibo.');
      return;
    }

    if (!selectedClient) {
      setFeedbackType('error');
      setFeedbackMessage('Selecione um cliente existente para gerar o recibo.');
      return;
    }

    if (!amount.trim()) {
      setFeedbackType('error');
      setFeedbackMessage('Informe um valor válido.');
      return;
    }

    const normalizedAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
      setFeedbackType('error');
      setFeedbackMessage('Informe um valor numérico maior que zero.');
      return;
    }

    if (!description.trim()) {
      setFeedbackType('error');
      setFeedbackMessage('Informe a descrição do recibo.');
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      await onCreateReceiptDocument({
        emitter: selectedEmitter,
        customer: selectedClient,
        amount: normalizedAmount,
        description: description.trim(),
      });

      setFeedbackType('success');
      setFeedbackMessage('Recibo gerado, enviado para o Storage e salvo em documents.');
      setAmount('');
      setDescription('');
    } catch (error) {
      setFeedbackType('error');
      setFeedbackMessage(error instanceof Error ? error.message : 'Falha ao gerar recibo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-1 mt-16 mb-24 px-6 py-8 max-w-2xl mx-auto w-full">
      <section className="space-y-8">
        <div className="rounded-2xl border border-outline-variant/20 bg-surface-container p-5">
          <h2 className="font-headline text-xl font-black tracking-wide text-on-surface">Gerar Recibo</h2>
          <p className="mt-2 text-sm font-medium text-on-surface-variant">
            Selecione emissor e cliente, preencha valor e descrição para emitir um recibo profissional em PDF.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="emitter-select" className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">
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
              type="text"
              value={clientSearch}
              onChange={(e) => handleClientSearch(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
              className="w-full rounded-xl border border-outline bg-surface-container-highest p-5 pr-14 text-lg font-medium text-on-surface focus:border-primary focus:outline-none"
              placeholder="Buscar cliente cadastrado..."
              aria-label="Buscar cliente por nome ou CPF/CNPJ"
              aria-autocomplete="list"
            />
            <button
              type="button"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-primary p-2 bg-surface-container-high rounded-lg"
              aria-hidden
            >
              <Search className="w-5 h-5" />
            </button>

            {showSuggestions && customerSuggestions.length > 0 && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-outline-variant/30 bg-surface-container shadow-2xl">
                <ul className="max-h-56 overflow-auto py-2" role="listbox" aria-label="Sugestões de clientes">
                  {customerSuggestions.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectSuggestedCustomer(customer)}
                        className="w-full px-4 py-3 text-left hover:bg-surface-container-high"
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
            <span className="text-primary-fixed text-2xl font-black mr-2">R$</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent border-none w-full text-3xl font-lexend font-bold p-0 focus:ring-0 text-on-surface placeholder:text-surface-variant"
              placeholder="0,00"
              aria-label="Valor do recibo"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">
            REFERENTE A (DESCRIÇÃO)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-outline bg-surface-container-highest p-5 text-lg font-medium text-on-surface focus:border-primary focus:outline-none resize-none"
            placeholder="Ex: Pagamento de serviços prestados no período..."
            rows={4}
            aria-label="Descrição do recibo"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">DATA DE EMISSÃO</label>
            <div className="bg-surface-container-highest rounded-xl p-5 text-lg font-bold flex items-center gap-3 border border-outline">
              <Calendar className="w-5 h-5 text-secondary" />
              <span>{format(new Date(), 'dd MMM, yyyy', { locale: ptBR })}</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-on-surface-variant font-label text-sm font-extrabold tracking-[0.05rem]">RECENTES</label>
            <button
              onClick={onGoToHistory}
              className="bg-surface-container-low hover:bg-surface-container-high transition-colors rounded-xl p-5 text-lg font-bold flex items-center justify-center gap-3 text-secondary"
            >
              <History className="w-5 h-5" />
              <span>Histórico</span>
            </button>
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
            <h4 className="font-headline font-bold text-lg leading-tight">Emissão Digital Segura</h4>
            <p className="text-on-surface-variant text-sm font-medium opacity-80">
              O PDF será salvo no Supabase Storage e os metadados serão registrados em <code>documents</code>.
            </p>
          </div>
        </div>
      </section>

      <div className="h-12" />

      <div className="fixed bottom-24 left-0 w-full px-6 z-40 pointer-events-none max-w-2xl mx-auto right-0">
        <button
          onClick={handleGenerateReceipt}
          disabled={isSubmitting}
          className="pointer-events-auto w-full h-[72px] primary-gradient-btn rounded-2xl flex items-center justify-center gap-3 text-on-primary font-headline font-black text-xl shadow-[0_20px_40px_rgba(0,0,0,0.5)] active:scale-95 transition-transform disabled:cursor-not-allowed disabled:opacity-70"
        >
          <FileText className="w-6 h-6" />
          {isSubmitting ? 'GERANDO E ENVIANDO...' : 'GERAR RECIBO PDF'}
        </button>
      </div>
    </main>
  );
}

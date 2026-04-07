import type { FormEvent } from 'react';
import { CheckCircle2, Save, UserRound, X } from 'lucide-react';
import type { Customer } from '../../types';

export interface CustomerFormValues {
  name: string;
  cpfCnpj: string;
  phone: string;
  address: string;
}

interface CustomerFormProps {
  mode: 'create' | 'edit';
  values: CustomerFormValues;
  isSubmitting: boolean;
  feedbackMessage: string | null;
  feedbackType: 'error' | 'success';
  suggestions: Customer[];
  onChange: (values: CustomerFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onUseSuggestion: (customer: Customer) => void;
}

export function CustomerForm({
  mode,
  values,
  isSubmitting,
  feedbackMessage,
  feedbackType,
  suggestions,
  onChange,
  onSubmit,
  onCancel,
  onUseSuggestion,
}: CustomerFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label={mode === 'create' ? 'Formulário para cadastrar cliente' : 'Formulário para editar cliente'}
      className="rounded-2xl border border-outline-variant/30 bg-surface-container p-5 shadow-lg"
    >
      <h3 className="mb-5 text-lg font-black tracking-wide text-on-surface">
        {mode === 'create' ? 'Novo Cliente' : 'Editar Cliente'}
      </h3>

      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="client-name" className="block text-xs font-bold uppercase tracking-[0.12rem] text-on-surface-variant">
            Nome Completo
          </label>
          <input
            id="client-name"
            type="text"
            required
            value={values.name}
            onChange={(event) => onChange({ ...values, name: event.target.value })}
            aria-label="Nome completo do cliente"
            className="h-12 w-full rounded-xl border border-outline bg-surface-container-highest px-4 text-base font-semibold text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            placeholder="Ex: João da Silva"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="client-cpf-cnpj" className="block text-xs font-bold uppercase tracking-[0.12rem] text-on-surface-variant">
            CPF / CNPJ
          </label>
          <input
            id="client-cpf-cnpj"
            type="text"
            required
            value={values.cpfCnpj}
            onChange={(event) => onChange({ ...values, cpfCnpj: event.target.value })}
            aria-label="CPF ou CNPJ do cliente"
            className="h-12 w-full rounded-xl border border-outline bg-surface-container-highest px-4 text-base font-semibold text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            placeholder="000.000.000-00"
          />
        </div>

        {suggestions.length > 0 && (
          <div className="rounded-xl border border-secondary/40 bg-secondary/10 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.12rem] text-secondary">
              Clientes encontrados
            </p>
            <ul className="space-y-2">
              {suggestions.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => onUseSuggestion(customer)}
                    className="flex min-h-11 w-full items-center justify-between rounded-lg bg-surface-container-highest px-3 py-2 text-left hover:bg-surface-container-high"
                    aria-label={`Usar cliente ${customer.name}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-on-surface">{customer.name}</span>
                      <span className="block truncate text-xs font-semibold text-on-surface-variant">{customer.cpfCnpj}</span>
                    </span>
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-secondary" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="client-phone" className="block text-xs font-bold uppercase tracking-[0.12rem] text-on-surface-variant">
            Telefone
          </label>
          <input
            id="client-phone"
            type="text"
            required
            value={values.phone}
            onChange={(event) => onChange({ ...values, phone: event.target.value })}
            aria-label="Telefone do cliente"
            className="h-12 w-full rounded-xl border border-outline bg-surface-container-highest px-4 text-base font-semibold text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            placeholder="(11) 99999-9999"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="client-address" className="block text-xs font-bold uppercase tracking-[0.12rem] text-on-surface-variant">
            Endereço Completo
          </label>
          <textarea
            id="client-address"
            required
            value={values.address}
            onChange={(event) => onChange({ ...values, address: event.target.value })}
            rows={3}
            aria-label="Endereço completo do cliente"
            className="w-full rounded-xl border border-outline bg-surface-container-highest p-4 text-base font-semibold text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
            placeholder="Rua, número, complemento, bairro, cidade - UF"
          />
        </div>

        {feedbackMessage && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-semibold ${
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

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="submit"
            disabled={isSubmitting}
            aria-label={mode === 'create' ? 'Cadastrar cliente' : 'Salvar alterações do cliente'}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl primary-gradient font-headline text-base font-black text-on-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {mode === 'create' ? <UserRound className="h-5 w-5" /> : <Save className="h-5 w-5" />}
            {isSubmitting ? 'Salvando...' : mode === 'create' ? 'Cadastrar Cliente' : 'Salvar Alterações'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancelar edição do cliente"
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-outline bg-surface-container-high text-base font-bold text-on-surface hover:bg-surface-container-highest"
          >
            <X className="h-5 w-5" />
            Cancelar
          </button>
        </div>
      </div>
    </form>
  );
}

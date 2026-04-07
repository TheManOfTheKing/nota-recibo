import { Pencil, Trash2, UserRound } from 'lucide-react';
import type { Customer } from '../../types';

interface CustomersListProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  searchTerm: string;
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  onSelectCustomer: (customer: Customer) => void;
  onCreateNew: () => void;
  onDeleteCustomer: (customer: Customer) => void;
}

export function CustomersList({
  customers,
  selectedCustomerId,
  searchTerm,
  isLoading,
  onSearchChange,
  onSelectCustomer,
  onCreateNew,
  onDeleteCustomer,
}: CustomersListProps) {
  return (
    <section className="rounded-2xl border border-outline-variant/30 bg-surface-container p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black tracking-wide text-on-surface">Clientes Cadastrados</h3>
        <button
          type="button"
          onClick={onCreateNew}
          className="rounded-lg border border-outline bg-surface-container-high px-3 py-2 text-xs font-bold uppercase tracking-widest text-on-surface hover:bg-surface-container-highest"
        >
          Novo
        </button>
      </div>

      <div className="mb-4">
        <label htmlFor="customers-search" className="mb-2 block text-xs font-bold uppercase tracking-[0.12rem] text-on-surface-variant">
          Buscar por nome ou CPF/CNPJ
        </label>
        <input
          id="customers-search"
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Digite para filtrar..."
          className="h-11 w-full rounded-xl border border-outline bg-surface-container-highest px-4 text-sm font-semibold text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none"
        />
      </div>

      {isLoading ? (
        <p className="py-6 text-center text-sm font-semibold text-on-surface-variant">Carregando clientes...</p>
      ) : customers.length === 0 ? (
        <p className="py-6 text-center text-sm font-semibold text-on-surface-variant">
          Nenhum cliente encontrado. Cadastre o primeiro cliente no formulário ao lado.
        </p>
      ) : (
        <ul className="space-y-3">
          {customers.map((customer) => {
            const isSelected = customer.id === selectedCustomerId;

            return (
              <li
                key={customer.id}
                className={`rounded-xl border p-4 transition-colors ${
                  isSelected
                    ? 'border-primary bg-surface-container-high'
                    : 'border-outline-variant/40 bg-surface-container-low hover:bg-surface-container-high'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(customer)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-label={`Selecionar cliente ${customer.name}`}
                  >
                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary/20">
                      <UserRound className="h-5 w-5 text-secondary" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-on-surface">{customer.name}</p>
                      <p className="truncate text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                        {customer.cpfCnpj}
                      </p>
                      <p className="truncate text-xs font-medium text-on-surface-variant">{customer.phone}</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(customer)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-surface-container-highest text-on-surface hover:text-primary"
                      aria-label={`Editar cliente ${customer.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteCustomer(customer)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-900/50 text-red-300 hover:bg-red-800"
                      aria-label={`Excluir cliente ${customer.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

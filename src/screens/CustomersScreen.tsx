import { useMemo, useState, type FormEvent } from 'react';
import { CustomerForm, type CustomerFormValues } from '../components/customers/CustomerForm';
import { CustomersList } from '../components/customers/CustomersList';
import type { Customer } from '../types';
import { toClientErrorMessage } from '../lib/clients';

interface CustomersScreenProps {
  customers: Customer[];
  isLoading: boolean;
  loadError: string | null;
  onCreateCustomer: (payload: {
    name: string;
    cpfCnpj: string;
    phone: string;
    address: string;
  }) => Promise<Customer>;
  onUpdateCustomer: (customerId: string, payload: {
    name: string;
    cpfCnpj: string;
    phone: string;
    address: string;
  }) => Promise<Customer>;
  onDeleteCustomer: (customer: Customer) => Promise<void>;
}

const EMPTY_FORM: CustomerFormValues = {
  name: '',
  cpfCnpj: '',
  phone: '',
  address: '',
};

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeDocument(value: string): string {
  return value.replace(/\D/g, '');
}

function toFormValues(customer: Customer): CustomerFormValues {
  return {
    name: customer.name,
    cpfCnpj: customer.cpfCnpj,
    phone: customer.phone,
    address: customer.address,
  };
}

function matchesCustomerQuery(customer: Customer, query: string): boolean {
  if (!query.trim()) {
    return true;
  }

  const textQuery = normalizeText(query);
  const docQuery = normalizeDocument(query);

  return (
    normalizeText(customer.name).includes(textQuery) ||
    normalizeText(customer.cpfCnpj).includes(textQuery) ||
    normalizeDocument(customer.cpfCnpj).includes(docQuery)
  );
}

export function CustomersScreen({
  customers,
  isLoading,
  loadError,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}: CustomersScreenProps) {
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [listSearchTerm, setListSearchTerm] = useState('');
  const [formValues, setFormValues] = useState<CustomerFormValues>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'error' | 'success'>('error');

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => matchesCustomerQuery(customer, listSearchTerm)),
    [customers, listSearchTerm],
  );

  const formSuggestionQuery = useMemo(() => {
    if (formValues.cpfCnpj.trim()) {
      return formValues.cpfCnpj.trim();
    }
    return formValues.name.trim();
  }, [formValues.cpfCnpj, formValues.name]);

  const formSuggestions = useMemo(() => {
    if (!formSuggestionQuery) {
      return [];
    }

    return customers
      .filter((customer) => matchesCustomerQuery(customer, formSuggestionQuery))
      .filter((customer) => customer.id !== selectedCustomerId)
      .slice(0, 5);
  }, [customers, formSuggestionQuery, selectedCustomerId]);

  const selectCustomerForEdit = (customer: Customer) => {
    setMode('edit');
    setSelectedCustomerId(customer.id);
    setFormValues(toFormValues(customer));
    setFeedbackMessage(null);
  };

  const resetToCreate = () => {
    setMode('create');
    setSelectedCustomerId(null);
    setFormValues(EMPTY_FORM);
    setFeedbackMessage(null);
  };

  const handleUseSuggestion = (customer: Customer) => {
    selectCustomerForEdit(customer);
    setFeedbackType('success');
    setFeedbackMessage('Cliente existente carregado para edição.');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = formValues.name.trim();
    const cpfCnpj = formValues.cpfCnpj.trim();
    const phone = formValues.phone.trim();
    const address = formValues.address.trim();

    if (!name || !cpfCnpj || !phone || !address) {
      setFeedbackType('error');
      setFeedbackMessage('Preencha nome, CPF/CNPJ, telefone e endereço.');
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      if (mode === 'create' || !selectedCustomer) {
        const created = await onCreateCustomer({
          name,
          cpfCnpj,
          phone,
          address,
        });
        selectCustomerForEdit(created);
        setFeedbackType('success');
        setFeedbackMessage('Cliente cadastrado com sucesso.');
      } else {
        const updated = await onUpdateCustomer(selectedCustomer.id, {
          name,
          cpfCnpj,
          phone,
          address,
        });
        selectCustomerForEdit(updated);
        setFeedbackType('success');
        setFeedbackMessage('Cliente atualizado com sucesso.');
      }
    } catch (error) {
      setFeedbackType('error');
      setFeedbackMessage(toClientErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (customer: Customer) => {
    const confirmed = window.confirm(`Deseja excluir o cliente "${customer.name}"?`);
    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      await onDeleteCustomer(customer);
      if (selectedCustomerId === customer.id) {
        resetToCreate();
      }
      setFeedbackType('success');
      setFeedbackMessage('Cliente excluído com sucesso.');
    } catch (error) {
      setFeedbackType('error');
      setFeedbackMessage(toClientErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-32 pt-24 sm:px-6">
      {loadError && (
        <div className="mb-4 rounded-xl border border-red-500/60 bg-red-950/50 px-4 py-3 text-sm font-semibold text-red-300">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <CustomerForm
          mode={mode}
          values={formValues}
          isSubmitting={isSubmitting}
          feedbackMessage={feedbackMessage}
          feedbackType={feedbackType}
          suggestions={formSuggestions}
          onChange={setFormValues}
          onSubmit={handleSubmit}
          onCancel={() => {
            if (selectedCustomer) {
              selectCustomerForEdit(selectedCustomer);
              return;
            }
            resetToCreate();
          }}
          onUseSuggestion={handleUseSuggestion}
        />

        <CustomersList
          customers={filteredCustomers}
          selectedCustomerId={selectedCustomerId}
          searchTerm={listSearchTerm}
          isLoading={isLoading}
          onSearchChange={setListSearchTerm}
          onSelectCustomer={selectCustomerForEdit}
          onCreateNew={resetToCreate}
          onDeleteCustomer={handleDelete}
        />
      </div>
    </main>
  );
}

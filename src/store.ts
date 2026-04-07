import { useState, useEffect } from 'react';
import { Customer, DocumentRecord, TabType } from './types';

export function useAppStore() {
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('customers');
    return saved ? JSON.parse(saved) : [];
  });

  const [history, setHistory] = useState<DocumentRecord[]>(() => {
    const saved = localStorage.getItem('history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history));
  }, [history]);

  const addCustomer = (customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
  };

  const updateCustomer = (customer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
  };

  const addDocument = (doc: DocumentRecord) => {
    setHistory(prev => [doc, ...prev]);
  };

  return {
    activeTab,
    setActiveTab,
    customers,
    addCustomer,
    updateCustomer,
    history,
    addDocument
  };
}

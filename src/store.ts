import { useState, useEffect } from 'react';
import { Customer, IssuerProfile, DocumentRecord, TabType } from './types';

export function useAppStore() {
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('customers');
    return saved ? JSON.parse(saved) : [];
  });

  const [profiles, setProfiles] = useState<IssuerProfile[]>(() => {
    const saved = localStorage.getItem('profiles');
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
    localStorage.setItem('profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history));
  }, [history]);

  const addCustomer = (customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
  };

  const updateCustomer = (customer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === customer.id ? customer : c));
  };

  const addProfile = (profile: IssuerProfile) => {
    if (profile.isDefault) {
      setProfiles(prev => prev.map(p => ({ ...p, isDefault: false })).concat(profile));
    } else {
      setProfiles(prev => [...prev, profile]);
    }
  };

  const updateProfile = (profile: IssuerProfile) => {
    if (profile.isDefault) {
      setProfiles(prev => prev.map(p => p.id === profile.id ? profile : { ...p, isDefault: false }));
    } else {
      setProfiles(prev => prev.map(p => p.id === profile.id ? profile : p));
    }
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
    profiles,
    addProfile,
    updateProfile,
    history,
    addDocument
  };
}

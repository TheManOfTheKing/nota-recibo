import { useState, useEffect } from 'react';
import { DocumentRecord, TabType } from './types';

export function useAppStore() {
  const [activeTab, setActiveTab] = useState<TabType>('generate');

  const [history, setHistory] = useState<DocumentRecord[]>(() => {
    const saved = localStorage.getItem('history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('history', JSON.stringify(history));
  }, [history]);

  const addDocument = (doc: DocumentRecord) => {
    setHistory(prev => [doc, ...prev]);
  };

  return {
    activeTab,
    setActiveTab,
    history,
    addDocument
  };
}

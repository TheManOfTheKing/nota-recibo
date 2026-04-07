import { useState, useEffect } from 'react';
import { DocumentRecord, TabType } from './types';

function readHistoryFromStorage(): DocumentRecord[] {
  try {
    const saved = localStorage.getItem('history');
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as DocumentRecord[]) : [];
  } catch {
    return [];
  }
}

export function useAppStore() {
  const [activeTab, setActiveTab] = useState<TabType>('generate');

  const [history, setHistory] = useState<DocumentRecord[]>(readHistoryFromStorage);

  useEffect(() => {
    try {
      localStorage.setItem('history', JSON.stringify(history));
    } catch {
      // Fallback to in-memory state when browser storage is unavailable.
    }
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

export interface Customer {
  id: string;
  userId: string;
  name: string;
  cpfCnpj: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
}

export interface Emitter {
  id: string;
  userId: string;
  name: string;
  cnpjCpf: string;
  address: string;
  logoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  type: 'receipt' | 'promissory_note';
  customerId: string;
  customerName: string;
  clientAddress: string;
  amount: number;
  date: string;
  dueDate?: string;
  description: string;
  status: 'pending' | 'paid' | 'cancelled';
  issuerId: string;
  pdfUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type TabType = 'generate' | 'customers' | 'history' | 'issuer';

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  role: UserRole;
}


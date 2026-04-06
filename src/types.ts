export interface Customer {
  id: string;
  name: string;
  document: string; // CPF or CNPJ
  phone: string;
  address: string;
  createdAt: string;
}

export interface IssuerProfile {
  id: string;
  name: string;
  document: string;
  address: string;
  logoUrl?: string;
  isDefault: boolean;
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
  status: 'PAGO' | 'EMITIDO' | 'PROCESSADO';
  issuerId: string;
}

export type TabType = 'generate' | 'customers' | 'history' | 'issuer';


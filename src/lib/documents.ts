import { supabase } from './supabase';
import { generatePromissoryNotePdfBlob, generateReceiptPdfBlob } from '../services/pdfService';
import type { Customer, DocumentRecord, Emitter } from '../types';

interface DocumentRow {
  id: string;
  document_type: 'receipt' | 'promissory_note';
  client_id: string | null;
  emitter_id: string | null;
  issue_date: string;
  amount: number;
  description: string | null;
  due_date: string | null;
  status: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateReceiptDocumentInput {
  userId: string;
  emitter: Emitter;
  customer: Customer;
  amount: number;
  description: string;
  issueDate?: Date;
}

interface CreatePromissoryNoteDocumentInput {
  userId: string;
  emitter: Emitter;
  customer: Customer;
  amount: number;
  description: string;
  dueDate: Date;
  status: DocumentRecord['status'];
  issueDate?: Date;
}

const DOCUMENTS_BUCKET = 'documents-pdfs';
const DOCUMENT_COLUMNS =
  'id, document_type, client_id, emitter_id, issue_date, amount, description, due_date, status, pdf_url, created_at, updated_at';
const documentsTable = () => supabase.schema('public').from('documents');

function sanitizeFileName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function formatDateForDb(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForUi(dateIso: string): string {
  const [year, month, day] = dateIso.split('-');
  if (!year || !month || !day) {
    return dateIso;
  }
  return `${day}/${month}/${year}`;
}

function normalizeStatus(value: string | null): DocumentRecord['status'] {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'paid' || normalized === 'cancelled') {
    return normalized;
  }

  if (value === 'PAGO' || value === 'PROCESSADO') {
    return 'paid';
  }

  if (value === 'EMITIDO') {
    return 'pending';
  }

  return 'pending';
}

function mapDocumentRowToRecord(row: DocumentRow, customer: Customer): DocumentRecord {
  return {
    id: row.id,
    type: row.document_type,
    customerId: row.client_id ?? customer.id,
    customerName: customer.name,
    clientAddress: customer.address,
    amount: Number(row.amount),
    date: formatDateForUi(row.issue_date),
    dueDate: row.due_date ? formatDateForUi(row.due_date) : undefined,
    description: row.description ?? '',
    status: normalizeStatus(row.status),
    issuerId: row.emitter_id ?? '',
    pdfUrl: row.pdf_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function generateReceiptNumber(issueDate: Date): string {
  const stamp = `${issueDate.getFullYear()}${String(issueDate.getMonth() + 1).padStart(2, '0')}${String(issueDate.getDate()).padStart(2, '0')}`;
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${stamp}-${random}`;
}

function generatePromissoryNoteNumber(issueDate: Date): string {
  const stamp = `${issueDate.getFullYear()}${String(issueDate.getMonth() + 1).padStart(2, '0')}${String(issueDate.getDate()).padStart(2, '0')}`;
  const random = Math.floor(10000 + Math.random() * 90000);
  return `NP-${stamp}-${random}`;
}

async function uploadDocumentPdf(
  userId: string,
  folder: 'receipts' | 'promissory-notes',
  customer: Customer,
  pdfBlob: Blob,
  issueDate: Date,
): Promise<string> {
  const safeCustomerName = sanitizeFileName(customer.name || 'cliente');
  const path = `${userId}/${folder}/${formatDateForDb(issueDate)}-${Date.now()}-${safeCustomerName}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, pdfBlob, { upsert: true, contentType: 'application/pdf' });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(DOCUMENTS_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error('Não foi possível obter a URL pública do PDF.');
  }

  return data.publicUrl;
}

export async function createReceiptDocument(input: CreateReceiptDocumentInput): Promise<DocumentRecord> {
  const issueDate = input.issueDate ?? new Date();
  const receiptNumber = generateReceiptNumber(issueDate);

  const pdfBlob = await generateReceiptPdfBlob({
    emitter: input.emitter,
    customer: input.customer,
    amount: input.amount,
    description: input.description,
    receiptNumber,
    issueDate,
  });

  const pdfUrl = await uploadDocumentPdf(input.userId, 'receipts', input.customer, pdfBlob, issueDate);

  const { data, error } = await documentsTable()
    .insert({
      user_id: input.userId,
      emitter_id: input.emitter.id,
      client_id: input.customer.id,
      document_type: 'receipt',
      issue_date: formatDateForDb(issueDate),
      amount: input.amount,
      description: input.description,
      pdf_url: pdfUrl,
      status: 'paid',
    })
    .select(DOCUMENT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapDocumentRowToRecord(data as DocumentRow, input.customer);
}

export async function createPromissoryNoteDocument(
  input: CreatePromissoryNoteDocumentInput,
): Promise<DocumentRecord> {
  const issueDate = input.issueDate ?? new Date();
  const noteNumber = generatePromissoryNoteNumber(issueDate);

  const pdfBlob = await generatePromissoryNotePdfBlob({
    emitter: input.emitter,
    customer: input.customer,
    amount: input.amount,
    description: input.description,
    noteNumber,
    issueDate,
    dueDate: input.dueDate,
    status: input.status,
  });

  const pdfUrl = await uploadDocumentPdf(input.userId, 'promissory-notes', input.customer, pdfBlob, issueDate);

  const { data, error } = await documentsTable()
    .insert({
      user_id: input.userId,
      emitter_id: input.emitter.id,
      client_id: input.customer.id,
      document_type: 'promissory_note',
      issue_date: formatDateForDb(issueDate),
      amount: input.amount,
      description: input.description,
      due_date: formatDateForDb(input.dueDate),
      status: input.status,
      pdf_url: pdfUrl,
    })
    .select(DOCUMENT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapDocumentRowToRecord(data as DocumentRow, input.customer);
}

export function toDocumentErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    const message = error.message.toLowerCase();
    if (message.includes('bucket') && message.includes('not found')) {
      return 'Bucket de PDFs não encontrado. Crie o bucket "documents-pdfs" no Supabase Storage.';
    }
    return error.message;
  }

  return 'Não foi possível gerar e salvar o documento. Tente novamente.';
}

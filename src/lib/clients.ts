import { supabase } from './supabase';
import type { Customer } from '../types';

export interface UpsertClientInput {
  name: string;
  cpfCnpj: string;
  phone: string;
  address: string;
}

interface ClientRow {
  id: string;
  user_id: string;
  name: string;
  cpf_cnpj: string;
  phone: string | null;
  address: string;
  created_at: string;
  updated_at: string;
}

const CLIENT_COLUMNS = 'id, user_id, name, cpf_cnpj, phone, address, created_at, updated_at';
const clientsTable = () => supabase.schema('public').from('clients');

function mapClient(row: ClientRow): Customer {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    cpfCnpj: row.cpf_cnpj,
    phone: row.phone ?? '',
    address: row.address,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listClients(userId: string): Promise<Customer[]> {
  const { data, error } = await clientsTable()
    .select(CLIENT_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as ClientRow[]).map(mapClient);
}

export async function createClient(userId: string, payload: UpsertClientInput): Promise<Customer> {
  const { data, error } = await clientsTable()
    .insert({
      user_id: userId,
      name: payload.name,
      cpf_cnpj: payload.cpfCnpj,
      phone: payload.phone,
      address: payload.address,
    })
    .select(CLIENT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapClient(data as ClientRow);
}

export async function updateClient(
  userId: string,
  clientId: string,
  payload: UpsertClientInput,
): Promise<Customer> {
  const { data, error } = await clientsTable()
    .update({
      name: payload.name,
      cpf_cnpj: payload.cpfCnpj,
      phone: payload.phone,
      address: payload.address,
    })
    .eq('id', clientId)
    .eq('user_id', userId)
    .select(CLIENT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapClient(data as ClientRow);
}

export async function deleteClient(userId: string, clientId: string): Promise<void> {
  const { error } = await clientsTable()
    .delete()
    .eq('id', clientId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export function toClientErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Não foi possível concluir a operação de cliente. Tente novamente.';
}

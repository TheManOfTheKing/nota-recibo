import { supabase } from './supabase';
import type { ManagedUser, UserRole } from '../types';

interface ProfileRow {
  id: string;
  email: string | null;
  role: UserRole;
  approval_status: 'pending' | 'approved';
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

const PROFILE_COLUMNS = 'id, email, role, approval_status, created_at, approved_at, approved_by';
const profilesTable = () => supabase.schema('public').from('profiles');

function mapProfileRow(row: ProfileRow): ManagedUser {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    approvalStatus: row.approval_status,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
  };
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  const { data, error } = await profilesTable().select(PROFILE_COLUMNS).order('created_at', { ascending: false });
  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapProfileRow(row as ProfileRow));
}

export async function approveUser(targetUserId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.rpc('admin_approve_user', {
    target_user_id: targetUserId,
    target_role: role,
  });
  if (error) {
    throw error;
  }
}

export async function updateUserRole(targetUserId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.rpc('admin_update_user_role', {
    target_user_id: targetUserId,
    target_role: role,
  });
  if (error) {
    throw error;
  }
}

export async function rejectAndRemoveUser(targetUserId: string): Promise<void> {
  const { error } = await supabase.rpc('admin_reject_and_remove_user', {
    target_user_id: targetUserId,
  });
  if (error) {
    throw error;
  }
}

export function toAdminUsersErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    const message = error.message.toLowerCase();
    if (message.includes('only admin users')) {
      return 'Apenas administradores podem gerenciar usuários.';
    }
    if (message.includes('at least one approved admin must remain')) {
      return 'Não é permitido remover ou rebaixar o último administrador aprovado.';
    }
    if (message.includes('cannot remove your own account')) {
      return 'Você não pode remover a própria conta.';
    }
    if (message.includes('cannot demote yourself')) {
      return 'Você não pode rebaixar sua própria conta de administrador.';
    }
    return error.message;
  }

  return 'Não foi possível gerenciar o usuário. Tente novamente.';
}

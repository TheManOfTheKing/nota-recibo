import type { AuthError, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { UserProfile, UserRole } from '../types';

interface AuthCredentials {
  email: string;
  password: string;
}

interface SignUpResult {
  requiresEmailConfirmation: boolean;
}

const PROFILE_COLUMNS = 'id, role';

function normalizeProfile(data: unknown): UserProfile {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid profile payload received from Supabase.');
  }

  const maybeProfile = data as Record<string, unknown>;
  const role = maybeProfile.role;

  if (role !== 'admin' && role !== 'user') {
    throw new Error('Invalid user role in profiles table.');
  }

  if (typeof maybeProfile.id !== 'string') {
    throw new Error('Invalid profile id in profiles table.');
  }

  return {
    id: maybeProfile.id,
    role,
  };
}

async function getProfileById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeProfile(data);
}

async function countProfiles(): Promise<number> {
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { head: true, count: 'exact' });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function createProfile(userId: string, role: UserRole): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, role })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') {
      const existing = await getProfileById(userId);
      if (existing) {
        return existing;
      }
    }
    throw error;
  }

  return normalizeProfile(data);
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const existing = await getProfileById(user.id);
  if (existing) {
    return existing;
  }

  const totalProfiles = await countProfiles();
  const role: UserRole = totalProfiles === 0 ? 'admin' : 'user';
  return createProfile(user.id, role);
}

export async function signInWithPassword(credentials: AuthCredentials): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    throw error;
  }

  if (data.user) {
    await ensureUserProfile(data.user);
  }
}

export async function signUpWithPassword(credentials: AuthCredentials): Promise<SignUpResult> {
  const { data, error } = await supabase.auth.signUp(credentials);
  if (error) {
    throw error;
  }

  const user = data.user;
  const session = data.session;

  if (user && session) {
    await ensureUserProfile(user);
  }

  return {
    requiresEmailConfirmation: Boolean(user) && !session,
  };
}

export async function signOutCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function promoteUserToAdmin(currentUserId: string, targetUserId: string): Promise<void> {
  const currentUserProfile = await getProfileById(currentUserId);
  if (!currentUserProfile || currentUserProfile.role !== 'admin') {
    throw new Error('Only admin users can promote other users.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', targetUserId);

  if (error) {
    throw error;
  }
}

export function toAuthErrorMessage(error: unknown): string {
  if (!error) {
    return 'Falha de autenticação. Tente novamente.';
  }

  const maybeAuthError = error as Partial<AuthError> & { message?: string };
  if (typeof maybeAuthError.message === 'string' && maybeAuthError.message.trim().length > 0) {
    return maybeAuthError.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Falha de autenticação. Tente novamente.';
}

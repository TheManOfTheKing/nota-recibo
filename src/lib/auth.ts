import type { AuthError, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { UserProfile } from '../types';

interface AuthCredentials {
  email: string;
  password: string;
}

interface SignUpResult {
  requiresEmailConfirmation: boolean;
}

interface ProfileRow {
  id: string;
  email: string | null;
  role: 'admin' | 'user';
  approval_status: 'pending' | 'approved';
}

const PROFILE_COLUMNS = 'id, email, role, approval_status';
const profilesTable = () => supabase.schema('public').from('profiles');

function normalizeProfile(data: unknown): UserProfile {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid profile payload received from Supabase.');
  }

  const maybeProfile = data as Record<string, unknown>;
  const role = maybeProfile.role;
  const approvalStatus = maybeProfile.approval_status;
  const email = maybeProfile.email;

  if (role !== 'admin' && role !== 'user') {
    throw new Error('Invalid user role in profiles table.');
  }

  if (approvalStatus !== 'pending' && approvalStatus !== 'approved') {
    throw new Error('Invalid approval status in profiles table.');
  }

  if (email !== null && typeof email !== 'string') {
    throw new Error('Invalid profile e-mail in profiles table.');
  }

  if (typeof maybeProfile.id !== 'string') {
    throw new Error('Invalid profile id in profiles table.');
  }

  const normalizedEmail: string | null = email === null ? null : (email as string);

  return {
    id: maybeProfile.id,
    email: normalizedEmail,
    role,
    approvalStatus,
  };
}

async function getProfileById(userId: string): Promise<UserProfile | null> {
  const { data, error } = await profilesTable()
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

async function createFallbackProfile(user: User): Promise<UserProfile> {
  const { data, error } = await profilesTable()
    .insert({ id: user.id, email: user.email ?? null })
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    if (error.code === '23505') {
      const existing = await getProfileById(user.id);
      if (existing) {
        return existing;
      }
    }
    throw error;
  }

  return normalizeProfile(data as ProfileRow);
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const existing = await getProfileById(user.id);
  if (existing) {
    return existing;
  }

  return createFallbackProfile(user);
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

  if (data.user && data.session) {
    await ensureUserProfile(data.user);
  }

  return {
    requiresEmailConfirmation: Boolean(data.user) && !data.session,
  };
}

export async function signOutCurrentUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
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

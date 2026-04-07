import { createClient } from '@supabase/supabase-js';

function extractSupabaseUrl(rawValue: string | undefined): string {
  if (!rawValue) {
    return '';
  }

  const normalized = rawValue.replace(/[\r\n\t]+/g, ' ').trim();
  const urlMatch = normalized.match(/https?:\/\/[^\s"'\\]+/i);
  return (urlMatch?.[0] ?? normalized).trim();
}

function extractSupabaseAnonKey(rawValue: string | undefined): string {
  if (!rawValue) {
    return '';
  }

  const normalized = rawValue.replace(/[\r\n\t]+/g, ' ').trim();
  const jwtMatch = normalized.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);

  if (jwtMatch?.[0]) {
    return jwtMatch[0];
  }

  return normalized.replace(/^[\s"'\\]+|[\s"'\\]+$/g, '');
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:';
  } catch {
    return false;
  }
}

const supabaseUrl = extractSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = extractSupabaseAnonKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

if (!supabaseUrl) {
  throw new Error('Missing environment variable: VITE_SUPABASE_URL');
}

if (!isValidHttpUrl(supabaseUrl)) {
  throw new Error('Invalid environment variable: VITE_SUPABASE_URL must be a valid HTTP or HTTPS URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

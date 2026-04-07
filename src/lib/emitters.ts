import { supabase } from './supabase';
import type { Emitter } from '../types';

export interface UpsertEmitterInput {
  name: string;
  cnpjCpf: string;
  address: string;
  logoFile?: File | null;
  removeLogo?: boolean;
}

interface EmitterRow {
  id: string;
  user_id: string;
  name: string;
  cnpj_cpf: string;
  address: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

const EMITTER_COLUMNS = 'id, user_id, name, cnpj_cpf, address, logo_url, created_at, updated_at';
const EMITTER_LOGOS_BUCKET = 'emitters-logos';
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
const LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']);

const emittersTable = () => supabase.schema('public').from('emitters');

function mapEmitter(row: EmitterRow): Emitter {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    cnpjCpf: row.cnpj_cpf,
    address: row.address,
    logoUrl: row.logo_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-');
}

function ensureLogoFile(file: File): void {
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new Error('O logotipo deve ter no máximo 2MB.');
  }

  if (!LOGO_MIME_TYPES.has(file.type)) {
    throw new Error('Formato de logotipo inválido. Use PNG, JPG, SVG ou WEBP.');
  }
}

function extractLogoPathFromPublicUrl(url: string): string | null {
  const marker = `/object/public/${EMITTER_LOGOS_BUCKET}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const storagePath = url.slice(markerIndex + marker.length);
  if (!storagePath) {
    return null;
  }

  return decodeURIComponent(storagePath);
}

async function removeLogoFromStorageByUrl(url: string | null | undefined): Promise<void> {
  if (!url) {
    return;
  }

  const path = extractLogoPathFromPublicUrl(url);
  if (!path) {
    return;
  }

  await supabase.storage.from(EMITTER_LOGOS_BUCKET).remove([path]);
}

async function uploadEmitterLogo(userId: string, emitterId: string, file: File): Promise<string> {
  ensureLogoFile(file);

  const safeName = sanitizeFileName(file.name || 'logo');
  const extension = safeName.includes('.') ? '' : '.png';
  const path = `${userId}/${emitterId}/${Date.now()}-${safeName}${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(EMITTER_LOGOS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage.from(EMITTER_LOGOS_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error('Não foi possível obter a URL pública do logotipo.');
  }

  return data.publicUrl;
}

export async function listEmitters(userId: string): Promise<Emitter[]> {
  const { data, error } = await emittersTable()
    .select(EMITTER_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as EmitterRow[]).map(mapEmitter);
}

export async function createEmitter(userId: string, payload: UpsertEmitterInput): Promise<Emitter> {
  const { data, error } = await emittersTable()
    .insert({
      user_id: userId,
      name: payload.name,
      cnpj_cpf: payload.cnpjCpf,
      address: payload.address,
      logo_url: null,
    })
    .select(EMITTER_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  const created = mapEmitter(data as EmitterRow);

  if (!payload.logoFile) {
    return created;
  }

  const logoUrl = await uploadEmitterLogo(userId, created.id, payload.logoFile);

  const { data: updatedData, error: updateError } = await emittersTable()
    .update({ logo_url: logoUrl })
    .eq('id', created.id)
    .eq('user_id', userId)
    .select(EMITTER_COLUMNS)
    .single();

  if (updateError) {
    throw updateError;
  }

  return mapEmitter(updatedData as EmitterRow);
}

export async function updateEmitter(
  userId: string,
  emitterId: string,
  payload: UpsertEmitterInput,
): Promise<Emitter> {
  const { data: currentData, error: fetchError } = await emittersTable()
    .select(EMITTER_COLUMNS)
    .eq('id', emitterId)
    .eq('user_id', userId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  const current = mapEmitter(currentData as EmitterRow);
  let nextLogoUrl = current.logoUrl ?? null;

  if (payload.removeLogo) {
    await removeLogoFromStorageByUrl(nextLogoUrl);
    nextLogoUrl = null;
  }

  if (payload.logoFile) {
    const uploadedLogoUrl = await uploadEmitterLogo(userId, emitterId, payload.logoFile);
    await removeLogoFromStorageByUrl(nextLogoUrl);
    nextLogoUrl = uploadedLogoUrl;
  }

  const { data, error } = await emittersTable()
    .update({
      name: payload.name,
      cnpj_cpf: payload.cnpjCpf,
      address: payload.address,
      logo_url: nextLogoUrl,
    })
    .eq('id', emitterId)
    .eq('user_id', userId)
    .select(EMITTER_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return mapEmitter(data as EmitterRow);
}

export async function deleteEmitter(userId: string, emitter: Emitter): Promise<void> {
  await removeLogoFromStorageByUrl(emitter.logoUrl);

  const { error } = await emittersTable()
    .delete()
    .eq('id', emitter.id)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export function toEmitterErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    const lower = error.message.toLowerCase();
    if (lower.includes('bucket') && lower.includes('not found')) {
      return 'Bucket de logotipos não encontrado. Crie o bucket "emitters-logos" no Supabase Storage e permita upload para usuários autenticados.';
    }
    return error.message;
  }

  return 'Não foi possível concluir a operação de emissor. Tente novamente.';
}

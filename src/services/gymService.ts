import { supabase } from '../lib/supabase';
import type { ServiceResult } from './userService';
import type { Rutina, RutinaDivision, RutinaSport } from '../types/gym';

const BUCKET = 'gym-rutinas';

export async function getRutinas(): Promise<ServiceResult<Rutina[]>> {
  const { data, error } = await supabase
    .from('gym_rutinas')
    .select('*')
    .order('fecha', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: (data as Rutina[]) ?? [], error: null };
}

export async function getRutinaById(id: string): Promise<ServiceResult<Rutina>> {
  const { data, error } = await supabase.from('gym_rutinas').select('*').eq('id', id).single();
  if (error) return { data: null, error: error.message };
  return { data: data as Rutina, error: null };
}

export async function getRutinaSignedUrl(pdfPath: string): Promise<ServiceResult<string>> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pdfPath, 60 * 60);
  if (error) return { data: null, error: error.message };
  return { data: data?.signedUrl ?? null, error: null };
}

interface CreateRutinaInput {
  nombre: string;
  descripcion: string;
  fecha: string | null;
  sport: RutinaSport;
  division: RutinaDivision;
  createdBy: string;
  file: File;
}

export async function createRutina(input: CreateRutinaInput): Promise<ServiceResult<Rutina>> {
  const { nombre, descripcion, fecha, sport, division, createdBy, file } = input;
  const path = `${createdBy}/${Date.now()}.pdf`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf' });
  if (upErr) return { data: null, error: upErr.message };

  const { data, error } = await supabase
    .from('gym_rutinas')
    .insert({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      fecha,
      sport,
      division,
      pdf_path: path,
      created_by: createdBy,
    })
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { data: null, error: error.message };
  }
  return { data: data as Rutina, error: null };
}

interface UpdateRutinaInput {
  nombre: string;
  descripcion: string;
  fecha: string | null;
  sport: RutinaSport;
  division: RutinaDivision;
  createdBy: string;
  oldPdfPath: string;
  file?: File | null;
}

export async function updateRutina(id: string, input: UpdateRutinaInput): Promise<ServiceResult<Rutina>> {
  const fields: Record<string, unknown> = {
    nombre: input.nombre.trim(),
    descripcion: input.descripcion.trim() || null,
    fecha: input.fecha,
    sport: input.sport,
    division: input.division,
  };

  let newPath: string | null = null;
  if (input.file) {
    newPath = `${input.createdBy}/${Date.now()}.pdf`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(newPath, input.file, { contentType: 'application/pdf' });
    if (upErr) return { data: null, error: upErr.message };
    fields.pdf_path = newPath;
  }

  const { data, error } = await supabase.from('gym_rutinas').update(fields).eq('id', id).select('*').single();

  if (error) {
    if (newPath) await supabase.storage.from(BUCKET).remove([newPath]);
    return { data: null, error: error.message };
  }

  if (newPath && input.oldPdfPath && input.oldPdfPath !== newPath) {
    await supabase.storage.from(BUCKET).remove([input.oldPdfPath]);
  }
  return { data: data as Rutina, error: null };
}

export async function deleteRutina(id: string, pdfPath: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('gym_rutinas').delete().eq('id', id);
  if (error) return { error: error.message };
  if (pdfPath) await supabase.storage.from(BUCKET).remove([pdfPath]);
  return { error: null };
}

export async function uploadIfPresent(supabase: any, file: FormDataEntryValue | null, folder: string) {
  if (!file || !(file instanceof File) || file.size === 0) return null;
  const ext = file.name.split('.').pop();
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('fleet-files').upload(path, file, { upsert: false });
  if (error) throw new Error('No se pudo subir el archivo: ' + error.message);
  const { data } = supabase.storage.from('fleet-files').getPublicUrl(path);
  return data.publicUrl as string;
}

/** Borra del almacenamiento el archivo anterior cuando se reemplaza por uno nuevo */
export async function deleteOldFile(supabase: any, oldUrl: string | null) {
  if (!oldUrl) return;
  const marker = '/fleet-files/';
  const idx = oldUrl.indexOf(marker);
  if (idx === -1) return;
  const path = oldUrl.slice(idx + marker.length);
  await supabase.storage.from('fleet-files').remove([path]);
}

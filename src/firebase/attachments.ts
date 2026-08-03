import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from './config';
import type { Attachment } from '../types';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function uploadAttachment(ticketId: string, file: File): Promise<Attachment> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Súbor "${file.name}" presahuje limit 50 MB.`);
  }
  const path = `tickets/${ticketId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  try {
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    return { name: file.name, url, size: file.size, contentType: file.type || 'application/octet-stream' };
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    if (code.startsWith('storage/')) {
      throw new Error(
        'Nahrávanie súborov nie je nastavené (Firebase Storage nie je zapnutý pre tento projekt). Kontaktujte administrátora.',
      );
    }
    throw err;
  }
}

export async function uploadAttachments(ticketId: string, files: File[]): Promise<Attachment[]> {
  return Promise.all(files.map((f) => uploadAttachment(ticketId, f)));
}

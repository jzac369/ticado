import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import type { Attachment } from '../types';

/** Firebase Storage isn't enabled on this project (Spark plan can't
 * provision a bucket at all since Oct 2024), so attachment content is
 * base64-encoded and stored directly as a Firestore document instead.
 * Firestore caps a document at 1 MiB; base64 adds ~33% overhead, so the
 * raw file must stay well under that after encoding. */
const MAX_FILE_SIZE = 700 * 1024;

const ATTACHMENT_URL_PREFIX = 'fsblob://';

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Čítanie súboru zlyhalo.'));
    reader.readAsDataURL(file);
  });
}

/** Which upload path this came from, so Firestore rules can apply the same
 * per-path trust level the old storage.rules used (public ticket/live-chat
 * uploads vs. signed-in-only internal messaging). Inferred from the id
 * prefix each caller already passes (see tickets.ts, LiveChatWidget,
 * LiveChatInbox, Messages.tsx). */
function inferKind(scopeId: string): 'ticket' | 'livechat' | 'conversation' {
  if (scopeId.startsWith('livechat-')) return 'livechat';
  if (scopeId.startsWith('conversations/')) return 'conversation';
  return 'ticket';
}

const blobsCol = collection(db, 'attachmentBlobs');

export async function uploadAttachment(scopeId: string, file: File): Promise<Attachment> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Súbor "${file.name}" presahuje limit ${Math.round(MAX_FILE_SIZE / 1024)} KB (súbory sa ukladajú priamo v databáze).`);
  }
  const data = await readAsBase64(file);
  const contentType = file.type || 'application/octet-stream';
  const ref = await addDoc(blobsCol, {
    data,
    name: file.name,
    size: file.size,
    contentType,
    kind: inferKind(scopeId),
    createdAt: serverTimestamp(),
  });
  return { name: file.name, url: `${ATTACHMENT_URL_PREFIX}${ref.id}`, size: file.size, contentType };
}

export async function uploadAttachments(scopeId: string, files: File[]): Promise<Attachment[]> {
  return Promise.all(files.map((f) => uploadAttachment(scopeId, f)));
}

/** Resolves an Attachment's `url` into something a browser can actually
 * open/download: a real URL is passed through unchanged (legacy Storage
 * attachments, if any survive from before Storage was disabled), while an
 * `fsblob://` reference is fetched and turned into a `data:` URI. */
export async function resolveAttachmentUrl(url: string): Promise<string> {
  if (!url.startsWith(ATTACHMENT_URL_PREFIX)) return url;
  const id = url.slice(ATTACHMENT_URL_PREFIX.length);
  const snap = await getDoc(doc(db, 'attachmentBlobs', id));
  if (!snap.exists()) throw new Error('Príloha už nie je dostupná.');
  const { data, contentType } = snap.data() as { data: string; contentType: string };
  return `data:${contentType};base64,${data}`;
}

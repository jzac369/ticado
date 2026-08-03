import { deleteApp, getApps, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db, app } from './config';
import type { Colleague } from '../types';

const usersCol = collection(db, 'users');

export function subscribeColleagues(customerId: string, callback: (colleagues: Colleague[]) => void) {
  const q = query(usersCol, where('customerId', '==', customerId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Colleague));
  });
}

export interface NewColleagueInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  customerId: string;
  customerName: string;
}

/**
 * Creates the colleague's Firebase Auth account on a temporary secondary app
 * instance so the admin creating it stays signed in on the primary app.
 */
export async function createColleague(input: NewColleagueInput) {
  const secondaryName = `colleague-creation-${Date.now()}`;
  const secondaryApp = initializeApp(app.options, secondaryName);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credential = await createUserWithEmailAndPassword(secondaryAuth, input.email, input.password);
    const uid = credential.user.uid;

    await setDoc(doc(db, 'users', uid), {
      uid,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? '',
      role: 'klient',
      customerId: input.customerId,
      customerName: input.customerName,
      active: true,
      createdAt: serverTimestamp(),
    });

    await signOut(secondaryAuth);
    return uid;
  } finally {
    const existing = getApps().find((a) => a.name === secondaryName);
    if (existing) await deleteApp(existing);
  }
}

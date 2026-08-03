import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import type { Customer } from '../types';

const customersCol = collection(db, 'customers');

export function subscribeCustomers(callback: (customers: Customer[]) => void) {
  const q = query(customersCol, orderBy('name', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer));
  });
}

export function subscribeCustomer(customerId: string, callback: (customer: Customer | null) => void) {
  return onSnapshot(doc(db, 'customers', customerId), (snap) => {
    callback(snap.exists() ? ({ id: snap.id, ...snap.data() } as Customer) : null);
  });
}

export async function createCustomer(input: Omit<Customer, 'id' | 'createdAt'>) {
  return addDoc(customersCol, { ...input, createdAt: serverTimestamp() });
}

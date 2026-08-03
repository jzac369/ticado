import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
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

export async function updateCustomer(customerId: string, input: Partial<Omit<Customer, 'id' | 'createdAt'>>) {
  return updateDoc(doc(db, 'customers', customerId), input);
}

export async function deleteCustomer(customerId: string) {
  return deleteDoc(doc(db, 'customers', customerId));
}

// Seeds Firestore with sample customers and tickets for local/testing use.
// Usage: place your Firebase service account key at scripts/serviceAccountKey.json, then:
//   node scripts/seed.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = join(__dirname, 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
} catch {
  console.error(
    `Chýba scripts/serviceAccountKey.json. Stiahnite ho vo Firebase Console -> Project settings -> Service accounts -> Generate new private key.`,
  );
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const customers = [
  { name: 'RONA s.r.o.', contactPerson: 'Andrej Strecansky', email: 'andrej@rona.sk' },
  { name: 'Alfa Trade a.s.', contactPerson: 'Miroslav Zachar', email: 'miroslav@alfatrade.sk' },
];

const priorities = ['nizka', 'normalna', 'vysoka', 'kriticka'];
const statuses = ['otvoreny', 'v_rieseni', 'caka_na_klienta', 'uzavrety'];
const categories = ['Infra', 'Security', 'Sieť', 'Backup', 'Aplikácie'];

async function seed() {
  console.log('Seedujem zákazníkov...');
  const customerRefs = [];
  for (const c of customers) {
    const ref = await db.collection('customers').add({ ...c, createdAt: Timestamp.now() });
    customerRefs.push({ id: ref.id, ...c });
  }

  console.log('Seedujem tickety...');
  const counterRef = db.doc('meta/ticketCounter');
  let counter = 1680;

  for (let i = 0; i < 15; i++) {
    counter += 1;
    const customer = customerRefs[i % customerRefs.length];
    const priority = priorities[i % priorities.length];
    const status = statuses[i % statuses.length];
    const createdAt = Timestamp.fromMillis(Date.now() - i * 6 * 60 * 60 * 1000);

    const ticketRef = await db.collection('tickets').add({
      code: `TKT${String(counter).padStart(6, '0')}`,
      subject: `Ukážkový ticket #${i + 1}`,
      description: 'Toto je testovacie zadanie vygenerované seed skriptom.',
      customerId: customer.id,
      customerName: customer.name,
      requesterName: customer.contactPerson,
      requesterEmail: customer.email,
      category: categories[i % categories.length],
      priority,
      status,
      channel: 'web',
      assignedTo: null,
      createdAt,
      updatedAt: createdAt,
      closedAt: status === 'uzavrety' ? Timestamp.now() : null,
      slaDueAt: Timestamp.fromMillis(createdAt.toMillis() + 24 * 60 * 60 * 1000),
    });

    await ticketRef.collection('messages').add({
      ticketId: ticketRef.id,
      authorName: customer.contactPerson,
      authorEmail: customer.email,
      body: 'Ticket vytvorený cez seed skript.',
      isPrivate: false,
      createdAt,
    });

    await ticketRef.collection('activity').add({
      ticketId: ticketRef.id,
      text: 'Ticket vytvorený',
      actor: customer.contactPerson,
      createdAt,
    });
  }

  await counterRef.set({ value: counter }, { merge: true });
  console.log(`Hotovo. Vytvorených ${customerRefs.length} zákazníkov a 15 ticketov.`);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

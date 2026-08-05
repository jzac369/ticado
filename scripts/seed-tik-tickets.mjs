// Temporary seed script - generates 100 realistic-looking demo tickets.
// Requires firestore.rules to be in its TEMP SEED WINDOW state (see git diff).
// Usage: node scripts/seed-tik-tickets.mjs
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCoalIrTjVqf7jF6pUSJr6tKm9bfnSczz0',
  authDomain: 'ticado-servicedesk.firebaseapp.com',
  projectId: 'ticado-servicedesk',
  storageBucket: 'ticado-servicedesk.firebasestorage.app',
  messagingSenderId: '941547725191',
  appId: '1:941547725191:web:e2d56a805c4a5c9f33f322',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const ISSUES = [
  { subject: 'Nefunguje pripojenie na VPN', category: 'Sieť', tags: ['VPN'] },
  { subject: 'Pomalé internetové pripojenie na pobočke', category: 'Sieť', tags: ['Wi-Fi'] },
  { subject: 'Výpadok Wi-Fi v zasadačke', category: 'Sieť', tags: ['Wi-Fi'] },
  { subject: 'Potrebujem reset hesla do firemnej siete', category: 'Security', tags: ['heslo'] },
  { subject: 'Podozrivý phishingový email', category: 'Security', tags: ['phishing'] },
  { subject: 'Účet zablokovaný po viacerých nesprávnych prihláseniach', category: 'Security', tags: ['heslo'] },
  { subject: 'Žiadosť o prístup k zdieľanému disku', category: 'Security', tags: ['prístup'] },
  { subject: 'Tlačiareň na 2. poschodí hlási chybu papiera', category: 'Hardvér', tags: ['tlačiareň'] },
  { subject: 'Nový notebook nenabíja batériu', category: 'Hardvér', tags: ['notebook'] },
  { subject: 'Výmena monitora - praskla obrazovka', category: 'Hardvér', tags: ['monitor'] },
  { subject: 'Myš a klávesnica nereagujú', category: 'Hardvér', tags: [] },
  { subject: 'Potrebujem druhý monitor k pracovnej stanici', category: 'Hardvér', tags: ['monitor'] },
  { subject: 'Záloha dát sa minulú noc nedokončila', category: 'Backup', tags: ['záloha'] },
  { subject: 'Obnovenie súboru zo zálohy', category: 'Backup', tags: ['záloha'] },
  { subject: 'Nastavenie automatickej zálohy pre nové zariadenie', category: 'Backup', tags: ['záloha'] },
  { subject: 'Outlook nesynchronizuje nové emaily', category: 'Aplikácie', tags: ['email'] },
  { subject: 'Excel padá pri otváraní veľkých súborov', category: 'Aplikácie', tags: ['aktualizácia'] },
  { subject: 'Potrebujem licenciu na nový softvér', category: 'Aplikácie', tags: ['licencia'] },
  { subject: 'Aktualizácia Windows zlyhala', category: 'Aplikácie', tags: ['aktualizácia'] },
  { subject: 'Nefunguje prihlásenie do interného systému', category: 'Aplikácie', tags: ['prístup'] },
  { subject: 'Server je nedostupný z pobočky', category: 'Infra', tags: [] },
  { subject: 'Výpadok elektriny spôsobil reštart servera', category: 'Infra', tags: [] },
  { subject: 'Nedostatok voľného miesta na disku servera', category: 'Infra', tags: [] },
  { subject: 'Potrebujem nové IP adresy pre nové pracovné stanice', category: 'Infra', tags: [] },
  { subject: 'Telefón v kancelárii nemá tón', category: 'Iné', tags: [] },
  { subject: 'Otázka ohľadom faktúry za IT služby', category: 'Iné', tags: [] },
  { subject: 'Školenie nového zamestnanca na firemné aplikácie', category: 'Iné', tags: [] },
];

const CUSTOMER_NAMES = ['RONA s.r.o.', 'RONA', 'RONA a.s.'];
const DEPARTMENTS = ['Predaj', 'Sklad', 'Účtovníctvo', 'HR', 'Marketing', 'Logistika', 'Vedenie'];
const FIRST_NAMES = ['Peter', 'Jana', 'Martin', 'Lucia', 'Tomáš', 'Zuzana', 'Michal', 'Andrea', 'Ján', 'Katarína', 'Roman', 'Veronika'];
const LAST_NAMES = ['Novák', 'Horváth', 'Kováč', 'Baláž', 'Varga', 'Molnár', 'Urban', 'Kráľ', 'Šimko', 'Petrík'];
const PRIORITIES = ['nizka', 'normalna', 'normalna', 'vysoka', 'kriticka'];
const STATUS_WEIGHTS = [
  ['otvoreny', 0.3],
  ['v_rieseni', 0.25],
  ['caka_na_klienta', 0.15],
  ['uzavrety', 0.3],
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedStatus() {
  const r = Math.random();
  let acc = 0;
  for (const [status, weight] of STATUS_WEIGHTS) {
    acc += weight;
    if (r <= acc) return status;
  }
  return 'otvoreny';
}

function daysAgo(days) {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

async function main() {
  console.log('Načítavam zákazníkov a technikov...');
  const customersSnap = await getDocs(collection(db, 'customers'));
  const customers = customersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const ronaCustomer =
    customers.find((c) => CUSTOMER_NAMES.some((n) => c.name.toUpperCase().includes('RONA'))) || customers[0];

  const agentsSnap = await getDocs(collection(db, 'agents'));
  const agents = agentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.active !== false);

  if (!ronaCustomer) {
    console.error('Nenašiel sa žiadny zákazník RONA v databáze. Ukončujem.');
    process.exit(1);
  }
  if (agents.length === 0) {
    console.error('Nenašli sa žiadni IT technici. Ukončujem.');
    process.exit(1);
  }
  console.log(`Zákazník: ${ronaCustomer.name}, technici: ${agents.map((a) => a.name).join(', ')}`);

  const counterRef = doc(db, 'meta', 'ticketCounter');
  const counterSnap = await getDocs(collection(db, 'meta'));
  let counter = counterSnap.docs.find((d) => d.id === 'ticketCounter')?.data()?.value ?? -1;

  const TOTAL = 100;
  for (let i = 0; i < TOTAL; i++) {
    counter += 1;
    const issue = pick(ISSUES);
    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    const requesterName = `${firstName} ${lastName}`;
    const stripDiacritics = (s) => s.normalize('NFD').replace(new RegExp('[̀-ͯ]', 'g'), '');
    const requesterEmail = `${stripDiacritics(firstName.toLowerCase())}.${stripDiacritics(lastName.toLowerCase())}@rona.sk`;
    const priority = pick(PRIORITIES);
    const status = weightedStatus();
    const assignedTo = status === 'otvoreny' && Math.random() < 0.3 ? null : pick(agents).name;
    const createdAtMs = daysAgo(Math.random() * 29);
    const createdAt = Timestamp.fromMillis(createdAtMs);
    const updatedAtMs = createdAtMs + Math.random() * (Date.now() - createdAtMs);
    const updatedAt = Timestamp.fromMillis(updatedAtMs);
    const closedAt = status === 'uzavrety' ? Timestamp.fromMillis(updatedAtMs) : null;
    const tags = Math.random() < 0.55 ? issue.tags.slice(0, 1) : [];
    const code = `TIK${String(counter).padStart(6, '0')}`;

    const ticketRef = await addDoc(collection(db, 'tickets'), {
      code,
      subject: issue.subject,
      description: `${issue.subject}. Nahlásené používateľom ${requesterName} z oddelenia ${pick(DEPARTMENTS)}.`,
      customerId: ronaCustomer.id,
      customerName: ronaCustomer.name,
      requesterName,
      requesterEmail,
      department: pick(DEPARTMENTS),
      category: issue.category,
      priority,
      status,
      channel: pick(['web', 'email', 'telefon']),
      assignedTo,
      tags,
      createdAt,
      updatedAt,
      closedAt,
    });

    await addDoc(collection(db, 'tickets', ticketRef.id, 'messages'), {
      ticketId: ticketRef.id,
      authorName: requesterName,
      authorEmail: requesterEmail,
      body: issue.subject,
      isPrivate: false,
      createdAt,
    });

    await addDoc(collection(db, 'tickets', ticketRef.id, 'activity'), {
      ticketId: ticketRef.id,
      text: 'Ticket vytvorený',
      actor: requesterName,
      createdAt,
    });

    if (assignedTo) {
      await addDoc(collection(db, 'tickets', ticketRef.id, 'activity'), {
        ticketId: ticketRef.id,
        text: `Priradené: ${assignedTo}`,
        actor: 'Systém',
        createdAt: updatedAt,
      });
    }

    if ((i + 1) % 10 === 0) console.log(`  ...${i + 1}/${TOTAL}`);
  }

  await setDoc(counterRef, { value: counter }, { merge: true });
  console.log(`Hotovo. Vytvorených ${TOTAL} ticketov (TIK${String(counter).padStart(6, '0')} posledný).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

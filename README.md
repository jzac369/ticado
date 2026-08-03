# Ticado — ServiceDesk

Interný ticketing systém (React + Vite + TypeScript + Firebase).

## Funkcie

- Prihlásenie cez Firebase Auth (email/heslo)
- Dashboard s prehľadom SLA, kritických a otvorených ticketov
- Zoznam ticketov: štatistiky, fulltextové hľadanie, filtre (stav, priorita, dátum), triedenie, stránkovanie
- Detail ticketu: vlákno komunikácie s klientom, privátne poznámky, zmena stavu, priradenie, SLA countdown, log aktivít
- Sprievodca vytvorením nového ticketu (zákazník, kategória, priorita, popis)
- Evidencia zákazníkov
- Automatické odhlásenie po nečinnosti
- Dáta bežia v reálnom čase cez Firestore (`onSnapshot`)

## 1. Založenie Firebase projektu

1. Choď na [console.firebase.google.com](https://console.firebase.google.com) a vytvor nový projekt (napr. `ticado-servicedesk`).
2. V projekte zapni **Authentication → Sign-in method → Email/Password**.
3. V **Authentication → Users** ručne pridaj svojich agentov (email + heslo) — verejná registrácia nie je súčasťou appky.
4. Zapni **Firestore Database** (v produkčnom režime, región zvoľ najbližší, napr. `eur3`).
5. V **Project settings → General → Your apps** pridaj webovú aplikáciu a skopíruj `firebaseConfig`.

## 2. Konfigurácia projektu

```bash
cp .env.example .env
```

Do `.env` vlož hodnoty z `firebaseConfig`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

```bash
npm install
npm run dev
```

Appka pobeží na `http://localhost:5173`.

## 3. Nasadenie Firestore pravidiel

```bash
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc   # a doplň svoje projectId
firebase deploy --only firestore:rules
```

## 4. (Voliteľné) Naplnenie testovacích dát

1. Vo Firebase Console: **Project settings → Service accounts → Generate new private key** → stiahnutý súbor ulož ako `scripts/serviceAccountKey.json` (tento súbor sa negituje).
2. Spusti:

```bash
node scripts/seed.mjs
```

Vytvorí 2 zákazníkov a 15 ukážkových ticketov s rôznymi stavmi a prioritami.

## 5. Nasadenie na Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

## Dátový model (Firestore)

- `customers/{id}` — `name`, `contactPerson`, `email`, `phone`
- `tickets/{id}` — `code`, `subject`, `description`, `customerId`, `customerName`, `requesterName`, `category`, `priority`, `status`, `channel`, `assignedTo`, `createdAt`, `updatedAt`, `closedAt`, `slaDueAt`
  - `tickets/{id}/messages/{id}` — komunikácia (verejná aj privátna)
  - `tickets/{id}/activity/{id}` — log zmien
- `meta/ticketCounter` — počítadlo pre generovanie `TKT00XXXX` kódov

## Neskorší presun na lokálnu sieť

Build je čisto statický (`npm run build` → priečinok `dist`), takže rovnaké súbory sa dajú neskôr servovať z lokálneho stroja (nginx/IIS) v podnikovej sieti bez zmeny kódu. Firestore/Auth ale ostávajú cloudové — lokálny stroj bude potrebovať prístup na internet, pokiaľ sa backend v budúcnosti nenahradí lokálnou databázou.

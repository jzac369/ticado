import { useState, type ReactNode } from 'react';

interface Entry {
  title: string;
  body: ReactNode;
}

interface Group {
  title: string;
  entries: Entry[];
}

const GROUPS: Group[] = [
  {
    title: 'Dashboard',
    entries: [
      {
        title: 'Štatistické dlaždice',
        body: 'Nevyriešené = otvorené tickety (všetky stavy okrem Uzavretý). Priradené/Nepriradené = či má ticket vyplneného technika. Čakajúce na klienta = tickety v stave "Čaká na klienta". Vyriešené za 30 dní = tickety uzavreté v poslednom mesiaci.',
      },
      {
        title: 'Vývoj ticketov (graf)',
        body: 'Čiarový graf posledných 14 dní: koľko ticketov bolo v daný deň vytvorených (modrá) a koľko vyriešených/uzavretých (oranžová).',
      },
      {
        title: 'Otvorené podľa priority',
        body: 'Donut graf rozdelenia aktuálne otvorených ticketov podľa priority (Nízka/Normálna/Vysoká/Kritická).',
      },
      { title: 'Najviac otvorených', body: 'Rebríček zákazníkov s najväčším počtom aktuálne otvorených ticketov.' },
      {
        title: 'Odpracované hodiny agentov',
        body: 'Súčet hodín, ktoré agenti zaznamenali pri odpovediach (pole "hodiny" pri komunikácii) za posledných 7 dní.',
      },
      { title: 'Posledná aktivita', body: 'Posledné zmeny naprieč všetkými ticketmi (zmena stavu, priradenia, nová odpoveď).' },
    ],
  },
  {
    title: 'Rotujúci banner hore',
    entries: [
      {
        title: 'Čo zobrazuje',
        body: 'Farebný box vedľa "VERZIA 1.0" cyklicky strieda až 5 upozornení: počet nepriradených ticketov, kritické otvorené tickety, tickety čakajúce na klienta, dnes vytvorené/vyriešené tickety, a tickety bez aktivity 24+ hodín. Kliknutím sa presuniete na zoznam ticketov.',
      },
    ],
  },
  {
    title: 'Všetky tikety',
    entries: [
      {
        title: 'Vyhľadávanie',
        body: 'Hľadá v čísle ticketu, predmete, mene zákazníka aj v obsahu komunikácie. Viac slov oddelených medzerou = musia sedieť všetky (nie ľubovoľné). Presnú frázu zadajte v úvodzovkách, napr. "Backup Configuration".',
      },
      { title: 'Filtre', body: 'Stav, priorita a rozsah dátumu vytvorenia. Tlačidlo "Reset" vráti všetky filtre na východiskový stav.' },
      {
        title: 'Rýchle filtre Všetky/Otvorené/Zatvorené',
        body: 'Otvorené = všetky stavy okrem Uzavretý. Zatvorené = len Uzavretý.',
      },
      { title: 'Zoradenie a stránkovanie', body: 'Najnovšie/Najstaršie podľa dátumu vytvorenia; počet záznamov na stránku si viete zmeniť.' },
      {
        title: 'Červený pruh pri riadku',
        body: 'Tenký zvislý pruh pred číslom ticketu znamená, že ticket má kritickú prioritu.',
      },
      { title: 'Stĺpec Pridelené', body: 'Meno technika, ktorému je ticket aktuálne priradený, alebo "Bez priradenia".' },
      { title: 'Export CSV', body: 'Tlačidlo "Exportovať CSV" stiahne aktuálne vyfiltrovaný zoznam ticketov ako tabuľku pre Excel.' },
    ],
  },
  {
    title: 'Detail ticketu',
    entries: [
      { title: 'Komunikácia', body: 'Vlákno správ medzi klientom a technikmi. Modrý pruh vľavo = verejná správa (vidí ju klient), oranžový = privátna poznámka (vidí len tím).' },
      {
        title: 'Prílohy',
        body: 'Súbory/screenshoty sa dajú pridať pretiahnutím do rámčeka, tlačidlom "Vybrať súbory", alebo vložením obrázka zo schránky (Ctrl+V) priamo do textu odpovede. Vyžaduje zapnutý Firebase Storage.',
      },
      { title: 'Šablóny odpovedí', body: 'Tlačidlo nad odpoveďou vloží preddefinovaný text (spravuje sa v Nastavenia → Šablóny).' },
      { title: 'Privátna poznámka', body: 'Zaškrtávacie políčko pri odosielaní správy — takto napísaný text klient v komunikácii nevidí.' },
      { title: 'Stav ticketu', body: 'Otvorený → V riešení → Čaká na klienta → Uzavretý. Zmena stavu sa zaznamená do Poslednej aktivity.' },
      { title: 'Priradenie', body: 'Výber technika zo zoznamu (spravovaného v Nastavenia → IT technici), ktorý má ticket na starosti.' },
      { title: 'Štítky', body: 'Ľubovoľné krátke značky pridané k tiketu (napr. "hardvér", "urgent") pre jemnejšie triedenie nad rámec kategórie.' },
      { title: 'Žiadateľ', body: 'Meno, firma, oddelenie (ak vyplnené) a email osoby, ktorá ticket nahlásila.' },
      { title: 'Posledná aktivita', body: 'Chronologický log zmien konkrétne na tomto tickete.' },
    ],
  },
  {
    title: 'Nový ticket (interný)',
    entries: [
      { title: 'Zákazník', body: 'Vyberte existujúceho, alebo rovno napíšte názov novej firmy — vytvorí sa automaticky.' },
      { title: 'Priorita', body: 'Nízka/Normálna/Vysoká/Kritická — ovplyvňuje farebné zvýraznenie v zoznamoch a grafoch, kritická pridáva červený pruh v zozname.' },
      { title: 'Automatické priradenie', body: 'Nový ticket sa systém pokúsi rovnomerne (round-robin) priradiť aktívnemu IT technikovi, ak nejakí existujú v Nastaveniach.' },
    ],
  },
  {
    title: 'Nahlásiť problém (verejný formulár)',
    entries: [
      {
        title: 'Kto ho vidí',
        body: 'Stránka /support je verejne dostupná bez prihlásenia — odkaz je aj na prihlasovacej obrazovke ("Nahlásiť problém bez prihlásenia").',
      },
      {
        title: 'Obmedzenia',
        body: 'Firma sa vyberá len z existujúceho zoznamu (nedá sa vymyslieť nová), a nedá sa vybrať konkrétny technik — o priradení rozhoduje až interný tím.',
      },
      { title: 'Prílohy', body: 'Rovnaké možnosti ako v detaile ticketu — drag&drop, výber súboru, alebo vloženie screenshotu (Ctrl+V) do popisu.' },
      { title: 'Po odoslaní', body: 'Zobrazí sa číslo ticketu a tlačidlo "Nahlásiť ďalší problém" na okamžité zadanie ďalšej požiadavky.' },
    ],
  },
  {
    title: 'Zákazníci',
    entries: [
      { title: 'Zoznam a úpravy', body: 'Firmy sa dajú priamo v tabuľke upravovať (Upraviť/Uložiť) aj mazať (s potvrdením, ktoré upozorní na existujúce tickety).' },
      { title: 'Emailová doména', body: 'Ak je vyplnená, pri zakladaní kolegu sa automaticky ponúkne ako pevná koncovka emailovej adresy.' },
      { title: 'Kolegovia', body: 'Kliknutím na zákazníka sa dostanete na zoznam jeho kontaktných osôb (klientske účty) a môžete pridať nového cez "Pridať kolegu".' },
    ],
  },
  {
    title: 'Nastavenia',
    entries: [
      { title: 'IT technici', body: 'Meno, pozícia a email technikov, ktorí sa dajú priraďovať k ticketom. Editovateľné a mazateľné priamo v tabuľke.' },
      { title: 'Šablóny odpovedí', body: 'Preddefinované texty na rýchle vkladanie do odpovedí (napr. "Prosíme o reštart zariadenia...").' },
    ],
  },
  {
    title: 'Bezpečnosť a prístup',
    entries: [
      {
        title: 'Automatické odhlásenie',
        body: 'Po 30 minútach nečinnosti sa používateľ automaticky odhlási. 5 minút vopred sa zobrazí upozornenie s možnosťou zostať prihlásený.',
      },
      {
        title: 'Rola Klient vs Agent',
        body: 'Kolegovia (klientske účty) vidia len tickety svojej vlastnej firmy. Interní agenti/technici (účty vytvorené priamo vo Firebase Console) vidia všetko.',
      },
      {
        title: 'Prehliadačové notifikácie',
        body: 'Ak ich povolíte, appka vás upozorní na nové udalosti (napr. nový nepriradený ticket), pokiaľ máte appku otvorenú v prehliadači.',
      },
    ],
  },
];

export function LegendPage() {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(GROUPS.map((g) => [g.title, true])),
  );

  function toggle(title: string) {
    setOpenGroups((s) => ({ ...s, [title]: !s[title] }));
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>NÁPOVEDA</div>
      <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Legenda funkcií</h1>
      <p style={{ margin: '0 0 20px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Prehľad všetkých funkcií Ticado ServiceDesk — čo znamenajú a ako sa používajú.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {GROUPS.map((group) => (
          <div
            key={group.title}
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => toggle(group.title)}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                background: 'var(--color-surface-2)',
                border: 'none',
                fontWeight: 700,
                fontSize: 14.5,
                cursor: 'pointer',
              }}
            >
              {group.title}
              <span style={{ transform: openGroups[group.title] ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s' }}>
                ▾
              </span>
            </button>
            {openGroups[group.title] && (
              <div style={{ padding: '6px 18px 16px' }}>
                {group.entries.map((entry) => (
                  <div key={entry.title} style={{ padding: '10px 0', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>{entry.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{entry.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

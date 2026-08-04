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
    title: 'Rotujúci banner v hornej lište',
    entries: [
      {
        title: 'Čo zobrazuje',
        body: 'Farebný box v riadku so záložkami (Dashboard, Moje tikety, ...), zarovnaný k pravému okraju pred tlačidlom "+ Nový ticket". Cyklicky strieda až 5 upozornení: počet nepriradených ticketov, kritické otvorené tickety, tickety čakajúce na klienta, dnes vytvorené/vyriešené tickety, a tickety bez aktivity 24+ hodín. Kliknutím sa presuniete na zoznam ticketov.',
      },
    ],
  },
  {
    title: 'Zoznamy ticketov (Moje / Všetky / Nepriradené / Dnešné / Archivované)',
    entries: [
      {
        title: 'Číslo pri názve záložky',
        body: 'Každá záložka v hornej lište zobrazuje aktuálny počet ticketov, ktoré do nej patria — aktualizuje sa v reálnom čase.',
      },
      { title: 'Moje tikety', body: 'Pre technika: tickety, ktoré mu sú priradené (podľa mena v Nastavenia → IT technici). Pre klienta: tickety, ktoré osobne nahlásil.' },
      { title: 'Nepriradené tikety', body: 'Otvorené tickety bez priradeného technika — miesto, kde technici zvyknú hľadať prácu na prevzatie.' },
      { title: 'Archivované tikety', body: 'Tickety odložené tlačidlom "Archivovať" v detaile ticketu. Nezobrazujú sa v žiadnom inom zozname ani v Dashboard štatistikách, kým sa neobnovia.' },
      {
        title: 'Vyhľadávanie (Všetky tikety)',
        body: 'Hľadá v čísle ticketu, predmete, mene zákazníka aj v obsahu komunikácie. Viac slov oddelených medzerou = musia sedieť všetky (nie ľubovoľné). Presnú frázu zadajte v úvodzovkách, napr. "Backup Configuration". Rovnaké vyhľadávanie je dostupné odkiaľkoľvek klávesovou skratkou Ctrl+K.',
      },
      { title: 'Filtre (Všetky tikety)', body: 'Stav, priorita a rozsah dátumu vytvorenia. Tlačidlo "Reset" vráti všetky filtre na východiskový stav.' },
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
      {
        title: 'Archivovať',
        body: 'Tlačidlo vpravo hore (vedľa Tlačiť/PDF) odloží ticket do zoznamu Archivované tikety — zmizne zo všetkých bežných zoznamov a štatistík, kým ho niekto neobnoví tlačidlom "Obnoviť".',
      },
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
    title: 'Podporná stránka /support (bez prihlásenia)',
    entries: [
      {
        title: 'Kto ju vidí',
        body: 'Stránka /support je verejne dostupná bez prihlásenia — odkaz je aj na prihlasovacej obrazovke ("Nahlásiť problém bez prihlásenia"). Úvodná obrazovka ponúka dve možnosti: nahlásiť nový problém alebo skontrolovať stav existujúcej požiadavky.',
      },
      {
        title: 'Nahlásiť problém — obmedzenia',
        body: 'Firma sa vyberá len z existujúceho zoznamu (nedá sa vymyslieť nová), a nedá sa vybrať konkrétny technik — o priradení rozhoduje až interný tím.',
      },
      { title: 'Prílohy', body: 'Rovnaké možnosti ako v detaile ticketu — drag&drop, výber súboru, alebo vloženie screenshotu (Ctrl+V) do popisu.' },
      { title: 'Po odoslaní', body: 'Zobrazí sa číslo ticketu a tlačidlo "Nahlásiť ďalší problém" na okamžité zadanie ďalšej požiadavky.' },
      {
        title: 'Skontrolovať stav požiadavky',
        body: 'Vyžaduje číslo ticketu AJ emailovú adresu použitú pri nahlásení — obe sa musia zhodovať, inak sa ticket nezobrazí. Zobrazí stav, prioritu a či sa mu už venuje technik.',
      },
      {
        title: 'Doplňujúca správa',
        body: 'Po úspešnom overení môže klient poslať doplňujúcu otázku. Ak má ticket priradeného technika, správa sa zapíše priamo do komunikácie ticketu. Ak ticket ešte čaká vo fronte, správa sa zapíše len do Poslednej aktivity ticketu.',
      },
      {
        title: 'Zrušiť ticket',
        body: 'Po overení emailu môže klient ticket sám zrušiť — stav sa zmení na Uzavretý a do Poslednej aktivity pribudne záznam "Uzavretý používateľom" s časovou stopou. Dá sa použiť len na ešte neuzavreté tickety.',
      },
      {
        title: 'Live chat',
        body: 'Ak je zapnutý v Nastavenia → Live chat, na stránke sa zobrazí plávajúce tlačidlo 💬. Návštevník zadá meno, email a nepovinne číslo ticketu, ktorého sa chat týka.',
      },
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
      {
        title: 'IT technici',
        body: 'Meno, priezvisko, pozícia, email a ďalšie kontaktné údaje technikov, ktorí sa dajú priraďovať k ticketom. Upravovať a mazať iných technikov môže len master agent — ostatní vidia zoznam len na čítanie a upravujú si len svoj vlastný záznam cez Môj profil.',
      },
      { title: 'Šablóny odpovedí', body: 'Preddefinované texty na rýchle vkladanie do odpovedí (napr. "Prosíme o reštart zariadenia...").' },
      {
        title: 'Live chat',
        body: 'Zoznam konverzácií z podporného widgetu na /support, s prepínačom na zapnutie/vypnutie chatu pre klientov. Ak návštevník uviedol číslo ticketu, vedľa chatu sa zobrazí aj samotný ticket s jeho záznamom aktivity — pre rýchlejšiu prácu bez prepínania obrazoviek.',
      },
      {
        title: 'Notifikácie live chatu',
        body: 'Nová správa od návštevníka rozbliká ikonu 💬 Live chat v hornej lište a pridá záznam do zvončeka notifikácií, spolu s jemným zvukovým tónom (dá sa vypnúť vo Všeobecných nastaveniach). Otvorením konverzácie v Live chate sa upozornenie stíši.',
      },
      {
        title: 'Všeobecné nastavenia',
        body: 'Uvítací nadpis/podnadpis a text v päte podpornej stránky /support, prevádzkové hodiny podpory, a vypínače pre live chat a jeho zvukové upozornenie.',
      },
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
        Prehľad všetkých funkcií RONA Technická podpora — čo znamenajú a ako sa používajú.
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

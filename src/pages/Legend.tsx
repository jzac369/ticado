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
        body: 'Nevyriešené = otvorené tikety (všetky stavy okrem Uzavretý). Priradené/Nepriradené = či má tiket vyplneného technika. Čakajúce na klienta = tikety v stave "Čaká na klienta". Vyriešené za 30 dní = tikety uzavreté v poslednom mesiaci.',
      },
      {
        title: 'Vývoj tiketov (graf)',
        body: 'Čiarový graf posledných 14 dní: koľko tiketov bolo v daný deň vytvorených (modrá) a koľko vyriešených/uzavretých (oranžová).',
      },
      {
        title: 'Otvorené podľa priority',
        body: 'Donut graf rozdelenia aktuálne otvorených tiketov podľa priority (Nízka/Normálna/Vysoká/Kritická).',
      },
      { title: 'Najviac otvorených', body: 'Rebríček zákazníkov s najväčším počtom aktuálne otvorených tiketov.' },
      {
        title: 'Odpracované hodiny agentov',
        body: 'Súčet hodín, ktoré agenti zaznamenali pri odpovediach (pole "hodiny" pri komunikácii) za posledných 7 dní.',
      },
      { title: 'Posledná aktivita', body: 'Posledné zmeny naprieč všetkými tiketmi (zmena stavu, priradenia, nová odpoveď).' },
    ],
  },
  {
    title: 'Rotujúci banner v hornej lište',
    entries: [
      {
        title: 'Čo zobrazuje',
        body: 'Farebný box v riadku so záložkami (Dashboard, Moje tikety, ...), zarovnaný k pravému okraju pred tlačidlom "+ Nový tiket". Cyklicky strieda až 5 upozornení: počet nepriradených tiketov, kritické otvorené tikety, tikety čakajúce na klienta, dnes vytvorené/vyriešené tikety, a tikety bez aktivity 24+ hodín. Kliknutím sa presuniete na zoznam tiketov.',
      },
    ],
  },
  {
    title: 'Zoznamy tiketov (Moje / Všetky / Nepriradené / Dnešné / Archivované)',
    entries: [
      {
        title: 'Číslo pri názve záložky',
        body: 'Každá záložka v hornej lište zobrazuje aktuálny počet tiketov, ktoré do nej patria — aktualizuje sa v reálnom čase.',
      },
      { title: 'Moje tikety', body: 'Pre technika: tikety, ktoré mu sú priradené (podľa mena v Nastavenia → IT technici). Pre klienta: tikety, ktoré osobne nahlásil.' },
      { title: 'Nepriradené tikety', body: 'Otvorené tikety bez priradeného technika — miesto, kde technici zvyknú hľadať prácu na prevzatie.' },
      { title: 'Archivované tikety', body: 'Tikety odložené tlačidlom "Archivovať" v detaile tiketu. Nezobrazujú sa v žiadnom inom zozname ani v Dashboard štatistikách, kým sa neobnovia.' },
      {
        title: 'Vyhľadávanie (Všetky tikety)',
        body: 'Hľadá v čísle tiketu, predmete, mene zákazníka aj v obsahu komunikácie. Viac slov oddelených medzerou = musia sedieť všetky (nie ľubovoľné). Presnú frázu zadajte v úvodzovkách, napr. "Backup Configuration". Rovnaké vyhľadávanie je dostupné odkiaľkoľvek klávesovou skratkou Ctrl+K.',
      },
      { title: 'Filtre (Všetky tikety)', body: 'Stav, priorita a rozsah dátumu vytvorenia. Tlačidlo "Reset" vráti všetky filtre na východiskový stav.' },
      {
        title: 'Rýchle filtre Všetky/Otvorené/Zatvorené',
        body: 'Otvorené = všetky stavy okrem Uzavretý. Zatvorené = len Uzavretý.',
      },
      { title: 'Zoradenie a stránkovanie', body: 'Najnovšie/Najstaršie podľa dátumu vytvorenia; počet záznamov na stránku si viete zmeniť.' },
      {
        title: 'Červený pruh pri riadku',
        body: 'Tenký zvislý pruh pred číslom tiketu znamená, že tiket má kritickú prioritu.',
      },
      { title: 'Stĺpec Pridelené', body: 'Meno technika, ktorému je tiket aktuálne priradený, alebo "Bez priradenia".' },
      { title: 'Export CSV', body: 'Tlačidlo "Exportovať CSV" stiahne aktuálne vyfiltrovaný zoznam tiketov ako tabuľku pre Excel.' },
    ],
  },
  {
    title: 'Detail tiketu',
    entries: [
      { title: 'Komunikácia', body: 'Vlákno správ medzi klientom a technikmi. Modrý pruh vľavo = verejná správa (vidí ju klient), oranžový = privátna poznámka (vidí len tím).' },
      {
        title: 'Prílohy',
        body: 'Súbory/screenshoty sa dajú pridať pretiahnutím do rámčeka, tlačidlom "Vybrať súbory", alebo vložením obrázka zo schránky (Ctrl+V) priamo do textu odpovede. Vyžaduje zapnutý Firebase Storage.',
      },
      { title: 'Šablóny odpovedí', body: 'Tlačidlo nad odpoveďou vloží preddefinovaný text (spravuje sa v Nastavenia → Šablóny).' },
      { title: 'Privátna poznámka', body: 'Zaškrtávacie políčko pri odosielaní správy — takto napísaný text klient v komunikácii nevidí.' },
      { title: 'Stav tiketu', body: 'Otvorený → V riešení → Čaká na klienta → Uzavretý. Zmena stavu sa zaznamená do Poslednej aktivity.' },
      { title: 'Priradenie', body: 'Výber technika zo zoznamu (spravovaného v Nastavenia → IT technici), ktorý má tiket na starosti.' },
      { title: 'Štítky', body: 'Ľubovoľné krátke značky pridané k tiketu (napr. "hardvér", "urgent") pre jemnejšie triedenie nad rámec kategórie.' },
      { title: 'Žiadateľ', body: 'Meno, firma, oddelenie (ak vyplnené) a email osoby, ktorá tiket nahlásila.' },
      { title: 'Posledná aktivita', body: 'Chronologický log zmien konkrétne na tomto tikete.' },
      {
        title: 'Archivovať',
        body: 'Tlačidlo vpravo hore (vedľa Tlačiť/PDF) odloží tiket do zoznamu Archivované tikety — zmizne zo všetkých bežných zoznamov a štatistík, kým ho niekto neobnoví tlačidlom "Obnoviť".',
      },
    ],
  },
  {
    title: 'Nový tiket (interný)',
    entries: [
      { title: 'Zákazník', body: 'Vyberte existujúceho, alebo rovno napíšte názov novej firmy — vytvorí sa automaticky.' },
      { title: 'Priorita', body: 'Nízka/Normálna/Vysoká/Kritická — ovplyvňuje farebné zvýraznenie v zoznamoch a grafoch, kritická pridáva červený pruh v zozname.' },
      { title: 'Automatické priradenie', body: 'Nový tiket sa systém pokúsi rovnomerne (round-robin) priradiť aktívnemu IT technikovi, ak nejakí existujú v Nastaveniach.' },
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
      { title: 'Prílohy', body: 'Rovnaké možnosti ako v detaile tiketu — drag&drop, výber súboru, alebo vloženie screenshotu (Ctrl+V) do popisu.' },
      { title: 'Po odoslaní', body: 'Zobrazí sa číslo tiketu a tlačidlo "Nahlásiť ďalší problém" na okamžité zadanie ďalšej požiadavky.' },
      {
        title: 'Skontrolovať stav požiadavky',
        body: 'Vyžaduje číslo tiketu AJ emailovú adresu použitú pri nahlásení — obe sa musia zhodovať, inak sa tiket nezobrazí. Zobrazí stav, prioritu a či sa mu už venuje technik.',
      },
      {
        title: 'Doplňujúca správa',
        body: 'Po úspešnom overení môže klient poslať doplňujúcu otázku. Ak má tiket priradeného technika, správa sa zapíše priamo do komunikácie tiketu. Ak tiket ešte čaká vo fronte, správa sa zapíše len do Poslednej aktivity tiketu.',
      },
      {
        title: 'Zrušiť tiket',
        body: 'Po overení emailu môže klient tiket sám zrušiť — stav sa zmení na Uzavretý a do Poslednej aktivity pribudne záznam "Uzavretý používateľom" s časovou stopou. Dá sa použiť len na ešte neuzavreté tikety.',
      },
      {
        title: 'Live chat',
        body: 'Ak je zapnutý v Nastavenia → Live chat, na stránke sa zobrazí plávajúce tlačidlo 💬. Návštevník zadá meno, email a nepovinne číslo tiketu, ktorého sa chat týka.',
      },
    ],
  },
  {
    title: 'Zákazníci',
    entries: [
      { title: 'Zoznam a úpravy', body: 'Firmy sa dajú priamo v tabuľke upravovať (Upraviť/Uložiť) aj mazať (s potvrdením, ktoré upozorní na existujúce tikety).' },
      { title: 'Emailová doména', body: 'Ak je vyplnená, pri zakladaní kolegu sa automaticky ponúkne ako pevná koncovka emailovej adresy.' },
      { title: 'Kolegovia', body: 'Kliknutím na zákazníka sa dostanete na zoznam jeho kontaktných osôb (klientske účty) a môžete pridať nového cez "Pridať kolegu".' },
    ],
  },
  {
    title: 'Nastavenia',
    entries: [
      {
        title: 'IT technici',
        body: 'Meno, priezvisko, pozícia, email a ďalšie kontaktné údaje technikov, ktorí sa dajú priraďovať k tiketom. Upravovať a mazať iných technikov môže len master agent — ostatní vidia zoznam len na čítanie a upravujú si len svoj vlastný záznam cez Môj profil.',
      },
      { title: 'Šablóny odpovedí', body: 'Preddefinované texty na rýchle vkladanie do odpovedí (napr. "Prosíme o reštart zariadenia...").' },
      {
        title: 'Live chat',
        body: 'Zoznam konverzácií z podporného widgetu na /support, s prepínačom na zapnutie/vypnutie chatu pre klientov. Ak návštevník uviedol číslo tiketu, vedľa chatu sa zobrazí aj samotný tiket s jeho záznamom aktivity — pre rýchlejšiu prácu bez prepínania obrazoviek.',
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
        body: 'Kolegovia (klientske účty) vidia len tikety svojej vlastnej firmy. Interní agenti/technici (účty vytvorené priamo vo Firebase Console) vidia všetko.',
      },
      {
        title: 'Prehliadačové notifikácie',
        body: 'Ak ich povolíte, appka vás upozorní na nové udalosti (napr. nový nepriradený tiket), pokiaľ máte appku otvorenú v prehliadači.',
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

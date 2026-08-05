import { useMemo, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';

interface Entry {
  title: string;
  body: ReactNode;
}

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)', padding: '0 1px', borderRadius: 2 }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface Group {
  title: string;
  entries: Entry[];
}

const GROUPS: Group[] = [
  {
    title: 'Prihlásenie a základné rozloženie',
    entries: [
      {
        title: 'Prihlásenie',
        body: 'Email a heslo pridelené agentovi. Voliteľné "Zapamätať heslo na tomto zariadení". Dole je odkaz "Nahlásiť problém bez prihlásenia" na verejnú stránku /support pre návštevníkov bez účtu.',
      },
      {
        title: 'Horná lišta',
        body: 'Prvý riadok: ikony Tikety / Zákazníci / Live chat / Reporty / Nastavenia / Pomoc, zvonček s notifikáciami a meno používateľa s menu (Môj profil, Odhlásiť sa). Druhý riadok: záložky Dashboard / Moje tikety / Všetky tikety / Nepriradené / Dnešné / Archivované, každá s počtom v reálnom čase, rotujúci banner s upozorneniami a tlačidlo "+ Nový tiket".',
      },
      {
        title: 'Príkazový panel (Ctrl+K)',
        body: 'Odkiaľkoľvek v appke otvorí rýchle vyhľadávanie tiketov a skratky na hlavné stránky, bez nutnosti klikať cez menu.',
      },
      {
        title: 'Zvonček s notifikáciami',
        body: 'Zoznam posledných udalostí (nové tikety, nové live chat správy a pod.) s odkazom priamo na daný záznam.',
      },
    ],
  },
  {
    title: 'Dashboard',
    entries: [
      {
        title: 'Panel filtrov',
        body: 'Hľadanie podľa tiketu/zákazníka/agenta, filter podľa agenta/priority/stavu, výber obdobia (7/14/30 dní) a tlačidlo "Exportovať" (CSV aktuálne vyfiltrovaných tiketov).',
      },
      {
        title: 'Štatistické dlaždice',
        body: 'Nevyriešené = otvorené tikety (všetky stavy okrem Uzavretý). Priradené/Nepriradené = či majú technika. Čakajúce na klienta = stav "Čaká na klienta". Vyriešené (Xd) = uzavreté v zvolenom období, s percentuálnou zmenou oproti rovnako dlhému predchádzajúcemu obdobiu. Mini grafy trendu majú len Nevyriešené a Vyriešené — pri ostatných dlaždiciach systém neuchováva históriu zmien v čase, takže trend by bol len odhad, nie skutočné dáta.',
      },
      {
        title: 'Vývoj tiketov',
        body: 'Čiarový graf: koľko tiketov bolo v daný deň vytvorených a koľko vyriešených, za zvolené obdobie.',
      },
      { title: 'Podľa priority / Podľa stavu / Kanály tiketov', body: 'Donut grafy rozdelenia tiketov podľa priority, stavu a kanála (web/email/telefón).' },
      { title: 'Priemerný čas riešenia', body: 'Priemerná doba od vytvorenia po uzavretie, osobitne za každú prioritu.' },
      { title: 'Vek otvorených', body: 'Koľko aktuálne otvorených tiketov je staré 0-1 deň, 1-3 dni, 3-7 dní a 7+ dní.' },
      { title: 'Podľa kategórie', body: 'Rebríček najčastejších kategórií medzi otvorenými tiketmi.' },
      { title: 'Najviac otvorených', body: 'Rebríček zákazníkov (firiem) s najväčším počtom aktuálne otvorených tiketov.' },
      { title: 'Výkon agentov', body: 'Za zvolené obdobie: počet uzavretých a otvorených tiketov na technika a jeho priemerný čas riešenia.' },
      {
        title: 'Vyžaduje akciu',
        body: '"Čaká na vašu odpoveď" = posledná správa v tikete je od klienta. "Bez aktivity 24h+" = tiket sa 24 a viac hodín vôbec nehol.',
      },
      { title: 'Posledná aktivita / Najnovšie tikety', body: 'Posledné zmeny naprieč všetkými tiketmi, resp. posledné vytvorené tikety (rešpektuje políčko hľadania hore).' },
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
        body: 'Hľadá v čísle tiketu, predmete, mene firmy aj v obsahu komunikácie. Viac slov oddelených medzerou = musia sedieť všetky (nie ľubovoľné). Presnú frázu zadajte v úvodzovkách, napr. "Backup Configuration". Rovnaké vyhľadávanie je dostupné odkiaľkoľvek klávesovou skratkou Ctrl+K.',
      },
      { title: 'Filtre (Všetky tikety)', body: 'Stav, priorita a rozsah dátumu vytvorenia. Tlačidlo "Reset" vráti všetky filtre na východiskový stav.' },
      {
        title: 'Rýchle filtre Všetky/Otvorené/Zatvorené',
        body: 'Otvorené = všetky stavy okrem Uzavretý. Zatvorené = len Uzavretý.',
      },
      { title: 'Zoradenie a stránkovanie', body: 'Najnovšie/Najstaršie podľa dátumu vytvorenia; počet záznamov na stránku si viete zmeniť.' },
      {
        title: 'Zvýraznenie kritických tiketov',
        body: 'Riadok tiketu s kritickou prioritou má tenký červený pruh pred číslom tiketu a jemne podfarbené celé pozadie riadku — aby bol na prvý pohľad odlíšiteľný od ostatných.',
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
      { title: 'Šablóny odpovedí', body: 'Tlačidlo nad odpoveďou vloží preddefinovaný text (spravuje sa v Nastavenia → Obsah podpory → Šablóny odpovedí).' },
      { title: 'Privátna poznámka', body: 'Zaškrtávacie políčko pri odosielaní správy — takto napísaný text klient v komunikácii nevidí.' },
      {
        title: 'Stav a priorita tiketu',
        body: 'Rozbaľovacie menu priamo v detaile — Otvorený → V riešení → Čaká na klienta → Uzavretý, resp. Nízka/Normálna/Vysoká/Kritická. Každá položka v menu je farebne odlíšená rovnako ako v zoznamoch (napr. kritická = červená). Zmena sa hneď zaznamená do Poslednej aktivity.',
      },
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
      { title: 'Firma', body: 'Výber z existujúceho zoznamu zákazníckych firiem (nové firmy sa dnes zakladajú v Nastavenia → Zákazníci, nie priamo z formulára).' },
      { title: 'Meno žiadateľa', body: 'Vypĺňa sa ručne, nič sa vopred nedopĺňa — aby nedošlo k omylu, keď agent zakladá tiket v mene niekoho iného.' },
      { title: 'Priorita', body: 'Nízka/Normálna/Vysoká/Kritická — ovplyvňuje farebné zvýraznenie v zoznamoch a grafoch, kritická pridáva červené zvýraznenie riadku v zozname.' },
      {
        title: 'Automatické priradenie',
        body: 'Podľa toho, čo je zvolené v Nastavenia → Prideľovanie tiketov: manuálne (ostane nepridelený), postupne dokola, náhodne, alebo tomu, kto má aktuálne najmenej otvorených tiketov.',
      },
    ],
  },
  {
    title: 'Podporná stránka /support (bez prihlásenia)',
    entries: [
      {
        title: 'Hlavička a banner',
        body: 'Logo a názov firmy, pod ním prípadný banner s dôležitým oznámením (spravovaný v Nastavenia → Podporná stránka → Banner).',
      },
      {
        title: 'Úvodná časť',
        body: 'Uvítací nadpis/podnadpis (upraviteľné v Nastavenia → Podporná stránka) a tri tlačidlá: Nahlásiť problém, Skontrolovať stav požiadavky, Znalostná báza.',
      },
      {
        title: 'Kategórie problémov',
        body: 'Šesť dlaždíc (IT problém, Prístup/heslo, Hardvér, Softvér, Nová požiadavka, Iné) — slúžia len ako vizuálny prehľad typov požiadaviek, kliknutím sa nič nespustí.',
      },
      {
        title: 'Info pruh',
        body: 'Prevádzkové hodiny s farebnou bodkou (zelená = "Sme tu pre vás" počas nastavených hodín, sivá = mimo nich), telefón na urgentné prípady (ak je vyplnený v Nastaveniach) a odkaz na Najčastejšie riešené témy.',
      },
      {
        title: 'Ako to funguje',
        body: 'Tri kroky vysvetľujúce postup: Nahlásenie → Spracovanie → Riešenie.',
      },
      {
        title: 'Znalostná báza',
        body: 'Najviac 3 obľúbené články priamo na úvode, celý zoznam po kliknutí na "Znalostná báza". Obsah sa spravuje v Nastavenia → Obsah podpory → Znalostná báza — každý článok má názov, kategóriu a voliteľný odkaz.',
      },
      {
        title: 'Nahlásiť problém — obmedzenia',
        body: 'Firma sa vyberá len z existujúceho zoznamu, a nedá sa vybrať konkrétny technik — o priradení rozhoduje interný tím (alebo automatika podľa Nastavenia → Prideľovanie tiketov).',
      },
      { title: 'Prílohy', body: 'Rovnaké možnosti ako v detaile tiketu — drag&drop, výber súboru, alebo vloženie screenshotu (Ctrl+V) do popisu.' },
      { title: 'Po odoslaní', body: 'Zobrazí sa číslo tiketu a tlačidlo "Nahlásiť ďalší problém" na okamžité zadanie ďalšej požiadavky.' },
      {
        title: 'Skontrolovať stav požiadavky',
        body: 'Vyžaduje číslo tiketu AJ emailovú adresu použitú pri nahlásení — obe sa musia zhodovať, inak sa tiket nezobrazí. Zobrazí stav, prioritu a či sa mu už venuje technik.',
      },
      {
        title: 'Doplňujúca správa a zrušenie tiketu',
        body: 'Po overení emailu môže klient poslať doplňujúcu otázku (zapíše sa do komunikácie alebo aktivity, podľa toho, či má tiket technika) alebo tiket sám zrušiť — stav sa zmení na Uzavretý.',
      },
    ],
  },
  {
    title: 'Live chat',
    entries: [
      {
        title: 'Tlačidlo "Live Chat" na /support',
        body: 'Ak je live chat zapnutý (Nastavenia → Podporná stránka → Všeobecné), vpravo dole na podpornej stránke sa zobrazí plávajúce tlačidlo "Live Chat". Návštevník zadá meno, email a nepovinne číslo tiketu, ktorého sa chat týka, potom môže písať priamo s podporou.',
      },
      {
        title: 'Inbox pre agentov (/livechat)',
        body: 'Zoznam všetkých konverzácií. Ak návštevník uviedol číslo tiketu, vedľa chatu sa zobrazí aj samotný tiket s jeho aktivitou — pre rýchlejšiu prácu bez prepínania obrazoviek.',
      },
      {
        title: 'Notifikácie',
        body: 'Nová správa od návštevníka rozbliká ikonu Live chat v hornej lište a pridá záznam do zvončeka notifikácií, spolu s jemným zvukovým tónom (dá sa vypnúť v Nastavenia → Podporná stránka → Všeobecné). Otvorením konverzácie v Live chate sa upozornenie stíši.',
      },
      { title: 'Ukončenie chatu', body: 'Návštevník aj agent môžu konverzáciu kedykoľvek ukončiť tlačidlom "Ukončiť chat" — po ukončení sa dá začať už len nová konverzácia.' },
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
      { title: 'Zákazníci', body: 'Rovnaká stránka ako Zákazníci v hornej lište — správa firiem a ich kolegov.' },
      {
        title: 'Obsah podpory',
        body: 'Dve záložky: "Šablóny odpovedí" (preddefinované texty do komunikácie) a "Znalostná báza" (články zobrazené v sekcii Najčastejšie riešené témy na /support, dajú sa pridávať, upravovať, mazať a preusporadúvať šípkami).',
      },
      {
        title: 'Podporná stránka',
        body: 'Dve záložky: "Všeobecné" (uvítacie texty, prevádzkové hodiny — textový popis aj presný čas/dni pre živý indikátor, telefón na urgentné prípady, text v päte, vypínače live chatu a zvukových upozornení) a "Banner" (oznámenie o odstávke alebo inej dôležitej správe, zobrazené aj klientom po prihlásení aj na /support).',
      },
      {
        title: 'Prideľovanie tiketov',
        body: 'Určuje, ako sa vyberá technik pre tiket, ktorý zakladá agent za niekoho iného: manuálne, automaticky postupne (round-robin), automaticky náhodne, alebo automaticky tomu s najnižším počtom aktuálne otvorených tiketov. Tikety z /support a tikety, ktoré si klient založí sám, ostávajú vždy nepridelené.',
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
        body: 'Kolegovia (klientske účty) vidia len tikety svojej vlastnej firmy. Interní agenti/technici (účty vytvorené priamo vo Firebase Console a zapísané do zoznamu povolených agentov) vidia všetko.',
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
  const [search, setSearch] = useState('');

  function toggle(title: string) {
    setOpenGroups((s) => ({ ...s, [title]: !s[title] }));
  }

  const query = search.trim();
  const isSearching = query.length > 0;

  const visibleGroups = useMemo(() => {
    if (!isSearching) return GROUPS;
    const q = query.toLowerCase();
    return GROUPS.map((g) => ({
      ...g,
      entries: g.entries.filter(
        (e) => e.title.toLowerCase().includes(q) || (typeof e.body === 'string' && e.body.toLowerCase().includes(q)),
      ),
    })).filter((g) => g.entries.length > 0);
  }, [query, isSearching]);

  return (
    <div style={{ maxWidth: 860 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', letterSpacing: 0.4 }}>NÁPOVEDA</div>
      <h1 style={{ fontSize: 24, margin: '4px 0 4px' }}>Legenda funkcií</h1>
      <p style={{ margin: '0 0 16px', color: 'var(--color-text-muted)', fontSize: 13.5 }}>
        Prehľad všetkých funkcií RONA Technická podpora — čo znamenajú a ako sa používajú.
      </p>

      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Icon
          name="search"
          size={13}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hľadať v Pomoci…"
          style={{
            width: '100%',
            padding: '10px 14px 10px 34px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
            fontSize: 13.5,
          }}
        />
      </div>

      {isSearching && (
        <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginBottom: 10 }}>
          {visibleGroups.reduce((sum, g) => sum + g.entries.length, 0)} výsledkov pre "{query}"
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {isSearching && visibleGroups.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-faint)', fontSize: 13.5 }}>
            Nič sa nenašlo.
          </div>
        )}
        {visibleGroups.map((group) => (
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
              <span style={{ transform: isSearching || openGroups[group.title] ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .15s' }}>
                ▾
              </span>
            </button>
            {(isSearching || openGroups[group.title]) && (
              <div style={{ padding: '6px 18px 16px' }}>
                {group.entries.map((entry) => (
                  <div key={entry.title} style={{ padding: '10px 0', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>
                      {isSearching ? highlight(entry.title, query) : entry.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                      {isSearching && typeof entry.body === 'string' ? highlight(entry.body, query) : entry.body}
                    </div>
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

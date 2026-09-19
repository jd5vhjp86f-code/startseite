/**
 * Build der Startseite rosenbaum.hamburg.
 *
 * Bewusst ohne Abhängigkeiten: Es geht darum, eine Handvoll Dateien
 * zusammenzusetzen. Jede Abhängigkeit wäre eine, die jemand in zwei Jahren
 * aktualisieren müsste.
 *
 *   node build.mjs           einmal bauen
 *   node build.mjs --watch   bauen, lokal ausliefern und bei Änderungen neu bauen
 */

import { createServer } from 'node:http';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = import.meta.dirname;
const QUELLE = join(WURZEL, 'src');
const OEFFENTLICH = join(WURZEL, 'public');
const ZIEL = join(WURZEL, 'dist');
const HAFEN = 4180;

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

/** Bricht den Build mit einer verständlichen Meldung ab. */
export class BuildFehler extends Error {
  constructor(message) {
    super(message);
    this.name = 'BuildFehler';
  }
}

/**
 * Entfernt aus CSS, was der Browser nicht braucht.
 *
 * Absichtlich zurückhaltend: Kommentare raus, Leerraum zusammenfassen. Mehr
 * spart kaum etwas und birgt nur die Gefahr, gültiges CSS zu zerbrechen.
 */
function kuerzeCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};:,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

/** Maskiert Text, der in HTML eingesetzt wird. */
function html(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Ersetzt {{PLATZHALTER}} und meckert, wenn einer übrig bleibt. */
function fuelle(vorlage, werte) {
  const ergebnis = vorlage.replace(/\{\{([A-Z_]+)\}\}/g, (_treffer, name) => {
    if (!(name in werte)) {
      throw new BuildFehler(`Die Vorlage nutzt {{${name}}}, aber dafür gibt es keinen Wert.`);
    }
    return werte[name];
  });
  const uebrig = /\{\{([A-Z_]+)\}\}/.exec(ergebnis);
  if (uebrig !== null) {
    throw new BuildFehler(`Platzhalter {{${uebrig[1]}}} wurde nicht ersetzt.`);
  }
  return ergebnis;
}

/**
 * Entfernt aus JavaScript, was der Browser nicht braucht.
 *
 * Genauso zurückhaltend wie beim CSS: nur Zeilenkommentare und führender
 * Leerraum. Beides ist gefahrlos, alles Weitere wäre ein Minifier.
 */
function kuerzeJs(js) {
  return js
    .split('\n')
    .map((zeile) => zeile.trim())
    .filter((zeile) => zeile !== '' && !zeile.startsWith('//'))
    .join('\n');
}

/**
 * Die Angaben für die Vorschau in Messengern.
 *
 * Absolute Adressen, weil Messenger relative Pfade nicht auflösen.
 */
function openGraph(titel, beschreibung) {
  const basis = 'https://www.rosenbaum.hamburg';
  return [
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${html(titel)}" />`,
    `<meta property="og:description" content="${html(beschreibung)}" />`,
    `<meta property="og:url" content="${basis}/" />`,
    `<meta property="og:image" content="${basis}/og-image.png" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:locale" content="de_DE" />',
    '<meta name="twitter:card" content="summary_large_image" />',
  ].join('\n    ');
}

/**
 * Lädt die Schriftschnitte vor, die sofort sichtbar sind.
 *
 * Nur latin und nur 400 und 800: Das ist die Wortmarke und der Fließtext über
 * dem Falz. Alles andere holt der Browser, wenn er es braucht.
 */
function schriftVorladen() {
  return ['overpass-latin-800-normal.woff2', 'overpass-latin-400-normal.woff2']
    .map((datei) => `<link rel="preload" href="fonts/${datei}" as="font" type="font/woff2" crossorigin />`)
    .join('\n    ');
}

/* ------------------------------------------------------------------ */
/* Inhalte                                                             */
/* ------------------------------------------------------------------ */

/**
 * Liest sites.json, sofern vorhanden.
 *
 * Solange es die Datei nicht gibt, zeigt die Seite den Platzhalter. So ist der
 * Build ab dem ersten Tag deploybar, auch bevor Inhalte feststehen.
 */
async function leseInhalte() {
  try {
    const roh = await readFile(join(WURZEL, 'sites.json'), 'utf8');
    return JSON.parse(roh);
  } catch (fehler) {
    if (fehler.code === 'ENOENT') return null;
    if (fehler instanceof SyntaxError) {
      throw new BuildFehler(
        `sites.json ist kein gültiges JSON: ${fehler.message}\n` +
          'Häufigste Ursache: ein Komma zu viel hinter dem letzten Eintrag.',
      );
    }
    throw new BuildFehler(`sites.json ließ sich nicht lesen: ${fehler.message}`);
  }
}

/* ------------------------------------------------------------------ */
/* Prüfung der Inhalte                                                 */
/* ------------------------------------------------------------------ */

export const PFLICHTFELDER = ['id', 'title', 'description', 'url', 'icon', 'color', 'status'];
const ERLAUBTE_STATUS = ['live', 'bald'];

/**
 * Begriffe, die auf eine interne Anwendung hindeuten.
 *
 * Diese Seite ist öffentlich. Ein Link hierher macht ein internes System für
 * jeden auffindbar, der die Startseite aufruft - deshalb wird gewarnt, statt
 * es stillschweigend zu verlinken.
 */
const HEIKLE_BEGRIFFE = ['dashboard', 'praxis', 'intern', 'admin', 'anamnese', 'patient'];

/** Relative Helligkeit nach WCAG. */
function helligkeit(hex) {
  const kanaele = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const linear = kanaele.map((wert) => (wert <= 0.03928 ? wert / 12.92 : ((wert + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** Kontrastverhältnis einer Farbe zu Weiß. */
export function kontrastTrifftWeiss(hex) {
  return Math.round((1.05 / (helligkeit(hex) + 0.05)) * 100) / 100;
}

/**
 * Prüft sites.json und bricht bei Fehlern mit einer Meldung ab, mit der man
 * etwas anfangen kann.
 */
export function pruefe(inhalte, symbole) {
  const fehler = [];
  const warnungen = [];

  if (!Array.isArray(inhalte.sites)) {
    throw new BuildFehler('In sites.json fehlt die Liste "sites".');
  }

  const gesehen = new Set();
  inhalte.sites.forEach((eintrag, nummer) => {
    const wo = `Eintrag ${nummer + 1}${typeof eintrag?.id === 'string' ? ` ("${eintrag.id}")` : ''}`;
    if (typeof eintrag !== 'object' || eintrag === null) {
      fehler.push(`${wo}: ist kein Objekt.`);
      return;
    }

    for (const feld of PFLICHTFELDER) {
      if (typeof eintrag[feld] !== 'string' || eintrag[feld].trim() === '') {
        fehler.push(`${wo}: Das Feld "${feld}" fehlt oder ist leer.`);
      }
    }

    if (typeof eintrag.id === 'string') {
      if (!/^[a-z0-9-]+$/.test(eintrag.id)) {
        fehler.push(`${wo}: Die id darf nur a-z, 0-9 und Bindestriche enthalten.`);
      }
      if (gesehen.has(eintrag.id)) {
        fehler.push(`${wo}: Die id "${eintrag.id}" kommt mehrfach vor.`);
      }
      gesehen.add(eintrag.id);
    }

    if (typeof eintrag.url === 'string' && !eintrag.url.startsWith('https://')) {
      fehler.push(`${wo}: Die Adresse muss mit https:// beginnen, hier steht "${eintrag.url}".`);
    }

    if (typeof eintrag.status === 'string' && !ERLAUBTE_STATUS.includes(eintrag.status)) {
      fehler.push(`${wo}: status ist "${eintrag.status}", erlaubt sind ${ERLAUBTE_STATUS.join(' und ')}.`);
    }

    if (typeof eintrag.icon === 'string' && !symbole.has(eintrag.icon)) {
      fehler.push(
        `${wo}: Das Symbol "${eintrag.icon}" gibt es nicht. Vorhanden sind: ${[...symbole.keys()].sort().join(', ')}.`,
      );
    }

    if (typeof eintrag.color === 'string') {
      if (!/^#[0-9a-fA-F]{6}$/.test(eintrag.color)) {
        fehler.push(`${wo}: color muss ein Hex-Wert mit sechs Stellen sein, z. B. #0069B4.`);
      } else {
        const kontrast = kontrastTrifftWeiss(eintrag.color);
        if (kontrast < 4.5) {
          fehler.push(
            `${wo}: Die Farbe ${eintrag.color} hat zu wenig Kontrast zu Weiß (${kontrast}:1, nötig sind 4,5:1). ` +
              'Weißer Text darauf wäre schlecht lesbar - bitte einen dunkleren Ton wählen.',
          );
        }
      }
    }

    const text = `${eintrag.url ?? ''} ${eintrag.title ?? ''} ${eintrag.description ?? ''}`.toLowerCase();
    const treffer = HEIKLE_BEGRIFFE.filter((begriff) => text.includes(begriff));
    if (treffer.length > 0) {
      warnungen.push(
        `${wo}: enthält ${treffer.map((t) => `"${t}"`).join(', ')}. Diese Seite ist öffentlich - ` +
          'interne Anwendungen gehören nicht in sites.json.',
      );
    }
  });

  if (fehler.length > 0) {
    throw new BuildFehler(`sites.json hat ${fehler.length} Fehler:\n  - ${fehler.join('\n  - ')}`);
  }
  for (const warnung of warnungen) {
    console.warn(`WARNUNG: ${warnung}`);
  }
}

/* ------------------------------------------------------------------ */
/* Kacheln                                                             */
/* ------------------------------------------------------------------ */

/** Liest alle Symbol-SVGs ein, damit sie inline eingesetzt werden können. */
export async function leseSymbole() {
  const ordner = join(QUELLE, 'icons');
  const symbole = new Map();
  for (const name of await readdir(ordner)) {
    if (!name.endsWith('.svg')) continue;
    const roh = await readFile(join(ordner, name), 'utf8');
    // aria-hidden, weil der Titel daneben steht - das Symbol sagt nichts Neues.
    symbole.set(name.replace(/\.svg$/, ''), roh.trim().replace('<svg ', '<svg aria-hidden="true" focusable="false" '));
  }
  return symbole;
}

/** Die Adresse ohne https:// und ohne abschließenden Schrägstrich. */
export function schlichteAdresse(url) {
  return url.replace(/^https:\/\//, '').replace(/\/$/, '');
}

/** Eine einzelne Kachel. Bei status "bald" ohne Link. */
function kachel(eintrag, symbole) {
  const symbol = symbole.get(eintrag.icon) ?? '';
  const inneres = `<span class="kachel__symbol" style="--farbe:${eintrag.color}">${symbol}</span>
          <span class="kachel__text">
            <span class="kachel__titel">${html(eintrag.title)}</span>
            <span class="kachel__beschreibung">${html(eintrag.description)}</span>
            <span class="kachel__adresse">${eintrag.status === 'bald' ? 'Kommt bald' : html(schlichteAdresse(eintrag.url))}</span>
          </span>`;

  if (eintrag.status === 'bald') {
    return `<li class="kachel kachel--bald" style="--farbe:${eintrag.color}">
          ${inneres}
        </li>`;
  }
  return `<li><a class="kachel" href="${html(eintrag.url)}" style="--farbe:${eintrag.color}">
          ${inneres}
        </a></li>`;
}

/** Alle Kacheln als Liste. */
function kacheln(sichtbare, symbole) {
  return `<ul class="kacheln">
        ${sichtbare.map((eintrag) => kachel(eintrag, symbole)).join('\n        ')}
      </ul>`;
}

/* ------------------------------------------------------------------ */
/* Liniennetz                                                          */
/* ------------------------------------------------------------------ */

/**
 * Bricht einen Stationsnamen auf höchstens zwei Zeilen um.
 *
 * SVG-Text bricht nicht von selbst um. Lange Namen wie "PDF-Anonymisierer"
 * würden sonst in die Nachbarstation ragen.
 */
function zweiZeilen(titel, maxZeichen = 15) {
  if (titel.length <= maxZeichen) return [titel];

  // Zuerst am Leerzeichen trennen, sonst am Bindestrich.
  const stellen = [...titel.matchAll(/[\s-]/g)].map((treffer) => treffer.index ?? 0);
  if (stellen.length === 0) return [titel];

  const mitte = titel.length / 2;
  const beste = stellen.reduce((a, b) => (Math.abs(a - mitte) <= Math.abs(b - mitte) ? a : b));
  const trenner = titel[beste];
  const erste = titel.slice(0, beste) + (trenner === '-' ? '-' : '');
  return [erste, titel.slice(beste + 1)];
}

/**
 * Das Liniennetz als SVG: eine durchgezogene Linie, links der Knotenpunkt
 * "Start", danach je Projekt eine Station.
 *
 * Die Maße stehen im viewBox-System, damit die Grafik ohne Umrechnung jeder
 * Breite folgt. Gezeichnet wird von links nach rechts in der Reihenfolge aus
 * sites.json.
 */
function liniennetz(sichtbare) {
  const BREITE = 1000;
  const RAND = 62;
  const Y_LINIE = 40;
  const Y_NAME = 76;
  const ZEILENHOEHE = 21;

  // Der Knotenpunkt trägt keinen Eintrag aus sites.json, deshalb wird hier
  // vereinheitlicht: jede Station hat einen \.
  const stationen = [
    { titel: 'Start', knoten: true },
    ...sichtbare.map((eintrag) => ({ ...eintrag, titel: eintrag.title, knoten: false })),
  ];
  const spanne = BREITE - 2 * RAND;
  const schritt = stationen.length > 1 ? spanne / (stationen.length - 1) : 0;
  const x = (nummer) => RAND + nummer * schritt;

  const hoehe = Y_NAME + ZEILENHOEHE + 8;
  const laenge = spanne;

  const teile = stationen.map((station, nummer) => {
    const mitte = x(nummer);
    const zeilen = zweiZeilen(station.titel);
    const text = zeilen
      .map(
        (zeile, i) =>
          `<tspan x="${mitte.toFixed(1)}" y="${(Y_NAME + i * ZEILENHOEHE).toFixed(1)}">${html(zeile)}</tspan>`,
      )
      .join('');

    const bald = station.status === 'bald';
    const klassen = ['netz__station', bald ? 'netz__station--bald' : ''].filter(Boolean).join(' ');
    const punkt = `<circle class="netz__punkt${station.knoten ? ' netz__punkt--knoten' : ''}${bald ? ' netz__punkt--bald' : ''}" cx="${mitte.toFixed(1)}" cy="${Y_LINIE}" r="${station.knoten ? 13 : 10}" />`;
    const name = `<text class="netz__name">${text}</text>`;
    const stil = `--nummer:${nummer}${station.knoten ? '' : `;--farbe:${station.color}`}`;

    // Der Knotenpunkt ist die Seite selbst und bekommt deshalb keinen Link;
    // eine Station mit "bald" gibt es noch nicht, also auch nicht.
    if (station.knoten || bald) {
      return `<g class="${klassen}" style="${stil}">${punkt}${name}</g>`;
    }
    return `<a class="${klassen}" style="${stil}" href="${html(station.url)}">${punkt}${name}</a>`;
  });

  return `<nav aria-label="Projektübersicht">
        <svg class="netz" viewBox="0 0 ${BREITE} ${hoehe}" style="--laenge:${laenge}" role="group">
          <line class="netz__linie" x1="${RAND}" y1="${Y_LINIE}" x2="${BREITE - RAND}" y2="${Y_LINIE}" />
          ${teile.join('\n          ')}
        </svg>
      </nav>`;
}

/** Der Platzhalter, solange es noch keine Kacheln gibt. */
function platzhalter() {
  return `<section class="aufbau">
        <h2>Im Aufbau</h2>
        <p>Hier entsteht eine Übersicht der Projekte auf dieser Domain. Schau später noch einmal vorbei.</p>
      </section>`;
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

async function baue() {
  const inhalte = await leseInhalte();
  const seite = inhalte?.site ?? {};
  const titel = seite.title ?? 'rosenbaum.hamburg';
  const tagline = seite.tagline ?? 'Projekte und Werkzeuge der Familie Rosenbaum';
  const noindex = seite.noindex !== false;

  const symbole = await leseSymbole();
  let inhalt = platzhalter();
  let anzahl = 0;

  if (inhalte !== null) {
    pruefe(inhalte, symbole);
    // "hidden" nimmt eine Kachel vorübergehend heraus, ohne den Eintrag zu verlieren.
    const sichtbare = inhalte.sites.filter((eintrag) => eintrag.hidden !== true);
    anzahl = sichtbare.length;
    if (anzahl > 0) inhalt = `${liniennetz(sichtbare)}\n\n      ${kacheln(sichtbare, symbole)}`;
  }

  const vorlage = await readFile(join(QUELLE, 'template.html'), 'utf8');
  const css = kuerzeCss(await readFile(join(QUELLE, 'styles.css'), 'utf8'));
  const themeSofort = kuerzeJs(await readFile(join(QUELLE, 'theme-sofort.js'), 'utf8'));
  const theme = kuerzeJs(await readFile(join(QUELLE, 'theme.js'), 'utf8'));

  // Die Links auf Impressum und Datenschutz erscheinen erst, wenn die Seiten
  // ausgefüllt sind. Ein Link auf eine Vorlage voller Platzhalter wäre
  // schlechter als gar kein Link.
  const rechtliches = seite.legal === true;

  /** Baut eine Seite aus der Vorlage. */
  function seiteBauen({ seitentitel, beschreibung, inhalt, markeVerlinkt }) {
    const vollerTitel = seitentitel === undefined ? titel : `${seitentitel} – ${titel}`;
    return fuelle(vorlage, {
      TITEL: html(titel),
      SEITENTITEL: html(vollerTitel),
      MARKE: markeVerlinkt ? `<a href="/">${html(titel)}</a>` : html(titel),
      TAGLINE: html(tagline),
      BESCHREIBUNG: html(beschreibung ?? tagline),
      ROBOTS: noindex ? '<meta name="robots" content="noindex" />' : '',
      OPENGRAPH: openGraph(vollerTitel, beschreibung ?? tagline),
      CSS: css,
      INHALT: inhalt,
      VORLADEN: schriftVorladen(),
      THEME_SOFORT: themeSofort,
      THEME: theme,
      FUSS_RECHTLICHES: rechtliches
        ? '<p><a href="/impressum.html">Impressum</a> &middot; <a href="/datenschutz.html">Datenschutz</a></p>'
        : '',
      JAHR: String(new Date().getFullYear()),
    });
  }

  const dokument = seiteBauen({ inhalt, markeVerlinkt: false });

  await rm(ZIEL, { recursive: true, force: true });
  await mkdir(ZIEL, { recursive: true });
  await writeFile(join(ZIEL, 'index.html'), dokument, 'utf8');

  // Unterseiten aus ihren Inhaltsdateien.
  const unterseiten = [
    { datei: '404.html', seitentitel: 'Seite nicht gefunden' },
    { datei: 'impressum.html', seitentitel: 'Impressum' },
    { datei: 'datenschutz.html', seitentitel: 'Datenschutz' },
  ];
  for (const unterseite of unterseiten) {
    const roh = await readFile(join(QUELLE, unterseite.datei), 'utf8');
    await writeFile(
      join(ZIEL, unterseite.datei),
      seiteBauen({ seitentitel: unterseite.seitentitel, inhalt: roh.trimEnd(), markeVerlinkt: true }),
      'utf8',
    );
  }

  // Solange die Seite auf noindex steht, halten wir Suchmaschinen auch per
  // robots.txt fern - ein Signal allein reicht nicht zuverlässig.
  await writeFile(join(ZIEL, 'robots.txt'), noindex ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n', 'utf8');

  await cp(join(QUELLE, 'fonts'), join(ZIEL, 'fonts'), { recursive: true });
  await cp(OEFFENTLICH, ZIEL, { recursive: true });

  const bytes = Buffer.byteLength(dokument, 'utf8');
  console.log(`Gebaut: ${anzahl} Kacheln, index.html ${(bytes / 1024).toFixed(1)} KB`);
  if (inhalte === null) {
    console.log('Hinweis: Noch keine sites.json - es wird die Platzhalterseite ausgeliefert.');
  }

  // Solange GitHub Pages noch aus dem Branch ausliefert, liegt im
  // Wurzelverzeichnis eine zweite, von Hand gepflegte index.html. Sie ist dann
  // die Seite, die Besucher sehen - nicht diese hier.
  try {
    await stat(join(WURZEL, 'index.html'));
    console.warn(
      'HINWEIS: Im Wurzelverzeichnis liegt noch eine index.html. Sie stammt aus der Zeit vor diesem\n' +
        '         Build und wird von GitHub Pages im Modus "Deploy from a branch" ausgeliefert.\n' +
        '         Sobald Pages auf "GitHub Actions" steht, kann sie gelöscht werden.',
    );
  } catch {
    // Gibt es nicht mehr - gut so.
  }
}

/* ------------------------------------------------------------------ */
/* Lokal ausliefern                                                    */
/* ------------------------------------------------------------------ */

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function liefereAus() {
  createServer(async (anfrage, antwort) => {
    const pfad = decodeURIComponent((anfrage.url ?? '/').split('?')[0]);
    const datei = resolve(ZIEL, `.${pfad === '/' ? '/index.html' : pfad}`);
    // Nicht aus dem Zielverzeichnis herausführen lassen.
    if (!datei.startsWith(ZIEL)) {
      antwort.writeHead(403).end('Verboten');
      return;
    }
    try {
      const inhalt = await readFile(datei);
      antwort.writeHead(200, { 'Content-Type': TYPEN[extname(datei)] ?? 'application/octet-stream' });
      antwort.end(inhalt);
    } catch {
      antwort.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Nicht gefunden');
    }
  }).listen(HAFEN, () => {
    console.log(`Lokal erreichbar: http://localhost:${HAFEN}`);
  });
}

/* ------------------------------------------------------------------ */

// Nur bauen, wenn die Datei direkt aufgerufen wurde. Beim Import aus den
// Tests soll sie nur ihre Funktionen hergeben.
const direktAufgerufen = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (!direktAufgerufen) {
  // Als Modul geladen - nichts tun.
} else {
  try {
    await baue();
  } catch (fehler) {
    console.error(`\nBuild abgebrochen: ${fehler.message}\n`);
    process.exit(1);
  }
}

if (direktAufgerufen && process.argv.includes('--watch')) {
  liefereAus();
  let laeuft = false;
  for (const ordner of [QUELLE, WURZEL]) {
    watch(ordner, { recursive: ordner === QUELLE }, async (_art, name) => {
      if (name === 'dist' || laeuft) return;
      laeuft = true;
      try {
        await baue();
      } catch (fehler) {
        console.error(`Build abgebrochen: ${fehler.message}`);
      }
      setTimeout(() => {
        laeuft = false;
      }, 100);
    });
  }
}

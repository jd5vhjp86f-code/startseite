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

const WURZEL = import.meta.dirname;
const QUELLE = join(WURZEL, 'src');
const OEFFENTLICH = join(WURZEL, 'public');
const ZIEL = join(WURZEL, 'dist');
const HAFEN = 4180;

/* ------------------------------------------------------------------ */
/* Hilfen                                                              */
/* ------------------------------------------------------------------ */

/** Bricht den Build mit einer verständlichen Meldung ab. */
class BuildFehler extends Error {
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
    throw new BuildFehler(`sites.json ließ sich nicht lesen: ${fehler.message}`);
  }
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

  const vorlage = await readFile(join(QUELLE, 'template.html'), 'utf8');
  const css = kuerzeCss(await readFile(join(QUELLE, 'styles.css'), 'utf8'));

  const dokument = fuelle(vorlage, {
    TITEL: html(titel),
    TAGLINE: html(tagline),
    BESCHREIBUNG: html(tagline),
    ROBOTS: noindex ? '<meta name="robots" content="noindex" />' : '',
    CSS: css,
    INHALT: platzhalter(),
    JAHR: String(new Date().getFullYear()),
  });

  await rm(ZIEL, { recursive: true, force: true });
  await mkdir(ZIEL, { recursive: true });
  await writeFile(join(ZIEL, 'index.html'), dokument, 'utf8');

  // Solange die Seite auf noindex steht, halten wir Suchmaschinen auch per
  // robots.txt fern - ein Signal allein reicht nicht zuverlässig.
  await writeFile(join(ZIEL, 'robots.txt'), noindex ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n', 'utf8');

  await cp(OEFFENTLICH, ZIEL, { recursive: true });

  const groesse = (await readdir(ZIEL)).length;
  console.log(`Gebaut: ${groesse} Einträge in dist/ (CSS ${css.length} Zeichen)`);
  if (inhalte === null) {
    console.log('Hinweis: Noch keine sites.json - es wird die Platzhalterseite ausgeliefert.');
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

try {
  await baue();
} catch (fehler) {
  console.error(`\nBuild abgebrochen: ${fehler.message}\n`);
  process.exit(1);
}

if (process.argv.includes('--watch')) {
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

/**
 * Prüfungen für die Validierung von sites.json.
 *
 * Ohne Test-Bibliothek: node:test gehört zu Node. Wer hier etwas ändert, soll
 * kein npm install brauchen.
 *
 *   node --test
 */

import { strict as assert } from 'node:assert';
import test from 'node:test';
import { BuildFehler, kontrastTrifftWeiss, leseSymbole, pruefe, schlichteAdresse } from './build.mjs';
import { readFile } from 'node:fs/promises';

const symbole = await leseSymbole();

/** Ein gültiger Eintrag, aus dem die Fälle abgeleitet werden. */
function eintrag(aenderungen = {}) {
  return {
    id: 'beispiel',
    title: 'Beispiel',
    description: 'Ein Satz dazu.',
    url: 'https://beispiel.rosenbaum.hamburg',
    icon: 'globe',
    color: '#0069B4',
    status: 'live',
    ...aenderungen,
  };
}

function pruefeMit(...eintraege) {
  return () => {
    pruefe({ site: {}, sites: eintraege }, symbole);
  };
}

/** Prüft, dass abgebrochen wird und die Meldung den Hinweis enthält. */
function bricht_ab(fall, hinweis) {
  assert.throws(fall, (fehler) => {
    assert.ok(fehler instanceof BuildFehler, 'Es sollte ein BuildFehler sein.');
    assert.ok(
      fehler.message.includes(hinweis),
      `Die Meldung sollte "${hinweis}" enthalten, lautet aber:\n${fehler.message}`,
    );
    return true;
  });
}

test('gültige Einträge gehen durch', () => {
  assert.doesNotThrow(pruefeMit(eintrag()));
  assert.doesNotThrow(pruefeMit(eintrag({ status: 'bald' })));
  assert.doesNotThrow(pruefeMit(eintrag({ id: 'a' }), eintrag({ id: 'b' })));
});

test('die echte sites.json ist gültig', async () => {
  const inhalte = JSON.parse(await readFile(new URL('./sites.json', import.meta.url), 'utf8'));
  assert.doesNotThrow(() => {
    pruefe(inhalte, symbole);
  });
  assert.ok(inhalte.sites.length > 0, 'Es sollte mindestens eine Kachel geben.');
});

test('fehlende Pflichtfelder brechen ab', () => {
  for (const feld of ['id', 'title', 'description', 'url', 'icon', 'color', 'status']) {
    const ohne = eintrag();
    delete ohne[feld];
    bricht_ab(pruefeMit(ohne), `"${feld}"`);
  }
  bricht_ab(pruefeMit(eintrag({ description: '   ' })), '"description"');
});

test('doppelte id bricht ab', () => {
  bricht_ab(pruefeMit(eintrag(), eintrag()), 'kommt mehrfach vor');
});

test('id nur mit Kleinbuchstaben, Ziffern und Bindestrich', () => {
  bricht_ab(pruefeMit(eintrag({ id: 'Gross' })), 'nur a-z');
  bricht_ab(pruefeMit(eintrag({ id: 'mit leer' })), 'nur a-z');
  assert.doesNotThrow(pruefeMit(eintrag({ id: 'a-1' })));
});

test('Adresse muss https sein', () => {
  bricht_ab(pruefeMit(eintrag({ url: 'http://unsicher.de' })), 'https://');
  bricht_ab(pruefeMit(eintrag({ url: 'beispiel.de' })), 'https://');
});

test('unbekanntes Symbol bricht ab und listet die vorhandenen auf', () => {
  bricht_ab(pruefeMit(eintrag({ icon: 'einhorn' })), 'gibt es nicht');
  bricht_ab(pruefeMit(eintrag({ icon: 'einhorn' })), 'globe');
});

test('unbekannter status bricht ab', () => {
  bricht_ab(pruefeMit(eintrag({ status: 'vielleicht' })), 'erlaubt sind');
});

test('Farbe muss ein Hex-Wert sein', () => {
  bricht_ab(pruefeMit(eintrag({ color: 'blau' })), 'Hex-Wert');
  bricht_ab(pruefeMit(eintrag({ color: '#abc' })), 'Hex-Wert');
});

test('zu heller Farbton bricht ab, dunkler geht durch', () => {
  bricht_ab(pruefeMit(eintrag({ color: '#FFDD00' })), 'Kontrast zu Weiß');
  assert.doesNotThrow(pruefeMit(eintrag({ color: '#00875A' })));
});

test('Kontrastberechnung stimmt mit bekannten Werten überein', () => {
  assert.equal(kontrastTrifftWeiss('#000000'), 21);
  assert.equal(kontrastTrifftWeiss('#ffffff'), 1);
  assert.ok(kontrastTrifftWeiss('#0069B4') > 4.5);
});

test('fehlende Liste bricht mit klarer Meldung ab', () => {
  bricht_ab(() => {
    pruefe({ site: {} }, symbole);
  }, 'fehlt die Liste');
});

test('interne Anwendungen erzeugen eine Warnung, aber keinen Abbruch', () => {
  const gesammelt = [];
  const echt = console.warn;
  console.warn = (text) => gesammelt.push(text);
  try {
    pruefe({ site: {}, sites: [eintrag({ id: 'praxis', title: 'Praxis-Dashboard' })] }, symbole);
  } finally {
    console.warn = echt;
  }
  assert.equal(gesammelt.length, 1);
  assert.ok(gesammelt[0].includes('öffentlich'), gesammelt[0]);
  assert.ok(gesammelt[0].includes('dashboard'), gesammelt[0]);
});

test('Adresse wird für die Anzeige entschlackt', () => {
  assert.equal(schlichteAdresse('https://pdf.rosenbaum.hamburg/'), 'pdf.rosenbaum.hamburg');
  assert.equal(schlichteAdresse('https://a.de/pfad'), 'a.de/pfad');
});

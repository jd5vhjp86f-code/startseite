# Startseite rosenbaum.hamburg

Übersicht aller Projekte auf Subdomains von `rosenbaum.hamburg`, als Kacheln
verlinkt. Statisches HTML, keine Cookies, kein Tracking, keine externen
Ressourcen.

## Neue Subdomain hinzufügen

1. `sites.json` öffnen.
2. Im Abschnitt `sites` einen Eintrag ergänzen – am einfachsten einen
   bestehenden kopieren und anpassen.
3. `title`, `description`, `url`, `icon`, `color` und `status` ausfüllen.
4. Datei speichern und auf `main` pushen.
5. Nach ein bis zwei Minuten ist die Kachel unter
   [www.rosenbaum.hamburg](https://www.rosenbaum.hamburg) da.

Mehr ist nicht nötig. Passt etwas nicht, bricht der Build ab und sagt, was
fehlt – die Seite bleibt dann unverändert online.

> **Nicht aufnehmen:** alles mit Praxis- oder Patientenbezug. Diese Seite ist
> öffentlich; ein Link macht interne Systeme für jeden auffindbar.

### Die Felder

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | ja | Kurzname, eindeutig, nur `a–z`, `0–9`, `-` |
| `title` | ja | Anzeigename, etwa bis 24 Zeichen |
| `description` | ja | Ein Satz, was man dort tun kann, etwa bis 90 Zeichen |
| `url` | ja | Vollständige Adresse, muss mit `https://` beginnen |
| `icon` | ja | Dateiname aus `src/icons/` ohne `.svg` |
| `color` | ja | Linienfarbe als Hex-Wert, Kontrast zu Weiß mindestens 4,5 : 1 |
| `status` | ja | `live` = verlinkt, `bald` = sichtbar, aber nicht klickbar |
| `hidden` | nein | `true` blendet den Eintrag aus, ohne ihn zu löschen |

Der Build prüft das alles und nennt beim Abbruch den Eintrag und das Feld.

### Ein neues Symbol

Die Symbole kommen von [Lucide](https://lucide.dev) und liegen in
`src/icons/`. Für ein neues: das SVG dort ablegen, Breite und Höhe entfernen
(die Größe kommt aus dem CSS) und den Dateinamen ohne `.svg` als `icon`
eintragen. Nennt man ein Symbol, das es nicht gibt, listet der Build die
vorhandenen auf.

## Entwicklung

```bash
npm run build    # einmal bauen, Ergebnis in dist/
npm run dev      # bauen, lokal unter http://localhost:4180 ausliefern und
                 # bei Änderungen neu bauen
npm test         # prüft die Validierung von sites.json
```

Es gibt keine Abhängigkeiten: `npm install` ist nicht nötig, Node ≥ 20 genügt.
Auch die Tests laufen mit `node:test` aus der Standardbibliothek.

## Aufbau

```
sites.json          Inhalte – die einzige Datei, die regelmäßig geändert wird
build.mjs           liest sites.json, prüft sie und schreibt dist/
test.mjs            Tests für die Prüfung
src/template.html   HTML-Gerüst mit Platzhaltern
src/styles.css      Design-Tokens, Schrift, Layout
src/theme.js        Hell/Dunkel-Schalter
src/icons/          die verwendeten Symbole (Lucide, ISC-Lizenz)
src/fonts/          Schrift Overpass (SIL Open Font License)
src/404.html        Inhalt der Fehlerseite
src/impressum.html  Vorlage, noch nicht ausgefüllt
src/datenschutz.html Vorlage, noch nicht ausgefüllt
public/CNAME        die Domain – nie löschen
public/favicon.svg  Seitensymbol
public/og-image.png Vorschaubild für Messenger
```

## Impressum und Datenschutz

Beide Seiten liegen als Vorlage mit Platzhaltern vor und sind **nicht**
verlinkt. Ein Link auf eine Seite voller eckiger Klammern wäre schlechter als
gar kein Link. Sobald sie ausgefüllt sind: in `sites.json` unter `site` den
Wert `"legal": true` setzen, dann erscheinen die Links in der Fußzeile.

## Zwei Punkte, die man wissen sollte

**Die Seite steht auf `noindex`.** Das ist so gewollt und sorgt dafür, dass
Suchmaschinen sie nicht aufnehmen. Ein Lighthouse-Bericht bewertet SEO deshalb
mit 63 statt 100 – ohne `noindex` sind es 100. Das ist kein Mangel, sondern die
Folge der Entscheidung. Wer die Seite auffindbar machen will, setzt in
`sites.json` `"noindex": false`.

**GitHub Pages muss auf „GitHub Actions" stehen.** Solange es auf „Deploy from
a branch" steht, liefert Pages die alte `index.html` aus dem Wurzelverzeichnis
aus und ignoriert alles hier. Der Build weist darauf hin, solange diese Datei
noch existiert.

Der vollständige Plan steht in [PLAN.md](PLAN.md), die Projektregeln in
[CLAUDE.md](CLAUDE.md).

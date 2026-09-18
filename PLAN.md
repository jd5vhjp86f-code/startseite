# Startseite www.rosenbaum.hamburg – Umsetzungsplan für Claude Code

> Arbeitsgrundlage für Claude Code. Umsetzung **phasenweise**: Nach jeder Phase stoppen,
> Ergebnis kurz zusammenfassen und auf Freigabe warten. Bei Unklarheiten nachfragen statt raten.

---

## 1. Ziel

Eine schlanke, schnelle Startseite unter **https://www.rosenbaum.hamburg**, die alle Projekte
auf Subdomains (z. B. `mathemoritz.rosenbaum.hamburg`, `pdf.rosenbaum.hamburg`) als Kacheln
mit Symbol, Kurzbeschreibung und Link anzeigt.

- Hosting: **GitHub Pages** (eigenes Repository), Deployment über GitHub Actions
- `rosenbaum.hamburg` (ohne www) leitet automatisch auf `www.rosenbaum.hamburg` um
- Neue Subdomain hinzufügen = **ein Eintrag in `sites.json`**, sonst nichts
- Keine Cookies, kein Tracking, **keine externen Ressourcen** (keine CDNs, keine Google Fonts)

### Leitprinzipien
1. **Wartbar ohne Programmierkenntnisse:** Alle Inhalte stehen in einer einzigen Datei `sites.json`.
2. **Statisches HTML:** Die Kacheln werden beim Build ins HTML geschrieben. Die Seite funktioniert
   vollständig ohne JavaScript; JS nur für den Hell/Dunkel-Umschalter.
3. **Datensparsam:** Schriften und Symbole liegen im Repository. Der Browser lädt nichts von Dritten.
4. **Schnell & barrierearm:** Lighthouse ≥ 95 in allen Kategorien, WCAG-AA-Kontraste, Tastaturbedienung.

---

## 2. Inhalte: `sites.json`

Einzige Quelle für alle Kacheln. Reihenfolge in der Datei = Reihenfolge auf der Seite.

```json
{
  "site": {
    "title": "rosenbaum.hamburg",
    "tagline": "Projekte und Werkzeuge der Familie Rosenbaum",
    "noindex": true
  },
  "sites": [
    {
      "id": "mathemoritz",
      "title": "Mathe-Trainer",
      "description": "Brüche, Dezimalzahlen und mehr – spielerisch üben für Klasse 7.",
      "url": "https://mathemoritz.rosenbaum.hamburg",
      "icon": "calculator",
      "color": "#0069B4",
      "status": "live"
    },
    {
      "id": "pdf",
      "title": "PDF-Werkzeuge",
      "description": "TODO: Kurzbeschreibung eintragen.",
      "url": "https://pdf.rosenbaum.hamburg",
      "icon": "file-text",
      "color": "#C8102E",
      "status": "live"
    },
    {
      "id": "zahlendrache",
      "title": "Zahlendrache",
      "description": "TODO: Kurzbeschreibung eintragen.",
      "url": "https://zahlendrache.rosenbaum.hamburg",
      "icon": "flame",
      "color": "#00875A",
      "status": "live"
    }
  ]
}
```

### Felder
| Feld | Pflicht | Bedeutung |
|---|---|---|
| `id` | ja | Kurzname, eindeutig, nur `a–z`, `0–9`, `-` |
| `title` | ja | Anzeigename (max. ca. 24 Zeichen) |
| `description` | ja | Ein Satz, was man dort tun kann (max. ca. 90 Zeichen) |
| `url` | ja | Vollständige https-Adresse |
| `icon` | ja | Name eines Lucide-Symbols (siehe Abschnitt 5) |
| `color` | ja | Linienfarbe als Hex-Wert (Kontrast zu Weiß ≥ 4,5 : 1 prüfen) |
| `status` | ja | `live` = verlinkt · `bald` = sichtbar, aber nicht klickbar, mit Hinweis „Kommt bald“ |
| `hidden` | nein | `true` = wird nicht angezeigt (z. B. vorübergehend offline) |

### Validierung (im Build-Skript)
- Build **bricht ab** mit verständlicher Fehlermeldung, wenn Pflichtfelder fehlen, `id` doppelt ist,
  `url` nicht mit `https://` beginnt, das Symbol nicht existiert oder der Farbkontrast zu Weiß < 4,5 : 1 ist.

### Hinweis zu internen Anwendungen
Anwendungen mit Praxis- oder Patientenbezug (z. B. ein internes Praxis-Dashboard) **nicht** in
`sites.json` aufnehmen. Die Startseite ist öffentlich; ein Link macht interne Systeme für jeden
auffindbar. Das Build-Skript soll deshalb eine Warnung ausgeben, wenn eine URL oder ein Titel die
Begriffe `dashboard`, `praxis`, `intern`, `admin`, `anamnese` oder `patient` enthält.
Ausdrücklich **nicht** aufnehmen: Praxis-Dashboard, Anamnesebogen.

---

## 3. Gestaltungskonzept: „Liniennetz“

Die Seite ist wie ein Hamburger Schnellbahn-Liniennetzplan gedacht: Die Startseite ist der
Knotenpunkt, jede Subdomain ist eine **Station** mit eigener Linienfarbe. Das gibt der Seite
einen klaren Hamburg-Bezug und skaliert von selbst – jedes neue Projekt ist eine neue Station.
(Nur inspiriert von Verkehrsbeschilderung allgemein; keine Logos, Farben oder Schriften des HVV übernehmen.)

### Farben (Design-Tokens)
| Token | Hell | Dunkel | Verwendung |
|---|---|---|---|
| `--bg` | `#F3F6F8` (kühles Hellgrau) | `#0F1A24` (Nachtblau) | Seitenhintergrund |
| `--surface` | `#FFFFFF` | `#172633` | Kacheln |
| `--ink` | `#1A2530` | `#E6EDF2` | Text |
| `--muted` | `#5A6875` | `#9AAAB8` | Beschreibungen, URLs |
| `--line` | `#1A2530` | `#E6EDF2` | Hauptlinie im Liniennetz |
| `--focus` | `#F2B705` (Signalgelb) | `#F2B705` | Fokusrahmen |

Linienfarben pro Projekt kommen aus `sites.json`. Vorschläge für weitere Projekte:
`#00875A` (Grün), `#6B3FA0` (Violett), `#B85C00` (Orange), `#00747A` (Petrol).

### Schrift
- **Overpass** (SIL Open Font License), inspiriert von Verkehrsschild-Schriften. Eine Familie für alles.
- **Selbst gehostet** als `woff2` (z. B. aus dem npm-Paket `@fontsource/overpass`, Gewichte 400, 600, 800;
  nur Subset `latin` + `latin-ext` für Umlaute). `font-display: swap`.
- Fallback: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Schriftskala (Basis 1 rem = 16 px): 0,875 · 1 · 1,25 · 1,75 · 2,75 rem. Satzschrift, keine Versalien-Labels.

### Aufbau (Desktop)

```
┌──────────────────────────────────────────────────────────────┐
│  rosenbaum.hamburg                                    [◐]    │
│  Projekte und Werkzeuge der Familie Rosenbaum                │
│                                                              │
│   ◉━━━━━━━━━━━○━━━━━━━━━━━○━━━━━━━━━━━○                      │
│  Start      Mathe-      PDF-       Kommt                     │
│             Trainer     Werkzeuge  bald                      │
│                                                              │
│  ┌─────────────────────┐  ┌─────────────────────┐            │
│  │ ▌[▣]  Mathe-Trainer │  │ ▌[▣]  PDF-Werkzeuge │            │
│  │ ▌ Brüche, Dezimal-  │  │ ▌ Kurzbeschreibung  │            │
│  │ ▌ zahlen und mehr … │  │ ▌                   │            │
│  │ ▌ mathemoritz.ros…  │  │ ▌ pdf.rosenbaum.ha… │            │
│  └─────────────────────┘  └─────────────────────┘            │
│                                                              │
│  Impressum · Datenschutz                                     │
└──────────────────────────────────────────────────────────────┘
```

**Kopfbereich:** Links ausgerichtet. Domainname groß (2,75 rem, Gewicht 800) als Wortmarke,
darunter die Tagline. Rechts oben ein kleiner Hell/Dunkel-Schalter.

**Liniennetz (das eine auffällige Element):** Ein aus `sites.json` generiertes SVG.
Eine durchgezogene dicke Linie (8 px, `--line`) von links nach rechts. Erste Station „Start“ als
großer gefüllter Kreis (Umsteigeknoten), danach je Projekt ein weißer Kreis mit farbigem Rand in
der Projektfarbe. Stationsnamen darunter. Jede Station ist ein Link zur Subdomain.
Stationen mit `status: "bald"` gestrichelt dargestellt und nicht verlinkt.
Beim Laden einmalig: Die Linie zeichnet sich in ca. 800 ms von links nach rechts
(`stroke-dashoffset`), die Stationen erscheinen nacheinander. **Keine weiteren Animationen auf der Seite.**
Bei `prefers-reduced-motion: reduce` ohne Animation.
Unter 640 px Breite wird das Liniennetz ausgeblendet (die Kacheln tragen die Navigation allein).

**Kacheln („Stationsschilder“):** Raster mit `grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr))`.
Jede Kachel ist vollständig ein Link (`<a>`), links ein 6 px breiter Streifen in der Projektfarbe,
oben links ein quadratisches Symbolfeld (44 × 44 px, Projektfarbe, weißes Symbol),
daneben der Titel (1,25 rem, 600). Darunter die Beschreibung und die URL ohne `https://` in `--muted`.
Eckenradius 4 px (Schilder, nicht Karten). Kein Schatten; Rahmen 1 px in `--muted` mit 30 % Deckkraft.
Hover/Fokus: Rahmen in Projektfarbe, der Farbstreifen wird auf 10 px verbreitert. Nichts sonst.
Kachel mit `status: "bald"`: kein Link, 60 % Deckkraft, Hinweis „Kommt bald“.

**Links öffnen im selben Tab** (Zurück-Taste führt zur Startseite).

**Fußzeile:** Links zu Impressum und Datenschutz (siehe Abschnitt 7), Jahr.

### Texte
- Sprache: Deutsch, Satzschreibung, keine Werbesprache. Beschreibungen sagen, was man dort tun kann.
- Seitentitel: `rosenbaum.hamburg`

---

## 4. Technik

- **Kein Framework.** Plain HTML + CSS + ein kleines Node-Build-Skript **ohne Abhängigkeiten**
  (außer den Schrift- und Symboldateien, die einmalig ins Repo kopiert werden).
- Node ≥ 20.

### Projektstruktur
```
/
├── sites.json              # Inhalte (einzige Datei, die regelmäßig geändert wird)
├── build.mjs               # liest sites.json, validiert, schreibt dist/
├── src/
│   ├── template.html       # HTML-Gerüst mit Platzhaltern
│   ├── styles.css          # Design-Tokens, Layout
│   ├── theme.js            # Hell/Dunkel-Schalter (< 1 KB)
│   ├── icons/              # benötigte Lucide-SVGs (Lizenzdatei beilegen)
│   ├── fonts/              # Overpass woff2 + OFL-Lizenz
│   ├── impressum.html
│   ├── datenschutz.html
│   └── 404.html
├── public/
│   ├── CNAME               # Inhalt: www.rosenbaum.hamburg
│   ├── favicon.svg
│   └── og-image.png        # 1200 × 630, für Link-Vorschau in Messengern
├── .github/workflows/deploy.yml
├── README.md               # Anleitung „Neue Subdomain hinzufügen“ in 5 Zeilen
└── CLAUDE.md               # Kurzfassung dieses Plans für spätere Sitzungen
```

### Build (`build.mjs`)
1. `sites.json` lesen und validieren (Abschnitt 2).
2. Für jede Seite das Symbol-SVG inline einsetzen (kein Nachladen).
3. Liniennetz-SVG berechnen: Stationen gleichmäßig auf der Breite verteilen (viewBox-basiert, responsiv).
4. HTML aus `template.html` erzeugen, CSS minimieren und inline einbetten (kritisches CSS), Schriften per `<link rel="preload">`.
5. `noindex: true` → `<meta name="robots" content="noindex">` und `robots.txt` mit `Disallow: /`.
6. Alles nach `dist/` schreiben. `npm run build` und `npm run dev` (einfacher lokaler Server, z. B. `node --watch` + `http-server` oder eigenes Mini-Skript).

### Hell/Dunkel
- Standard: `prefers-color-scheme`. Schalter überschreibt, Wahl in `localStorage` (in `try/catch`).
- Kleines Inline-Skript im `<head>`, damit kein Aufblitzen des falschen Themas entsteht.

### Meta-Angaben
- `<html lang="de">`, `viewport`, `description`, `theme-color` (hell/dunkel), Open-Graph-Tags (Titel, Beschreibung, `og-image.png`), Favicon als SVG.

---

## 5. Symbole

- **Lucide** (ISC-Lizenz), nur die benötigten SVGs ins Repo kopieren, Lizenztext beilegen.
- Strichstärke 2, `currentColor`, 24 × 24 viewBox.
- Vorschläge: Mathe → `calculator` · PDF → `file-text` · Fotos → `images` · Rezepte → `chef-hat` ·
  Reisen → `map` · Musik → `music` · Allgemein → `globe` · Schalter → `sun` / `moon`.
- Das Build-Skript listet bei unbekanntem Symbolnamen die vorhandenen Dateien auf.

---

## 6. Barrierefreiheit & Qualität

- Alle Kacheln und Stationen per Tab erreichbar, sichtbarer Fokusrahmen (3 px `--focus`, Abstand 2 px).
- SVG-Liniennetz: `role="navigation"` mit `aria-label="Projektübersicht"`; Symbole `aria-hidden="true"`.
- Kontraste WCAG AA in beiden Themen (Build prüft Projektfarben gegen Weiß).
- Seitengewicht < 150 KB inkl. Schriften.
- Lighthouse ≥ 95 in Performance, Barrierefreiheit, Best Practices, SEO.

---

## 7. Rechtliches (vom Betreiber zu klären)

- **Keine externen Ressourcen:** Keine Google Fonts, keine CDNs, keine Analytics. Damit entfällt ein Cookie-Banner.
- **Impressum/Datenschutz:** Für eine rein private/familiäre Seite ist ein Impressum nach § 5 DDG in der
  Regel nicht erforderlich; sobald ein geschäftlicher Bezug besteht, schon. Claude Code legt `impressum.html`
  und `datenschutz.html` als **Vorlagen mit Platzhaltern** an (Datenschutz: Hosting durch GitHub Inc., Verarbeitung
  von IP-Adressen in Server-Logs, keine Cookies). Inhalte trägt der Betreiber selbst ein; im Zweifel rechtlich prüfen lassen.
- Die Links in der Fußzeile nur anzeigen, wenn die Seiten ausgefüllt sind (Schalter in `sites.json`: `"legal": true/false`).

---

## 8. Phasenplan

### Phase 0 – Repository & Deployment
- [ ] Projektstruktur anlegen, `CLAUDE.md` aus diesem Plan ableiten
- [ ] `deploy.yml`: bei Push auf `main` → `npm run build` → GitHub Pages über `actions/upload-pages-artifact` + `actions/deploy-pages`
- [ ] `public/CNAME` mit `www.rosenbaum.hamburg`
- [ ] Platzhalterseite „rosenbaum.hamburg – im Aufbau“
- [ ] **Anleitung für den Betreiber ausgeben** (Abschnitt 9)
- ✅ Abnahme: https://www.rosenbaum.hamburg zeigt die Platzhalterseite, `rosenbaum.hamburg` leitet dorthin um, HTTPS aktiv

### Phase 1 – Daten & Build
- [ ] `sites.json` mit den Einträgen aus Abschnitt 2
- [ ] `build.mjs` inkl. Validierung, Warnung bei internen Begriffen, Symbole inline
- [ ] Einfache ungestylte Kachelliste
- ✅ Abnahme: Fehlerhafte `sites.json` erzeugt klare Fehlermeldung; gültige erzeugt korrektes HTML

### Phase 2 – Gestaltung
- [ ] Design-Tokens, Schrift (selbst gehostet), Kopfbereich
- [ ] Kacheln inkl. Status „bald“
- [ ] Liniennetz-SVG inkl. einmaliger Ladeanimation
- [ ] Hell/Dunkel-Schalter
- [ ] Responsiv: 360 px, 768 px, 1280 px, 1920 px prüfen (Screenshots zeigen)
- ✅ Abnahme: Seite sieht in beiden Themen auf Handy, Tablet und Desktop stimmig aus

### Phase 3 – Feinschliff
- [ ] Favicon, OG-Bild, Meta-Angaben, `robots.txt`
- [ ] `404.html` im gleichen Stil („Diese Station gibt es nicht“ + Link zur Startseite)
- [ ] Impressum-/Datenschutz-Vorlagen
- [ ] Barrierefreiheit prüfen, Lighthouse-Bericht ausgeben
- [ ] `README.md` mit Anleitung „Neue Subdomain hinzufügen“
- ✅ Abnahme: Lighthouse ≥ 95 überall, Tastaturbedienung vollständig

---

## 9. Einrichtung Domain & GitHub (manuelle Schritte, einmalig)

Voraussetzung: Die Domain `rosenbaum.hamburg` ist bei GitHub bereits verifiziert (TXT-Eintrag,
siehe Mathe-Trainer-Einrichtung). Falls nicht: GitHub → Profil- bzw. Organisations-Settings →
*Pages* → *Add a domain* → TXT-Eintrag beim Domain-Anbieter setzen.

1. **Neues öffentliches Repository** anlegen, z. B. `startseite`.
2. **Vorher prüfen:** Zeigt `rosenbaum.hamburg` (ohne www) aktuell auf Webspace beim Domain-Anbieter
   (z. B. IONOS) mit Inhalten? Dann diese vorher sichern bzw. verlegen.
3. **DNS beim Domain-Anbieter** (bestehende A/AAAA-Einträge für `@` ersetzen):
   - `A` `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `AAAA` `@` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - `CNAME` `www` → `<github-name>.github.io`
   - **MX- und TXT-Einträge (E-Mail!) nicht löschen.** Die bestehenden Subdomain-Einträge (`mathemoritz`, `pdf` …) bleiben unverändert.
4. Repository → Settings → *Pages* → Source: **GitHub Actions**; Custom domain: `www.rosenbaum.hamburg`.
5. Nach DNS-Propagation (Minuten bis 24 h): **„Enforce HTTPS“** aktivieren.
6. Test: `https://rosenbaum.hamburg` muss auf `https://www.rosenbaum.hamburg` umleiten.

Die IP-Adressen vor dem Eintragen mit der aktuellen GitHub-Dokumentation abgleichen:
https://docs.github.com/de/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

---

## 10. Außerhalb des Umfangs (bewusst nicht)

- Live-Statusprüfung der Subdomains (unzuverlässig über Domaingrenzen, braucht Backend)
- Suchfunktion (erst ab ca. 12 Kacheln sinnvoll)
- Login, geschützte Bereiche, Tracking

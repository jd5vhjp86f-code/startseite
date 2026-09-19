# CLAUDE.md – Projektregeln Startseite rosenbaum.hamburg

## Kontext

Startseite unter `www.rosenbaum.hamburg`, die alle Projekte auf Subdomains als
Kacheln verlinkt. Vollständiger Plan: `PLAN.md`. Arbeite phasenweise, stoppe
nach jeder Phase und fasse zusammen.

## Inhalte

- Alle Kacheln stehen in `sites.json`. Eine neue Subdomain hinzufügen heißt:
  ein Eintrag dort, sonst nichts.
- Reihenfolge in der Datei = Reihenfolge auf der Seite.
- **Nicht aufnehmen:** alles mit Praxis- oder Patientenbezug. Die Startseite ist
  öffentlich; ein Link macht interne Systeme für jeden auffindbar. Der Build
  warnt bei `dashboard`, `praxis`, `intern`, `admin`, `anamnese`, `patient`.

## Technik

- Kein Framework, keine Laufzeit-Abhängigkeiten. Plain HTML, CSS und ein
  Node-Build-Skript ohne npm-Pakete. Node ≥ 20.
- Die Kacheln werden **beim Build** ins HTML geschrieben. Die Seite funktioniert
  vollständig ohne JavaScript; JS nur für den Hell/Dunkel-Umschalter.
- Der Build bricht mit verständlicher Meldung ab, wenn `sites.json` fehlerhaft
  ist: fehlende Pflichtfelder, doppelte `id`, `url` ohne `https://`, unbekanntes
  Symbol, Farbkontrast zu Weiß unter 4,5 : 1.

## Datenschutz

- **Keine externen Ressourcen zur Laufzeit.** Keine CDNs, keine Google Fonts,
  kein Analytics. Schriften und Symbole liegen im Repository. Damit entfällt
  auch ein Cookie-Banner.
- Keine Cookies, kein Tracking.
- Die CI prüft, dass im gebauten HTML keine fremden Adressen stehen.

## Gestaltung

- Leitbild „Liniennetz": Die Startseite ist der Knotenpunkt, jede Subdomain eine
  Station mit eigener Linienfarbe.
- Nur inspiriert von Verkehrsbeschilderung allgemein – keine Logos, Farben oder
  Schriften des HVV übernehmen.
- Eine einmalige Ladeanimation für das Liniennetz, sonst keine Animationen.
  `prefers-reduced-motion: reduce` respektieren.
- Deutsch, Satzschreibung, keine Werbesprache. Beschreibungen sagen, was man
  dort tun kann.

## Qualität

- Vor jedem Commit: `npm test && npm run build` muss durchlaufen.
- Kontraste WCAG AA in beiden Themen.
- Alles per Tastatur erreichbar, sichtbarer Fokusrahmen.
- Seitengewicht unter 150 KB inklusive Schriften.
- Lighthouse ≥ 95 in Performance, Barrierefreiheit und Best Practices.
  SEO bleibt bei etwa 63, solange `noindex` gesetzt ist - das ist gewollt und
  kein Mangel. Der Plan fordert beides; es geht nicht zusammen.

## Deployment

- Push auf `main` → GitHub Actions → GitHub Pages unter
  `www.rosenbaum.hamburg`.
- `public/CNAME` nie löschen.

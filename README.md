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

## Entwicklung

```bash
npm run build    # einmal bauen, Ergebnis in dist/
npm run dev      # bauen, lokal unter http://localhost:4180 ausliefern und
                 # bei Änderungen neu bauen
```

Es gibt keine Abhängigkeiten: `npm install` ist nicht nötig, Node ≥ 20 genügt.

## Aufbau

```
sites.json          Inhalte – die einzige Datei, die regelmäßig geändert wird
build.mjs           liest sites.json, prüft sie und schreibt dist/
src/template.html   HTML-Gerüst mit Platzhaltern
src/styles.css      Design-Tokens und Layout
src/icons/          die verwendeten Symbole (Lucide, ISC-Lizenz)
src/fonts/          Schrift Overpass (OFL)
public/CNAME        die Domain – nie löschen
```

Der vollständige Plan steht in [PLAN.md](PLAN.md), die Projektregeln in
[CLAUDE.md](CLAUDE.md).

# Spieltrieb

Fünf kleine Browserspiele für die Neugier – reinklicken, sofort verstehen, gleich das nächste ausprobieren.
Komplett auf Deutsch, ohne Anmeldung. Bestwerte und geschaffte Level bleiben nur im Browser (localStorage).

## Schnellstart

Voraussetzung: [Node.js](https://nodejs.org) 20 oder neuer.

```bash
npm install
npm run dev
```

Dann <http://localhost:5173> öffnen. Der Server lauscht auch im lokalen Netz, so lässt sich die Seite direkt auf Handy oder iPad testen (die Adresse steht im Terminal unter „Network“).

| Befehl            | Was passiert                                            |
| ----------------- | ------------------------------------------------------- |
| `npm run dev`     | Entwicklungsserver mit Live-Neuladen                    |
| `npm run build`   | Typprüfung und fertige Website im Ordner `dist/`        |
| `npm run preview` | den Build lokal ansehen (<http://localhost:4173>)       |
| `npm test`        | alle automatischen Tests (Physik, Fairness, Logik)      |

`dist/` ist eine rein statische Seite mit relativen Pfaden und Hash-Routen – sie läuft auf jedem Webspace, auch in einem Unterordner.

## Die Spiele

| Spiel              | Idee                                                                                                     | Steuerung                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Ein Strich**     | Eine Linie zeichnen, die zur Rampe wird und die fallende Kugel in den Becher lenkt. 5 Level mit Wänden, Stacheln, Sperrzone, Trampolin und Sturm. Probierfeld direkt im Titelbild. | Maus oder Finger; nach Fehlversuch einfach neu zeichnen |
| **Innerer Takt**   | Zielzeit treffen, die Uhr ist nur in den ersten 20 % sichtbar (bei 10 s also 2 s). 5 Runden, Ergebnis wie „0,23 Sekunden zu früh“. | Tippen, Klick, Leertaste oder Enter             |
| **Schattenlabor**  | Welcher von drei Gegenständen wirft den seltsamen Schatten? Danach dreht sich das echte 3D-Modell aus seinem Schatten heraus. 8 Rätsel. | Tippen/Klicken                                  |
| **Kleiner Planet** | Landung auf einem winzigen Mond mit echter Zentralschwerkraft, knappem Treibstoff und markierter Landezone. 3 Missionen, konkreter Grund bei Bruchlandung. | ← → drehen, ↑/W/Leertaste Schub, R Neustart; große Touch-Flächen |
| **Falscher Ton**   | Ein kleines Wesen singt eine Melodie, beim zweiten Mal ist genau ein Ton anders. Start mit 3 Tönen, dann immer länger. Visueller Modus „Töne sehen“ mit Tonhöhen-Balken. | Tippen/Klicken                                  |

Jedes Spiel hat oben einen gut sichtbaren Knopf „Übersicht“, einen Neustart-Knopf und einen Stummschalter.
Töne entstehen direkt im Browser (Web Audio) und starten erst nach einer Nutzeraktion.

## Geprüft

- **Ein Strich:** Für jedes Level ist eine echte Ein-Strich-Lösung hinterlegt und wird nachsimuliert. Dabei gilt: Ohne Strich geht es nicht, und leicht verschobene Striche funktionieren meist auch (`tests/strich.test.ts`).
- **Schattenlabor:** Jeder Schatten ist die exakte Projektion des richtigen Modells. Für jeden Köder wird über alle Drehungen und Größen gesucht, und keiner kommt dem Schatten nahe (`tests/schatten.test.ts`).
- **Kleiner Planet:** Ein einfacher Autopilot landet jede Mission mit mehr als 25 % Treibstoff. Ohne Steuern gibt es eine Bruchlandung mit Grund (`tests/planet.test.ts`).
- **Falscher Ton / Innerer Takt:** Genau ein Ton ändert sich, Balkenhöhen steigen mit der Tonhöhe, Texte und Wertung stimmen (`tests/ton.test.ts`).
- Im Browser durchgespielt auf Desktop, iPad (hoch/quer) und iPhone-Größe – inklusive Zeichnen per Touch.

## Aufbau

```
src/
  pages/Home.tsx            Startseite (Arcade-Poster, Kacheln, Titelbild)
  illustrations/Art.tsx     handgezeichnete SVG-Illustrationen der Kacheln
  components/GameShell.tsx  Kopfzeile mit Übersicht, Neustart, Ton
  lib/                      Speichern (localStorage), Ton (Web Audio), Routing
  games/strich/             Physik, Level, Canvas-Zeichenfläche
  games/takt/               Logik + Oberfläche
  games/schatten/           3D-Gegenstände (three.js), Rätsel, Bühne
  games/planet/             Flugphysik, Missionen, Oberfläche
  games/ton/                Melodien, das Wesen „Pip“, Oberfläche
tests/                      Vitest-Tests
scripts/                    Entwicklerwerkzeuge (Lösungssuche, Fairness- und Missionsprüfung)
```

Technik: React 19, TypeScript, Vite, Canvas 2D, SVG und three.js (nur im Schattenlabor, wird erst dort nachgeladen).

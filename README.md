# ha-recorder-advisor

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![GitHub Release](https://img.shields.io/github/release/Noack1978/ha-recorder-advisor.svg)](https://github.com/Noack1978/ha-recorder-advisor/releases)

Analysiert die Home Assistant Recorder-Datenbank auf hochfrequente Entitäten und generiert fertige `recorder.yaml`-Ausschlussblöcke, die du mit einem Klick in die Zwischenablage kopieren kannst.

## Features

- 📊 Analysiert Änderungshäufigkeit aller Entitäten im Recorder (konfigurierbare Zeitspanne)
- ⛔/🔴/🟡 Dreistufige Ausschlussempfehlung basierend auf Änderungen pro Tag
- 🔒 Kritische Entitäten (Person, Zone, Automation…) werden als "behalten" markiert und sind nicht wählbar
- ✅ Checkbox-Auswahl mit Schnellauswahl-Buttons ("Alle dringend", "Alle empfohlen")
- 📄 Generiert fertigen `recorder.yaml` YAML-Block
- 📋 Ein-Klick-Kopie in die Zwischenablage
- ✅ "Als angewendet markieren" – merkt sich, welche Ausschlüsse bereits eingefügt wurden
- 🔎 Suche, Filterung nach Empfehlungsstufe & Sortierung

## Voraussetzungen

- **Home Assistant Recorder-Integration** muss aktiv sein (Standardmäßig aktiviert in HA)
- **Recorder-Modus:** Die Integration nutzt die interne HA-Recorder-Datenbank (SQLite) direkt über die HA-eigene API – keine externe Software oder zusätzliche Python-Pakete nötig
- Empfohlen: Mindestens ein paar Tage Recorder-Daten für aussagekräftige Ergebnisse

> **Hinweis:** Falls der Recorder deaktiviert oder auf eine externe Datenbank (z. B. MariaDB/PostgreSQL) umgestellt ist, funktioniert die Analyse ebenfalls – die Integration nutzt ausschließlich die offizielle HA Recorder API.

## Installation

### Via HACS

1. HACS → Integrationen → ⋮ → Benutzerdefiniertes Repository hinzufügen
2. URL: `https://github.com/Noack1978/ha-recorder-advisor`
3. Kategorie: Integration
4. Installieren & HA neu starten

## Einrichtung

Einstellungen → Geräte & Dienste → Integration hinzufügen → **Recorder Advisor**

## Lovelace-Karte

```yaml
type: custom:recorder-advisor-card
```

Lovelace-Ressource (falls nicht auto-registriert):
- URL: `/recorder_advisor_card/recorder-advisor-card.js`
- Typ: JavaScript-Modul

## Empfehlungsstufen

| Stufe | Änderungen/Tag | Bedeutung |
|---|---|---|
| ⛔ Dringend ausschließen | > 500 | Sehr hohe DB-Last, Ausschluss dringend empfohlen |
| 🔴 Empfohlen | > 100 | Deutliche DB-Last |
| 🟡 Erwägen | > 10 | Moderate Last, je nach Bedarf |
| ✅ OK | ≤ 10 | Kein Handlungsbedarf |
| 🔒 Kritisch behalten | – | Wichtige HA-Entitäten, nicht ausschließen |

## recorder.yaml Workflow

1. Karte öffnen → "Neu analysieren"
2. Entitäten per Checkbox auswählen (oder Schnellauswahl nutzen)
3. "YAML generieren" klicken → Tab "YAML" öffnet sich automatisch
4. YAML in Zwischenablage kopieren
5. In `recorder.yaml` unter `exclude: → entities:` einfügen
6. HA neu starten
7. "Als angewendet markieren" klicken

## Services

| Service | Parameter | Beschreibung |
|---|---|---|
| `recorder_advisor.reanalyze` | – | Neuanalyse starten |
| `recorder_advisor.get_results` | – | Ergebnisse abrufen |
| `recorder_advisor.generate_yaml` | `entity_ids` | YAML generieren |
| `recorder_advisor.mark_applied` | `entity_ids` | Als angewendet markieren |

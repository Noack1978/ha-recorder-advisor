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


## Recorder-Konfiguration (recorder.yaml)

Der Recorder Advisor generiert fertige YAML-Blöcke zum Ausschließen von Entitäten. So fügst du sie in deine Konfiguration ein:

### Schritt 1 – recorder.yaml einbinden (einmalig)

Falls noch nicht vorhanden, füge folgendes in deine `configuration.yaml` ein:

```yaml
recorder: !include recorder.yaml
```

Dann erstelle die Datei `/config/recorder.yaml`.

### Schritt 2 – Ausschlüsse einfügen

Den vom Recorder Advisor generierten Block in die `recorder.yaml` kopieren. Falls bereits ein `exclude`-Block vorhanden ist, nur die Einträge unter `entities:` ergänzen – **nicht ersetzen**:

```yaml
exclude:
  entity_globs:
    - sensor.awtrix_*          # Beispiel bestehender Eintrag
  entities:
    - sensor.mein_sensor_1     # ← neu vom Recorder Advisor
    - sensor.mein_sensor_2     # ← neu vom Recorder Advisor
```

### Schritt 3 – Konfiguration prüfen & neu starten

1. **Entwicklerwerkzeuge → YAML → Konfiguration prüfen**
2. **Home Assistant neu starten**

> **Hinweis:** Bereits aufgezeichnete Werte werden nicht automatisch gelöscht. Sie verschwinden nach Ablauf der konfigurierten `purge_keep_days` (Standard: 10 Tage) oder beim nächsten Lauf deines Bereinigungsskripts.

### Internes Event vom Recorder ausschließen (empfohlen)

Die Integration feuert interne Events die nicht aufgezeichnet werden müssen. Ergänze deine `recorder.yaml`:

```yaml
exclude:
  event_types:
    - recorder_advisor_results
    - recorder_advisor_yaml
```

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

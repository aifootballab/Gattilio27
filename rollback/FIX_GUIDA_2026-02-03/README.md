# Rollback - Fix Guida 2026-02-03

## Modifiche applicate
- **app/guida/page.jsx**: rimossi import FileImage, Circle (non usati)
- **lib/i18n.js**: aggiornato guideCountermeasuresStep4 (rimosso "applica i suggerimenti" - pulsante rimosso)

## Rollback
```bash
git checkout -- app/guida/page.jsx lib/i18n.js
```

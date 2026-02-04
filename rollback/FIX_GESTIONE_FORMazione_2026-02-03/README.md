# Rollback - Fix Gestione Formazione 2026-02-03

## Modifiche applicate
- **lib/i18n.js**: Aggiunto formationCustom (IT: Personalizzato, EN: Custom)
- **app/gestione-formazione/page.jsx**: 
  - 'Personalizzato' → t('formationCustom')
  - 'ATTACCO' → t('attacking')
  - 'DIFESA' → t('defending')
  - 'FORZA' → t('athleticism')

## Rollback
```bash
git checkout -- lib/i18n.js "app/gestione-formazione/page.jsx"
```

## Come testare
1. Gestione formazione: salva formazione personalizzata → nome deve mostrare "Personalizzato" (IT) o "Custom" (EN)
2. Dettaglio giocatore: sezione Statistiche → header ATTACCO, DIFESA, FORZA devono essere tradotti

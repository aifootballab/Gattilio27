# Rollback - Fix Hydration Mismatch 2026-02-03

## Problema
React error #425, #418, #423: "Text content does not match server-rendered HTML" / "Hydration failed".
Causa: LanguageProvider leggeva `localStorage` nello state iniziale: server (no localStorage) → lang='it', client (con localStorage) → lang='en' → mismatch.

## Modifica
- **lib/i18n.js**: LanguageProvider usa sempre 'it' come state iniziale; useEffect legge localStorage dopo mount e aggiorna se diverso.

## Rollback
```bash
git checkout -- lib/i18n.js
```

## Come testare
1. Apri dashboard su Vercel (produzione)
2. Verifica che non compaiano più errori React #425/#418/#423 nella console
3. Cambia lingua (IT/EN) → deve funzionare correttamente

# Rollback – Fix sicurezza (3 feb 2026)

## Modifiche

1. **app/api/tasks/list/route.js** – Rimossi log con email utente (sicurezza produzione)
2. **app/login/page.jsx** – Throttling 3 secondi dopo login/signup fallito (anti brute-force)

## File modificati

- `app/api/tasks/list/route.js` – log senza email in produzione
- `app/login/page.jsx` – throttling 3 s dopo errore login/signup
- `lib/i18n.js` – chiave `retryInSeconds`
- `docs/AUDIT_ENTERPRISE_2026.md` – riga rollback

## Rollback

```bash
git checkout HEAD -- app/api/tasks/list/route.js app/login/page.jsx lib/i18n.js docs/AUDIT_ENTERPRISE_2026.md
```

## Test

1. **tasks/list**: Verificare che endpoint funzioni (nessun log email in prod)
2. **Login**: Fallire login → bottone disabilitato 3 sec → riprovare

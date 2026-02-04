# Rollback – Rimozione codice morto (3 feb 2026)

## File modificati

- `lib/fetchHelper.js` – rimosso `safeFetch`
- `lib/taskHelper.js` – rimosso `calculateWeightedTasksScore`
- `lib/playerPhotoTypes.js` – rimosso `PHOTO_TYPE_ICONS`
- `app/api/extract-coach/route.js` – rimosso import non usato `parseOpenAIResponse`
- `lib/README.md` – aggiornato riferimento fetchHelper
- `docs/GUIDA_VALIDAZIONE_PROGRAMMATORE.md` – aggiornato riferimento fetchHelper

## Rollback (se qualcosa si rompe)

```bash
git checkout HEAD -- lib/fetchHelper.js lib/taskHelper.js lib/playerPhotoTypes.js app/api/extract-coach/route.js lib/README.md docs/GUIDA_VALIDAZIONE_PROGRAMMATORE.md docs/AUDIT_ENTERPRISE_2026.md
```

## Come testare

1. **Build**: `npm run build` – deve completare senza errori
2. **fetchHelper**: Nessuna chiamata a `safeFetch` nel progetto; `safeJsonResponse` resta invariata
3. **taskHelper**: `generateWeeklyTasksForUser`, `updateTasksProgressAfterMatch`, `getCurrentWeek` invariati
4. **playerPhotoTypes**: `getPhotoTypeStyle` e `getPhotoTypeConfig` usano COLORS/BG_COLORS, non PHOTO_TYPE_ICONS
5. **extract-coach**: La route fa parsing manuale; `parseOpenAIResponse` non era usato
6. **App**: Dashboard, gestione formazione, pagina giocatore, upload coach – verificare flussi principali

**Nota**: `GUIDA_SVILUPPATORI_TASK.md` e `DOCUMENTAZIONE_TASK_SISTEMA.md` citano `calculateWeightedTasksScore` negli esempi di test. Se si eseguono quei test, aggiornare o rimuovere quei riferimenti.

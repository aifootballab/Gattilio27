# Rollback - Fix Allenatori 2026-02-03

## Modifiche applicate
1. **app/allenatori/page.jsx**: rimosso import `User` non usato; corretto modal eliminazione (chiavi i18n)
2. **lib/i18n.js**: aggiunte chiavi confirmDeleteCoachTitle, confirmDeleteCoachMessage, confirmDeleteCoach, confirmDeleteCoachDetails (IT + EN)

## Test
1. Vai su /allenatori
2. Con almeno un allenatore, clicca Elimina (icona cestino)
3. Verifica: modal mostra "Conferma Eliminazione" / "Sei sicuro di voler eliminare [Nome]?" (IT) o equivalenti in EN
4. Cambia lingua e ripeti: messaggi devono essere tradotti

## Rollback
```bash
git checkout -- app/allenatori/page.jsx lib/i18n.js
```

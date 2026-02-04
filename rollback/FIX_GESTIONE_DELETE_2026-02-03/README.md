# Rollback – Unificazione handleDelete (gestione formazione)

## Modifica
- `app/gestione-formazione/page.jsx`: unificati `handleDeletePlayerConfirm` e `handleDeleteReserveConfirm` in un'unica funzione
- Fix: reset completo modal (showAssignModal, selectedSlot, selectedReserve) in entrambi i casi

## Rollback
```bash
git checkout HEAD -- app/gestione-formazione/page.jsx docs/GESTIONE_ROSA_FUNZIONI.md docs/AUDIT_ENTERPRISE_2026.md
```

## Test
1. Eliminare titolare da AssignModal → modal si chiude, lista aggiornata
2. Eliminare riserva dalla griglia → lista aggiornata
3. Eliminare riserva mostrata in AssignModal → modal si chiude, lista aggiornata

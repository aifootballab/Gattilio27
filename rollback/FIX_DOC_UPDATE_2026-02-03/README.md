# Rollback – Aggiornamento documentazione (3 feb 2026)

## File modificati

- `INDICE_DOCUMENTAZIONE.md` – corretta numerazione duplicata (7→8, 16→17, 17→18)
- `DOCUMENTAZIONE_TASK_SISTEMA.md` – rimosso `calculateWeightedTasksScore` (codice morto)
- `GUIDA_SVILUPPATORI_TASK.md` – rimosso test `calculateWeightedTasksScore` dall'esempio
- `DOCUMENTAZIONE_RIFERIMENTO.md` – aggiornato lib/taskHelper, data
- `docs/AUDIT_ENTERPRISE_2026.md` – nota ultimo aggiornamento doc
- `rollback/FIX_DEAD_CODE_2026-02-03/README.md` – aggiornata nota su doc task

## Rollback

```bash
git checkout HEAD -- INDICE_DOCUMENTAZIONE.md DOCUMENTAZIONE_TASK_SISTEMA.md GUIDA_SVILUPPATORI_TASK.md DOCUMENTAZIONE_RIFERIMENTO.md docs/AUDIT_ENTERPRISE_2026.md rollback/FIX_DEAD_CODE_2026-02-03/README.md
```

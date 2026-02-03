# Rollback - Fix Giocatore 2026-02-03

## Modifiche applicate
- **app/giocatore/[id]/page.jsx**: rimosso import User; sostituiti testi hardcoded con t() (skillsNotAvailable, attacking, athleticism, effect, name)

## Rollback
```bash
git checkout -- "app/giocatore/[id]/page.jsx"
```

# Rollback - Fix Login 2026-02-03

## Modifiche applicate
- **app/login/page.jsx**: rimossi lang e changeLanguage da useTranslation (non usati)

## Rollback
```bash
git checkout -- app/login/page.jsx
```

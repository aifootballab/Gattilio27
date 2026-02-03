# Rollback - Fix Impostazioni-profilo 2026-02-03

## Modifiche applicate
- **lib/i18n.js**: aggiunto profileSectionSaved in italiano
- **lib/taskHelper.js**: check case-insensitive per 'difesa' in common_problems
- **app/impostazioni-profilo/page.jsx**: sostituiti testi hardcoded con t() (loadingProfile, firstName, yourFirstName, saving, save, currentDivision, selectDivision, aiPreferences, aiName, aiNamePlaceholder, hoursPerWeek, hoursPerWeekPlaceholder, whichProblems, gameExperience, completeProfile, getLevelText)

## Rollback
```bash
git checkout -- lib/i18n.js lib/taskHelper.js "app/impostazioni-profilo/page.jsx"
```

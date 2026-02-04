# Rollback - Fix photo_slots e completezza profilo 2026-02-04

## Modifiche applicate
- **app/gestione-formazione/page.jsx**:
  - Mapping corretto photo_slots (card+statistiche, stats→abilita, skills→booster)
  - AssignModal: completedSections e isProfileComplete con fallback su dati reali
  - SlotCard getProfileBorderColor: fallback su base_stats, skills, boosters
  - card → card + statistiche (se base_stats estratto)
  - stats → abilita
  - skills → booster (+ abilita se estratti dalla stessa foto)
- **app/giocatore/[id]/page.jsx**: Fallback visualizzazione dati reali
  - hasStats/hasSkills/hasBoosters usano dati reali come fallback se photo_slots inconsistente
  - isProfileComplete e completedSections con fallback sui dati
- **AssignModal (in gestione-formazione)**: completedSections con fallback su base_stats, skills, boosters

## Rollback (in caso di rottura)
```bash
git checkout -- "app/gestione-formazione/page.jsx" "app/giocatore/[id]/page.jsx"
```

## Come testare
1. Nuovo giocatore: carica 3 foto da gestione formazione → deve mostrare 3/3
2. Solo Card: carica prima foto → Statistiche devono mostrare dati e conteggio corretto
3. Pagina giocatore: giocatori esistenti con dati ma photo_slots vuoto → devono vedere Statistiche/Abilità/Booster
4. Completa Profilo: carica Abilità e Booster da pagina giocatore → spunta verde corretta

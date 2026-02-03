# Rollback - Fix Components 2026-02-03

## Modifiche applicate
- **components/PositionSelectionModal.jsx**: t('lang') → lang da useTranslation (bug lingua etichette posizioni)
- **components/AssistantChat.jsx**: usePathname() al posto di popstate (suggerimenti contestuali corretti alla navigazione)
- **lib/i18n.js**: positionGroup* (Goalkeeper, Defense, Midfield, Attack), aiKnowledgeProfile/Roster/Matches/Patterns/Coach/Usage/Success
- **components/AIKnowledgeBar.jsx**: labels breakdown tradotte con t()
- **components/TaskWidget.jsx**: fix shadowing t→task nel filter

## Rollback
```bash
git checkout -- components/PositionSelectionModal.jsx components/AssistantChat.jsx lib/i18n.js components/AIKnowledgeBar.jsx components/TaskWidget.jsx
```

## Come testare
1. **PositionSelectionModal**: Apri gestione-formazione, carica un giocatore, clicca su posizioni → cambia lingua IT/EN → le etichette (Portiere, Goalkeeper, ecc.) devono cambiare
2. **AssistantChat**: Apri chat, vai su /gestione-formazione → suggerimenti "Quale modulo per la mia rosa?" → naviga a /contromisure-live → suggerimenti devono aggiornarsi ("Come preparo la squadra...")
3. **AIKnowledgeBar**: Dashboard, espandi "Vedi dettagli" sulla barra Conoscenza AI → Profilo, Rosa, Partite ecc. devono essere tradotti
4. **TaskWidget**: Nessun cambiamento visibile, solo fix interno (shadowing)

# Rollback – Rimozione documentazione obsoleta (3 feb 2026)

## Documenti e cartelle rimossi

- `docs/AUDIT_DOCUMENTAZIONE_2026.md`
- `docs/AUDIT_ENTERPRISE_CREDITI_PERCHÉ_SOLO_5.md`
- `docs/BRAINSTORM_DOCUMENTO.md`
- `docs/ANALISI_BRAINSTORM_RIGA_PER_RIGA.md`
- `docs/AUDIT_CODICE_MORTO_E_DOCUMENTI.md`
- `docs/ESEMPIO_RISPOSTA_ABILITA_SBAGLIATE.md`
- `docs/INTRECCI_IA_E_MIGLIORAMENTI.md`
- `docs/FLUSSO_DATI_IA_E_SUGGERIMENTI.md`
- `docs/VERIFICA_RAG_STILI_E_ABILITA.md`
- `docs/AUDIT_STILI_GIOCATORE_CREARE_RICEVERE.md`
- `docs/AUDIT_ALLINEAMENTO_SUPABASE_ISTRUZIONI_PALETTI.md`
- `docs/AUDIT_DATI_IA_E_SUPABASE.md`
- `docs/AUDIT_ENTERPRISE_IA_PROMPTI_2026.md`
- `memoria_attila_backup/` (01-08.md, index.json, memoria_attila_definitiva_unificata.txt)

## File modificati (riferimenti aggiornati)

- `INDICE_DOCUMENTAZIONE.md`
- `docs/AUDIT_ENTERPRISE_2026.md`
- `docs/GUIDA_VALIDAZIONE_PROGRAMMATORE.md`
- `DOCUMENTAZIONE_RIFERIMENTO.md`
- `docs/SISTEMA_CREDITI_AI.md`

## Rollback (ripristinare documenti rimossi)

```bash
git checkout HEAD~1 -- docs/AUDIT_DOCUMENTAZIONE_2026.md docs/AUDIT_ENTERPRISE_CREDITI_PERCHÉ_SOLO_5.md docs/BRAINSTORM_DOCUMENTO.md docs/ANALISI_BRAINSTORM_RIGA_PER_RIGA.md docs/AUDIT_CODICE_MORTO_E_DOCUMENTI.md docs/ESEMPIO_RISPOSTA_ABILITA_SBAGLIATE.md docs/INTRECCI_IA_E_MIGLIORAMENTI.md docs/FLUSSO_DATI_IA_E_SUGGERIMENTI.md docs/VERIFICA_RAG_STILI_E_ABILITA.md docs/AUDIT_STILI_GIOCATORE_CREARE_RICEVERE.md docs/AUDIT_ALLINEAMENTO_SUPABASE_ISTRUZIONI_PALETTI.md docs/AUDIT_DATI_IA_E_SUPABASE.md docs/AUDIT_ENTERPRISE_IA_PROMPTI_2026.md memoria_attila_backup/
git checkout HEAD~1 -- INDICE_DOCUMENTAZIONE.md docs/AUDIT_ENTERPRISE_2026.md docs/GUIDA_VALIDAZIONE_PROGRAMMATORE.md DOCUMENTAZIONE_RIFERIMENTO.md docs/SISTEMA_CREDITI_AI.md
```

**Nota**: Nessun documento rimosso è referenziato dal codice in esecuzione. `info_rag.md` e i doc rimanenti sono sufficienti per il funzionamento e la manutenzione della piattaforma.

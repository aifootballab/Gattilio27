# Audit Stili Giocatore – Verifica creare/ricevere e ambiguità

**Data**: 3 Febbraio 2026  
**Obiettivo**: Evitare che l’IA inverta o confonda verbi (creare vs ricevere) come per Ala prolifica.

---

## 1. Rischio verificato (Ala prolifica)

| Stile | Errore IA | RAG/memoria | Corretto |
|-------|-----------|-------------|----------|
| **Ala prolifica** | "tagliare verso il centro per **creare** passaggi filtranti" | "per **ricevere** passaggi filtranti" | **ricevere** – l’ala taglia per ricevere la palla in profondità |

---

## 2. Stili con verbi potenzialmente ambigui

| Stile | Verbo critico | Cosa fa il giocatore | Rischio |
|-------|---------------|----------------------|---------|
| **Ala prolifica** | ricevere/creare | Taglia per **ricevere** passaggi filtranti in profondità | ✅ Corretto: ricevere |
| **Taglio al centro** | ricevere | Taglia per **ricevere** passaggi | ✅ Chiaro |
| **Regista creativo** | creare/ricevere | **Riceve** palla negli spazi e **crea** occasioni | Entrambi corretti |
| **Specialista di cross** | crossare | **Effettua** cross (lui crossa) | ✅ Chiaro |
| **Classico n° 10** | avviare | **Crea** avvia attacchi con passaggi | ✅ Chiaro |
| **Senza palla** | creare | **Crea** spazi per compagni (attirando difensori) | ✅ Chiaro |
| **Punta arretrata** | contribuire | **Contribuisce** alla costruzione (imposta) | ✅ Chiaro |
| **Fulcro di gioco** | creare | **Crea** spazio per esterni (con fisico) | ✅ Chiaro |

---

## 3. Azioni correttive per info_rag e memoria

### 3.1 Ala prolifica – esplicitare "ricevere"

**info_rag** (attuale): "taglia verso il centro per passaggi filtranti" → ambiguo  
**Correzione**: "taglia verso il centro per **ricevere** passaggi filtranti"

**memoria_attila**: già "per ricevere passaggi filtranti" ✓

### 3.2 Regola §10 per l’IA

Aggiungere in §10 NOTE CRITICHE una riga tipo:
- **Ala prolifica**: taglia per **ricevere** passaggi filtranti (non per creare). Il giocatore si accentra per ricevere la palla in profondità.

---

## 4. Allineamento memoria_attila ↔ info_rag ↔ Supabase

| Stile | memoria_attila | info_rag | Supabase pos |
|-------|----------------|----------|--------------|
| Ala prolifica | ricevere ✓ | da esplicitare "ricevere" | EDA,ESA ✓ |
| Regista creativo | creare assist | ricevere + creare occasioni | SP,EDA,ESA,TRQ,CLD,CLS ✓ |
| Specialista cross | crossare | crossare | EDA,ESA,CLD,CLS ✓ |
| Sviluppo | solo DC ✓ | solo DC ✓ | DC ✓ |

---

## 5. Checklist per future modifiche

- [ ] Verificare ogni verbo "creare"/"ricevere"/"fornire" nel contesto: chi fa l’azione?
- [ ] Ala prolifica: sempre "ricevere" passaggi filtranti
- [ ] Regista creativo: riceve palla, crea occasioni/assist
- [ ] Specialista cross: effettua cross (soggetto del verbo)

---

*Documento per audit completo stili e prevenzione errori AI.*

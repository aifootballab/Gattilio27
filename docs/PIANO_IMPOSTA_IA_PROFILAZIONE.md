# Piano: da "Imposta IA" a "Informazioni IA"

**Concetto attuale**: il bottone che ci serve è **"Informazioni IA"**: apre un form dove **noi facciamo domande al cliente** (connessione buona?, divisione?, piattaforma?, cosa ti fa perdere più spesso?, ecc.). Le risposte si **salvano** e si **inseriscono nel riassunto** (diagnostic) così l’IA ha tutto per dare consigli mirati. **Niente** preferenza tecnico/semplice: solo domande per completare il quadro.

**Doc di riferimento**: **`INFORMAZIONI_IA_DOMANDE_CLIENTE.md`** – domande da fare, dove salvare, come metterle nel riassunto.

*(Il resto di questo file resta come archivio possibile estensione futura: profilazione avanzata, preferenza stile risposta, ecc.)*

---

## 1. Dove mettere il bottone "Imposta IA"

- **Opzione A (consigliata)**: vicino alla chat o alla barra Conoscenza AI in dashboard (es. icona ingranaggio o "Imposta IA" che apre un pannello/modal).
- **Opzione B**: dentro **Gestione profilo** come sezione "Preferenze IA" (stesso posto dove nome, squadra, problemi dichiarati).
- **Opzione C**: in entrambi (bottone in dashboard che apre il pannello; in gestione profilo la stessa sezione per chi arriva da lì).

**Raccomandazione**: **Opzione A** o **C**. Un bottone "Imposta IA" visibile dalla dashboard/chat richiama subito l’idea "configuro come voglio i consigli"; la sezione può essere la stessa che in Gestione profilo (un solo blocco UI riusabile).

---

## 2. Cosa raccogliere (profilazione)

Domande/sezioni **brevi** per arricchire il riassunto (diagnostic) e il contesto della chat:

| Sezione / domanda | Tipo | Esempio valori | Dove salvare |
|-------------------|------|----------------|---------------|
| **Su cosa vuoi lavorare prima?** | Scelta singola (opzionale) | Difesa / Attacco / Transizioni / Piazzati / Bilanciato | `user_profiles.ai_focus_area` (text) o JSON |
| **Livello di esperienza** | Scelta singola (opzionale) | Principiante / Intermedio / Avanzato | `user_profiles.ai_experience_level` (text) |
| **Preferenza di gioco** | Scelta singola (opzionale) | Possesso / Contropiede / Bilanciato / Non so | `user_profiles.ai_play_preference` (text) |
| **Problemi dichiarati** | Già esistente | `common_problems` (array) | Già in `user_profiles` |

Altre domande opzionali (es. "Cosa ti fa perdere più spesso?", "Preferisci consigli su formazione o su gameplay?") si possono aggiungere in seguito; per la v1 bastano poche voci per non appesantire.

**DB**: estendere `user_profiles` con colonne (es. `ai_focus_area`, `ai_experience_level`, `ai_play_preference`) oppure un JSON `ai_profile` con tutte le risposte. Il diagnostic e il prompt chat leggono questi campi e li includono nel riassunto / nel contesto (es. "Focus: transizioni. Esperienza: intermedio. Preferenza: contropiede.").

---

## 3. Preferenza stile risposta (tecnico vs meno tecnico)

**Scelta del cliente** (es. radio o select):

- **Più tecnica** – L’IA può usare termini precisi (pressing alto, linea, blocchi, transizioni, coperture, ecc.) e dettaglio tattico.
- **Meno tecnica / più semplice** – Consigli in linguaggio piano, meno gergo, frasi brevi e actionable.
- **Bilanciata** (default) – Mix: termini essenziali quando servono, ma senza eccessi.

**Dove salvare**: `user_profiles.ai_response_style` (text: `'technical' | 'simple' | 'balanced'`).

**Uso**:
- In **diagnosticBuilder**: aggiungere una riga tipo "Preferenza risposta: tecnica / semplice / bilanciata".
- In **system prompt** (assistant-chat): "Se il cliente ha scelto risposta **semplice**, evita gergo molto tecnico e usa frasi brevi. Se **tecnica**, puoi usare termini precisi (pressing, linea, blocchi, transizioni). Se **bilanciata**, mix."

Così il riassunto e il prompt sono già allineati alla preferenza e i consigli risultano più mirati anche nel tono.

---

## 4. Flusso tecnico (da implementare)

1. **Migration**: aggiungere a `user_profiles` le colonne (o il JSON) per `ai_focus_area`, `ai_experience_level`, `ai_play_preference`, `ai_response_style`.
2. **API**:  
   - Lettura: già disponibile se si usano le stesse select di profilo.  
   - Scrittura: estendere `save-profile` (o creare `save-ai-preferences`) per salvare questi campi.
3. **UI**:  
   - Bottone "Imposta IA" che apre modal/pannello con le sezioni (domande profilazione + preferenza tecnico/semplice).  
   - Form con le opzioni sopra; submit chiama save-profile (o save-ai-preferences).
4. **diagnosticBuilder**: nel blocco profilo (o in una riga dedicata) includere focus, esperienza, preferenza di gioco, preferenza risposta (tecnica/semplice/bilanciata).
5. **assistant-chat**: nel system prompt (o nel contesto) includere la preferenza risposta e l’istruzione su tono tecnico vs semplice.

---

## 5. Riepilogo

- **Bottone "Imposta IA"**: posto vicino a chat/dashboard (e/o in Gestione profilo) che apre un pannello con domande di profilazione + scelta stile risposta.
- **Profilazione**: poche domande (su cosa lavorare, esperienza, preferenza di gioco) salvate in `user_profiles` e usate per arricchire il riassunto e i consigli mirati.
- **Stile risposta**: tecnica / semplice / bilanciata salvato in `user_profiles.ai_response_style` e rispettato in diagnostic e in system prompt.
- **Suggerimenti (3 domande)**: vanno tenuti **generali e da allenatore**; la formazione/disposizione la chiede il cliente quando vuole (vedi aggiornamento in `getDefaultSuggestions` e `FORMULA_SUGGERIMENTI_CHAT.md`).

Quando si implementa: partire da migration + save/read profilo + UI "Imposta IA" + una riga in diagnostic e una in system prompt; poi eventuali altre domande di profilazione.

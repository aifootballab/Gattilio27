# Bottone "Informazioni IA" – domande al cliente per completare il riassunto

**Idea**: un bottone **"Informazioni IA"** (vicino alla chat o alla barra Conoscenza AI) che apre un form. Lì **noi facciamo domande al cliente** – tutto ciò che serve all’IA per completare il riassunto. Le risposte si **salvano** e si **inseriscono nel riassunto** (diagnostic). Alcune cose esistono già in **Gestione profilo** (nome, come chiamare l’IA, divisione): le mettiamo **anche qui** così "Informazioni IA" diventa il **posto unico** dove il cliente completa tutto per l’IA, senza dover andare in due sezioni diverse.

**Niente scelte di stile** (tecnico/semplice): solo domande e campi per il riassunto.

---

## 1. Dove mettere il bottone

- Vicino alla **chat** o alla **barra Conoscenza AI** in dashboard (es. "Informazioni IA" o icona info).
- Clic → apre un **modal / pannello** con le domande (form).
- Opzionale: stessa sezione raggiungibile anche da **Gestione profilo** ("Informazioni per l’IA"), così chi preferisce può compilarla da lì.

---

## 2. Domande che ci servono per completare il riassunto

Sono cose che **l’IA non può dedurre** da rosa, partite, tattica, allenatore. Il cliente le inserisce qui; **alcune esistono già in profilo** (nome, come chiamare l’IA, divisione): le includiamo nello stesso form così "Informazioni IA" è il posto unico per l’IA.

### 2.1 Gioco e connessione

| Domanda | Perché serve all’IA | Tipo input | Dove salvare |
|---------|---------------------|------------|--------------|
| **Hai la connessione buona o spesso lag/ritardi?** | Evitare consigli che richiedono tempismo perfetto se c’è lag. | Select: Buona / A volte instabile / Spesso lag | `connection_quality` |
| **Difficoltà quando giochi contro avversari con connessione lenta?** | Come sopra: adattare consigli (meno pressing istantaneo, più struttura). | Sì / No / A volte | `slow_opponent_connection_issues` |
| **Hai spesso ritardo input (comandi in ritardo)?** | Non consigliare azioni che richiedono reazioni istantanee. | Sì / No / A volte | `input_delay` |
| **Livello di passaggi (PA)** | In eFootball PA1/PA2/PA3 influenza controllo e tipo di gioco; l’IA può adattare consigli (possesso, passaggio corto/lungo). | Select: PA1 / PA2 / PA3 (o 1–3) | `pass_level` |
| **Usi lo smart assist?** | Influenza come l’IA parla di passaggi, contrasti, posizionamento (assist alto = meno dettaglio su “come” passare). | Sì / No | `smart_assist` |
| **Su che piattaforma giochi?** | Console/PC/mobile può influire su ritardi e tipo di consiglio. | Select: Console / PC / Mobile / Altro | `platform` |

### 2.2 Contesto e preferenze

| Domanda | Perché serve all’IA | Tipo input | Dove salvare |
|---------|---------------------|------------|--------------|
| **In che divisione giochi?** | Contesto livello (avversari, consigli più o meno strutturati). | Testo o select (Div 1–10) | `current_division` (già in profilo) |
| **Ore di gioco (a settimana)?** | Quanto “allenabile” è il contesto; priorità consigli. | Select o numero (es. 1–5, 5–10, 10+) | `hours_per_week` (se non già in profilo) |
| **Giocatore preferito (in rosa)?** | Per connection (Focal/Key Man) o per consigli su sostituzioni/ruolo. | Testo breve (nome) | `favourite_player_name` |
| **Cosa ti fa perdere più spesso?** | Focus esplicito: difesa, attacco, piazzati, transizioni, finale partita. | Select o testo | `ai_weak_point` / `common_problems` |
| **Cosa vorrebbe imparare da noi?** | Orientare consigli: formazione, sostituzioni, istruzioni, gameplay, piazzati, difesa, attacco, ecc. | Select multiplo o testo | `ai_learn_goals` |

### 2.3 Come ti chiami / come chiamare l’IA (già in profilo)

| Domanda | Perché serve all’IA | Tipo input | Dove salvare |
|---------|---------------------|------------|--------------|
| **Come vuoi essere chiamato?** | Nome usato dall’IA in chat ("Ciao Marco", "Per te Luca…"). | Testo breve | `first_name` (già in profilo) |
| **Come vuoi chiamare l’IA?** | Nome dell’assistente ("Coach", "Alex", "Allenatore", ecc.). | Testo breve | `ai_name` (già in profilo) |

In questo modo **anche i campi che sono già in profilo** (nome, ai_name, divisione, ore) li mettiamo nel form "Informazioni IA": il cliente compila tutto in un solo posto e noi leggiamo/scriviamo gli stessi campi di `user_profiles`.

### 2.4 Note libere

| Domanda | Tipo input | Dove salvare |
|---------|------------|--------------|
| **Note per l’IA** (opzionale) | Testo breve: "Struggo contro chi preme alto", "Sono forte sui piazzati", ecc. | `ai_notes` |

Tutte le risposte sono **opzionali**: il cliente compila solo ciò che vuole; nel riassunto usiamo solo i campi valorizzati.

---

## 3. Dove salvare

- **user_profiles**:  
  - **Già presenti** (li mostriamo e aggiorniamo dal form Informazioni IA): `first_name`, `ai_name`, `current_division`, `hours_per_week` (se esiste), `common_problems`.  
  - **Nuovi campi** (migration): `connection_quality`, `slow_opponent_connection_issues`, `input_delay`, `pass_level`, `smart_assist`, `platform`, `favourite_player_name`, `ai_weak_point`, `ai_learn_goals`, `ai_notes`.  
  - Oppure un unico JSON **`ai_info`** con tutte le chiavi sopra (e in lettura unifichiamo con first_name, ai_name, current_division da profilo).
- **save-profile** (o **save-ai-info**) scrive tutti questi campi; refresh-diagnostic e diagnosticBuilder li leggono da user_profiles.

---

## 4. Come inserirle nel riassunto (diagnostic)

- In **refresh-diagnostic** si leggono da user_profiles tutti i campi (first_name, ai_name, current_division, hours_per_week, connection_quality, pass_level, smart_assist, platform, input_delay, slow_opponent_connection_issues, favourite_player_name, ai_weak_point, ai_learn_goals, ai_notes, common_problems, ecc.).
- In **diagnosticBuilder** si aggiunge una sezione **"Informazioni per l’IA"** (o si integra nel blocco profilo) con righe tipo:
  - Nome: … | Chiamare l’IA: … | Divisione: … | Ore/settimana: …
  - Connessione: buona/instabile/lag. Difficoltà con avversari lenti: sì/no. Ritardo input: sì/no.
  - Livello passaggi: PA1/PA2/PA3. Smart assist: sì/no. Piattaforma: …
  - Giocatore preferito: … | Punto debole: … | Cosa vuole imparare: …
  - Note: …
- Solo i campi **valorizzati** vengono scritti (niente "Piattaforma: -" se vuoto).
- La chat riceve il riassunto completo così l’IA adatta i consigli (connessione, PA, cosa vuole imparare, come chiamare l’utente e l’IA).

---

## 5. Flusso tecnico (da implementare)

1. **Migration**: aggiungere a `user_profiles` le colonne (o il JSON `ai_info`) per: connection_quality, slow_opponent_connection_issues, input_delay, pass_level, smart_assist, platform, favourite_player_name, ai_weak_point, ai_learn_goals, ai_notes; usare i campi già esistenti (first_name, ai_name, current_division, hours_per_week) per le domande corrispondenti.
2. **API**: estendere **save-profile** (o **save-ai-info**) per salvare tutti i campi del form Informazioni IA; lettura nelle select profilo/diagnostic.
3. **UI**: bottone **"Informazioni IA"** → modal con form (sezioni: Gioco e connessione, Contesto e preferenze, Come ti chiami / come chiamare l’IA, Note); submit salva su user_profiles.
4. **refresh-diagnostic**: includere in lettura profilo tutti i campi sopra.
5. **diagnosticBuilder**: sezione "Informazioni per l’IA" con i valori sanitizzati; solo campi compilati.

---

## 6. Riepilogo

- **Bottone "Informazioni IA"**: apre un form con **tutte** le domande utili all’IA: connessione, difficoltà con avversari lenti, ritardo input, **livello passaggi (PA)**, **smart assist**, piattaforma, divisione, ore di gioco, **giocatore preferito**, punto debole, **cosa vorrebbe imparare da noi**, **come vuole essere chiamato**, **come vuole chiamare l’IA**, note.
- **Anche i campi già in profilo** (nome, ai_name, divisione, ore) sono nel form: un solo posto dove il cliente completa tutto per l’IA.
- Risposte → **user_profiles** → **diagnostic** → l’IA ha il quadro completo per consigli più mirati (tono, PA, connessione, obiettivi di apprendimento, nome utente e nome IA).

Quando si implementa: migration, API save/read, UI bottone + form (eventualmente a sezioni), integrazione in diagnosticBuilder.

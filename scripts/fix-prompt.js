const fs = require('fs');

const filePath = 'app/api/assistant-chat/route.js';
let content = fs.readFileSync(filePath, 'utf8');

const oldSection = `DOMANDA: "${userMessage}"

Rispondi come ${aiName} in ${language === 'it' ? 'italiano' : 'inglese'}. Max 3 frasi + In sintesi.

---
SUGGERIMENTI (3 domande che esplorano diversi angoli):

🎯 REGOLA PER LE DOMANDE SUGGERITE:
Le 3 domande devono essere PERSONALIZZATE sui dati del cliente (rosa, partite, tattica), NON generiche.

STRUTTURA OBBLIGATORIA:
1. DOMANDA A: Approfondimento sul tema appena trattato (stesso argomento)
2. DOMANDA B: Collegamento a un aspetto CORRELATO ma DIVERSO (es: da modulo → a giocatori specifici della rosa; da tattica → a partite recenti; da singolo giocatore → a sinergia con compagni)
3. DOMANDA C: Prospettiva alternativa o "E se..." (sfida, cambio di approccio, ipotesi diversa)

${personalContextSummary ? `
📊 USA I DATI ROSA PER PERSONALIZZARE:
Titolari elencati sopra → cita nomi specifici nelle domande
Riserve elencate → suggerisci sostituzioni concrete
Partite caricate → collega a risultati recenti
Allenatore → collega a competenze stili
` : '\n📊 SE NON HAI DATI ROSA: domande su come caricarli\n'}

🚫 VIETATO:
• Domande generiche: "Che ne pensi del mio centrocampo?" (troppo vaga)
• Tre domande sullo stesso identico argomento (tutte su modulo, o tutte su stili)
• Domande che ignorano completamente i dati disponibili

✅ ESEMPI CORRETTI (con dati rosa):

Se hai parlato di MODULO 4-3-3:
1. "Passo alla difesa: i miei DC hanno abbastanza fisicità per questo modulo?" ← collega a giocatori specifici
2. "Vedo che hai Messi SP. Conviene metterlo al centro o spostarlo sulla fascia?" ← nome specifico dalla rosa
3. "E se provassi 4-2-3-1 per dare più copertura a centrocampo?" ← prospettiva alternativa

Se hai parlato di SOSTITUZIONI:
1. "Chi altro dovrei valutare in panchina per il centrocampo?" ← approfondimento
2. "La mia difesa ha tenuto nelle ultime partite o serve rinforzo?" ← collega a partite recenti
3. "E se inverto le ali? La mia ESA destra può giocare a sinistra?" ← ipotesi diversa

ISTRUZIONI INDIVIDUALI - REGOLA FERREA:
• NON suggerire istruzioni "a caso"
• Ogni istruzione deve essere COERENTE con:
  - Ruolo del giocatore (non tutte le istruzioni esistono per tutti i ruoli)
  - Stile di gioco del giocatore
  - Posizione in campo
• Se non sei SICURO che un'istruzione esista per quel ruolo, NON proporla
• Preferibile: NON menzionare istruzioni individuali se non hai certezza al 100%

DOMANDE:
1. 
2. 
3. \``;

const newSection = `📝 FORMATO RISPOSTA OBBLIGATORIO:

Devi rispondere ESATTAMENTE in questo formato (copia la struttura):

[Scrivi qui la tua risposta: max 3 frasi operative, inizia con "Metti/Usa/Cambia", finisci con "In sintesi: [azione]"]

---
SUGGERIMENTI:
1. [Prima domanda: approfondimento tema]
2. [Seconda domanda: collegamento ad aspetto correlato ma diverso - es. da modulo a giocatori specifici dalla rosa]
3. [Terza domanda: prospettiva alternativa "E se..."]

🎯 REGOLE PER LE 3 DOMANDE:
• DOMANDA 1: Approfondisci il tema appena trattato (stesso argomento)
• DOMANDA 2: Collega a un aspetto CORRELATO ma DIVERSO (es: da modulo → giocatori specifici dalla rosa; da tattica → partite recenti)
• DOMANDA 3: Prospettiva alternativa o "E se..." (sfida, ipotesi diversa)
• USA nomi specifici dalla rosa del cliente (non domande generiche)

${personalContextSummary ? '\n📊 DATI ROSA DISPONIBILI SOPRA - usa nomi specifici nelle domande\n' : '\n📊 ROSA NON CARICATA - domande su come caricare i dati\n'}

ISTRUZIONI INDIVIDUALI - NON suggerire se non sei sicuro al 100% della coerenza con ruolo e stile.

DOMANDA CLIENTE: "${userMessage}"

Rispondi come ${aiName} in ${language === 'it' ? 'italiano' : 'inglese'}.\``;

if (content.includes(oldSection)) {
  content = content.replace(oldSection, newSection);
  fs.writeFileSync(filePath, content);
  console.log('Replacement successful');
} else {
  console.log('Section not found');
}

/**
 * Regole AI Centralizzate
 * Regole condivise tra tutti i prompt AI per coerenza e manutenibilità
 * Modifica qui una regola, si aggiorna ovunque
 */

/**
 * Regola: Stili di gioco sono fissi, non modificabili
 * Usata in: assistant-chat, analyze-match, countermeasures
 */
export const STILI_GIOCO_FISSI = `⚠️ STILI DI GIOCO FISSI: In eFootball gli stili di gioco dei giocatori (Ala prolifica, Collante, Box-to-Box, Istinto di attacante, ecc.) sono CARATTERISTICHE FISSE della card. NON si possono potenziare, modificare o "migliorare". NON suggerire MAI "potenziare ala prolifica", "migliorare lo stile", "fare in modo che diventi X". Puoi invece consigliare: formazione, chi schierare, sostituzioni, istruzioni individuali, competenza posizione (in-game con Aggiunta Posizione).`;

/**
 * Regola: Competenze allenatore vincolanti
 * Usata in: analyze-match, countermeasures
 */
export const COMPETENZE_ALLENATORE_RULES = `⚠️ REGOLE CRITICHE ALLENATORE:
- Se suggerisci un cambio stile di gioco, usa SOLO stili in cui l'allenatore ha competenza >= 70
- NON suggerire stili con competenza < 50, l'allenatore non è competente
- Le competenze allenatore sono VINCOLANTI: non suggerire mai uno stile con competenza < 50; preferisci stili con competenza >= 70`;

/**
 * Regola: Non inventare dati
 * Usata in: analyze-match, countermeasures, extract-match-data
 */
export const NON_INVENTARE_DATI = `⚠️ REGOLE CRITICHE - NON INVENTARE DATI (ASSOLUTO):
1. NON menzionare goals/assists per giocatori specifici a meno che non siano esplicitamente forniti nei dati
2. Se vedi "goals_scored: X" nelle statistiche squadra, questo è il TOTALE squadra, NON per giocatore
3. Se vedi rating alto (es. 8.5), questo indica buona performance generale, NON necessariamente gol
4. Usa SOLO i dati forniti esplicitamente. NON inferire o inventare dettagli
5. NON inventare azioni specifiche: dribbling, passaggi, tiri, contrasti, recuperi, ecc.
6. NON analizzare video o azioni: abbiamo SOLO il rating (voto), NON dettagli su come ha giocato`;

/**
 * Regola: Distinzione Caratteristiche vs Performance
 * Usata in: analyze-match, countermeasures
 */
export const CARATTERISTICHE_VS_PERFORMANCE = `⚠️ DISTINZIONI CRITICHE - CARATTERISTICHE vs PERFORMANCE:
1. **Skills/Com_Skills** = Caratteristiche del giocatore (es. "Dribbling", "Passing"), NON azioni nel match
   - ❌ SBAGLIATO: "Messi ha fatto dribbling perché ha skill Dribbling"
   - ✅ CORRETTO: "Messi ha performato bene (rating 8.5)" (usa solo rating)
2. **Overall Rating** = Caratteristica giocatore (es. 99), NON performance nel match
   - ❌ SBAGLIATO: "Messi ha giocato bene perché ha overall 99"
   - ✅ CORRETTO: "Messi ha performato bene (rating 8.5)" (usa solo rating match)
3. **Base Stats** (finishing, speed, ecc.) = Caratteristiche giocatore, NON performance nel match
   - ❌ SBAGLIATO: "Messi ha segnato perché ha finishing 95"
   - ✅ CORRETTO: "Messi ha performato bene (rating 8.5)" (usa solo rating)
4. **Form** (A/B/C/D/E) = Forma generale giocatore, NON performance nel match
   - ❌ SBAGLIATO: "Messi ha giocato bene perché è in forma A"
   - ✅ CORRETTO: "Messi ha performato bene (rating 8.5)" (usa solo rating)
5. **Boosters** = Bonus statistici, NON azioni effettuate
   - ❌ SBAGLIATO: "Messi ha corso veloce perché ha booster Speed"
   - ✅ CORRETTO: "Messi ha performato bene (rating 8.5)" (usa solo rating)
6. **Connection** = Bonus statistici, NON causa diretta performance
   - ❌ SBAGLIATO: "Messi ha giocato bene perché ha connection X"
   - ✅ CORRETTO: "Messi ha performato bene (rating 8.5)" (usa solo rating)`;

/**
 * Regola: Non inferire cause
 * Usata in: analyze-match, countermeasures
 */
export const NON_INFERIRE_CAUSE = `⚠️ NON INFERIRE CAUSE - DATI STORICI/STATISTICI ≠ CAUSE DIRETTE:
1. **Competenze Allenatore** = Competenze disponibili, NON stile usato nel match
   - ❌ SBAGLIATO: "Ha usato Contrattacco perché allenatore ha competenza 89"
   - ✅ CORRETTO: "Stile usato: Contrattacco" (se disponibile nei dati)
2. **Win Rate** = Statistica storica, NON causa vittoria
   - ❌ SBAGLIATO: "Ha vinto perché ha win rate 60%"
   - ✅ CORRETTO: "Ha vinto. Win rate storico: 60%" (se menzioni, dì che è storico)
3. **Performance Storiche** = Pattern storico, NON causa performance attuale
   - ❌ SBAGLIATO: "Ha giocato male perché ha sempre giocato male contro 4-3-3"
   - ✅ CORRETTO: "Rating attuale: 5.5. Storicamente ha rating medio 5.8 contro 4-3-3"
4. **Istruzioni Individuali** = Istruzioni configurate, NON azioni effettuate
   - ❌ SBAGLIATO: "Ha attaccato perché ha istruzione offensiva"
   - ✅ CORRETTO: "Ha istruzione offensiva configurata"
5. **Formazione Avversaria** = Formazione avversaria, NON causa performance
   - ❌ SBAGLIATO: "Ha giocato bene perché ha sfruttato debolezze 4-3-3"
   - ✅ CORRETTO: "Formazione avversaria: 4-3-3. Performance: rating 8.5"
6. **Posizioni Originali** = Posizioni naturali giocatore, NON posizione nel match
   - ❌ SBAGLIATO: "Ha giocato in AMF perché è sua posizione originale"
   - ✅ CORRETTO: "Posizione originale: AMF. Posizione match: SP"`;

/**
 * Regola: Stili per ruolo (non mescolare)
 * Usata in: assistant-chat, countermeasures
 */
export const STILI_PER_RUOLO = `⚠️ STILI PER RUOLO (OBBLIGATORIO): Applica gli stili SOLO al ruolo corretto. Per domande su attaccanti/punte usa solo stili da "Attaccanti" (Istinto di attacante, Opportunista, Ala prolifica, ecc.); NON citare Collante o Box-to-Box per attaccanti. Per centrocampisti usa solo stili da "Centrocampisti" (Collante, Box-to-Box, ecc.); per difensori solo da "Difensori" (Difensore distruttore, Frontale extra). Non mescolare ruoli.`;

/**
 * Regola: Statistiche sono totali squadra
 * Usata in: extract-match-data, analyze-match
 */
export const STATISTICHE_SQUADRA_NOT_PER_PLAYER = `⚠️ IMPORTANTE: TUTTE le statistiche sono TOTALI SQUADRA, NON per giocatore.
- "goals_scored" e "goals_conceded" = totali squadra, NON per giocatore
- "shots", "passes", "tackles", ecc. = totali squadra, NON per giocatore
- NON dire "Messi ha tirato X volte" da shots: 16 (è totale squadra)`;

/**
 * Regola: Comunicazione reason breve
 * Usata in: countermeasures
 */
export const REASON_BREVE_DIRETTO = `⚠️ REGOLE CRITICHE - CAMPO "reason":
- Il campo "reason" deve contenere solo una breve motivazione diretta (1-2 righe)
- NON spiegare ragionamenti tattici espliciti
- NON dire "perché" o "perché l'avversario ha X quindi Y"
- NON inventare azioni specifiche: dribbling, passaggi, tiri, contrasti, recuperi, ecc.
- Dire solo il risultato: "Usa 4-2-3-1. Funziona." (non "Usa 4-2-3-1 perché...")
- Se menzioni performance giocatori, usa SOLO rating: "Giocatore X ha performato bene (rating 8.5)"
- Essere professionale, fermo, diretto`;

/**
 * Regola: Posizioni e overall verificati
 * Usata in: analyze-match, countermeasures
 */
export const POSIZIONI_OVERALL_VERIFICATI = `⚠️ REGOLE CRITICHE - POSIZIONI E OVERALL:
1. NON menzionare overall_rating se photo_slots è vuoto {} (dati non verificati)
2. NON menzionare posizione specifica se original_positions è vuoto [] (posizioni non estratte)
3. NON menzionare posizione se original_positions.length === 1 E photo_slots.card !== true (troppo incerto)
4. Se dati non verificati, usa generico: "Messi va bene in campo" (non "Messi va bene in SP")
5. Essere professionale: dire solo ciò che sai con certezza, non inventare`;

/**
 * Costruisci stringa competenze allenatore formattata
 * @param {Object} competences - Oggetto { style: value, ... }
 * @returns {string} Testo formattato
 */
export function formatCoachCompetences(competences) {
  if (!competences || typeof competences !== 'object') return '';
  
  const styleNames = {
    'possesso_palla': 'Possesso Palla',
    'contropiede_veloce': 'Contropiede Veloce',
    'contrattacco': 'Contrattacco',
    'vie_laterali': 'Vie Laterali',
    'passaggio_lungo': 'Passaggio Lungo'
  };
  
  const items = [];
  Object.entries(competences).forEach(([style, value]) => {
    const styleName = styleNames[style] || style;
    const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
    const level = numValue >= 80 ? '🔴 ALTA' : numValue >= 60 ? '🟡 MEDIA' : '⚪ BASSA';
    items.push(`  * ${styleName}: ${numValue} ${level}`);
  });
  
  return items.join('\n');
}

/**
 * Ottieni array di stili alti (>=70) e bassi (<50)
 * @param {Object} competences 
 * @returns {{high: string[], low: string[]}}
 */
export function getHighLowCompetences(competences) {
  if (!competences || typeof competences !== 'object') return { high: [], low: [] };
  
  const styleNames = {
    'possesso_palla': 'Possesso Palla',
    'contropiede_veloce': 'Contropiede Veloce',
    'contrattacco': 'Contrattacco',
    'vie_laterali': 'Vie Laterali',
    'passaggio_lungo': 'Passaggio Lungo'
  };
  
  const high = [];
  const low = [];
  
  Object.entries(competences).forEach(([style, value]) => {
    const numValue = typeof value === 'number' ? value : parseInt(value) || 0;
    const styleName = styleNames[style] || style;
    
    if (numValue >= 70) high.push(styleName);
    if (numValue < 50) low.push(styleName);
  });
  
  return { high, low };
}

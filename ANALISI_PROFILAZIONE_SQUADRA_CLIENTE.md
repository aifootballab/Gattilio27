# Analisi Profilazione Squadra Cliente

**Data:** 23 Gennaio 2026  
**Problema:** Non sappiamo quale squadra è quella del cliente nelle statistiche match

---

## 🔍 SITUAZIONE ATTUALE

### Problema Identificato

**Dall'immagine fornita:**
- Squadra 1: "GONDİKLENDİNİZZZ <^=^>" (Orange County SC)
- Squadra 2: "Naturalborngamers.it" (AC Milan)
- Risultato: **6-1**
- **Problema:** Non sappiamo quale squadra ha vinto 6-1 (quale è quella del cliente)

### Struttura Database Attuale

**Tabella `matches`:**
- ✅ `opponent_name` (TEXT) - Nome avversario
- ❌ **MANCA** `client_team_name` - Nome squadra del cliente

**Tabella `user_profiles`:**
- ✅ `team_name` (TEXT) - Nome squadra nel gioco (già presente!)

**Tabella `coaches`:**
- ✅ `team` (TEXT) - Nome squadra dell'allenatore

---

## 💡 SOLUZIONE PROPOSTA

### Opzione 1: Usare `user_profiles.team_name` (CONSIGLIATA)

**Vantaggi:**
- ✅ Campo già esistente in `user_profiles`
- ✅ Un solo valore per utente (UNIQUE user_id)
- ✅ Già parte della profilazione utente
- ✅ Non serve migration (solo aggiungere campo in `matches`)

**Implementazione:**
1. Aggiungere campo `client_team_name` in `matches` (migration)
2. Recuperare `team_name` da `user_profiles` quando si salva match
3. Se non esiste, chiedere all'utente di inserirlo (opzionale nel wizard)
4. Salvare `client_team_name` in ogni match

### Opzione 2: Chiedere nel Wizard "Aggiungi Partita"

**Vantaggi:**
- ✅ Utente può specificare squadra per ogni match
- ✅ Utile se utente ha più squadre

**Svantaggi:**
- ⚠️ Aggiunge step al wizard
- ⚠️ UX più complessa

**Raccomandazione:** **Opzione 1** (più semplice, coerente con profilazione esistente)

---

## 🎯 IMPLEMENTAZIONE CONSIGLIATA

### 1. Migration: Aggiungere `client_team_name` a `matches`

```sql
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS client_team_name TEXT;

-- Indice per query future
CREATE INDEX IF NOT EXISTS idx_matches_client_team_name 
ON matches(client_team_name) 
WHERE client_team_name IS NOT NULL;
```

### 2. Modificare `save-match/route.js`

**Logica:**
```javascript
// 1. Recupera team_name da user_profiles
const { data: userProfile } = await admin
  .from('user_profiles')
  .select('team_name')
  .eq('user_id', userId)
  .single()

// 2. Se non esiste, prova a recuperare da coaches (fallback)
let clientTeamName = userProfile?.team_name
if (!clientTeamName) {
  const { data: activeCoach } = await admin
    .from('coaches')
    .select('team')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()
  clientTeamName = activeCoach?.team
}

// 3. Salva in match
const insertData = {
  // ...
  client_team_name: toText(clientTeamName) || toText(matchData.client_team_name) || null,
  // ...
}
```

### 3. Aggiungere Campo Opzionale nel Wizard

**Se `team_name` non esiste in `user_profiles`:**
- Mostrare campo opzionale "Nome Squadra" nel modal riepilogo
- Salvare in `user_profiles.team_name` quando si salva match
- Usare per tutti i match futuri

### 4. Usare `client_team_name` per Identificare Squadra

**Nelle statistiche:**
- Confrontare `client_team_name` con nomi squadre nelle statistiche
- Identificare quale è "team1" e quale è "team2"
- Calcolare risultato corretto (6-1 per cliente o 1-6 per avversario)

---

## 📋 PIANO IMPLEMENTAZIONE

### Fase 1: Migration Database (5 minuti)
- [ ] Aggiungere campo `client_team_name` a `matches`
- [ ] Creare indice

### Fase 2: Backend - Recupero Team Name (30 minuti)
- [ ] Modificare `save-match/route.js` per recuperare da `user_profiles`
- [ ] Fallback su `coaches.team` se non presente
- [ ] Salvare `client_team_name` in match

### Fase 3: Frontend - Campo Opzionale (1 ora)
- [ ] Verificare se `team_name` esiste in `user_profiles`
- [ ] Mostrare campo opzionale nel modal riepilogo se mancante
- [ ] Salvare in `user_profiles` quando inserito

### Fase 4: Identificazione Squadra nelle Statistiche (1 ora)
- [ ] Usare `client_team_name` per identificare quale è "team1" vs "team2"
- [ ] Calcolare risultato corretto
- [ ] Mostrare statistiche corrette (cliente vs avversario)

---

## 🔒 GARANZIE

- ✅ **Backward Compatible:** Match vecchi avranno `client_team_name = null` (ok)
- ✅ **Non Bloccante:** Se non presente, match si salva comunque
- ✅ **Profilazione Esistente:** Usa struttura già presente (`user_profiles.team_name`)
- ✅ **Fallback:** Se non in `user_profiles`, prova `coaches.team`

---

## ✅ CONCLUSIONE

**Soluzione:** Usare `user_profiles.team_name` + aggiungere `client_team_name` in `matches`

**Tempo Stimato:** 2-3 ore  
**Rischio:** 🟢 **BASSO** - Aggiunta campo, non modifica logica esistente  
**Impatto:** 🟢 **ALTO** - Risolve problema tracciabilità

**Pronto per implementazione!** ✅

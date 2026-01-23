# Piano Implementazione Profilazione Squadra Cliente

**Data:** 23 Gennaio 2026  
**Status:** ✅ **PAGINA ESISTE - DA COMPLETARE**

---

## 🔍 SITUAZIONE ATTUALE

### ✅ Cosa Esiste Già

1. **Pagina Impostazioni Profilo** (`app/impostazioni-profilo/page.jsx`)
   - ✅ Campo `team_name` presente (linea 472-491)
   - ✅ Endpoint `/api/supabase/save-profile` funzionante
   - ✅ Salvataggio in `user_profiles.team_name` ✅

2. **Database**
   - ✅ Tabella `user_profiles` con campo `team_name`
   - ❌ **MANCA** campo `client_team_name` in `matches`

3. **Backend**
   - ✅ Endpoint `save-profile` salva `team_name`
   - ❌ **MANCA** recupero `team_name` in `save-match`

---

## 🎯 PROBLEMA IDENTIFICATO

**Dall'immagine:**
- Squadra 1: "GONDİKLENDİNİZZZ <^=^>"
- Squadra 2: "Naturalborngamers.it"
- Risultato: **6-1**
- **Non sappiamo quale squadra è quella del cliente**

**Causa:**
- `team_name` esiste in `user_profiles` ma:
  1. Utente potrebbe non averlo ancora inserito
  2. Quando si salva match, non viene recuperato e salvato in `matches.client_team_name`
  3. Non c'è link visibile alla pagina profilo dalla dashboard

---

## 💡 SOLUZIONE ENTERPRISE

### Fase 1: Migration Database (5 minuti)

**Aggiungere campo `client_team_name` in `matches`:**

```sql
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS client_team_name TEXT;

-- Indice per query future
CREATE INDEX IF NOT EXISTS idx_matches_client_team_name 
ON matches(client_team_name) 
WHERE client_team_name IS NOT NULL;
```

### Fase 2: Backend - Recupero Team Name (30 minuti)

**Modificare `save-match/route.js`:**

```javascript
// Dopo autenticazione, prima di preparare insertData

// 1. Recupera team_name da user_profiles
const { data: userProfile, error: profileError } = await admin
  .from('user_profiles')
  .select('team_name')
  .eq('user_id', userId)
  .maybeSingle()

// 2. Fallback: prova coaches.team se non presente
let clientTeamName = userProfile?.team_name
if (!clientTeamName) {
  const { data: activeCoach } = await admin
    .from('coaches')
    .select('team')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  clientTeamName = activeCoach?.team
}

// 3. Salva in match
const insertData = {
  // ...
  client_team_name: toText(clientTeamName) || toText(matchData.client_team_name) || null,
  // ...
}
```

### Fase 3: Link alla Pagina Profilo (15 minuti)

**Aggiungere link nella dashboard (`app/page.jsx`):**

```javascript
// Nel header o in una sezione dedicata
<button
  onClick={() => router.push('/impostazioni-profilo')}
  style={{ /* stile neon */ }}
>
  <User size={18} />
  {t('userProfile')}
</button>
```

### Fase 4: Evidenziare Campo Team Name (30 minuti)

**Nella pagina profilo, evidenziare importanza `team_name`:**

- Badge "Importante" accanto al campo
- Messaggio: "Questo nome verrà usato per identificare la tua squadra nelle partite"
- Validazione: suggerire di compilarlo se vuoto

---

## 📋 CHECKLIST IMPLEMENTAZIONE

### Database
- [ ] Migration: Aggiungere `client_team_name` a `matches`
- [ ] Creare indice

### Backend
- [ ] Modificare `save-match/route.js` per recuperare `team_name`
- [ ] Fallback su `coaches.team`
- [ ] Salvare `client_team_name` in match
- [ ] Testare con `team_name` presente
- [ ] Testare con `team_name` assente

### Frontend
- [ ] Aggiungere link "Impostazioni Profilo" nella dashboard
- [ ] Evidenziare campo `team_name` nella pagina profilo
- [ ] Aggiungere messaggio informativo
- [ ] Verificare responsive

### UX
- [ ] Verificare che pagina profilo sia accessibile
- [ ] Verificare che salvataggio funzioni
- [ ] Testare flusso completo

---

## 🔒 GARANZIE ENTERPRISE

- ✅ **Backward Compatible:** Match vecchi avranno `client_team_name = null` (ok)
- ✅ **Non Bloccante:** Se `team_name` non presente, match si salva comunque
- ✅ **Profilazione Esistente:** Usa struttura già presente
- ✅ **Fallback:** Se non in `user_profiles`, prova `coaches.team`
- ✅ **UX Chiara:** Link visibile nella dashboard

---

## ✅ CONCLUSIONE

**Soluzione:** 
1. Aggiungere `client_team_name` in `matches` (migration)
2. Recuperare `team_name` da `user_profiles` quando si salva match
3. Aggiungere link alla pagina profilo nella dashboard
4. Evidenziare importanza campo `team_name`

**Tempo Stimato:** 1.5-2 ore  
**Rischio:** 🟢 **BASSO** - Aggiunta campo, non modifica logica esistente  
**Impatto:** 🟢 **ALTO** - Risolve problema tracciabilità

**Pronto per implementazione!** ✅

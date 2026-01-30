# 🧪 GUIDA TEST - Ambiente Cloud (Vercel)

**Per chi lavora solo su cloud senza ambiente locale**

---

## 🚀 Step 1: Deploy su Vercel

### Opzione A: Deploy Automatico (Consigliata)
```
1. Committa su GitHub (già fatto)
2. Vercel fa deploy automatico della branch
3. Ottieni URL preview (es: https://gattilio27-xxx.vercel.app)
```

### Opzione B: Deploy Manuale
```bash
# Se hai Vercel CLI installato
npx vercel --prod

# Oppure vai su https://vercel.com/dashboard
# Seleziona progetto → Deploy
```

**URL da testare:**
- 🔗 Preview: `https://[nome-progetto]-git-[branch]-[utente].vercel.app`
- 🔗 Production: `https://[nome-progetto].vercel.app`

---

## 🧪 Step 2: Test su Cloud

### Test A: Blocco Doppio Click (RC-004)

**URL:** `https://tuo-url.vercel.app/gestione-formazione`

```
1. Accedi all'app (login)
2. Vai su "Gestione Formazione"
3. Assicurati di avere riserve caricate
4. Apri DevTools (F12) → Network tab
5. Clicca su slot vuoto
6. Seleziona riserva
7. Clicca RAPIDAMENTE 2-3 volte su conferma
```

**Verifica in Network tab:**
- ✅ Solo UNA chiamata a `assign-player-to-slot`
- ✅ Status 200 (non 429 o multipli)

---

### Test B: Errori User-Friendly

**Simula errore:**
```
1. Apri Console (F12)
2. Esegui:
```

```javascript
// Test mapping errori
fetch('/api/assistant-chat', {
  method: 'POST',
  body: JSON.stringify({message: 'test'})
}).catch(e => console.log(e.message));
```

**Risultato atteso:**
- Messaggio utente: "Servizio momentaneamente sovraccarico..."
- NON "Quota OpenAI esaurita"

---

### Test C: Memory Leak

```
1. Vai su Gestione Formazione
2. Carica un giocatore
3. Mentre carica, clicca su "Dashboard"
4. Torna indietro
5. Ripeti 5 volte
```

**Verifica:**
- Nessun errore in console
- Memoria stabile (Memory tab → Snapshot)

---

## 🔍 Step 3: Test Funzionalità Core

Devi testare che TUTTO funzioni su cloud:

| Feature | URL da testare | Cosa verificare |
|---------|----------------|-----------------|
| Login | `/login` | Accede senza errori |
| Dashboard | `/` | Carica dati, TaskWidget visibile |
| Formazione | `/gestione-formazione` | Upload, assegnazione, riserve |
| Partita | `/match/new` | Wizard 5 step, salvataggio |
| Chat AI | Icona cervello | Risponde, mantiene contesto |
| Guida | `/guida` | Tour interattivo funziona |

---

## 🐛 Step 4: Come Segnalare Bug

### Template Bug Report (Cloud)

```markdown
**URL:** https://gattilio27-xxx.vercel.app
**Data/Ora:** 2026-01-30 15:30
**Browser:** Chrome 120 / Mobile Safari

**Problema:** [Descrizione]

**Passi:**
1. Vai su [URL]
2. Clicca su [elemento]
3. ...

**Errore Console:**
```
[incolla errore]
```

**Screenshot:** [allega]

**Deploy:** Commit 83f6bc0
```

---

## 🚨 Step 5: Rollback Cloud

Se l'app si rompe su cloud:

### Metodo 1: Rollback GitHub
```
1. Vai su https://github.com/aifootballab/Gattilio27
2. Clicca su "Commits"
3. Trova commit stabile (es: ae38cd6)
4. Clicca "Revert" o crea PR di rollback
5. Vercel redeploya automaticamente
```

### Metodo 2: Rollback Vercel Dashboard
```
1. Vai su https://vercel.com/dashboard
2. Seleziona progetto Gattilio27
3. Tab "Deployments"
4. Trova deploy stabile precedente
5. Clicca "..." → "Promote to Production"
```

### Metodo 3: Branch di Emergenza
```bash
# Se hai accesso a terminale
git checkout -b hotfix/rollback
git reset --hard ae38cd6  # Commit stabile
git push origin hotfix/rollback

# Crea PR su GitHub per hotfix
```

---

## ⚡ Test Veloce (5 minuti)

Se hai poco tempo, testa SOLO questi:

```
1. Login → Dashboard ✓
2. Gestione Formazione → Upload giocatore ✓
3. Assegna riserva a slot (test doppio click) ✓
4. Wizard Partita → Salva ✓
5. Chat AI → Messaggio ✓
```

Se tutti ✅ → OK per production

---

## 📊 Monitoraggio Post-Deploy

### Vercel Analytics
```
https://vercel.com/dashboard → Progetto → Analytics
```
Controlla:
- Errori 500
- Performance (Web Vitals)
- Traffic

### Log Realtime
```
https://vercel.com/dashboard → Progetto → Logs
```
Filtra per:
- Errori (level:error)
- API routes (/api/*)

---

## 🎯 Checklist Pre-Production

Prima di mettere in production:

- [ ] Test su URL preview superati
- [ ] Nessun errore 500 in Vercel Logs
- [ ] Core Web Vitals verdi
- [ ] Test su mobile (Chrome DevTools → Responsive)
- [ ] Test incognito (no cache)

---

## 💡 Suggerimenti Cloud

### Preview per ogni PR
```
1. Crea branch: git checkout -b feature/test
2. Push: git push origin feature/test
3. Vercel crea URL preview automatico
4. Testa su URL preview
5. Se OK → merge su main
```

### Environment Variables
```
Vercel Dashboard → Settings → Environment Variables
```
Verifica siano impostate:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`

---

**Test su cloud = Test su production!** 🚀

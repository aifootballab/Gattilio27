# Refactoring Completo - Versione Minimale

## Obiettivo
App minimale con solo **login** e **visualizzazione giocatori salvati**.

---

## Stato Finale

### ✅ Pagine Mantenute
1. **`app/login/page.jsx`** - Login/Signup
2. **`app/my-players/page.jsx`** - Visualizzazione giocatori salvati
3. **`app/page.jsx`** - Homepage (redirect a /login)

### ✅ API Mantenute
1. **`app/api/supabase/get-my-players/route.js`** - Recupera giocatori utente
2. **`app/api/supabase/save-player/route.js`** - Salva giocatore (per salvataggi da altre fonti)

### ❌ Pagine Rimosse
- `app/dashboard/page.jsx` - ❌ ELIMINATA
- `app/rosa/page.jsx` - ❌ ELIMINATA
- `app/opponent-formation/page.jsx` - ❌ ELIMINATA

### ❌ API Rimosse
- `app/api/extract-batch/` - ❌ ELIMINATA
- `app/api/extract-player/` - ❌ ELIMINATA
- `app/api/extract-formation/` - ❌ ELIMINATA
- `app/api/supabase/reset-my-data/` - ❌ ELIMINATA
- `app/api/supabase/save-opponent-formation/` - ❌ ELIMINATA
- `app/api/env-check/` - ❌ ELIMINATA
- `app/api/whoami/` - ❌ ELIMINATA

---

## Modifiche Applicate

### 1. `app/page.jsx`
- **Prima**: Redirect a `/dashboard`
- **Dopo**: Redirect a `/login`

### 2. `app/login/page.jsx`
- **Prima**: Redirect a `/dashboard` dopo login
- **Dopo**: Redirect a `/my-players` dopo login

### 3. `app/my-players/page.jsx`
- **Rimossi**: Link a `/dashboard` e `/rosa`
- **Aggiunto**: Bottone logout nel header
- **Rimosso**: Empty state con link a upload screenshot
- **Rimossi**: Import `Link` e `Upload` non usati

---

## Flusso Finale

```
Home (/) 
  → Redirect a /login
  
Login (/login)
  → Login/Signup con Supabase Auth
  → Redirect a /my-players
  
My Players (/my-players)
  → Visualizza giocatori salvati (GET /api/supabase/get-my-players)
  → Card cliccabili → Modal dettaglio
  → Logout → /login
```

---

## Database Supabase

### Tabella `players`
- **Azzerata**: `DELETE FROM players` (0 giocatori)
- **Associazione**: Tutti i giocatori salvati hanno `user_id` associato
- **RLS**: Attivo (ogni utente vede solo i propri giocatori)

---

## API Disponibili

### `GET /api/supabase/get-my-players`
- **Auth**: Bearer token JWT
- **Response**: `{ players: [...], count: N }`
- **Filter**: Solo giocatori dell'utente (`WHERE user_id = ?`)

### `POST /api/supabase/save-player`
- **Auth**: Bearer token JWT
- **Request**: `{ player: {...} }`
- **Response**: `{ success: true, player_id: "uuid", is_new: true }`
- **Note**: Salva sempre come nuovo record (permette duplicati)

---

## Verifica Finale

### ✅ Database
- [x] Tabella `players` vuota (0 record)
- [x] RLS attivo
- [x] `user_id` associato correttamente al salvataggio

### ✅ Frontend
- [x] Solo 2 pagine: `login` e `my-players`
- [x] Homepage redirect a `/login`
- [x] Login redirect a `/my-players`
- [x] My-players senza link a pagine rimosse

### ✅ Backend
- [x] Solo 2 API: `get-my-players` e `save-player`
- [x] Tutte le API extract-* rimosse
- [x] Tutte le API inutilizzate rimosse

---

## Note

- **Salvataggio giocatori**: L'API `save-player` è disponibile per salvataggi da altre fonti (non c'è più upload nel frontend)
- **Visualizzazione**: `my-players` mostra tutti i giocatori salvati per l'utente corrente
- **Minimale**: Solo login e visualizzazione - nessun upload, nessuna estrazione nel frontend

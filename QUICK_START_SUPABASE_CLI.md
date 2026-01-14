# ⚡ Quick Start: Connettere Supabase CLI a Cursor

**Guida Rapida** - 5 minuti per configurare tutto

---

## 🚀 STEP 1: Installa Supabase CLI

```powershell
# Apri PowerShell nella directory del progetto
cd C:\Users\attil\Desktop\Gattilio27-master\Gattilio27-master

# Installa Supabase CLI globalmente
npm install -g supabase

# Verifica installazione
supabase --version
```

**Output atteso**: `supabase x.x.x` (versione)

---

## 🔐 STEP 2: Login a Supabase

```powershell
# Login (apre browser per autenticazione)
supabase login
```

**Cosa succede**:
1. Si apre il browser
2. Fai login con il tuo account Supabase
3. Autorizza l'accesso
4. Torna al terminale - dovresti vedere "Logged in as: your-email"

---

## 🔗 STEP 3: Link al Progetto

```powershell
# Link al progetto (usa il tuo Project Reference ID)
supabase link --project-ref YOUR_PROJECT_REF
```

**Dove trovare Project Reference**:
1. Vai su https://supabase.com/dashboard
2. Seleziona il tuo progetto
3. Vai su **Settings** → **General**
4. Copia **Reference ID** (es. `zliuuorrwdetylollrua`)

**Esempio**:
```powershell
supabase link --project-ref zliuuorrwdetylollrua
```

**Output atteso**: `Linked to project: your-project-name`

---

## ✅ STEP 4: Verifica Connessione

```powershell
# Verifica stato
supabase status
```

**Output atteso**: Informazioni sul progetto linkato

---

## 🎯 STEP 5: Test - Chiedi a Me!

Ora che è configurato, puoi chiedermi di:

1. **Eseguire la migration 003**:
   ```
   "Esegui la migration 003 in Supabase"
   ```

2. **Deployare Edge Functions**:
   ```
   "Deploya tutte le Edge Functions GPT-Realtime"
   ```

3. **Eseguire query SQL**:
   ```
   "Mostrami le prime 5 righe della tabella players_base"
   ```

4. **Verificare tabelle**:
   ```
   "Verifica che tutte le tabelle della migration 003 siano create"
   ```

---

## ⚠️ PROBLEMI COMUNI

### **Errore: "supabase: command not found"**
- **Soluzione**: Riavvia PowerShell dopo installazione
- Oppure: `npm install -g supabase` di nuovo

### **Errore: "Not logged in"**
- **Soluzione**: Esegui `supabase login` di nuovo

### **Errore: "Project not found"**
- **Soluzione**: Verifica che il Project Reference ID sia corretto
- Controlla che il progetto esista nel tuo account

---

## 📋 CHECKLIST RAPIDA

- [ ] Supabase CLI installato (`supabase --version` funziona)
- [ ] Loggato (`supabase login` completato)
- [ ] Progetto linkato (`supabase link --project-ref XXX` completato)
- [ ] Verificato (`supabase status` mostra il progetto)

---

**Status**: ✅ **PRONTO** - Ora posso aiutarti a gestire Supabase direttamente!

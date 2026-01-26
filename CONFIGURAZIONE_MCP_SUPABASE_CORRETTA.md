# ✅ CONFIGURAZIONE MCP SUPABASE CORRETTA

**Data**: 24 Gennaio 2026  
**Status**: ✅ **CONFIGURATA CORRETTAMENTE**

---

## 📋 CONFIGURAZIONE APPLICATA

**File**: `c:\Users\attil\.cursor\mcp.json`

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

---

## ✅ CONFIGURAZIONE CORRETTA

### **Remote MCP Server (Raccomandato)**

**URL**: `https://mcp.supabase.com/mcp`

**Caratteristiche**:
- ✅ **Nessun parametro nell'URL**: L'URL base è sufficiente
- ✅ **Autenticazione automatica**: Tramite browser (dynamic client registration)
- ✅ **Nessuna credenziale manuale**: Non serve PAT o Service Role Key
- ✅ **Project scoping**: Gestito tramite autenticazione browser

---

## ❌ CONFIGURAZIONE ERRATA (Quella Fornita)

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=zliuuorrwdetylollrua"
    }
  }
}
```

**Problemi**:
- ❌ **Parametro `project_ref` non necessario**: Per remote MCP, il project viene selezionato durante l'autenticazione browser
- ❌ **Manca header Authorization**: Se si usa `project_ref` nell'URL, serve anche `Authorization: Bearer <PAT>` (solo per CI)

---

## 🔧 COME FUNZIONA

### **1. Setup Iniziale**

1. **Aggiungi configurazione** in `~/.cursor/mcp.json` (o `.cursor/mcp.json` nel progetto)
2. **Riavvia Cursor**
3. **Autenticazione automatica**: Cursor aprirà browser per login Supabase
4. **Seleziona organizzazione**: Scegli l'organizzazione che contiene il progetto
5. **Concedi permessi**: Autorizza l'accesso MCP

### **2. Verifica Connessione**

1. **Apri Cursor Settings**: `Ctrl+,` (o `Cmd+,` su Mac)
2. **Vai a**: Settings → Cursor Settings → Tools & MCP
3. **Verifica**: Server "supabase" dovrebbe essere verde/attivo
4. **Test**: Chiedi all'AI "What tables are there in the database? Use MCP tools."

---

## 📚 DOCUMENTAZIONE UFFICIALE

**Fonte**: https://supabase.com/docs/guides/getting-started/mcp

**Punti Chiave**:
- Remote MCP server: `https://mcp.supabase.com/mcp`
- Autenticazione: Dynamic client registration (browser-based)
- Nessun PAT richiesto per uso normale
- Project scoping: Gestito durante autenticazione

---

## ⚠️ CONFIGURAZIONE ALTERNATIVA (Solo per CI)

Se stai usando Supabase MCP in ambiente CI (dove browser login non è possibile):

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=zliuuorrwdetylollrua",
      "headers": {
        "Authorization": "Bearer ${SUPABASE_ACCESS_TOKEN}"
      }
    }
  }
}
```

**Requisiti**:
- Personal Access Token (PAT) da Supabase Dashboard
- Variabile ambiente `SUPABASE_ACCESS_TOKEN`
- Variabile ambiente `SUPABASE_PROJECT_REF`

**⚠️ NOTA**: Questa configurazione è solo per CI. Per uso normale (Cursor IDE), usa la configurazione standard senza parametri.

---

## ✅ STATUS ATTUALE

- ✅ **Configurazione applicata**: `c:\Users\attil\.cursor\mcp.json` aggiornato
- ✅ **URL corretto**: `https://mcp.supabase.com/mcp` (senza parametri)
- ⚠️ **Server non ancora attivo**: Richiede riavvio Cursor e autenticazione browser

---

## 🔍 VERIFICA POST-CONFIGURAZIONE

**Data Verifica**: 24 Gennaio 2026

**Risultato**:
- ✅ File `mcp.json` contiene configurazione corretta
- ❌ Server "supabase" non ancora disponibile nei tool MCP
- ⚠️ **Causa probabile**: Cursor non riavviato dopo modifica configurazione

**Azioni Necessarie**:
1. **Riavviare Cursor completamente**
2. **Completare autenticazione browser** (dovrebbe aprirsi automaticamente)
3. **Verificare in Settings → Tools & MCP** che server sia verde/attivo

**Documento dettagliato**: Vedi `VERIFICA_MCP_SUPABASE.md`

---

**Fine Documento**

# Perché GPT-5 potrebbe non funzionare

OpenAI a volte restituisce **400 Bad Request** (non 404) quando il modello non è disponibile per l’account; l’app ora tratta anche questi casi e fa fallback a gpt-4o.

Dopo il deploy, se la chat va ancora in errore con `gpt-5`, controlla i **log su Vercel** (Functions → assistant-chat → Logs). Troverai una riga tipo:

```text
[assistant-chat] OpenAI error: status=..., code=..., message=..., model requested=gpt-5
```

## Cause possibili

### 1. **Piano Free / modello non disponibile per il tuo tier**
Nella [documentazione OpenAI](https://platform.openai.com/docs/models/gpt-5), GPT-5 ha **"Free | Not supported"**: sul piano gratuito il modello non è disponibile. Serve un account a pagamento (Tier 1 o superiore).

- **Cosa fare:** vai su [Usage](https://platform.openai.com/usage), aggiungi un metodo di pagamento e assicurati di avere un tier che supporta GPT-5.

### 2. **Nome modello errato**
L’API accetta ad esempio:
- `gpt-5` (modello principale)
- `gpt-5-mini`, `gpt-5-nano`
- Snapshot tipo `gpt-5-2025-08-07`

Se in `OPENAI_MODEL` hai un typo (es. `gpt5`, `gpt-5.0`) OpenAI risponde con `model_not_found` / 404.

### 3. **Errore diverso da “model not found”**
Se nei log vedi `status=429` → rate limit; `status=401` → chiave API non valida; `status=500` → problema lato OpenAI. In questi casi il fallback automatico a gpt-4o non viene usato (è solo per `model_not_found`).

## Come verificare

1. **Log Vercel:** Project → Logs (o Functions → assistant-chat) e cerca `OpenAI error:` per vedere `status`, `code`, `message` e `model requested`.
2. **Dashboard OpenAI:** [API keys](https://platform.openai.com/api-keys), [Usage](https://platform.openai.com/usage), [Models](https://platform.openai.com/docs/models) per tier e modelli disponibili.
3. **Test diretto:** da terminale (sostituisci `sk-...` con la tua chiave):
   ```bash
   curl -s https://api.openai.com/v1/chat/completions -H "Authorization: Bearer sk-..." -H "Content-Type: application/json" -d "{\"model\":\"gpt-5\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":5}"
   ```
   La risposta JSON conterrà l’eventuale errore (es. `"code":"model_not_found"` o messaggio sul billing).

## Comportamento dell’app

- Se OpenAI risponde con **model not found** (404 / `model_not_found`), l’app riprova automaticamente con **gpt-4o** e la chat funziona ugualmente.
- Per usare davvero GPT-5 serve che il tuo account OpenAI abbia accesso al modello (tier e billing corretti).

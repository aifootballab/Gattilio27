# Gattilio27 — RESET (solo locale)

Obiettivo minimo: **testare in locale** il flusso

**drop screenshot giocatore → estrazione dati visibile → inserimento in rosa (21 slot, solo memoria)**.

Niente Supabase, niente Vercel, niente Realtime in questa fase.

---

## Requisiti (obbligatori per lavorare in locale)

- **Node.js 18+** (serve per avviare Next.js localmente)

> Senza Node installato sul PC non puoi eseguire `next dev` in locale.

---

## Env vars (server-only)

Crea un file **`.env.local`** nella root (`Gattilio27-master/Gattilio27-master/.env.local`) con:

```
OPENAI_API_KEY=sk-...
```

Nota: questa key viene usata **solo** dall’endpoint server `POST /api/extract-player` e **non** finisce nel browser.

---

## Avvio locale

```bash
npm install
npm run dev
```

Apri `http://localhost:3000`.

---

## Come testare

1) Trascina uno screenshot di un giocatore nella dropzone  
2) Clicca **“Estrai dati”**  
3) Vedi il JSON estratto  
4) Scegli lo slot (0–20) e clicca **“Inserisci”**  

La rosa è **solo in RAM** (refresh = reset).

---

## File chiave

- UI: `app/page.tsx`
- Estrazione (server): `app/api/extract-player/route.ts`

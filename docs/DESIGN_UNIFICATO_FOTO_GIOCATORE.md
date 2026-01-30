# Design unificato – Foto giocatore (3 tipi)

**Decisione:** una sola grafica per i 3 tipi di foto (Card/Statistiche, Abilità, Booster) in tutta l’app.

**Lingue:** tutte le etichette e i messaggi sono in doppia lingua (IT/EN) tramite `lib/i18n.js`; nessuna stringa hardcoded per il flusso foto/upload.

## Dove si usa

1. **Gestione formazione** – Modal "Upload Player - Slot X": 3 blocchi per caricare Card, Abilità, Booster.
2. **Pagina giocatore** (`/giocatore/[id]`) – 3 sezioni espandibili: Statistiche, Abilità, Booster (con pulsante upload per sezione).

## Regole unificate

- **Icone:** sempre Lucide (BarChart3 = Statistiche/Card, Zap = Abilità, Gift = Booster).
- **Colori:** da `lib/playerPhotoTypes.js`:
  - **Card/Statistiche:** `var(--neon-blue)` (blu).
  - **Abilità:** `var(--neon-purple)` (viola).
  - **Booster:** `var(--neon-orange)` (arancione).
- **Stile card:** `borderRadius: 12px`, `border: 1px solid borderColor`, `background: bgColor` (valori dalla config).
- **Pulsante upload:** bordo e testo con il colore del tipo; stessi `borderColor`/`bgColor` della config.

## Config condivisa

- **File:** `lib/playerPhotoTypes.js`
- **Esporta:** `PHOTO_TYPE_KEYS`, `getPhotoTypeConfig(key)`, `getPhotoTypeStyle(key)`.
- **Chiavi tipo:** `card` (Statistiche), `stats` (Abilità), `skills` (Booster).

Per aggiungere un nuovo posto che mostra/upload di queste 3 foto, usare la stessa config e gli stessi colori/icone.

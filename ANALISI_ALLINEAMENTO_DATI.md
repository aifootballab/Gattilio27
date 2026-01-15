# 📊 Analisi Allineamento Dati - Screenshot eFootball

## 🎯 Obiettivo
Allineare estrazione, salvataggio e visualizzazione per catturare TUTTI i dati presenti negli screenshot di eFootball.

---

## 📸 Dati Presenti nelle Foto (Ronaldinho esempio)

### ✅ Dati Attualmente Estratti (parzialmente)
- `player_name`: "Ronaldinho Gaúcho"
- `overall_rating`: 99
- `position`: "Ala prolifica"
- `role`: "ESA Ala prolifica"
- `card_type`: "Epico"
- `team`: "FC Barcelona 05-06"
- `height_cm`: 182
- `weight_kg`: 80
- `age`: 26
- `form`: "B"
- `level_current`: 31
- `level_cap`: 31
- `progression_points`: 0
- `boosters`: [array con name/effect]
- `skills`: [array stringhe]

### ❌ Dati MANCANTI (non estratti/salvati)

#### 1. Statistiche Dettagliate (3 categorie)
**Attacco:**
- Comportamento offensivo: 74
- Controllo palla: 93
- Dribbling: 94
- Possesso stretto: 94
- Passaggio rasoterra: 87
- Passaggio alto: 80
- Finalizzazione: 82
- Colpo di testa: 61
- Calci da fermo: 76
- Tiro a giro: 82

**Difesa:**
- Comportamento difensivo: 42
- Contrasto: 44
- Aggressività: 45
- Coinvolgimento difensivo: 44
- Portiere (tutti 40)

**Forza:**
- Velocità: 90
- Accelerazione: 88
- Potenza di tiro: 87
- Salto: 61
- Contatto fisico: 80
- Controllo corpo: 86
- Resistenza: 85

#### 2. Caratteristiche
- Frequenza piede debole: "Raramente"
- Precisione piede debole: "Alta"
- Forma: "Incrollabile" (non solo A/B/C/D/E)
- Resistenza infortuni: "Media"

#### 3. Abilità Giocatore (lista completa)
- Finta doppio passo
- Doppio tocco
- Elastico
- Sombrero
- Controllo di suola
- Dribbling fulminei
- A giro da distante
- Passaggio di prima
- Esterno a giro
- No-look

#### 4. Abilità Aggiuntive
- Colpo di testa
- Passaggio a scavalcare
- Tiro di prima
- Dominio palle alte
- Pallonetto mirato

#### 5. Competenza Posizione Aggiuntiva
- CLD
- EDA

#### 6. Stili di Gioco IA
- Funambolo
- Serpentina

#### 7. Statistiche Partita
- Partite giocate: 204
- Gol: 86
- Assist: 37

#### 8. Altri Dati
- Preferred foot: "Destro" (icona)
- Nazionalità: "Brasile" (da flag)
- Club: "FC Barcelona" (da logo)

---

## 🗄️ Schema Database Attuale

### `players_base` (ha i campi per tutto!)
- ✅ `base_stats` (JSONB) - **PERFETTO per statistiche dettagliate**
- ✅ `skills` (text[]) - **PERFETTO per abilità giocatore**
- ✅ `com_skills` (text[]) - **PERFETTO per abilità aggiuntive**
- ✅ `position_ratings` (JSONB) - **PERFETTO per competenza posizione**
- ✅ `available_boosters` (JSONB) - **PERFETTO per booster**
- ✅ `metadata` (JSONB) - **PERFETTO per caratteristiche extra**
- ✅ `height`, `weight`, `age`, `nationality`, `form`, `role` - campi diretti
- ✅ `club_name` - campo diretto

### `player_builds`
- ✅ `source_data` (JSONB) - **PERFETTO per dati estratti raw**
- ✅ `final_stats` (JSONB) - **PERFETTO per statistiche finali con booster**

---

## 🔍 Problemi Attuali

### 1. **Estrazione (`/api/extract-player` e `/api/extract-batch`)**
- ❌ Prompt non chiede statistiche dettagliate strutturate
- ❌ Prompt non chiede caratteristiche (piede debole, forma dettagliata, resistenza infortuni)
- ❌ Prompt non distingue tra `skills` e `com_skills`
- ❌ Prompt non chiede stili di gioco IA
- ❌ Prompt non chiede competenza posizione aggiuntiva
- ❌ Prompt non chiede statistiche partita (matches_played, goals, assists)

### 2. **Normalizzazione (`normalizePlayer`)**
- ❌ Non struttura `base_stats` in formato JSONB corretto
- ❌ Non separa `skills` da `com_skills`
- ❌ Non salva caratteristiche in `metadata`
- ❌ Non salva stili di gioco IA
- ❌ Non salva competenza posizione aggiuntiva

### 3. **Salvataggio (`/api/supabase/save-player`)**
- ❌ Non salva `base_stats` strutturato
- ❌ Non salva `com_skills`
- ❌ Non salva `position_ratings`
- ❌ Non salva caratteristiche in `metadata`
- ❌ Non salva stili di gioco IA
- ❌ Non salva statistiche partita

### 4. **Recupero (`/api/supabase/get-my-players`)**
- ❌ Non recupera `base_stats`
- ❌ Non recupera `com_skills`
- ❌ Non recupera `position_ratings`
- ❌ Non recupera `metadata`
- ❌ Non recupera statistiche partita

---

## 📋 Piano di Lavoro

### Fase 1: Aggiornare Prompt Estrazione ⚠️ MEDIA
**File:** `app/api/extract-player/route.js`, `app/api/extract-batch/route.js`
- Aggiungere richiesta statistiche dettagliate (Attacco/Difesa/Forza)
- Aggiungere richiesta caratteristiche (piede debole, forma dettagliata, resistenza infortuni)
- Aggiungere richiesta abilità aggiuntive separate
- Aggiungere richiesta stili di gioco IA
- Aggiungere richiesta competenza posizione aggiuntiva
- Aggiungere richiesta statistiche partita

### Fase 2: Aggiornare Normalizzazione ⚠️ MEDIA
**File:** `app/api/extract-player/route.js` (funzione `normalizePlayer`)
- Strutturare `base_stats` in formato JSONB:
  ```json
  {
    "overall_rating": 99,
    "attacking": { ... },
    "defending": { ... },
    "athleticism": { ... }
  }
  ```
- Separare `skills` da `com_skills`
- Salvare caratteristiche in `metadata`
- Salvare stili di gioco IA in `metadata`
- Salvare competenza posizione aggiuntiva in `position_ratings`

### Fase 3: Aggiornare Salvataggio ⚠️ ALTA
**File:** `app/api/supabase/save-player/route.js`
- Salvare `base_stats` strutturato in `players_base.base_stats`
- Salvare `com_skills` in `players_base.com_skills`
- Salvare `position_ratings` in `players_base.position_ratings`
- Salvare caratteristiche in `players_base.metadata`
- Salvare statistiche partita in `players_base.metadata` o campi diretti se esistono

### Fase 4: Aggiornare Recupero ⚠️ MEDIA
**File:** `app/api/supabase/get-my-players/route.js`
- Recuperare `base_stats` da `players_base`
- Recuperare `com_skills` da `players_base`
- Recuperare `position_ratings` da `players_base`
- Recuperare `metadata` da `players_base`
- Includere tutti i dati nella risposta

### Fase 5: Aggiornare Visualizzazione ⚠️ BASSA
**File:** `app/my-players/page.jsx`
- Mostrare statistiche dettagliate
- Mostrare abilità aggiuntive separate
- Mostrare caratteristiche
- Mostrare stili di gioco IA
- Mostrare competenza posizione aggiuntiva
- Mostrare statistiche partita

---

## ⚠️ Valutazione Difficoltà

### Complessità Totale: **MEDIA-ALTA**

**Motivi:**
1. ✅ Schema database già pronto (non serve migrazione)
2. ⚠️ Prompt OpenAI da aggiornare (richiede test)
3. ⚠️ Normalizzazione dati complessa (molti campi)
4. ⚠️ Salvataggio multi-tabella (players_base + player_builds)
5. ⚠️ Test end-to-end necessario

**Tempo Stimato:** 2-3 ore di sviluppo + 1 ora di test

---

## 🎯 Priorità

1. **ALTA**: Statistiche dettagliate (base_stats) - sono i dati più importanti
2. **MEDIA**: Abilità aggiuntive (com_skills) - separazione importante
3. **MEDIA**: Caratteristiche (metadata) - completano il profilo
4. **BASSA**: Stili di gioco IA - nice to have
5. **BASSA**: Competenza posizione aggiuntiva - nice to have
6. **BASSA**: Statistiche partita - nice to have

---

## ✅ Pronto per Implementazione

Tutto lo schema è già pronto! Basta aggiornare:
1. Prompt estrazione
2. Normalizzazione
3. Salvataggio
4. Recupero
5. Visualizzazione

**Aspetto il tuo via!** 🚀

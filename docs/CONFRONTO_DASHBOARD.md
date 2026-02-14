# Confronto Dashboard vs Backend e Audit

**Scopo:** Verificare che la dashboard (home) e le pagine collegate siano allineate a leaderboardHelper, taskHelper, API e decisioni degli audit (task fuori classifica, barra conoscenza, breakdown).

---

## 1. Dashboard (app/page.jsx)

| Elemento | Cosa fa | Allineamento |
|----------|---------|--------------|
| **Classifica (card)** | Fetch `GET /api/leaderboard?month=YYYY-MM`; mostra `currentUser.rank`, `currentUser.points`, `daysLeftInMonth`. Link a `/classifica`. | ✅ L’API usa leaderboardHelper (solo partite + usage_ia + profilo). Nessun riferimento a task in questa card. |
| **Task (TaskWidget)** | Fetch `GET /api/tasks/list`; mostra obiettivi settimanali; toast al completamento: "Contribuisce alla barra Conoscenza IA". Ascolta `match-saved`, `diagnostic-updated` per refresh. | ✅ Task presentati come strumento per la barra conoscenza, non per i punti classifica. |
| **Barra conoscenza (AIKnowledgeBar)** | Fetch `GET /api/ai-knowledge`; mostra score %, livello, CTA “prossimo step” in base al breakdown. | ✅ Score e breakdown da API (con coach_training in risposta). CTA: vedi §3. |
| **Setup banner** | Mostra cosa manca: allenatore attivo, analisi partita, 11 titolari. Nessun legame con classifica/task. | ✅ Coerente. |

---

## 2. Pagina Classifica (app/classifica/page.jsx)

| Elemento | Cosa fa | Allineamento |
|----------|---------|--------------|
| **Fetch** | `GET /api/leaderboard?month=` con `getCurrentMonth()` (locale). | ✅ Stesso mese usato dall’API per il mese corrente. |
| **Breakdown punti** | Mostra solo `matches`, `usage_ia`, `profile` (righe 232–235). | ✅ Allineato a leaderboardHelper: nessun task né improvement. |
| **Testi** | "Come salire" / hint da i18n (`comeSalireHint`): partite, utilizzo IA, profilo. | ✅ Coerente con doc e i18n aggiornati. |

---

## 3. Barra Conoscenza (components/AIKnowledgeBar.jsx)

| Elemento | Cosa fa | Allineamento |
|----------|---------|--------------|
| **Score e breakdown** | Usa `data.score`, `data.level`, `data.breakdown` da `/api/ai-knowledge`. | ✅ L’API ora include sempre `coach_training` (fix applicato). |
| **CTA “prossimo step”** | `getNextStepCtaKey()` (righe 199–210): confronta `breakdown` con un oggetto `max` e restituisce la prima voce sotto il massimo. | ⚠️ **Corretto in questo commit:** `max` era errato (usage 10, success 15) e mancava `coach_training`. Allineato a aiKnowledgeHelper: profile 20, roster 25, matches 30, patterns 15, coach 10, usage 5, success 10, coach_training 10. Aggiunta chiave i18n `ctaNextStepCoachTraining` e passo CTA per Palestra Coach. |

---

## 4. TaskWidget (components/TaskWidget.jsx)

| Elemento | Cosa fa | Allineamento |
|----------|---------|--------------|
| **Fetch** | `GET /api/tasks/list?lang=it|en`. | ✅ API usa taskHelper (lista + sync progresso con `updateTasksProgressAfterMatch`). |
| **Messaggio completamento** | Toast: obiettivo completato → "Contribuisce alla barra Conoscenza IA". | ✅ Task collegati alla barra, non alla classifica. |

---

## 5. Riepilogo

- **Dashboard e Classifica:** Allineate a backend e audit (punti = partite + usage_ia + profilo; task solo per barra).
- **AIKnowledgeBar:** Dopo la correzione di `getNextStepCtaKey` (pesi e coach_training), anche la CTA è coerente con la formula reale e con la presenza di Palestra Coach nel breakdown.

**File toccati in questo confronto:**  
- `docs/CONFRONTO_DASHBOARD.md` (nuovo)  
- `components/AIKnowledgeBar.jsx` (max CTA + coach_training)  
- `lib/i18n.js` (ctaNextStepCoachTraining IT/EN)

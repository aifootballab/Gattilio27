# 📚 SPIEGAZIONE: Perché esiste `user_hero_points`?

## 🎯 ARCHITETTURA EVENT SOURCING

### Fonte di Verità: `hero_points_transactions`
**Questa è la tabella IMPORTANTE** - contiene TUTTE le operazioni:
- ✅ Ogni acquisto (purchase)
- ✅ Ogni spesa (spent)
- ✅ Ogni rimborso (refund)
- ✅ Audit trail completo (chi, cosa, quando)

**Esempio**:
```
Transazione 1: +1000 HP (acquisto)
Transazione 2: +1000 HP (acquisto)
Transazione 3: +1000 HP (acquisto)
TOTALE CALCOLATO: 3000 HP ✅
```

### Cache: `user_hero_points`
**Questa è SOLO una cache per performance** - NON è la fonte di verità!

**Perché esiste?**
1. **Performance**: Calcolare il balance da 1000+ transazioni è lento
2. **Query veloci**: Una query semplice invece di sommare tutte le transazioni
3. **UI responsive**: Il frontend può leggere velocemente il balance

**Come funziona?**
```
1. Calcola balance dalle transazioni (fonte di verità)
2. Aggiorna cache (user_hero_points) con il valore calcolato
3. Usa cache per query veloci
```

**Se la cache si corrompe?**
- ✅ Nessun problema! Si ricalcola sempre dalle transazioni
- ✅ La cache viene sincronizzata ad ogni chiamata `/api/hero-points/balance`

---

## ⚠️ PROBLEMA ATTUALE

**Stato Database**:
- **Transazioni**: 3 × 1000 HP = **3000 HP** (CORRETTO ✅)
- **Cache**: **81000 HP** (SBAGLIATO ❌)

**Perché c'è ancora 81000?**
Il problema è che `syncBalanceCache` non sta aggiornando correttamente la cache. Probabilmente:
1. L'UPDATE fallisce silenziosamente
2. Qualcosa sovrascrive il valore dopo l'UPDATE
3. C'è un problema con il client Supabase JS

**Soluzione**:
- ✅ Ho aggiunto retry automatico
- ✅ Ho aggiunto forza aggiornamento se discrepanza
- ✅ Ho aggiunto log dettagliati per debug

---

## 🔧 COME FUNZIONA IL SISTEMA

### Quando compri Hero Points:
```
1. Crea transazione in hero_points_transactions ✅
2. Calcola nuovo balance dalle transazioni ✅
3. Aggiorna cache (user_hero_points) ← QUI IL PROBLEMA
4. Ritorna balance corretto al frontend ✅
```

### Quando fai refresh:
```
1. Calcola balance dalle transazioni (fonte di verità) ✅
2. Sincronizza cache (user_hero_points) ← QUI IL PROBLEMA
3. Se discrepanza, forza aggiornamento ✅
4. Ritorna balance calcolato (non dalla cache) ✅
```

---

## 💡 PERCHÉ NON ELIMINARE `user_hero_points`?

**Potremmo eliminarla?** SÌ, tecnicamente sì, ma:

**Svantaggi senza cache**:
- ❌ Ogni query balance deve sommare tutte le transazioni
- ❌ Con 1000+ transazioni, diventa lento
- ❌ Più carico sul database
- ❌ UX peggiore (latenza)

**Vantaggi con cache**:
- ✅ Query istantanea (1 record vs 1000+ transazioni)
- ✅ Performance ottimale
- ✅ UX fluida
- ✅ Se si corrompe, si ricalcola sempre

**Conclusione**: La cache è utile, ma deve essere sincronizzata correttamente!

---

## 🎯 SOLUZIONE

Il sistema è progettato correttamente (Event Sourcing), ma c'è un bug nella sincronizzazione della cache. Ho aggiunto:
1. ✅ Retry automatico se syncBalanceCache fallisce
2. ✅ Forza aggiornamento diretto se c'è discrepanza
3. ✅ Log dettagliati per capire dove fallisce

**Prossimo passo**: Verificare i log del server quando fai refresh per vedere dove fallisce la sincronizzazione.

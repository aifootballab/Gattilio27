# 🎨 Come Inserire il Tuo Sfondo - GUIDA SEMPLICE

## ✅ Cosa Devi Fare (Solo 2 Passi!)

### Passo 1: Carica la Tua Immagine
1. Prendi la tua immagine di sfondo (formato: `.jpg`, `.png`, o `.webp`)
2. Rinominala: `background.jpg` (o `background.png`)
3. Mettila nella cartella `public/` del progetto

**Esempio:**
```
Gattilio27-master/
  └── public/
      └── background.jpg  ← QUI!
```

### Passo 2: Dimmi il Nome del File
Scrivimi semplicemente:
- "Ho messo `background.jpg` in public"
- Oppure: "Il file si chiama `mio-sfondo.png`"

**E io lo configuro per te!** 🚀

---

## 📝 Dettagli Tecnici (Se Vuoi Capire)

Il file da modificare è: `app/globals.css`

Cerca questa sezione:
```css
.custom-background {
  /* INSERISCI QUI IL TUO SFONDO */
}
```

E aggiungi:
```css
.custom-background {
  background-image: url('/background.jpg');  /* ← Nome del tuo file */
  background-size: cover;                    /* Copre tutto lo schermo */
  background-position: center;               /* Centrato */
  background-repeat: no-repeat;              /* Non ripete */
  opacity: 0.6;                              /* Trasparenza (0.1 = molto scuro, 1.0 = molto visibile) */
}
```

---

## 🎛️ Regolazioni Opzionali

### Cambiare Trasparenza
Modifica `opacity`:
- `0.3` = Sfondo molto scuro (testo più leggibile)
- `0.6` = Bilanciato (consigliato)
- `0.9` = Sfondo molto visibile (testo meno leggibile)

### Cambiare Posizione
Modifica `background-position`:
- `center` = Centrato
- `top` = In alto
- `bottom` = In basso
- `left` = A sinistra
- `right` = A destra

---

## ❓ Domande Frequenti

**Q: La mia immagine è troppo grande/piccola?**  
A: `background-size: cover` la adatta automaticamente. Se vuoi altro, dimmelo!

**Q: Voglio un video invece di un'immagine?**  
A: Possibile! Dimmi e lo configuro.

**Q: Voglio un gradiente invece di un'immagine?**  
A: Possibile! Dimmi i colori e lo creo.

---

## 🎯 In Pratica

1. **Tu:** Carica `background.jpg` in `public/`
2. **Tu:** Scrivimi "Ho caricato background.jpg"
3. **Io:** Lo configuro e funziona! ✅

**Fine!** 🎉

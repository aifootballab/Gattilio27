# Setup Background Personalizzato

## Come Inserire il Tuo Sfondo

Il design system è configurato per supportare un background personalizzabile. Ecco come inserirlo:

### Opzione 1: Immagine di Sfondo

1. Aggiungi la tua immagine in `public/background.jpg` (o qualsiasi formato: `.png`, `.webp`, etc.)

2. Modifica `app/layout.tsx` o `app/globals.css`:

```css
.custom-background {
  background-image: url('/background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.6; /* Regola l'opacità (0.1 - 1.0) */
}
```

### Opzione 2: Gradiente CSS

Modifica `.custom-background` in `app/globals.css`:

```css
.custom-background {
  background: linear-gradient(135deg, #0A0E27 0%, #1a1a3e 50%, #2d1b4e 100%);
  /* oppure */
  background: radial-gradient(circle at 50% 50%, #0A0E27 0%, #050815 100%);
}
```

### Opzione 3: Video di Sfondo (Avanzato)

```css
.custom-background {
  position: fixed;
  /* ... */
}

.custom-background::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: url('/background-video.mp4');
  background-size: cover;
}
```

Poi aggiungi un elemento `<video>` in `layout.tsx`:

```jsx
<video 
  autoPlay 
  loop 
  muted 
  playsInline
  className="custom-background"
  style={{ objectFit: 'cover' }}
>
  <source src="/background-video.mp4" type="video/mp4" />
</video>
```

### Opzione 4: Pattern/Texture

```css
.custom-background {
  background-image: 
    url('/pattern.svg'),
    linear-gradient(135deg, #0A0E27 0%, #1a1a3e 100%);
  background-size: 200px 200px, cover;
  background-blend-mode: overlay;
  opacity: 0.8;
}
```

## Regolazione Opacità Overlay

L'overlay scuro sopra il background è controllato da:

```css
.custom-background::after {
  background: var(--bg-overlay); /* rgba(10, 14, 39, 0.85) */
}
```

Modifica `--bg-overlay` in `:root` per cambiare l'opacità:

```css
:root {
  --bg-overlay: rgba(10, 14, 39, 0.7); /* Più trasparente */
  /* oppure */
  --bg-overlay: rgba(10, 14, 39, 0.95); /* Più scuro */
}
```

## Effetti Aggiuntivi

### Animazione Sfondo

```css
.custom-background {
  animation: backgroundShift 20s ease-in-out infinite;
}

@keyframes backgroundShift {
  0%, 100% { filter: hue-rotate(0deg); }
  50% { filter: hue-rotate(30deg); }
}
```

### Particelle/Effetti

Usa una libreria come `particles.js` o `three.js` per effetti avanzati.

## Note

- Il background è `position: fixed` e `z-index: -1` per rimanere dietro tutto
- L'overlay garantisce leggibilità del testo
- Regola `opacity` del background per bilanciare visibilità e leggibilità
- Testa su mobile: alcuni effetti possono essere pesanti

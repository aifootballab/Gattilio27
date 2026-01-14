'use client'

import React from 'react'

export default function Home() {
  return <RosaLocalPage />
}

type ExtractedPlayer = {
  player_name: string | null
  overall_rating: number | null
  position: string | null
  role: string | null
  card_type: string | null
  team: string | null
  region_or_nationality: string | null
  form: string | null
  preferred_foot: string | null
  height_cm: number | null
  weight_kg: number | null
  age: number | null
  nationality: string | null
  club_name: string | null
  level_current: number | null
  level_cap: number | null
  progression_points: number | null
  matches_played: number | null
  goals: number | null
  assists: number | null
  boosters: { name: string | null; effect: string | null }[]
  skills: string[]
}

type RosaSlot = {
  id: string
  extracted: ExtractedPlayer
  imageDataUrl?: string
} | null

function RosaLocalPage() {
  const [isDragging, setIsDragging] = React.useState(false)
  const [imageDataUrl, setImageDataUrl] = React.useState<string | null>(null)
  const [isExtracting, setIsExtracting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [extracted, setExtracted] = React.useState<ExtractedPlayer | null>(null)
  const [rawJson, setRawJson] = React.useState<string>('')
  const [selectedSlot, setSelectedSlot] = React.useState<number>(0)
  const [rosa, setRosa] = React.useState<RosaSlot[]>(() => Array.from({ length: 21 }, () => null))
  const [envInfo, setEnvInfo] = React.useState<{ vercelEnv: string | null; hasOpenaiKey: boolean | null }>({
    vercelEnv: null,
    hasOpenaiKey: null,
  })

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    // Diagnostica: mostra chiaramente se siamo in production e se la key è presente
    fetch('/api/env-check')
      .then((r) => r.json())
      .then((j) => setEnvInfo({ vercelEnv: j?.vercelEnv ?? null, hasOpenaiKey: !!j?.hasOpenaiKey }))
      .catch(() => setEnvInfo({ vercelEnv: null, hasOpenaiKey: null }))
  }, [])

  const compressImageToDataUrl = async (file: File) => {
    // Riduce dimensioni per evitare body troppo grande su Vercel/Next
    const original = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Impossibile leggere il file'))
      reader.readAsDataURL(file)
    })

    const img = new Image()
    img.src = original
    await img.decode()

    const maxDim = 1400
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas non supportato')

    // sfondo bianco per PNG trasparenti
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)

    // jpeg riduce molto la size
    const out = canvas.toDataURL('image/jpeg', 0.9)
    return out
  }

  const onPickFile = async (file: File) => {
    setError(null)
    setExtracted(null)
    setRawJson('')
    const dataUrl = await compressImageToDataUrl(file)
    setImageDataUrl(dataUrl)
  }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await onPickFile(file)
  }

  const extract = async () => {
    if (!imageDataUrl) return
    setIsExtracting(true)
    setError(null)
    try {
      const res = await fetch('/api/extract-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const details = data?.openai_body || data?.raw || data?.details
        throw new Error(`${data?.error || `Errore estrazione (${res.status})`}${details ? `\n\n${String(details).slice(0, 1200)}` : ''}`)
      }
      setExtracted(data.player)
      setRawJson(JSON.stringify(data.player, null, 2))
    } catch (err: any) {
      setError(err?.message || 'Errore estrazione')
    } finally {
      setIsExtracting(false)
    }
  }

  const insertIntoRosa = () => {
    if (!extracted) return
    const slot = Math.max(0, Math.min(20, selectedSlot))
    setRosa(prev => {
      const next = [...prev]
      next[slot] = {
        id: crypto.randomUUID(),
        extracted,
        imageDataUrl: imageDataUrl || undefined,
      }
      return next
    })
  }

  const reset = () => {
    setError(null)
    setImageDataUrl(null)
    setExtracted(null)
    setRawJson('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <main className="container">
      <header className="header">
        <h1>Rosa (Local)</h1>
        <p className="subtitle">Drag & drop screenshot giocatore → estrazione dati → inserimento in rosa (solo memoria)</p>
        <p className="subtitle" style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
          Env: <b>{envInfo.vercelEnv ?? '—'}</b> · OPENAI_API_KEY: <b>{envInfo.hasOpenaiKey === null ? '—' : envInfo.hasOpenaiKey ? 'OK' : 'MISSING'}</b>
        </p>
      </header>

      <section className="card">
        {!imageDataUrl ? (
          <div
            className={`dropzone ${isDragging ? 'dragging' : ''}`}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true) }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false) }}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) await onPickFile(file)
              }}
            />
            <div className="dropzone-title">Carica Screenshot</div>
            <div className="dropzone-hint">Trascina qui oppure clicca (JPG/PNG/WebP)</div>
          </div>
        ) : (
          <div className="preview">
            <div className="preview-row">
              <img className="preview-img" src={imageDataUrl} alt="Preview screenshot" />
              <div className="preview-actions">
                <button className="btn primary" onClick={extract} disabled={isExtracting}>
                  {isExtracting ? 'Estrazione…' : 'Estrai dati'}
                </button>
                <button className="btn" onClick={reset} disabled={isExtracting}>
                  Cambia immagine
                </button>
              </div>
            </div>

            {error && <div className="error">Errore: {error}</div>}

            {extracted && (
              <div className="grid">
                <div className="card inner">
                  <h2>Dati estratti</h2>
                  <div className="kv">
                    <div><b>Nome</b>: {extracted.player_name ?? '—'}</div>
                    <div><b>OVR</b>: {extracted.overall_rating ?? '—'}</div>
                    <div><b>Pos</b>: {extracted.position ?? '—'}</div>
                    <div><b>Ruolo</b>: {extracted.role ?? '—'}</div>
                    <div><b>Carta</b>: {extracted.card_type ?? '—'}</div>
                    <div><b>Team</b>: {extracted.team ?? '—'}</div>
                    <div><b>Nazione/Regione</b>: {extracted.nationality ?? extracted.region_or_nationality ?? '—'}</div>
                    <div><b>Club</b>: {extracted.club_name ?? '—'}</div>
                    <div><b>Altezza/Peso/Età</b>: {(extracted.height_cm ?? '—')} / {(extracted.weight_kg ?? '—')} / {(extracted.age ?? '—')}</div>
                    <div><b>Forma</b>: {extracted.form ?? '—'} · <b>Piede</b>: {extracted.preferred_foot ?? '—'}</div>
                    <div><b>Livello</b>: {extracted.level_current ?? '—'} / {extracted.level_cap ?? '—'} · <b>Punti</b>: {extracted.progression_points ?? '—'}</div>
                    <div><b>Partite/Gol/Assist</b>: {extracted.matches_played ?? '—'} / {extracted.goals ?? '—'} / {extracted.assists ?? '—'}</div>
                    <div><b>Boosters</b>: {extracted.boosters?.filter(b => b?.name || b?.effect).map((b) => `${b.name ?? '—'} (${b.effect ?? '—'})`).join(', ') || '—'}</div>
                  </div>
                  <textarea className="json" value={rawJson} readOnly />
                </div>

                <div className="card inner">
                  <h2>Inserisci in rosa</h2>
                  <label className="label">
                    Slot (0-10 titolari, 11-20 panchina)
                    <select
                      className="select"
                      value={selectedSlot}
                      onChange={(e) => setSelectedSlot(Number(e.target.value))}
                    >
                      {Array.from({ length: 21 }, (_, i) => (
                        <option key={i} value={i}>
                          {i <= 10 ? `Titolare ${i + 1}` : `Panchina ${i - 10}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button className="btn primary" onClick={insertIntoRosa}>
                    Inserisci
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Rosa (21 slot)</h2>
        <div className="rosa-grid">
          {rosa.map((slot, idx) => (
            <div key={idx} className={`rosa-slot ${slot ? 'filled' : ''}`}>
              <div className="slot-title">{idx <= 10 ? `T ${idx + 1}` : `P ${idx - 10}`}</div>
              <div className="slot-body">
                {slot ? (
                  <>
                    <div className="slot-name">{slot.extracted.player_name ?? 'Senza nome'}</div>
                    <div className="slot-meta">
                      {slot.extracted.position ?? '—'} · OVR {slot.extracted.overall_rating ?? '—'}
                    </div>
                    <button
                      className="btn small"
                      onClick={() => setRosa(prev => {
                        const next = [...prev]
                        next[idx] = null
                        return next
                      })}
                    >
                      Rimuovi
                    </button>
                  </>
                ) : (
                  <div className="slot-empty">Vuoto</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

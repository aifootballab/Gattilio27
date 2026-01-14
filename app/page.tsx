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

type UploadImage = { id: string; dataUrl: string }
type BatchGroup = {
  group_id: string
  label: string
  image_ids: string[]
  player: ExtractedPlayer
  missing_screens?: string[]
  notes?: string[]
}

function RosaLocalPage() {
  const [isDragging, setIsDragging] = React.useState(false)
  const [images, setImages] = React.useState<UploadImage[]>([])
  const [isExtracting, setIsExtracting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = React.useState<number>(0)
  const [rosa, setRosa] = React.useState<RosaSlot[]>(() => Array.from({ length: 21 }, () => null))
  const [envInfo, setEnvInfo] = React.useState<{ vercelEnv: string | null; hasOpenaiKey: boolean | null }>({
    vercelEnv: null,
    hasOpenaiKey: null,
  })
  const [groups, setGroups] = React.useState<BatchGroup[]>([])

  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    // Diagnostica: mostra chiaramente se siamo in production e se la key è presente
    fetch('/api/env-check')
      .then((r) => r.json())
      .then((j) => setEnvInfo({ vercelEnv: j?.vercelEnv ?? null, hasOpenaiKey: !!j?.hasOpenaiKey }))
      .catch(() => setEnvInfo({ vercelEnv: null, hasOpenaiKey: null }))
  }, [])

  const compressImageToDataUrl = async (file: File, maxDim = 1200, quality = 0.88) => {
    // Riduce dimensioni per evitare body troppo grande su Vercel/Next (importante con batch)
    const original = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('Impossibile leggere il file'))
      reader.readAsDataURL(file)
    })

    const img = new Image()
    img.src = original
    await img.decode()

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
    const out = canvas.toDataURL('image/jpeg', quality)
    return out
  }

  const onPickFiles = async (fileList: FileList | File[]) => {
    setError(null)
    setGroups([])
    const files = Array.from(fileList).slice(0, 6) // minimo: max 6 immagini per batch
    const newImages: UploadImage[] = []
    for (const f of files) {
      const dataUrl = await compressImageToDataUrl(f, 1200, 0.88)
      newImages.push({ id: crypto.randomUUID(), dataUrl })
    }
    setImages(prev => [...prev, ...newImages])
  }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length) await onPickFiles(files)
  }

  const analyzeBatch = async () => {
    if (!images.length) return
    setIsExtracting(true)
    setError(null)
    try {
      const res = await fetch('/api/extract-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: images.map(i => ({ id: i.id, imageDataUrl: i.dataUrl })) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const details = data?.openai_body || data?.raw || data?.details
        throw new Error(`${data?.error || `Errore estrazione (${res.status})`}${details ? `\n\n${String(details).slice(0, 1200)}` : ''}`)
      }
      setGroups(Array.isArray(data.groups) ? data.groups : [])
    } catch (err: any) {
      setError(err?.message || 'Errore estrazione')
    } finally {
      setIsExtracting(false)
    }
  }

  const insertIntoRosa = (player: ExtractedPlayer, slotIndex: number) => {
    const slot = Math.max(0, Math.min(20, slotIndex))
    setRosa(prev => {
      const next = [...prev]
      next[slot] = {
        id: crypto.randomUUID(),
        extracted: player,
      }
      return next
    })
  }

  const reset = () => {
    setError(null)
    setImages([])
    setGroups([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <main className="container">
      <header className="header">
        <h1>Rosa (Production)</h1>
        <p className="subtitle">Carica 1–6 screenshot (anche mischiati) → raggruppo per giocatore → estraggo dati → inserisci in rosa</p>
        <p className="subtitle" style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
          Env: <b>{envInfo.vercelEnv ?? '—'}</b> · OPENAI_API_KEY: <b>{envInfo.hasOpenaiKey === null ? '—' : envInfo.hasOpenaiKey ? 'OK' : 'MISSING'}</b>
        </p>
      </header>

      <section className="card">
        {!images.length ? (
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
              multiple
              accept="image/jpeg,image/jpg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const files = e.target.files
                if (files && files.length) await onPickFiles(files)
              }}
            />
            <div className="dropzone-title">Carica Screenshot</div>
            <div className="dropzone-hint">Trascina qui oppure clicca (JPG/PNG/WebP). Puoi caricare 2 o 3 foto per giocatore, anche miste.</div>
          </div>
        ) : (
          <div className="preview">
            <div className="preview-row">
              <div className="card inner" style={{ padding: 12 }}>
                <b>Immagini caricate: {images.length}</b>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
                  {images.map((img) => (
                    <img key={img.id} src={img.dataUrl} alt="thumb" style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }} />
                  ))}
                </div>
              </div>
              <div className="preview-actions">
                <button className="btn primary" onClick={analyzeBatch} disabled={isExtracting}>
                  {isExtracting ? 'Analisi…' : 'Analizza batch'}
                </button>
                <button className="btn" onClick={reset} disabled={isExtracting}>
                  Cambia immagine
                </button>
              </div>
            </div>

            {error && <div className="error">Errore: {error}</div>}

            {groups.length > 0 && (
              <div className="grid">
                {groups.map((g) => (
                  <div key={g.group_id} className="card inner">
                    <h2>{g.label}</h2>
                    <div className="kv">
                      <div><b>Nome</b>: {g.player.player_name ?? '—'}</div>
                      <div><b>OVR</b>: {g.player.overall_rating ?? '—'} · <b>Pos</b>: {g.player.position ?? '—'}</div>
                      <div><b>Ruolo</b>: {g.player.role ?? '—'}</div>
                      <div><b>Carta</b>: {g.player.card_type ?? '—'} · <b>Team</b>: {g.player.team ?? '—'}</div>
                      <div><b>Boosters</b>: {g.player.boosters?.filter(b => b?.name || b?.effect).map((b) => `${b.name ?? '—'} (${b.effect ?? '—'})`).join(', ') || '—'}</div>
                      {g.missing_screens?.length ? <div><b>Manca</b>: {g.missing_screens.join(', ')}</div> : null}
                    </div>
                    <textarea className="json" value={JSON.stringify(g.player, null, 2)} readOnly />

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
                    <button className="btn primary" onClick={() => insertIntoRosa(g.player, selectedSlot)}>
                      Inserisci questo giocatore
                    </button>
                  </div>
                ))}
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

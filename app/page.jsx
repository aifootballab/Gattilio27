'use client'

import React from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  return <RosaLocalPage />
}

function RosaLocalPage() {
  const [isDragging, setIsDragging] = React.useState(false)
  const [images, setImages] = React.useState([])
  const [isExtracting, setIsExtracting] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [selectedSlot, setSelectedSlot] = React.useState(0)
  const [rosa, setRosa] = React.useState(() => Array.from({ length: 21 }, () => null))
  const [envInfo, setEnvInfo] = React.useState({
    vercelEnv: null,
    hasOpenaiKey: null,
    hasSupabaseUrl: null,
    hasSupabaseAnonKey: null,
    hasSupabaseServiceRoleKey: null,
  })
  const [groups, setGroups] = React.useState([])
  const [authStatus, setAuthStatus] = React.useState({ ready: false, userId: null, token: null })
  const [supabaseMsg, setSupabaseMsg] = React.useState(null)

  const fileInputRef = React.useRef(null)

  React.useEffect(() => {
    fetch('/api/env-check')
      .then((r) => r.json())
      .then((j) =>
        setEnvInfo({
          vercelEnv: j?.vercelEnv ?? null,
          hasOpenaiKey: j?.hasOpenaiKey ?? null,
          hasSupabaseUrl: j?.hasSupabaseUrl ?? null,
          hasSupabaseAnonKey: j?.hasSupabaseAnonKey ?? null,
          hasSupabaseServiceRoleKey: j?.hasSupabaseServiceRoleKey ?? null,
        })
      )
      .catch(() =>
        setEnvInfo({
          vercelEnv: null,
          hasOpenaiKey: null,
          hasSupabaseUrl: null,
          hasSupabaseAnonKey: null,
          hasSupabaseServiceRoleKey: null,
        })
      )
  }, [])

  React.useEffect(() => {
    const initAnon = async () => {
      try {
        if (!supabase) {
          setAuthStatus({ ready: true, userId: null, token: null })
          return
        }
        let { data } = await supabase.auth.getSession()
        let session = data?.session
        if (!session) {
          const res = await supabase.auth.signInAnonymously()
          session = res?.data?.session || null
        }
        setAuthStatus({
          ready: true,
          userId: session?.user?.id || null,
          token: session?.access_token || null,
        })
      } catch {
        setAuthStatus({ ready: true, userId: null, token: null })
      }
    }
    initAnon()
  }, [])

  const getFreshToken = async () => {
    if (!supabase) return null
    const { data } = await supabase.auth.getSession()
    return data?.session?.access_token || null
  }

  const compressImageToDataUrl = async (file, maxDim = 1200, quality = 0.88) => {
    const original = await new Promise((resolve, reject) => {
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

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)

    return canvas.toDataURL('image/jpeg', quality)
  }

  const onPickFiles = async (fileList) => {
    setError(null)
    setGroups([])
    const files = Array.from(fileList).slice(0, 6)
    const newImages = []
    for (const f of files) {
      const dataUrl = await compressImageToDataUrl(f, 1200, 0.88)
      newImages.push({ id: crypto.randomUUID(), dataUrl })
    }
    setImages((prev) => [...prev, ...newImages])
  }

  const onDrop = async (e) => {
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
        body: JSON.stringify({ images: images.map((i) => ({ id: i.id, imageDataUrl: i.dataUrl })) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const details = data?.openai_body || data?.raw || data?.details
        throw new Error(`${data?.error || `Errore estrazione (${res.status})`}${details ? `\n\n${String(details).slice(0, 1200)}` : ''}`)
      }
      setGroups(Array.isArray(data.groups) ? data.groups : [])
    } catch (err) {
      setError(err?.message || 'Errore estrazione')
    } finally {
      setIsExtracting(false)
    }
  }

  const insertIntoRosa = (player, slotIndex) => {
    const slot = Math.max(0, Math.min(20, Number(slotIndex)))
    setRosa((prev) => {
      const next = [...prev]
      next[slot] = { id: crypto.randomUUID(), extracted: player }
      return next
    })
  }

  const reset = () => {
    setError(null)
    setImages([])
    setGroups([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const resetMySupabaseData = async () => {
    setSupabaseMsg(null)
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Anon auth non pronta')
      const res = await fetch('/api/supabase/reset-my-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Reset failed (${res.status})`)
      setSupabaseMsg('✅ Dati Supabase resettati per questo utente anonimo')
    } catch (e) {
      setSupabaseMsg(`❌ ${e?.message || 'Errore reset'}`)
    }
  }

  const saveToSupabase = async (player, slotIndex) => {
    setSupabaseMsg(null)
    try {
      const token = await getFreshToken()
      if (!token) throw new Error('Anon auth non pronta')
      const res = await fetch('/api/supabase/save-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ player, slotIndex }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `Save failed (${res.status})`)
      setSupabaseMsg(`✅ Salvato in Supabase (slot ${data.slot})`)
    } catch (e) {
      setSupabaseMsg(`❌ ${e?.message || 'Errore salvataggio'}`)
    }
  }

  return (
    <main className="container">
      <header className="header">
        <h1>Rosa (Production)</h1>
        <p className="subtitle">Carica 1–6 screenshot (anche mischiati) → raggruppo per giocatore → estraggo dati → inserisci in rosa</p>
        <p className="subtitle" style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
          Env: <b>{envInfo.vercelEnv ?? '—'}</b> · OPENAI_API_KEY:{' '}
          <b>{envInfo.hasOpenaiKey === null ? '—' : envInfo.hasOpenaiKey ? 'OK' : 'MISSING'}</b>
        </p>
        <p className="subtitle" style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
          Supabase env:{' '}
          <b>
            {envInfo.hasSupabaseUrl === null
              ? '—'
              : envInfo.hasSupabaseUrl && envInfo.hasSupabaseAnonKey
                ? 'PUBLIC OK'
                : 'PUBLIC MISSING'}
          </b>
          {' · '}Service key:{' '}
          <b>
            {envInfo.hasSupabaseServiceRoleKey === null ? '—' : envInfo.hasSupabaseServiceRoleKey ? 'OK' : 'MISSING'}
          </b>
        </p>
        <p className="subtitle" style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
          Supabase anon: <b>{authStatus.userId ? 'OK' : authStatus.ready ? 'MISSING' : '…'}</b>
          {authStatus.userId ? <span> · user_id: <b>{authStatus.userId}</b></span> : null}
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
          <button className="btn" onClick={resetMySupabaseData} disabled={!authStatus.token}>
            Reset miei dati Supabase
          </button>
          {supabaseMsg ? <span style={{ opacity: 0.9 }}>{supabaseMsg}</span> : null}
        </div>
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
            <div className="dropzone-hint">Trascina qui oppure clicca. Puoi caricare 2 o 3 foto per giocatore, anche miste.</div>
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
                  Reset
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
                      <div><b>Nome</b>: {g.player?.player_name ?? '—'}</div>
                      <div><b>OVR</b>: {g.player?.overall_rating ?? '—'} · <b>Pos</b>: {g.player?.position ?? '—'}</div>
                      <div><b>Ruolo</b>: {g.player?.role ?? '—'}</div>
                      <div><b>Carta</b>: {g.player?.card_type ?? '—'} · <b>Team</b>: {g.player?.team ?? '—'}</div>
                      <div><b>Boosters</b>: {Array.isArray(g.player?.boosters) ? g.player.boosters.filter((b) => b?.name || b?.effect).map((b) => `${b.name ?? '—'} (${b.effect ?? '—'})`).join(', ') : '—'}</div>
                      {Array.isArray(g.missing_screens) && g.missing_screens.length ? <div><b>Manca</b>: {g.missing_screens.join(', ')}</div> : null}
                    </div>
                    <textarea className="json" value={JSON.stringify(g.player ?? {}, null, 2)} readOnly />

                    <label className="label">
                      Slot (0-10 titolari, 11-20 panchina)
                      <select className="select" value={selectedSlot} onChange={(e) => setSelectedSlot(Number(e.target.value))}>
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
                    <button className="btn" style={{ marginTop: 10 }} onClick={() => saveToSupabase(g.player, selectedSlot)} disabled={!authStatus.token}>
                      Salva in Supabase (slot selezionato)
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
                    <div className="slot-name">{slot.extracted?.player_name ?? 'Senza nome'}</div>
                    <div className="slot-meta">
                      {slot.extracted?.position ?? '—'} · OVR {slot.extracted?.overall_rating ?? '—'}
                    </div>
                    <button
                      className="btn small"
                      onClick={() => setRosa((prev) => {
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


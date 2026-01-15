'use client'

import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Upload, X, CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react'

export default function RosaPage() {
  return <RosaProductionPage />
}

function RosaProductionPage() {
  const { t, lang, changeLanguage } = useTranslation()
  const [isDragging, setIsDragging] = React.useState(false)
  const [images, setImages] = React.useState([])
  const [isExtracting, setIsExtracting] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [selectedSlot, setSelectedSlot] = React.useState(0)
  const [rosa, setRosa] = React.useState(() => Array.from({ length: 21 }, () => null))
  const [groups, setGroups] = React.useState([])
  const [authStatus, setAuthStatus] = React.useState({ ready: false, userId: null, token: null })
  const [supabaseMsg, setSupabaseMsg] = React.useState(null)
  const [tokenKind, setTokenKind] = React.useState(null)

  const fileInputRef = React.useRef(null)

  React.useEffect(() => {
    const initAnon = async () => {
      try {
        if (!supabase) {
          setAuthStatus({ ready: true, userId: null, token: null })
          return
        }
        
        let { data, error } = await supabase.auth.getSession()
        
        if (!data?.session?.access_token || error) {
          const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()
          
          if (signInError) {
            setAuthStatus({ ready: true, userId: null, token: null })
            return
          }
          
          data = signInData
        }
        
        const session = data?.session
        const userId = session?.user?.id || null
        const token = session?.access_token || null
        
        if (token && typeof token === 'string' && token.length >= 10) {
          const isJWT = token.includes('.') && token.split('.').length >= 3
          setTokenKind(isJWT ? 'jwt' : 'opaque')
        }
        
        setAuthStatus({
          ready: true,
          userId,
          token,
        })
      } catch (err) {
        setAuthStatus({ ready: true, userId: null, token: null })
      }
    }
    initAnon()
  }, [])

  const getFreshToken = async () => {
    if (!supabase) return null
    
    try {
      let { data, error } = await supabase.auth.getSession()
      
      if (!data?.session?.access_token || error) {
        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()
        
        if (signInError || !signInData?.session?.access_token) {
          return null
        }
        
        data = signInData
      }
      
      const token = data?.session?.access_token
      
      if (!token || typeof token !== 'string' || token.length < 10) {
        return null
      }
      
      const isJWT = token.includes('.') && token.split('.').length >= 3
      setTokenKind(isJWT ? 'jwt' : 'opaque')
      
      return token
    } catch (err) {
      return null
    }
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
      if (!token || typeof token !== 'string' || token.length < 10) {
        throw new Error(lang === 'it' ? 'Token di autenticazione non valido. Ricarica la pagina e riprova.' : 'Invalid authentication token. Reload the page and try again.')
      }
      
      const res = await fetch('/api/supabase/reset-my-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      
      const data = await res.json().catch(() => ({}))
      
      if (!res.ok) {
        throw new Error(`${data?.error || `Errore reset (${res.status})`}${data?.details ? ` — ${data.details}` : ''}`)
      }
      
      setSupabaseMsg(lang === 'it' ? '✅ Dati Supabase resettati' : '✅ Supabase data reset')
    } catch (e) {
      setSupabaseMsg(`❌ ${e?.message || (lang === 'it' ? 'Errore reset' : 'Reset error')}`)
    }
  }

  const saveToSupabase = async (player, slotIndex) => {
    setSupabaseMsg(null)
    try {
      const token = await getFreshToken()
      if (!token || typeof token !== 'string' || token.length < 10) {
        throw new Error(lang === 'it' ? 'Token di autenticazione non valido. Ricarica la pagina e riprova.' : 'Invalid authentication token. Reload the page and try again.')
      }
      
      const res = await fetch('/api/supabase/save-player', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ player, slotIndex }),
      })
      
      const data = await res.json().catch(() => ({}))
      
      if (!res.ok) {
        throw new Error(`${data?.error || `Errore salvataggio (${res.status})`}${data?.details ? ` — ${data.details}` : ''}`)
      }
      
      // Messaggio informativo basato sul risultato
      let msg = ''
      if (data.build_changed) {
        msg = lang === 'it' 
          ? `✅ Nuovo build creato (giocatore già presente ma con build diversa - nuove abilità/booster) - slot ${data.slot}`
          : `✅ New build created (player already present but with different build - new skills/booster) - slot ${data.slot}`
      } else if (data.was_duplicate && data.was_moved) {
        msg = lang === 'it' 
          ? `✅ Giocatore già presente (slot ${data.previous_slot}), spostato in slot ${data.slot}`
          : `✅ Player already present (slot ${data.previous_slot}), moved to slot ${data.slot}`
      } else if (data.was_duplicate) {
        msg = lang === 'it'
          ? `✅ Giocatore già presente, dati aggiornati (slot ${data.slot})`
          : `✅ Player already present, data updated (slot ${data.slot})`
      } else {
        msg = lang === 'it' 
          ? `✅ Salvato in Supabase (slot ${data.slot})`
          : `✅ Saved to Supabase (slot ${data.slot})`
      }
      
      setSupabaseMsg(msg)
    } catch (e) {
      setSupabaseMsg(`❌ ${e?.message || (lang === 'it' ? 'Errore salvataggio' : 'Save error')}`)
    }
  }

  return (
    <main className="container">
      {/* Language Switcher */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        gap: '8px',
        background: 'rgba(10, 14, 39, 0.9)',
        padding: '8px',
        borderRadius: '8px',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        backdropFilter: 'blur(10px)'
      }}>
        <button
          onClick={() => changeLanguage('it')}
          style={{
            padding: '6px 12px',
            background: lang === 'it' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '6px',
            color: lang === 'it' ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          IT
        </button>
        <button
          onClick={() => changeLanguage('en')}
          style={{
            padding: '6px 12px',
            background: lang === 'en' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: '6px',
            color: lang === 'en' ? 'var(--neon-blue)' : 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600
          }}
        >
          EN
        </button>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <Link href="/dashboard" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} />
          {t('backToDashboard')}
        </Link>
      </div>

      <header className="header">
        <h1>{t('squad')}</h1>
        <p className="subtitle">
          {lang === 'it' 
            ? 'Carica 1–6 screenshot (anche mischiati) → raggruppo per giocatore → estraggo dati → inserisci in rosa'
            : 'Upload 1–6 screenshots (even mixed) → group by player → extract data → insert into squad'}
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <a href="/my-players" className="btn primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} />
            {t('myPlayers')}
          </a>
          <button className="btn" onClick={resetMySupabaseData} disabled={!authStatus.token} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <X size={16} />
            {t('resetMyData')}
          </button>
          {supabaseMsg && (
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: supabaseMsg.includes('✅') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${supabaseMsg.includes('✅') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              fontSize: '14px',
              color: supabaseMsg.includes('✅') ? '#22C55E' : '#EF4444'
            }}>
              {supabaseMsg.includes('✅') ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {supabaseMsg.replace('✅', '').replace('❌', '')}
            </div>
          )}
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
            <div className="dropzone-title" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
              <Upload size={32} />
              {t('uploadScreenshots')}
            </div>
            <div className="dropzone-hint">{t('dragDropHint')}</div>
          </div>
        ) : (
          <div className="preview">
            <div className="preview-row">
              <div className="card inner" style={{ padding: 16 }}>
                <b style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={18} />
                  {t('imagesLoaded')}: {images.length}
                </b>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginTop: 16 }}>
                  {images.map((img) => (
                    <div key={img.id} style={{ position: 'relative' }}>
                      <img src={img.dataUrl} alt="thumb" style={{ width: '100%', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)' }} />
                      <button
                        onClick={() => setImages(images.filter(i => i.id !== img.id))}
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          background: 'rgba(239, 68, 68, 0.8)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: 'white'
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="preview-actions">
                <button className="btn primary" onClick={analyzeBatch} disabled={isExtracting} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  {isExtracting ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                  {isExtracting ? t('analyzing') : t('analyzeBatch')}
                </button>
                <button className="btn" onClick={reset} disabled={isExtracting} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <X size={16} />
                  {t('reset')}
                </button>
              </div>
            </div>

            {error && (
              <div className="error" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 16 }}>
                <AlertCircle size={18} />
                {t('error')}: {error}
              </div>
            )}

            {groups.length > 0 && (
              <div className="grid" style={{ marginTop: 24 }}>
                {groups.map((g) => (
                  <div key={g.group_id} className="card inner">
                    <h2>{g.label}</h2>
                    <div className="kv">
                      <div><b>{t('name')}</b>: {g.player?.player_name ?? '—'}</div>
                      <div><b>OVR</b>: {g.player?.overall_rating ?? '—'} · <b>{t('role')}</b>: {g.player?.position ?? '—'}</div>
                      {g.player?.role && <div><b>{t('role')}</b>: {g.player.role}</div>}
                      <div><b>{t('card')}</b>: {g.player?.card_type ?? '—'} · <b>{t('team')}</b>: {g.player?.team ?? '—'}</div>
                      {Array.isArray(g.player?.boosters) && g.player.boosters.length > 0 && (
                        <div><b>{t('boosters')}</b>: {g.player.boosters.filter((b) => b?.name || b?.effect).map((b) => `${b.name ?? '—'} (${b.effect ?? '—'})`).join(', ')}</div>
                      )}
                      {Array.isArray(g.player?.skills) && g.player.skills.length > 0 && (
                        <div><b>{t('skills')}</b>: {g.player.skills.slice(0, 5).join(', ')}{g.player.skills.length > 5 ? ` +${g.player.skills.length - 5}` : ''}</div>
                      )}
                      {Array.isArray(g.missing_screens) && g.missing_screens.length > 0 && (
                        <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255, 107, 53, 0.1)', borderRadius: '6px', border: '1px solid rgba(255, 107, 53, 0.3)' }}>
                          <b style={{ color: 'var(--neon-orange)' }}>⚠️ {t('missing')}:</b> {g.missing_screens.join(', ')}
                        </div>
                      )}
                    </div>

                    <label className="label">
                      {t('slot')} ({lang === 'it' ? '0-10 titolari, 11-20 panchina' : '0-10 starters, 11-20 bench'})
                      <select className="select" value={selectedSlot} onChange={(e) => setSelectedSlot(Number(e.target.value))}>
                        {Array.from({ length: 21 }, (_, i) => (
                          <option key={i} value={i}>
                            {i <= 10 
                              ? (lang === 'it' ? `Titolare ${i + 1}` : `Starter ${i + 1}`)
                              : (lang === 'it' ? `Panchina ${i - 10}` : `Bench ${i - 10}`)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button className="btn primary" onClick={() => insertIntoRosa(g.player, selectedSlot)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle2 size={16} />
                      {t('insertPlayer')}
                    </button>
                    <button className="btn" style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: '8px' }} onClick={() => saveToSupabase(g.player, selectedSlot)} disabled={!authStatus.token}>
                      <CheckCircle2 size={16} />
                      {t('saveToSupabase')} ({t('slotSelected')})
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="card">
        <h2>{t('squad')} (21 {t('slot')})</h2>
        <div className="rosa-grid">
          {rosa.map((slot, idx) => (
            <div key={idx} className={`rosa-slot ${slot ? 'filled' : ''}`}>
              <div className="slot-title">{idx <= 10 ? `${lang === 'it' ? 'T' : 'S'} ${idx + 1}` : `${lang === 'it' ? 'P' : 'B'} ${idx - 10}`}</div>
              <div className="slot-body">
                {slot ? (
                  <>
                    <div className="slot-name">{slot.extracted?.player_name ?? (lang === 'it' ? 'Senza nome' : 'No name')}</div>
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
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <X size={14} />
                      {lang === 'it' ? 'Rimuovi' : 'Remove'}
                    </button>
                  </>
                ) : (
                  <div className="slot-empty">{lang === 'it' ? 'Vuoto' : 'Empty'}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { normalizeStringArray } from '@/lib/normalize'
import { ArrowLeft, Upload, X, CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react'

// Componente Badge per completeness
function Badge({ status, label }) {
  return (
    <span style={{
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 600,
      background: status ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
      border: `1px solid ${status ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
      color: status ? '#22C55E' : '#EF4444',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      {status ? '✓' : '✗'} {label}
    </span>
  )
}

export default function RosaPage() {
  return <RosaProductionPage />
}

function RosaProductionPage() {
  const { t, lang, changeLanguage } = useTranslation()
  const router = useRouter()
  const [isDragging, setIsDragging] = React.useState(false)
  const [images, setImages] = React.useState([])
  const [isExtracting, setIsExtracting] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [groups, setGroups] = React.useState([])
  const [authStatus, setAuthStatus] = React.useState({ ready: false, userId: null, token: null })
  const [supabaseMsg, setSupabaseMsg] = React.useState(null)
  const [tokenKind, setTokenKind] = React.useState(null)
  const [processingProgress, setProcessingProgress] = React.useState({ current: 0, total: 0 })
  const [isMultiPlayerError, setIsMultiPlayerError] = React.useState(false)

  const fileInputRef = React.useRef(null)

  React.useEffect(() => {
    const initAuth = async () => {
      try {
        if (!supabase) {
          setAuthStatus({ ready: true, userId: null, token: null })
          return
        }
        
        // Controlla se c'è già una sessione email
        const { data, error } = await supabase.auth.getSession()
        
        // Se non c'è sessione valida, redirect a login
        if (!data?.session?.access_token || error) {
          console.log('[initAuth] No session, redirecting to login')
          setAuthStatus({ ready: true, userId: null, token: null })
          router.push('/login')
          return
        }
        
        const session = data.session
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
        console.error('[initAuth] Error:', err)
        setAuthStatus({ ready: true, userId: null, token: null })
        router.push('/login')
      }
    }
    initAuth()
  }, [])

  const getFreshToken = async () => {
    if (!supabase) return null
    
    try {
      const { data, error } = await supabase.auth.getSession()
      
      // Se non c'è sessione valida, redirect a login
      if (!data?.session?.access_token || error) {
        router.push('/login')
        return null
      }
      
      const token = data.session.access_token
      
      if (!token || typeof token !== 'string' || token.length < 10) {
        router.push('/login')
        return null
      }
      
      const isJWT = token.includes('.') && token.split('.').length >= 3
      setTokenKind(isJWT ? 'jwt' : 'opaque')
      
      return token
    } catch (err) {
      router.push('/login')
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
    setProcessingProgress({ current: 0, total: images.length })
    try {
      const res = await fetch('/api/extract-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: images.map((i) => ({ id: i.id, imageDataUrl: i.dataUrl })) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Gestione errore multi-player
        if (data?.error === 'MULTI_PLAYER_DETECTED') {
          setError(`${data.message}\n\n${data.suggestion || ''}`)
          setIsMultiPlayerError(true)
          // Mostriamo comunque i gruppi per debug, ma con warning
          setGroups(Array.isArray(data.groups) ? data.groups : [])
          return
        }
        const details = data?.openai_body || data?.raw || data?.details
        throw new Error(`${data?.error || `Errore estrazione (${res.status})`}${details ? `\n\n${String(details).slice(0, 1200)}` : ''}`)
      }
      setIsMultiPlayerError(false)
      setGroups(Array.isArray(data.groups) ? data.groups : [])
      setProcessingProgress({ current: images.length, total: images.length })
    } catch (err) {
      setError(err?.message || 'Errore estrazione')
    } finally {
      setIsExtracting(false)
      setTimeout(() => setProcessingProgress({ current: 0, total: 0 }), 1000)
    }
  }

  const reset = () => {
    setError(null)
    setImages([])
    setGroups([])
    setIsMultiPlayerError(false)
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

  const saveToSupabase = async (player) => {
    setSupabaseMsg(null)
    console.log('[saveToSupabase] Starting save for player:', player?.player_name || 'Unknown')
    try {
      const token = await getFreshToken()
      if (!token || typeof token !== 'string' || token.length < 10) {
        const errorMsg = lang === 'it' ? 'Token di autenticazione non valido. Ricarica la pagina e riprova.' : 'Invalid authentication token. Reload the page and try again.'
        console.error('[saveToSupabase] Invalid token:', { tokenLength: token?.length, tokenType: typeof token })
        throw new Error(errorMsg)
      }
      
      console.log('[saveToSupabase] Token OK, calling API...')
      const res = await fetch('/api/supabase/save-player', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ player }),
      })
      
      console.log('[saveToSupabase] API response:', { status: res.status, ok: res.ok })
      const data = await res.json().catch((err) => {
        console.error('[saveToSupabase] JSON parse error:', err)
        return {}
      })
      
      if (!res.ok) {
        console.error('[saveToSupabase] API error:', { status: res.status, data })
        // Se rosa piena, mostra messaggio con link a /my-players
        if (data.rosa_full) {
          const errorMsg = data.message || (lang === 'it' 
            ? 'Rosa piena. Vai a "I Miei Giocatori" per rimuovere un giocatore.'
            : 'Squad full. Go to "My Players" to remove a player.')
          setSupabaseMsg(
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: '#EF4444' }}>❌ {errorMsg}</div>
              <Link href="/my-players" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
                <Users size={16} />
                {t('myPlayers')}
              </Link>
            </div>
          )
          return
        }
        throw new Error(`${data?.error || `Errore salvataggio (${res.status})`}${data?.details ? ` — ${data.details}` : ''}`)
      }
      
      console.log('[saveToSupabase] Save successful:', data)
      // Messaggio informativo basato sul risultato
      let msg = ''
      if (data.was_duplicate) {
        msg = lang === 'it'
          ? `✅ Giocatore già presente, dati aggiornati`
          : `✅ Player already present, data updated`
      } else {
        msg = lang === 'it' 
          ? `✅ Giocatore salvato con successo`
          : `✅ Player saved successfully`
      }
      
      setSupabaseMsg(
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ color: '#10B981' }}>{msg}</div>
          <Link href="/my-players" className="btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start' }}>
            <Users size={16} />
            {t('myPlayers')}
          </Link>
        </div>
      )
      
      // Reset dopo salvataggio riuscito (ma mantieni il messaggio con link)
      setTimeout(() => {
        reset()
        // Non resettare il messaggio subito, lascia il link visibile
      }, 3000)
    } catch (e) {
      console.error('[saveToSupabase] Error:', e)
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
                <button className="btn primary" onClick={analyzeBatch} disabled={isExtracting} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}>
                  {isExtracting ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />}
                  {isExtracting ? t('extracting') : t('extractData')}
                </button>
                {isExtracting && processingProgress.total > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'rgba(0, 212, 255, 0.1)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}>
                    <span>{t('processingImage')} {processingProgress.current} {t('of')} {processingProgress.total}</span>
                    <div style={{ width: '100px', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${(processingProgress.current / processingProgress.total) * 100}%`, 
                        height: '100%', 
                        background: 'var(--neon-blue)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}
                <button className="btn" onClick={reset} disabled={isExtracting} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <X size={16} />
                  {t('reset')}
                </button>
              </div>
            </div>

            {error && (
              <div className="error" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 16, padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} />
                  <span style={{ fontWeight: 600 }}>{t('error')}:</span>
                </div>
                <div style={{ whiteSpace: 'pre-line', fontSize: '14px' }}>{error}</div>
                {isMultiPlayerError && (
                  <button
                    onClick={reset}
                    className="btn"
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      alignSelf: 'flex-start',
                      marginTop: '8px'
                    }}
                  >
                    <X size={16} />
                    {t('removePhotos')}
                  </button>
                )}
              </div>
            )}

            {groups.length > 0 && (
              <div className="grid" style={{ marginTop: 24 }}>
                {groups.map((g) => {
                  // Normalizza missingSections per gestire tutti i casi edge (stringa, oggetto, undefined, ecc.)
                  const rawMissingSections = g.completeness?.missingSections
                  const normalizedMissingSections = normalizeStringArray(rawMissingSections)
                  
                  // Debug temporaneo solo in dev per verificare il tipo originale
                  // In Next.js, process.env.NODE_ENV è disponibile nel client e viene sostituito a build-time
                  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && rawMissingSections !== undefined && rawMissingSections !== null) {
                    console.debug('[rosa/page] missingSections type check:', {
                      player: g.label,
                      originalType: typeof rawMissingSections,
                      isArray: Array.isArray(rawMissingSections),
                      originalValue: rawMissingSections,
                      normalized: normalizedMissingSections
                    })
                  }
                  
                  const completeness = g.completeness 
                    ? { ...g.completeness, missingSections: normalizedMissingSections }
                    : { identity: false, stats: false, skills: false, boosters: false, percentage: 0, missingSections: [] }
                  const canSave = completeness.identity && (completeness.stats || completeness.skills)
                  
                  return (
                  <div key={g.group_id} className="card inner">
                    <h2>{g.label}</h2>
                    
                    {/* Completeness Badge */}
                    {completeness && (
                      <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', border: '1px solid rgba(0, 212, 255, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{t('completeness')}</span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--neon-blue)' }}>
                            {completeness.percentage || 0}%
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                          <Badge status={completeness.identity} label={t('identity')} />
                          <Badge status={completeness.stats} label={t('stats')} />
                          <Badge status={completeness.skills} label={t('skills')} />
                          <Badge status={completeness.boosters} label={t('boosters')} />
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${completeness.percentage || 0}%`, 
                            height: '100%', 
                            background: 'var(--neon-blue)',
                            transition: 'width 0.3s ease'
                          }} />
                        </div>
                        
                        {/* Suggerimenti per foto mancanti */}
                        {/* missingSections è già normalizzato sopra, quindi è sempre un array */}
                        {completeness.missingSections && completeness.missingSections.length > 0 && (
                          <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(255, 193, 7, 0.1)', border: '1px solid rgba(255, 193, 7, 0.3)', borderRadius: '6px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffc107', marginBottom: '4px' }}>
                              {t('incompleteDataWarning')}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {/* missingSections è garantito essere un array dalla normalizzazione */}
                              {completeness.missingSections.includes('stats') && (
                                <div>• {t('missingStatsPhoto')}</div>
                              )}
                              {completeness.missingSections.includes('skills') && (
                                <div>• {t('missingSkillsPhoto')}</div>
                              )}
                              {completeness.missingSections.includes('boosters') && (
                                <div>• {t('missingBoostersPhoto')}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
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
                    </div>

                    <button 
                      className="btn primary" 
                      style={{ 
                        width: '100%',
                        marginTop: '16px',
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        gap: '8px',
                        opacity: (!canSave || !authStatus.token) ? 0.5 : 1,
                        cursor: (!canSave || !authStatus.token) ? 'not-allowed' : 'pointer'
                      }} 
                      onClick={() => saveToSupabase(g.player)} 
                      disabled={!canSave || !authStatus.token}
                      title={!canSave ? (lang === 'it' ? 'Dati insufficienti per salvare (serve Identity + Stats o Skills)' : 'Insufficient data to save (needs Identity + Stats or Skills)') : ''}
                    >
                      <CheckCircle2 size={16} />
                      {t('savePlayer')}
                    </button>
                  </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}

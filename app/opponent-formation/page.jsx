'use client'

import React from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useTranslation } from '@/lib/i18n'
import { ArrowLeft, Upload, X, CheckCircle2, AlertCircle, Loader2, Users, Target, Save } from 'lucide-react'

export default function OpponentFormationPage() {
  return <OpponentFormationView />
}

function OpponentFormationView() {
  const { t, lang, changeLanguage } = useTranslation()
  const [isDragging, setIsDragging] = React.useState(false)
  const [imageDataUrl, setImageDataUrl] = React.useState(null)
  const [isExtracting, setIsExtracting] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [formation, setFormation] = React.useState(null)
  const [authStatus, setAuthStatus] = React.useState({ ready: false, userId: null, token: null })
  const [saveMsg, setSaveMsg] = React.useState(null)
  const [formationName, setFormationName] = React.useState('')

  const fileInputRef = React.useRef(null)

  React.useEffect(() => {
    const initAnon = async () => {
      try {
        if (!supabase) {
          setAuthStatus({ ready: true, userId: null, token: null })
          return
        }
        
        let { data } = await supabase.auth.getSession()
        if (!data?.session?.access_token) {
          const { data: signInData } = await supabase.auth.signInAnonymously()
          data = signInData
        }
        
        setAuthStatus({
          ready: true,
          userId: data?.session?.user?.id || null,
          token: data?.session?.access_token || null,
        })
      } catch (err) {
        setAuthStatus({ ready: true, userId: null, token: null })
      }
    }
    initAnon()
  }, [])

  const compressImageToDataUrl = (file, maxWidth = 1920, quality = 0.85) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', quality))
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  const handleFileSelect = async (file) => {
    if (!file || !file.type.startsWith('image/')) return
    const dataUrl = await compressImageToDataUrl(file)
    setImageDataUrl(dataUrl)
    setFormation(null)
    setError(null)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) {
      await handleFileSelect(file)
    }
  }

  const handleFileInputChange = async (e) => {
    const file = e.target?.files?.[0]
    if (file) {
      await handleFileSelect(file)
    }
  }

  const extractFormation = async () => {
    if (!imageDataUrl) return
    
    setIsExtracting(true)
    setError(null)
    setFormation(null)
    
    try {
      const res = await fetch('/api/extract-formation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data?.error || `Errore estrazione (${res.status})`)
      }
      
      setFormation(data.formation)
      setFormationName(data.formation?.team_name || `Formazione Avversaria - ${new Date().toLocaleDateString('it-IT')}`)
    } catch (err) {
      setError(err?.message || (lang === 'it' ? 'Errore estrazione' : 'Extraction error'))
    } finally {
      setIsExtracting(false)
    }
  }

  const saveFormation = async () => {
    if (!formation || !authStatus.token) return
    
    setSaveMsg(null)
    try {
      const token = authStatus.token
      if (!token || typeof token !== 'string' || token.length < 10) {
        throw new Error(lang === 'it' ? 'Token di autenticazione non valido. Ricarica la pagina e riprova.' : 'Invalid authentication token. Reload the page and try again.')
      }
      
      const res = await fetch('/api/supabase/save-opponent-formation', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          formation,
          name: formationName || undefined,
          screenshot_url: imageDataUrl,
        }),
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(`${data?.error || `Errore salvataggio (${res.status})`}${data?.details ? ` — ${data.details}` : ''}`)
      }
      
      setSaveMsg(lang === 'it' ? '✅ Formazione avversaria salvata' : '✅ Opponent formation saved')
    } catch (e) {
      setSaveMsg(`❌ ${e?.message || (lang === 'it' ? 'Errore salvataggio' : 'Save error')}`)
    }
  }

  const fieldPositions = {
    goalkeeper: { x: 50, y: 95 },
    left_back: { x: 15, y: 75 },
    left_center_back: { x: 35, y: 75 },
    right_center_back: { x: 65, y: 75 },
    right_back: { x: 85, y: 75 },
    left_midfielder: { x: 20, y: 50 },
    center_midfielder: { x: 50, y: 50 },
    right_midfielder: { x: 80, y: 50 },
    left_forward: { x: 25, y: 25 },
    center_forward: { x: 50, y: 25 },
    right_forward: { x: 75, y: 25 },
  }

  return (
    <main className="container" style={{ padding: '24px', minHeight: '100vh' }}>
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
          {lang === 'it' ? 'Torna alla Dashboard' : 'Back to Dashboard'}
        </Link>
      </div>

      <header className="header">
        <h1>{lang === 'it' ? 'Formazione Avversaria' : 'Opponent Formation'}</h1>
        <p style={{ opacity: 0.8, marginTop: '8px' }}>
          {lang === 'it' 
            ? 'Carica screenshot della formazione avversaria per analisi e contromisure'
            : 'Upload opponent formation screenshot for analysis and countermeasures'}
        </p>
      </header>

      {/* Upload Area */}
      {!formation && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--neon-blue)' : 'rgba(0, 212, 255, 0.3)'}`,
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            cursor: 'pointer',
            background: isDragging ? 'rgba(0, 212, 255, 0.1)' : 'rgba(0, 212, 255, 0.05)',
            transition: 'all 0.3s',
            marginBottom: '24px'
          }}
        >
          <Upload size={48} style={{ color: 'var(--neon-blue)', marginBottom: '16px' }} />
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
            {lang === 'it' ? 'Trascina screenshot qui' : 'Drag screenshot here'}
          </div>
          <div style={{ opacity: 0.7, fontSize: '14px' }}>
            {lang === 'it' ? 'o clicca per selezionare' : 'or click to select'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Image Preview */}
      {imageDataUrl && !formation && (
        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
          <img 
            src={imageDataUrl} 
            alt="Screenshot" 
            style={{ 
              maxWidth: '100%', 
              maxHeight: '400px', 
              borderRadius: '8px',
              border: '1px solid rgba(0, 212, 255, 0.3)'
            }} 
          />
          <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={extractFormation}
              disabled={isExtracting}
              className="btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              {isExtracting ? (
                <>
                  <Loader2 size={16} className="spin" />
                  {lang === 'it' ? 'Estrazione...' : 'Extracting...'}
                </>
              ) : (
                <>
                  <Target size={16} />
                  {lang === 'it' ? 'Estrai Formazione' : 'Extract Formation'}
                </>
              )}
            </button>
            <button
              onClick={() => { setImageDataUrl(null); setError(null) }}
              className="btn"
              style={{ background: 'rgba(236, 72, 153, 0.2)', borderColor: 'var(--neon-pink)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Formation Display */}
      {formation && (
        <div>
          {/* Formation Info */}
          <div className="neon-panel" style={{ marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              {formation.formation && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                    {lang === 'it' ? 'Formazione' : 'Formation'}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--neon-blue)' }}>
                    {formation.formation}
                  </div>
                </div>
              )}
              {formation.overall_strength && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                    {lang === 'it' ? 'Forza Complessiva' : 'Overall Strength'}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--neon-purple)' }}>
                    {formation.overall_strength}
                  </div>
                </div>
              )}
              {formation.tactical_style && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                    {lang === 'it' ? 'Stile Tattico' : 'Tactical Style'}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>
                    {formation.tactical_style}
                  </div>
                </div>
              )}
              {formation.team_name && (
                <div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '4px' }}>
                    {lang === 'it' ? 'Squadra' : 'Team'}
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>
                    {formation.team_name}
                  </div>
                </div>
              )}
            </div>

            {/* Save Form */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
              <input
                type="text"
                value={formationName}
                onChange={(e) => setFormationName(e.target.value)}
                placeholder={lang === 'it' ? 'Nome formazione (opzionale)' : 'Formation name (optional)'}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '10px 16px',
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid var(--neon-blue)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={saveFormation}
                disabled={!authStatus.token || !!saveMsg}
                className="btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <Save size={16} />
                {lang === 'it' ? 'Salva Formazione' : 'Save Formation'}
              </button>
            </div>
            {saveMsg && (
              <div style={{ marginTop: '12px', padding: '12px', background: saveMsg.includes('✅') ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)', borderRadius: '8px', border: `1px solid ${saveMsg.includes('✅') ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)'}` }}>
                {saveMsg}
              </div>
            )}
          </div>

          {/* Field Visualization */}
          <div className="neon-panel">
            <h3 style={{ marginBottom: '24px' }}>
              {lang === 'it' ? 'Disposizione in Campo' : 'Field Layout'}
            </h3>
            <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto', aspectRatio: '2/3', background: 'linear-gradient(180deg, rgba(0, 212, 255, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)', borderRadius: '12px', border: '2px solid var(--neon-blue)', padding: '20px' }}>
              {/* Field Lines */}
              <div style={{ position: 'absolute', inset: '20px', border: '2px solid rgba(0, 212, 255, 0.3)', borderRadius: '8px' }}>
                {/* Center Line */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '2px', background: 'rgba(0, 212, 255, 0.3)', transform: 'translateY(-50%)' }} />
                {/* Center Circle */}
                <div style={{ position: 'absolute', left: '50%', top: '50%', width: '30%', height: '30%', border: '2px solid rgba(0, 212, 255, 0.3)', borderRadius: '50%', transform: 'translate(-50%, -50%)' }} />
              </div>

              {/* Players */}
              {formation.players && formation.players.map((player, idx) => {
                const pos = fieldPositions[player.field_position] || { x: 50, y: 50 }
                return (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: 'translate(-50%, -50%)',
                      minWidth: '80px',
                      textAlign: 'center'
                    }}
                  >
                    <div
                      className="neon-panel"
                      style={{
                        padding: '8px 12px',
                        fontSize: '11px',
                        background: 'rgba(0, 212, 255, 0.2)',
                        border: '1px solid var(--neon-blue)',
                        boxShadow: 'var(--glow-blue)'
                      }}
                    >
                      <div style={{ fontWeight: 700, marginBottom: '4px' }}>
                        {player.name || `Player ${idx + 1}`}
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.8 }}>
                        {player.position} {player.rating ? `• ${player.rating}` : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Players List */}
          <div className="neon-panel" style={{ marginTop: '24px' }}>
            <h3 style={{ marginBottom: '16px' }}>
              {lang === 'it' ? 'Giocatori Titolari' : 'Starting XI'} ({formation.players?.length || 0})
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
              {formation.players && formation.players.map((player, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px',
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px solid var(--neon-blue)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {player.name || `Giocatore ${idx + 1}`}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {player.position && <span>{player.position}</span>}
                    {player.rating && <span>• {player.rating}</span>}
                    {player.field_position && <span>• {player.field_position}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Substitutes & Reserves */}
          {(formation.substitutes?.length > 0 || formation.reserves?.length > 0) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginTop: '24px' }}>
              {formation.substitutes?.length > 0 && (
                <div className="neon-panel">
                  <h3 style={{ marginBottom: '16px' }}>
                    {lang === 'it' ? 'Sostituti' : 'Substitutes'} ({formation.substitutes.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {formation.substitutes.map((sub, idx) => (
                      <div key={idx} style={{ padding: '8px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '6px', fontSize: '14px' }}>
                        {sub.name} {sub.position && `(${sub.position})`} {sub.rating && `• ${sub.rating}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {formation.reserves?.length > 0 && (
                <div className="neon-panel">
                  <h3 style={{ marginBottom: '16px' }}>
                    {lang === 'it' ? 'Riserve' : 'Reserves'} ({formation.reserves.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {formation.reserves.map((res, idx) => (
                      <div key={idx} style={{ padding: '8px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '6px', fontSize: '14px' }}>
                        {res.name} {res.position && `(${res.position})`} {res.rating && `• ${res.rating}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => { setFormation(null); setImageDataUrl(null); setError(null); setSaveMsg(null) }}
              className="btn"
              style={{ background: 'rgba(236, 72, 153, 0.2)', borderColor: 'var(--neon-pink)' }}
            >
              {lang === 'it' ? 'Carica Altra Formazione' : 'Load Another Formation'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

'use client'

import React, { useState, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { BarChart3, X, Upload, Image as ImageIcon } from 'lucide-react'

const MAX_FILES = 2
const MAX_SIZE_MB = 10

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function GameAnalysisModal({ show, onClose, onSuccess }) {
  const { t, lang } = useTranslation()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef(null)

  const handleFileChange = (e) => {
    setError(null)
    const chosen = Array.from(e.target.files || []).slice(0, MAX_FILES)
    const valid = chosen.filter(f => f.size <= MAX_SIZE_MB * 1024 * 1024)
    if (chosen.length !== valid.length) {
      setError(lang === 'en' ? `Max ${MAX_SIZE_MB}MB per image.` : `Max ${MAX_SIZE_MB}MB per immagine.`)
    }
    setFiles(valid)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (files.length === 0) {
      setError(lang === 'en' ? 'Select at least one image.' : 'Seleziona almeno un\'immagine.')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const dataUrls = await Promise.all(files.map(fileToDataUrl))
      const { data: session } = await supabase?.auth.getSession() ?? {}
      if (!session?.session?.access_token) {
        setError(t('gameAnalysisError'))
        setLoading(false)
        return
      }
      const res = await fetch('/api/extract-game-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
          'Accept-Language': lang === 'en' ? 'en' : 'it'
        },
        body: JSON.stringify({ imageDataUrls: dataUrls })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setSuccess(true)
        onSuccess?.()
        // Aggiorna il riassunto (diagnostic) così la chat vede subito le nuove statistiche
        try {
          await fetch('/api/refresh-diagnostic', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.session.access_token}`,
              'Accept-Language': lang === 'en' ? 'en' : 'it'
            }
          })
        } catch (_) { /* non bloccare */ }
        setTimeout(() => {
          setSuccess(false)
          setFiles([])
          onClose?.()
        }, 1800)
      } else {
        setError(data.error || t('gameAnalysisError'))
      }
    } catch (err) {
      setError(t('gameAnalysisError'))
    } finally {
      setLoading(false)
    }
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
    if (inputRef.current) inputRef.current.value = ''
  }

  if (!show) return null

  const modalStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '16px'
  }
  const boxStyle = {
    background: 'var(--card-bg, #1a1a2e)',
    border: '1px solid rgba(0, 212, 255, 0.25)',
    borderRadius: '12px',
    maxWidth: '440px',
    width: '100%',
    overflow: 'hidden'
  }
  const headerStyle = {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px'
  }
  const bodyStyle = { padding: '20px' }
  const hintStyle = { fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '16px' }
  const inputWrapStyle = {
    marginBottom: '16px',
    minHeight: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px dashed rgba(255,255,255,0.2)',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    background: 'rgba(0,0,0,0.2)'
  }
  const previewStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }
  const previewItemStyle = {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.8)',
    background: 'rgba(0,212,255,0.15)',
    padding: '8px 12px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }

  return (
    <div style={modalStyle} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={boxStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={20} style={{ color: 'var(--neon-blue)' }} />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{t('gameAnalysisTitle')}</h2>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: '4px' }} aria-label={t('close')}>
            <X size={22} />
          </button>
        </div>
        <div style={bodyStyle}>
          <p style={hintStyle}>{t('gameAnalysisUploadHint')}</p>
          <form onSubmit={handleSubmit}>
            <label style={{ display: 'block' }}>
              <div
                style={inputWrapStyle}
                onClick={() => inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <Upload size={24} style={{ opacity: 0.8 }} />
                <span style={{ marginLeft: '8px' }}>
                  {files.length === 0
                    ? (lang === 'en' ? 'Choose 1 or 2 images' : 'Scegli 1 o 2 immagini')
                    : `${files.length} ${lang === 'en' ? 'image(s)' : 'immagine/i'}`}
                </span>
              </div>
            </label>
            {files.length > 0 && (
              <div style={previewStyle}>
                {files.map((f, i) => (
                  <div key={i} style={previewItemStyle}>
                    <ImageIcon size={14} />
                    {f.name}
                    <button type="button" onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '0 4px' }}>×</button>
                  </div>
                ))}
              </div>
            )}
            {error && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px' }}>{error}</p>}
            {success && <p style={{ color: 'var(--neon-blue)', fontSize: '13px', marginTop: '12px' }}>{t('gameAnalysisSuccess')}</p>}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', flexWrap: 'wrap' }}>
              <button type="button" className="btn secondary" onClick={onClose} disabled={loading}>{t('close')}</button>
              <button type="submit" className="btn primary" disabled={loading || files.length === 0}>
                {loading ? t('gameAnalysisAnalyzing') : t('gameAnalysisUpload')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

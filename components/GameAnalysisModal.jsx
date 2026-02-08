'use client'

import React, { useState, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { BarChart3, X, Upload, Image as ImageIcon, RefreshCw, CheckCircle2 } from 'lucide-react'

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

// Stili allineati ai modali gestione rosa (UploadPlayerModal, AssignModal): card, header, body, footer, responsive
// Allineato a gestione-formazione: overlay e card responsive (padding, maxHeight)
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1001,
  padding: 'clamp(16px, 4vw, 24px)',
  boxSizing: 'border-box'
}

const boxStyle = {
  maxWidth: '520px',
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: 'clamp(16px, 4vw, 24px)',
  background: 'rgba(10, 14, 39, 0.95)',
  border: '2px solid var(--neon-blue)',
  borderRadius: '12px',
  boxSizing: 'border-box'
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

  return (
    <div
      style={overlayStyle}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose?.()}
    >
      <div
        className="card"
        style={boxStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: allineato a UploadPlayerModal / AssignModal */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: 'clamp(18px, 4vw, 20px)',
            fontWeight: 700,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <BarChart3 size={22} style={{ color: 'var(--neon-blue)', flexShrink: 0 }} />
            {t('gameAnalysisTitle')}
          </h2>
          <button
            type="button"
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.7)',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '8px',
              opacity: loading ? 0.5 : 1,
              minWidth: 44,
              minHeight: 44
            }}
            aria-label={t('close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Istruzione: stile unico step come in UploadPlayerModal */}
        <div style={{
          fontSize: '14px',
          opacity: 0.9,
          marginBottom: '20px',
          textAlign: 'center',
          lineHeight: 1.5
        }}>
          {t('gameAnalysisUploadHint')}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Zona drop: card come gestione rosa (stesso look delle card vuote) */}
          <label style={{ display: 'block', marginBottom: '16px' }}>
            <div
              style={{
                padding: '20px 16px',
                minHeight: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                border: '2px dashed rgba(0, 212, 255, 0.3)',
                borderRadius: '12px',
                background: 'rgba(0, 212, 255, 0.05)',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                  e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.05)'
                e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)'
              }}
              onClick={() => !loading && inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={loading}
              />
              <Upload size={24} style={{ color: 'var(--neon-blue)', flexShrink: 0 }} />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                {files.length === 0
                  ? (lang === 'en' ? 'Choose 1 or 2 images' : 'Scegli 1 o 2 immagini')
                  : `${files.length} ${lang === 'en' ? 'image(s)' : 'immagine/i'}`}
              </span>
            </div>
          </label>

          {/* Preview: chip come in gestione rosa (verde check, rimuovi) */}
          {files.length > 0 && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              marginBottom: '16px'
            }}>
              {files.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.35)',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.95)'
                  }}
                >
                  <ImageIcon size={16} style={{ flexShrink: 0, opacity: 0.9 }} />
                  <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--neon-green)', color: '#000', borderRadius: '4px', fontWeight: 700 }}>✓</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    disabled={loading}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#ef4444',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      minWidth: 32,
                      minHeight: 32
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && (
            <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>
              {error}
              {files.length === 2 && t('gameAnalysisRetryOne') && (
                <span style={{ display: 'block', marginTop: '8px', opacity: 0.95 }}>{t('gameAnalysisRetryOne')}</span>
              )}
            </p>
          )}
          {success && (
            <p style={{ color: 'var(--neon-green)', fontSize: '13px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              {t('gameAnalysisSuccess')}
            </p>
          )}

          {/* Footer: stesso layout di UploadPlayerModal (border-top, flex-end, wrap) */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexWrap: 'wrap',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '20px',
            marginTop: '20px'
          }}>
            <div style={{ marginRight: 'auto', fontSize: '13px', opacity: 0.7 }}>
              {files.length === 0
                ? (lang === 'en' ? 'No images selected' : 'Nessuna immagine selezionata')
                : <span style={{ color: 'var(--neon-green)' }}>{files.length} {files.length === 1 ? (lang === 'en' ? 'image' : 'immagine') : (lang === 'en' ? 'images' : 'immagini')}</span>}
            </div>
            <button
              type="button"
              className="btn"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '12px 24px', minHeight: 44 }}
            >
              {t('close')}
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={loading || files.length === 0}
              style={{
                padding: '12px 24px',
                minHeight: 44,
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  {t('gameAnalysisAnalyzing')}
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  {t('gameAnalysisUpload')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

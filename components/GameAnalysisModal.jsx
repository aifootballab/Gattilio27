'use client'

import React, { useState, useRef } from 'react'
import { useTranslation } from '@/lib/i18n'
import { supabase } from '@/lib/supabaseClient'
import { BarChart3, X, Upload, Image as ImageIcon, RefreshCw, CheckCircle2, Camera } from 'lucide-react'
import CameraCaptureModal from '@/components/CameraCaptureModal'
import { MAX_IMAGE_UPLOAD_BYTES } from '@/lib/uploadConstants'

const SLOTS = [
  { key: 'slot1', labelKey: 'gameAnalysisSlot1', descKey: 'gameAnalysisSlot1Desc' },
  { key: 'slot2', labelKey: 'gameAnalysisSlot2', descKey: 'gameAnalysisSlot2Desc' }
]

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

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
  const [slot1, setSlot1] = useState(null) // { file, dataUrl, name }
  const [slot2, setSlot2] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const inputRef1 = useRef(null)
  const inputRef2 = useRef(null)

  const [cameraForSlot, setCameraForSlot] = useState(null)
  const getSlot = (key) => (key === 'slot1' ? slot1 : slot2)
  const setSlot = (key, value) => (key === 'slot1' ? setSlot1(value) : setSlot2(value))

  const processImageFile = (file, key) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
      setError(t('imageTooLarge'))
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setSlot(key, { file, dataUrl: ev.target.result, name: file.name || 'camera.jpg' })
    }
    reader.readAsDataURL(file)
  }

  const handleFileSelect = (e, key) => {
    const file = e.target.files?.[0]
    if (file) processImageFile(file, key)
    e.target.value = ''
  }

  const handleCameraCapture = (blob, key) => {
    const file = new File([blob], 'camera.jpg', { type: 'image/jpeg' })
    processImageFile(file, key)
    setCameraForSlot(null)
  }

  const removeSlot = (key) => {
    setSlot(key, null)
    setError(null)
    if (key === 'slot1' && inputRef1.current) inputRef1.current.value = ''
    if (key === 'slot2' && inputRef2.current) inputRef2.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const urls = [slot1?.dataUrl, slot2?.dataUrl].filter(Boolean)
    if (urls.length === 0) {
      setError(lang === 'en' ? 'Select at least one image.' : 'Seleziona almeno un\'immagine.')
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
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
        body: JSON.stringify({ imageDataUrls: urls })
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
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
            window.dispatchEvent(new CustomEvent('diagnostic-updated'))
          }
        } catch (_) { /* non bloccare */ }
        setTimeout(() => {
          setSuccess(false)
          setSlot1(null)
          setSlot2(null)
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

  if (!show) return null

  const hasAny = !!slot1 || !!slot2
  const hasBoth = !!slot1 && !!slot2

  return (
    <div
      style={overlayStyle}
      onClick={(e) => e.target === e.currentTarget && !loading && onClose?.()}
    >
      <div className="card" style={boxStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: 'clamp(18px, 4vw, 20px)', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 size={22} style={{ color: 'var(--neon-blue)', flexShrink: 0 }} />
            {t('gameAnalysisTitle')}
          </h2>
          <button
            type="button"
            onClick={() => !loading && onClose?.()}
            disabled={loading}
            style={{ background: 'transparent', border: 'none', color: 'rgba(255, 255, 255, 0.7)', cursor: loading ? 'not-allowed' : 'pointer', padding: '8px', opacity: loading ? 0.5 : 1, minWidth: 44, minHeight: 44 }}
            aria-label={t('close')}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '20px', textAlign: 'center', lineHeight: 1.5 }}>
          {t('gameAnalysisUploadHint')}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Due slot distinti come gestione rosa: il cliente vede sempre quale ha caricato e quale manca */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {SLOTS.map(({ key, labelKey, descKey }) => {
              const value = getSlot(key)
              const ref = key === 'slot1' ? inputRef1 : inputRef2
              const color = 'var(--neon-blue)'
              return (
                <div
                  key={key}
                  style={{
                    padding: '16px',
                    background: value ? 'rgba(34, 197, 94, 0.08)' : 'rgba(0, 212, 255, 0.05)',
                    border: `1px solid ${value ? 'rgba(34, 197, 94, 0.35)' : 'rgba(0, 212, 255, 0.2)'}`,
                    borderRadius: '12px',
                    cursor: loading ? 'default' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading && !value) {
                      e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                      e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!value) {
                      e.currentTarget.style.background = 'rgba(0, 212, 255, 0.05)'
                      e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.2)'
                    }
                  }}
                >
                  {value ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <BarChart3 size={20} style={{ color: 'var(--neon-green)', flexShrink: 0 }} />
                          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--neon-green)' }}>{t(labelKey)}</span>
                          <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--neon-green)', color: '#000', borderRadius: '4px', fontWeight: 700 }}>✓</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeSlot(key) }}
                          disabled={loading}
                          style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', padding: '4px 10px', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}
                        >
                          ✕
                        </button>
                      </div>
                      <img src={value.dataUrl} alt={t(labelKey)} style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }} />
                      <span style={{ fontSize: '13px', opacity: 0.85 }}>{t('uploadedPhotoLabel')}</span>
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <label style={{ display: 'inline-flex', cursor: loading ? 'not-allowed' : 'pointer', alignItems: 'center', gap: '8px', padding: '10px 14px', border: `2px solid ${color}`, borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
                          <input type="file" accept="image/*" capture="environment" ref={ref} style={{ display: 'none' }} onChange={(e) => handleFileSelect(e, key)} disabled={loading} />
                          <Upload size={20} style={{ color, flexShrink: 0 }} />
                          <span style={{ fontSize: '14px', fontWeight: 600, color }}>{lang === 'en' ? 'Choose file' : 'Sfoglia'}</span>
                        </label>
                        <button type="button" onClick={() => setCameraForSlot(key)} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 14px', border: `2px solid ${color}`, borderRadius: '8px', background: 'rgba(0,0,0,0.2)', color, cursor: loading ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 600 }}>
                          <Camera size={20} />
                          {t('takePhoto')}
                        </button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ fontSize: '15px', fontWeight: 700, color }}>{t(labelKey)}</div>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{t('gameAnalysisSlotMissing')}</span>
                      </div>
                      <div style={{ fontSize: '13px', opacity: 0.8 }}>{t(descKey)}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {error && (
            <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>
              {error}
              {hasBoth && t('gameAnalysisRetryOne') && (
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

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px', marginTop: '20px' }}>
            <div style={{ marginRight: 'auto', fontSize: '13px', opacity: 0.7 }}>
              {!hasAny
                ? (lang === 'en' ? 'No image selected' : 'Nessuna immagine selezionata')
                : <span style={{ color: 'var(--neon-green)' }}>{[slot1, slot2].filter(Boolean).length} / 2 {(lang === 'en' ? 'screens' : 'schermate')}</span>}
            </div>
            <button type="button" className="btn" onClick={onClose} disabled={loading} style={{ padding: '12px 24px', minHeight: 44 }}>
              {t('close')}
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={loading || !hasAny}
              style={{ padding: '12px 24px', minHeight: 44, opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
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
      <CameraCaptureModal
        show={!!cameraForSlot}
        onClose={() => setCameraForSlot(null)}
        onCapture={(blob) => { if (cameraForSlot) handleCameraCapture(blob, cameraForSlot) }}
        title={t('cameraCaptureTitle')}
        captureLabel={t('cameraCaptureButton')}
        closeLabel={t('cameraClose')}
        startingLabel={t('cameraStarting')}
        errorMessage={t('cameraNotAvailable')}
        captureFailedMessage={t('cameraCaptureFailed')}
      />
    </div>
  )
}

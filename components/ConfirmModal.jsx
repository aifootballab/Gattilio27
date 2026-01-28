'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

/**
 * Componente ConfirmModal Enterprise-Grade
 * Sostituisce window.confirm() con modal custom coerente con pattern esistenti
 */
export default function ConfirmModal({
  show = false,
  title,
  message,
  details = null,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  variant = 'warning',
  onConfirm,
  onCancel,
  confirmVariant = 'primary',
  disabled = false
}) {
  const { t } = useTranslation()

  if (!show) return null

  const variantConfig = {
    error: {
      icon: AlertCircle,
      iconColor: '#ef4444',
      borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    warning: {
      icon: AlertTriangle,
      iconColor: '#fbbf24',
      borderColor: 'rgba(251, 191, 36, 0.3)'
    },
    info: {
      icon: Info,
      iconColor: 'var(--neon-blue)',
      borderColor: 'rgba(0, 212, 255, 0.3)'
    }
  }

  const config = variantConfig[variant] || variantConfig.warning
  const Icon = config.icon

  const confirmButtonStyle = confirmVariant === 'danger'
    ? {
        background: 'rgba(239, 68, 68, 0.2)',
        borderColor: '#ef4444',
        color: '#ef4444'
      }
    : {
        background: 'rgba(0, 212, 255, 0.2)',
        borderColor: 'var(--neon-blue)',
        color: 'var(--neon-blue)'
      }

  return (
    <div 
      style={{
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
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !disabled) {
          onCancel?.()
        }
      }}
    >
      <div 
        style={{
          backgroundColor: 'var(--bg-primary, #1a1a1a)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '500px',
          width: '100%',
          border: `1px solid ${config.borderColor}`,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <Icon style={{ 
            color: config.iconColor, 
            width: '24px', 
            height: '24px',
            flexShrink: 0,
            marginTop: '2px'
          }} />
          <div style={{ flex: 1 }}>
            <h2 style={{ 
              margin: 0,
              marginBottom: '8px',
              color: 'var(--text-primary, #fff)',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              {title || t('confirmAction') || 'Conferma Azione'}
            </h2>
            <p style={{ 
              margin: 0,
              color: 'var(--text-secondary, #aaa)',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {message}
            </p>
            {details && (
              <p style={{
                margin: '12px 0 0 0',
                color: 'var(--text-secondary, #aaa)',
                fontSize: '13px',
                lineHeight: '1.5',
                opacity: 0.9
              }}>
                {details}
              </p>
            )}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          marginTop: '24px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={onCancel}
            disabled={disabled}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #333)',
              background: 'transparent',
              color: 'var(--text-primary, #fff)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: disabled ? 0.5 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {cancelLabel || t('cancel') || 'Annulla'}
          </button>
          
          <button
            onClick={onConfirm}
            disabled={disabled}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: `1px solid ${confirmButtonStyle.borderColor}`,
              background: confirmButtonStyle.background,
              color: confirmButtonStyle.color,
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              opacity: disabled ? 0.5 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {confirmLabel || t('confirm') || 'Conferma'}
          </button>
        </div>
      </div>
    </div>
  )
}

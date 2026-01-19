'use client'

import React from 'react'
import { useTranslation } from '@/lib/i18n'
import { Globe } from 'lucide-react'

export default function LanguageSwitch() {
  const { lang, changeLanguage } = useTranslation()

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 12px',
      background: 'rgba(0, 212, 255, 0.1)',
      border: '1.5px solid rgba(0, 212, 255, 0.3)',
      borderRadius: '20px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    }}
    onClick={() => changeLanguage(lang === 'it' ? 'en' : 'it')}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
      e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.5)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
      e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)'
    }}
    >
      <Globe size={16} style={{ color: 'var(--neon-blue)' }} />
      <span style={{
        fontSize: '13px',
        fontWeight: 600,
        color: 'var(--neon-blue)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {lang === 'it' ? 'IT' : 'EN'}
      </span>
    </div>
  )
}

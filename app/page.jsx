'use client'

import React from 'react'
import Link from 'next/link'

export default function Home() {
  // Redirect alla dashboard principale
  if (typeof window !== 'undefined') {
    window.location.href = '/dashboard'
    return null
  }
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div className="neon-text" style={{ fontSize: '24px', marginBottom: '20px' }}>Caricamento Dashboard...</div>
      <Link href="/dashboard" className="btn primary" style={{ textDecoration: 'none' }}>
        Vai alla Dashboard
      </Link>
    </div>
  )
}

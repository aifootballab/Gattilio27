'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Coins, RefreshCw, AlertCircle } from 'lucide-react'

export default function HeroPointsBalance() {
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [eurosEquivalent, setEurosEquivalent] = useState(0)

  const fetchBalance = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: session, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.session) {
        setBalance(null)
        setLoading(false)
        return
      }

      const token = session.session.access_token
      const response = await fetch('/api/hero-points/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Unable to fetch balance')
      }

      const data = await response.json()
      setBalance(data.hero_points_balance || 0)
      setEurosEquivalent(data.euros_equivalent || 0)
    } catch (err) {
      console.error('[HeroPointsBalance] Error fetching balance:', err)
      setError('Unable to load balance')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()

    // Refresh ogni 30 secondi
    const interval = setInterval(fetchBalance, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && balance === null) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: 'rgba(0, 212, 255, 0.1)',
        border: '1.5px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '20px',
        minWidth: '100px',
        justifyContent: 'center'
      }}>
        <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite', color: 'var(--neon-blue)' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1.5px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '20px',
        cursor: 'pointer'
      }}
      onClick={fetchBalance}
      title="Click to retry">
        <AlertCircle size={16} color="var(--red-light)" />
        <span style={{ fontSize: '14px', color: 'var(--red-light)' }}>Error</span>
      </div>
    )
  }

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%)',
      border: '1.5px solid rgba(0, 212, 255, 0.4)',
      borderRadius: '20px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 2px 8px rgba(0, 212, 255, 0.2)'
    }}
    onClick={fetchBalance}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(147, 51, 234, 0.25) 100%)'
      e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.6)'
      e.currentTarget.style.transform = 'scale(1.05)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%)'
      e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.4)'
      e.currentTarget.style.transform = 'scale(1)'
    }}
    title="Click to refresh balance">
      <Coins size={18} color="var(--neon-blue)" style={{ flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
        <span style={{
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--neon-blue)',
          lineHeight: '1',
          textShadow: '0 2px 4px rgba(0, 212, 255, 0.3)'
        }}>
          {balance?.toLocaleString('it-IT') || 0} HP
        </span>
        {eurosEquivalent > 0 && (
          <span style={{
            fontSize: '11px',
            color: 'var(--light-gray)',
            opacity: 0.8,
            lineHeight: '1'
          }}>
            ~{eurosEquivalent.toFixed(2)}€
          </span>
        )}
      </div>
    </div>
  )
}

'use client'

import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import { Coins, RefreshCw, AlertCircle, ShoppingCart, X } from 'lucide-react'

export default function HeroPointsBalance() {
  const { t } = useTranslation()
  const [balance, setBalance] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [eurosEquivalent, setEurosEquivalent] = useState(0)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [purchaseAmount, setPurchaseAmount] = useState(10)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState(null)
  const [purchaseSuccess, setPurchaseSuccess] = useState(null)
  
  // Cache: timestamp ultimo fetch
  const lastFetchRef = useRef(null)
  const CACHE_DURATION = 5 * 60 * 1000 // 5 minuti in millisecondi

  const fetchBalance = async (force = false) => {
    // Cache: controlla se abbiamo dati recenti (meno di 5 minuti fa)
    // IMPORTANTE: Se force=true, ignora sempre la cache
    const now = Date.now()
    if (!force && lastFetchRef.current && (now - lastFetchRef.current) < CACHE_DURATION && balance !== null) {
      // Usa dati in cache, non fare chiamata
      console.log('[HeroPointsBalance] Using cached balance:', balance, 'cache age:', Math.round((now - lastFetchRef.current) / 1000), 'seconds')
      return
    }
    
    // DEBUG: Log se stiamo forzando il refresh
    if (force) {
      console.log('[HeroPointsBalance] Force refresh: ignoring cache')
    } else if (!lastFetchRef.current) {
      console.log('[HeroPointsBalance] First load: fetching balance')
    } else {
      console.log('[HeroPointsBalance] Cache expired: fetching balance')
    }

    try {
      setLoading(true)
      setError(null)

      // Attendi che sessione sia pronta (max 3 tentativi)
      let session = null
      let sessionError = null
      let attempts = 0
      const maxAttempts = 3

      while (attempts < maxAttempts && !session) {
        const result = await supabase.auth.getSession()
        sessionError = result.error
        session = result.data?.session

        if (session || sessionError) {
          break
        }

        // Attendi 100ms prima di riprovare
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      if (sessionError || !session) {
        // Non resettare balance se c'è errore sessione (potrebbe essere temporaneo)
        // Mantieni valore precedente se disponibile
        if (balance === null) {
          setBalance(0)
        }
        setLoading(false)
        return
      }

      const token = session.access_token
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
      
      // DEBUG: Log risposta API
      console.log('[HeroPointsBalance] API Response:', data)
      console.log('[HeroPointsBalance] Balance from API:', data.hero_points_balance)
      console.log('[HeroPointsBalance] Previous balance (before update):', balance)
      
      // Verifica che hero_points_balance sia un numero valido
      const balanceValue = typeof data.hero_points_balance === 'number' ? data.hero_points_balance : (parseInt(data.hero_points_balance) || 0)
      
      // CRITICAL: Sempre aggiorna il balance con il valore dall'API, anche se diverso dalla cache
      if (balanceValue !== balance) {
        console.log(`[HeroPointsBalance] Balance changed: ${balance} -> ${balanceValue}`)
      }
      
      setBalance(balanceValue)
      setEurosEquivalent(data.euros_equivalent || (balanceValue / 100))
      lastFetchRef.current = now // Aggiorna timestamp cache
      
      console.log('[HeroPointsBalance] Set balance to:', balanceValue, '(previous was:', balance, ')')
    } catch (err) {
      console.error('[HeroPointsBalance] Error fetching balance:', err)
      setError(t('errorLoadingBalance'))
      // Non resettare balance su errore, mantieni valore precedente se disponibile
      if (balance === null) {
        setBalance(0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()

    // Refresh ogni 5 minuti (cache duration)
    const interval = setInterval(() => fetchBalance(true), CACHE_DURATION)
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

  const handlePurchase = async () => {
    setPurchasing(true)
    setPurchaseError(null)
    setPurchaseSuccess(null)

    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.session) {
        setPurchaseError(t('sessionExpired'))
        setPurchasing(false)
        return
      }

      const token = session.session.access_token
      const response = await fetch('/api/hero-points/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount_euros: purchaseAmount })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('purchaseError'))
      }

      setPurchaseSuccess(t('purchaseSuccess').replace('{amount}', data.hero_points_added.toLocaleString('it-IT')))
      
      // Aggiorna balance direttamente con i dati della risposta (più veloce e sicuro)
      if (data.hero_points_balance !== undefined) {
        setBalance(data.hero_points_balance)
        setEurosEquivalent(data.euros_equivalent || (data.hero_points_balance / 100))
        // Aggiorna timestamp cache per evitare refresh immediato
        lastFetchRef.current = Date.now()
      } else {
        // Fallback: forza refresh se dati non presenti
        await fetchBalance(true)
      }
      
      // Chiudi modal dopo 2 secondi
      setTimeout(() => {
        setShowPurchaseModal(false)
        setPurchaseSuccess(null)
      }, 2000)
    } catch (err) {
      console.error('[HeroPointsBalance] Error purchasing:', err)
      setPurchaseError(err.message || t('purchaseError'))
    } finally {
      setPurchasing(false)
    }
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
      onClick={() => fetchBalance(true)}
      title={t('clickToRefresh')}>
        <AlertCircle size={16} color="var(--red-light)" />
        <span style={{ fontSize: '14px', color: 'var(--red-light)' }}>{t('errorLoadingBalance')}</span>
      </div>
    )
  }

  const isLowBalance = balance !== null && balance < 50

  return (
    <>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        background: isLowBalance 
          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(251, 191, 36, 0.2) 100%)'
          : 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%)',
        border: isLowBalance
          ? '1.5px solid rgba(239, 68, 68, 0.5)'
          : '1.5px solid rgba(0, 212, 255, 0.4)',
        borderRadius: '20px',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: isLowBalance
          ? '0 2px 8px rgba(239, 68, 68, 0.3)'
          : '0 2px 8px rgba(0, 212, 255, 0.2)',
        position: 'relative'
      }}
      onClick={() => fetchBalance(true)}
      onMouseEnter={(e) => {
        if (!isLowBalance) {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.25) 0%, rgba(147, 51, 234, 0.25) 100%)'
          e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.6)'
        }
        e.currentTarget.style.transform = 'scale(1.05)'
      }}
      onMouseLeave={(e) => {
        if (!isLowBalance) {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(147, 51, 234, 0.15) 100%)'
          e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.4)'
        }
        e.currentTarget.style.transform = 'scale(1)'
      }}
      title={t('clickToRefresh')}>
        {isLowBalance && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            right: '-8px',
            background: 'var(--red-light)',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.5)',
            animation: 'pulse 2s infinite'
          }}>
            <AlertCircle size={12} color="white" />
          </div>
        )}
        <Coins size={18} color={isLowBalance ? "var(--red-light)" : "var(--neon-blue)"} style={{ flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{
            fontSize: '16px',
            fontWeight: 700,
            color: isLowBalance ? 'var(--red-light)' : 'var(--neon-blue)',
            lineHeight: '1',
            textShadow: isLowBalance 
              ? '0 2px 4px rgba(239, 68, 68, 0.3)'
              : '0 2px 4px rgba(0, 212, 255, 0.3)'
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

      {/* Bottone Compra Crediti */}
      <button
        onClick={() => setShowPurchaseModal(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 14px',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)',
          border: '1.5px solid rgba(34, 197, 94, 0.4)',
          borderRadius: '20px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          color: 'var(--neon-green)',
          fontSize: '14px',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(16, 185, 129, 0.3) 100%)'
          e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.6)'
          e.currentTarget.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)'
          e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)'
          e.currentTarget.style.transform = 'scale(1)'
        }}
        title={t('purchaseCredits')}>
        <ShoppingCart size={16} />
        <span>{t('buyCredits')}</span>
      </button>

      {/* Modal Acquisto */}
      {showPurchaseModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowPurchaseModal(false)
            setPurchaseError(null)
            setPurchaseSuccess(null)
          }
        }}>
          <div style={{
            background: 'var(--dark-blue-light)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '100%',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}
          onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--white)', margin: 0 }}>
                {t('purchaseCredits')}
              </h2>
              <button
                onClick={() => {
                  setShowPurchaseModal(false)
                  setPurchaseError(null)
                  setPurchaseSuccess(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--light-gray)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                <X size={20} />
              </button>
            </div>

            {purchaseSuccess ? (
              <div style={{
                padding: '16px',
                background: 'rgba(34, 197, 94, 0.2)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                borderRadius: '8px',
                color: 'var(--neon-green)',
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                {purchaseSuccess}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', color: 'var(--light-gray)', marginBottom: '8px', fontSize: '14px' }}>
                    {t('purchaseAmount')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="0.01"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(parseFloat(e.target.value) || 0)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 212, 255, 0.3)',
                      background: 'var(--dark-blue-dark)',
                      color: 'var(--white)',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--light-gray)', opacity: 0.8 }}>
                    {t('youWillReceive')}: <strong style={{ color: 'var(--neon-blue)' }}>{Math.round(purchaseAmount * 100).toLocaleString('it-IT')} {t('heroPoints')}</strong> ({purchaseAmount.toFixed(2)}€)
                  </div>
                </div>

                {purchaseError && (
                  <div style={{
                    padding: '12px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '8px',
                    color: 'var(--red-light)',
                    marginBottom: '16px',
                    fontSize: '14px'
                  }}>
                    {purchaseError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handlePurchase}
                    disabled={purchasing || purchaseAmount <= 0}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: purchasing 
                        ? 'rgba(34, 197, 94, 0.3)'
                        : 'linear-gradient(135deg, rgba(34, 197, 94, 0.8) 0%, rgba(16, 185, 129, 0.8) 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: purchasing || purchaseAmount <= 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: purchasing || purchaseAmount <= 0 ? 0.6 : 1
                    }}>
                    {purchasing ? (
                      <>
                        <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        {t('processing')}
                      </>
                    ) : (
                      <>
                        <ShoppingCart size={16} />
                        {t('purchase')}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowPurchaseModal(false)
                      setPurchaseError(null)
                      setPurchaseSuccess(null)
                    }}
                    style={{
                      padding: '12px 20px',
                      background: 'rgba(100, 100, 100, 0.2)',
                      border: '1px solid rgba(100, 100, 100, 0.4)',
                      borderRadius: '8px',
                      color: 'var(--light-gray)',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}>
                    {t('cancel')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </>
  )
}

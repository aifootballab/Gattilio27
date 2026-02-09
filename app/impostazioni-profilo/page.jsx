'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import { ArrowLeft, Save, SkipForward, RefreshCw, User, Gamepad2, Brain, CheckCircle2, AlertCircle, BarChart3, X, Wallet } from 'lucide-react'
import Link from 'next/link'

export default function ImpostazioniProfiloPage() {
  const { t } = useTranslation()
  const router = useRouter()
  
  // Stato profilo
  const [profile, setProfile] = React.useState({
    first_name: '',
    last_name: '',
    current_division: '',
    favorite_team: '',
    team_name: '',
    ai_name: '',
    how_to_remember: '',
    hours_per_week: null,
    common_problems: []
  })
  
  const [profileData, setProfileData] = React.useState(null) // Dati completi dal server
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(null)
  const [toast, setToast] = React.useState(null) // { message, type: 'success' | 'error' }
  
  // Divisioni disponibili
  const divisions = ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'Division 5', 'Division 6', 'Division 7', 'Division 8', 'Division 9', 'Division 10']

  // Carica profilo esistente
  React.useEffect(() => {
    if (!supabase) {
      router.push('/login')
      return
    }

    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data: session, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session?.session) {
          router.push('/login')
          return
        }

        // Carica profilo da Supabase (query diretta con RLS)
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .maybeSingle()

        if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found (ok)
          throw new Error(profileError.message || t('errorProfileLoad'))
        }

        if (profileData) {
          setProfileData(profileData)
          setProfile({
            first_name: profileData.first_name || '',
            last_name: profileData.last_name || '',
            current_division: profileData.current_division || '',
            favorite_team: profileData.favorite_team || '',
            team_name: profileData.team_name || '',
            ai_name: profileData.ai_name || '',
            how_to_remember: profileData.how_to_remember || '',
            hours_per_week: profileData.hours_per_week || null,
            common_problems: profileData.common_problems || []
          })
        }
      } catch (err) {
        console.error('[Impostazioni Profilo] Error loading profile:', err)
        // Non mostrare errore se profilo non esiste (prima volta)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  // Salva profilo (incrementale)
  const handleSave = async (sectionName) => {
    if (!supabase) return

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session) {
        router.push('/login')
        return
      }

      const token = session.session.access_token

      const response = await fetch('/api/supabase/save-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('errorProfileSave'))
      }

      const data = await response.json()
      if (data.profile) {
        setProfileData(prev => prev ? {
          ...prev,
          profile_completion_score: data.profile.profile_completion_score,
          profile_completion_level: data.profile.profile_completion_level
        } : {
          profile_completion_score: data.profile.profile_completion_score,
          profile_completion_level: data.profile.profile_completion_level
        })
      }
      const successMsg = data.profile
        ? `${sectionName} ${t('profileSectionSaved')}`
        : t('profileSectionSaved')
      setSuccess(successMsg)
      setToast({ message: successMsg, type: 'success' })
      setTimeout(() => setSuccess(null), 3000)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('knowledge-should-refresh'))
        setTimeout(() => window.dispatchEvent(new CustomEvent('leaderboard-updated')), 1500)
      }
    } catch (err) {
      console.error('[Impostazioni Profilo] Error saving profile:', err)
      const errMsg = err.message || t('errorProfileSave')
      setError(errMsg)
      setToast({ message: errMsg, type: 'error' })
      setTimeout(() => setError(null), 5000)
    } finally {
      setSaving(false)
    }
  }

  React.useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(t)
    }
  }, [toast])

  // Skip sezione
  const handleSkip = (sectionName) => {
    setSuccess(`${t('skipped')} ${sectionName}`)
    setTimeout(() => setSuccess(null), 2000)
  }

  // Calcola percentuale completamento (se disponibile)
  const completionScore = profileData?.profile_completion_score ?? 0
  const completionLevel = profileData?.profile_completion_level || 'beginner'
  
  const getLevelText = (level) => {
    switch(level) {
      case 'complete': return t('profileLevelComplete') || 'Completo'
      case 'intermediate': return t('profileLevelIntermediate') || 'Intermedio'
      default: return t('profileLevelBeginner') || 'Principiante'
    }
  }

  if (loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--neon-blue)' }} />
        <div>{t('loadingProfile')}</div>
      </main>
    )
  }

  return (
    <main data-tour-id="tour-profile-intro" style={{ 
      padding: '16px', 
      minHeight: '100vh', 
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '24px',
        position: 'sticky',
        top: 0,
        backgroundColor: '#0a0a0a',
        padding: '16px 0',
        zIndex: 10
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>{t('profileSettings')}</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/gestione-profilo"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: 'rgba(255,165,0,0.15)',
              border: '1px solid rgba(255,165,0,0.4)',
              borderRadius: '8px',
              color: '#ffa500',
              fontSize: '13px',
              fontWeight: '500',
              textDecoration: 'none'
            }}
          >
            <Wallet size={16} />
            {t('goToHeroPoints')}
          </Link>
          <LanguageSwitch />
        </div>
      </div>

      {/* Toast: feedback vicino all'azione (visibile anche se la sezione è in basso) */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 10000,
          padding: '16px 20px',
          background: toast.type === 'success'
            ? 'rgba(34, 197, 94, 0.95)'
            : 'rgba(239, 68, 68, 0.95)',
          border: `2px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`,
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '280px',
          maxWidth: '420px',
          animation: 'slideInRight 0.3s ease-out',
          backdropFilter: 'blur(8px)'
        }}>
          {toast.type === 'success' ? (
            <CheckCircle2 size={20} color="#ffffff" />
          ) : (
            <AlertCircle size={20} color="#ffffff" />
          )}
          <span style={{ color: '#ffffff', fontSize: '14px', fontWeight: 600, flex: 1 }}>
            {typeof toast.message === 'string' ? toast.message : (toast.message?.message ?? String(toast.message ?? ''))}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
            aria-label={t('close')}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Barra Profilazione */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <BarChart3 size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{t('profiling')}</h2>
        </div>
        
        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '24px',
          backgroundColor: '#2a2a2a',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '8px',
          position: 'relative'
        }}>
          <div style={{
            width: `${completionScore}%`,
            height: '100%',
            backgroundColor: completionScore >= 87.5 ? '#00ff88' : completionScore >= 50 ? '#00d4ff' : '#ffaa00',
            transition: 'width 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: '8px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#000'
          }}>
            {completionScore > 10 && `${Math.round(completionScore)}%`}
          </div>
        </div>
        
        <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>
          {getLevelText(completionLevel)} - {t('completeFor100')}
        </div>
        
        <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
          {t('moreYouAnswer')}
        </div>
      </div>

      {/* Messaggi Success/Error */}
      {success && (
        <div style={{
          backgroundColor: '#00ff8820',
          border: '1px solid #00ff88',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#00ff88'
        }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div style={{
          backgroundColor: '#ff444420',
          border: '1px solid #ff4444',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#ff4444'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Sezione: Dati Personali */}
      <div data-tour-id="tour-profile-personal" style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <User size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{t('personalData')}</h2>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            {t('firstName')}
          </label>
          <input
            type="text"
            value={profile.first_name}
            onChange={(e) => setProfile(prev => ({ ...prev, first_name: e.target.value }))}
            placeholder="Il tuo nome"
            maxLength={255}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            {t('lastName')}
          </label>
          <input
            type="text"
            value={profile.last_name}
            onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
            placeholder={t('yourLastName')}
            maxLength={255}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleSave(t('personalData'))}
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: saving ? '#2a2a2a' : '#00d4ff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Save size={18} />
            {saving ? t('saving') : t('save')}
          </button>
          <button
            onClick={() => handleSkip(t('personalData'))}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              color: '#888',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <SkipForward size={18} />
            {t('skip')}
          </button>
        </div>
      </div>

      {/* Sezione: Dati Gioco */}
      <div data-tour-id="tour-profile-game" style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Gamepad2 size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{t('gameData')}</h2>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            Divisione attuale
          </label>
          <select
            value={profile.current_division}
            onChange={(e) => setProfile(prev => ({ ...prev, current_division: e.target.value }))}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px'
            }}
          >
            <option value="">{t('selectDivision')}</option>
            {divisions.map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            {t('favoriteTeam')}
          </label>
          <input
            type="text"
            value={profile.favorite_team}
            onChange={(e) => setProfile(prev => ({ ...prev, favorite_team: e.target.value }))}
            placeholder={t('favoriteTeamPlaceholder')}
            maxLength={255}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <label style={{ fontSize: '14px', color: '#888', flex: 1 }}>
              {t('teamNameInGame')}
            </label>
            <span style={{
              fontSize: '11px',
              padding: '4px 8px',
              background: 'rgba(0, 212, 255, 0.2)',
              border: '1px solid rgba(0, 212, 255, 0.4)',
              borderRadius: '4px',
              color: 'var(--neon-blue)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {t('important')}
            </span>
          </div>
          <input
            type="text"
            value={profile.team_name}
            onChange={(e) => setProfile(prev => ({ ...prev, team_name: e.target.value }))}
            placeholder="Es: Naturalborngamers.it, AC Milan..."
            maxLength={255}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: profile.team_name ? '1px solid rgba(0, 212, 255, 0.3)' : '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
          <div style={{
            fontSize: '12px',
            color: '#666',
            marginTop: '6px',
            fontStyle: 'italic',
            lineHeight: '1.4'
          }}>
            {t('teamNameDescription')}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleSave(t('gameData'))}
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: saving ? '#2a2a2a' : '#00d4ff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Save size={18} />
            {saving ? t('saving') : t('save')}
          </button>
          <button
            onClick={() => handleSkip(t('gameData'))}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              color: '#888',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <SkipForward size={18} />
            {t('skip')}
          </button>
        </div>
      </div>

      {/* Sezione: Preferenze IA */}
      <div data-tour-id="tour-profile-ai" style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Brain size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>{t('aiPreferences')}</h2>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            {t('aiName')}
          </label>
          <input
            type="text"
            value={profile.ai_name}
            onChange={(e) => setProfile(prev => ({ ...prev, ai_name: e.target.value }))}
            placeholder={t('aiNamePlaceholder')}
            maxLength={255}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px'
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            {t('howToRemember')}
          </label>
          <textarea
            value={profile.how_to_remember}
            onChange={(e) => setProfile(prev => ({ ...prev, how_to_remember: e.target.value }))}
            placeholder={t('howToRememberPlaceholder')}
            maxLength={1000}
            rows={4}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#0a0a0a',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '16px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleSave(t('aiPreferences'))}
            disabled={saving}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: saving ? '#2a2a2a' : '#00d4ff',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Save size={18} />
            {saving ? t('saving') : t('save')}
          </button>
          <button
            onClick={() => handleSkip(t('aiPreferences'))}
            style={{
              padding: '12px 20px',
              backgroundColor: 'transparent',
              color: '#888',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <SkipForward size={18} />
            {t('skip')}
          </button>
        </div>
      </div>

      <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>
        {t('aiInfoHintInProfile')}
      </p>

      {/* Bottone Completa Profilo */}
      <button
        data-tour-id="tour-profile-complete"
        onClick={() => {
          handleSave(t('completeProfile'))
          setTimeout(() => router.push('/'), 2000)
        }}
        disabled={saving}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: saving ? '#2a2a2a' : '#00ff88',
          color: '#000',
          border: 'none',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: '600',
          cursor: saving ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '32px'
        }}
      >
        <CheckCircle2 size={20} />
        {saving ? t('saving') : t('completeProfile')}
      </button>
    </main>
  )
}


'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import HeroPointsBalance from '@/components/HeroPointsBalance'
import { ArrowLeft, Save, SkipForward, RefreshCw, User, Gamepad2, Brain, Clock, CheckCircle2, AlertCircle, BarChart3 } from 'lucide-react'

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
  
  // Divisioni disponibili
  const divisions = ['Division 1', 'Division 2', 'Division 3', 'Division 4', 'Division 5', 'Division 6', 'Division 7', 'Division 8', 'Division 9', 'Division 10']
  
  // Problemi comuni disponibili
  const availableProblems = [
    'Passaggi',
    'Difesa',
    'Centrocampo',
    'Attacco',
    'Formazione',
    'Istruzioni tattiche'
  ]

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
          throw new Error(profileError.message || 'Errore caricamento profilo')
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
        throw new Error(errorData.error || 'Unable to save profile')
      }

      const data = await response.json()
      if (data.profile) {
        // Aggiorna profileData per aggiornare barra profilazione
        setProfileData({
          profile_completion_score: data.profile.profile_completion_score,
          profile_completion_level: data.profile.profile_completion_level
        })
        setSuccess(`${sectionName} salvato con successo!`)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      console.error('[Impostazioni Profilo] Error saving profile:', err)
      setError(err.message || 'Unable to save profile')
      setTimeout(() => setError(null), 5000)
    } finally {
      setSaving(false)
    }
  }

  // Skip sezione
  const handleSkip = (sectionName) => {
    setSuccess(`Skipped ${sectionName}`)
    setTimeout(() => setSuccess(null), 2000)
  }

  // Toggle problema comune
  const toggleProblem = (problem) => {
    setProfile(prev => ({
      ...prev,
      common_problems: prev.common_problems.includes(problem)
        ? prev.common_problems.filter(p => p !== problem)
        : [...prev.common_problems, problem]
    }))
  }

  // Calcola percentuale completamento (se disponibile)
  const completionScore = profileData?.profile_completion_score ?? 0
  const completionLevel = profileData?.profile_completion_level || 'beginner'
  
  const getLevelText = (level) => {
    switch(level) {
      case 'complete': return 'Completo'
      case 'intermediate': return 'Intermedio'
      default: return 'Principiante'
    }
  }

  if (loading) {
    return (
      <main style={{ padding: '32px 24px', minHeight: '100vh', textAlign: 'center' }}>
        <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: '16px', color: 'var(--neon-blue)' }} />
        <div>Caricamento profilo...</div>
      </main>
    )
  }

  return (
    <main style={{ 
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
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Impostazioni Profilo</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <HeroPointsBalance />
          <LanguageSwitch />
        </div>
      </div>

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
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Profilazione</h2>
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
          {getLevelText(completionLevel)} - Completa per 100%
        </div>
        
        <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
          💡 Più rispondi, più l'IA ti conosce e ti aiuta meglio!
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
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <User size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Dati Personali</h2>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            Nome
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
            Cognome
          </label>
          <input
            type="text"
            value={profile.last_name}
            onChange={(e) => setProfile(prev => ({ ...prev, last_name: e.target.value }))}
            placeholder="Il tuo cognome"
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
            onClick={() => handleSave('Dati Personali')}
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
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
          <button
            onClick={() => handleSkip('Dati Personali')}
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
            Salta
          </button>
        </div>
      </div>

      {/* Sezione: Dati Gioco */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Gamepad2 size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Dati Gioco</h2>
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
            <option value="">Seleziona divisione</option>
            {divisions.map(div => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            Squadra del cuore
          </label>
          <input
            type="text"
            value={profile.favorite_team}
            onChange={(e) => setProfile(prev => ({ ...prev, favorite_team: e.target.value }))}
            placeholder="Es: Juventus, Real Madrid..."
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
            Nome squadra nel gioco
          </label>
          <input
            type="text"
            value={profile.team_name}
            onChange={(e) => setProfile(prev => ({ ...prev, team_name: e.target.value }))}
            placeholder="Nome della tua squadra"
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
            onClick={() => handleSave('Dati Gioco')}
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
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
          <button
            onClick={() => handleSkip('Dati Gioco')}
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
            Salta
          </button>
        </div>
      </div>

      {/* Sezione: Preferenze IA */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Brain size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Preferenze IA</h2>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            Nome IA (opzionale)
          </label>
          <input
            type="text"
            value={profile.ai_name}
            onChange={(e) => setProfile(prev => ({ ...prev, ai_name: e.target.value }))}
            placeholder='Es: "Coach Mario", "Alex"'
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
            Come vuoi che ti ricordi?
          </label>
          <textarea
            value={profile.how_to_remember}
            onChange={(e) => setProfile(prev => ({ ...prev, how_to_remember: e.target.value }))}
            placeholder='Es: "Sono un giocatore competitivo...", "Gioco per divertimento..."'
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
            onClick={() => handleSave('Preferenze IA')}
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
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
          <button
            onClick={() => handleSkip('Preferenze IA')}
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
            Salta
          </button>
        </div>
      </div>

      {/* Sezione: Esperienza Gioco */}
      <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: '1px solid #2a2a2a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Clock size={20} color="#00d4ff" />
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>Esperienza Gioco</h2>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#888' }}>
            Quante ore giochi a settimana?
          </label>
          <input
            type="number"
            value={profile.hours_per_week || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, hours_per_week: e.target.value ? parseInt(e.target.value) : null }))}
            placeholder="0-168 ore"
            min="0"
            max="168"
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
            Quali problemi riscontri?
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {availableProblems.map(problem => (
              <label
                key={problem}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #2a2a2a',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={profile.common_problems.includes(problem)}
                  onChange={() => toggleProblem(problem)}
                  style={{
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '16px' }}>{problem}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleSave('Esperienza Gioco')}
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
            {saving ? 'Salvataggio...' : 'Salva'}
          </button>
          <button
            onClick={() => handleSkip('Esperienza Gioco')}
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
            Salta
          </button>
        </div>
      </div>

      {/* Bottone Completa Profilo */}
      <button
        onClick={() => {
          handleSave('Profilo Completo')
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
        {saving ? 'Salvataggio...' : 'Completa Profilo'}
      </button>
    </main>
  )
}

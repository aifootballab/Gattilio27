'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArrowLeft, BookOpen } from 'lucide-react'
import RoadmapVisualizer from '@/components/RoadmapVisualizer'
import Header from '@/components/Header'
import { useLanguage } from '@/contexts/LanguageContext'

export default function RoadmapPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const { language: lang } = useLanguage()
  
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalPlayers: 0, titolari: 0, riserve: 0 })
  const [recentMatches, setRecentMatches] = useState([])
  const [userProfile, setUserProfile] = useState(null)
  const [gameAnalysisLastCapture, setGameAnalysisLastCapture] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Carica statistiche rosa
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)

      const titolari = players?.filter(p => p.is_starter && !p.is_in_jury).length || 0
      const riserve = players?.filter(p => !p.is_starter && !p.is_in_jury).length || 0

      setStats({
        totalPlayers: players?.length || 0,
        titolari,
        riserve
      })

      // Carica partite recenti
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('played_at', { ascending: false })
        .limit(10)

      setRecentMatches(matches || [])

      // Carica profilo utente
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setUserProfile(profile)

      // Carica ultima analisi
      const { data: analysis } = await supabase
        .from('game_analysis_captures')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      setGameAnalysisLastCapture(analysis)

    } catch (err) {
      console.error('Error loading roadmap data:', err)
    } finally {
      setLoading(false)
    }
  }

  const t = (key, fallback = '') => {
    const translations = {
      it: {
        roadmapPageTitle: 'La tua Roadmap',
        roadmapPageSubtitle: 'Ogni dato conta. Scopri perché.',
        backToDashboard: 'Torna alla Dashboard',
        whyDataMatters: 'Perché i dati sono importanti?',
        dataPhilosophy: 'Gattilio non è un oracolo che indovina. È un coach che impara chi sei. Più dati dai, più i consigli diventano TUOI.',
        stepByStep: 'Passo dopo passo',
        stepByStepDesc: 'Non devi fare tutto subito. Ogni passo sblocca il prossimo livello di consigli. Nessuna fretta, ma ogni dato aiuta.',
        loading: 'Caricamento...'
      },
      en: {
        roadmapPageTitle: 'Your Roadmap',
        roadmapPageSubtitle: 'Every piece of data counts. Discover why.',
        backToDashboard: 'Back to Dashboard',
        whyDataMatters: 'Why does data matter?',
        dataPhilosophy: 'Gattilio is not an oracle that guesses. It is a coach that learns who you are. The more data you give, the more the advice becomes YOURS.',
        stepByStep: 'Step by step',
        stepByStepDesc: 'You don\'t have to do everything at once. Each step unlocks the next level of advice. No rush, but every piece of data helps.',
        loading: 'Loading...'
      }
    }
    return translations[lang]?.[key] || fallback || key
  }

  if (loading) {
    return (
      <>
        <Header />
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p>{t('loading')}</p>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div style={styles.page}>
        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <button 
              onClick={() => router.push('/')}
              style={styles.backButton}
            >
              <ArrowLeft size={20} />
              {t('backToDashboard')}
            </button>
            <div style={styles.titleSection}>
              <h1 style={styles.pageTitle}>{t('roadmapPageTitle')}</h1>
              <p style={styles.pageSubtitle}>{t('roadmapPageSubtitle')}</p>
            </div>
          </div>

          {/* Educational Section */}
          <div style={styles.educationSection}>
            <div style={styles.eduCard}>
              <BookOpen size={32} color="#00d4ff" />
              <div style={styles.eduContent}>
                <h3>{t('whyDataMatters')}</h3>
                <p>{t('dataPhilosophy')}</p>
              </div>
            </div>
            <div style={styles.eduCard}>
              <div style={styles.stepIcon}>👣</div>
              <div style={styles.eduContent}>
                <h3>{t('stepByStep')}</h3>
                <p>{t('stepByStepDesc')}</p>
              </div>
            </div>
          </div>

          {/* Roadmap Visualizer */}
          <RoadmapVisualizer
            stats={stats}
            recentMatches={recentMatches}
            userProfile={userProfile}
            gameAnalysisLastCapture={gameAnalysisLastCapture}
            lang={lang}
            t={t}
          />
        </div>
      </div>
    </>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    paddingTop: '80px',
    paddingBottom: '60px'
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '0 20px'
  },
  loadingContainer: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    color: '#888'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid rgba(0, 212, 255, 0.2)',
    borderTop: '3px solid #00d4ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    marginBottom: '32px'
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#888',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    marginBottom: '24px',
    transition: 'all 0.2s ease'
  },
  titleSection: {
    textAlign: 'center'
  },
  pageTitle: {
    margin: '0 0 8px 0',
    fontSize: '36px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #00d4ff 0%, #0099cc 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  pageSubtitle: {
    margin: 0,
    fontSize: '18px',
    color: '#888'
  },
  educationSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  eduCard: {
    backgroundColor: '#1a1a1a',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start'
  },
  stepIcon: {
    fontSize: '32px',
    lineHeight: 1
  },
  eduContent: {
    flex: 1,
    '& h3': {
      margin: '0 0 8px 0',
      fontSize: '18px',
      fontWeight: 600,
      color: '#fff'
    },
    '& p': {
      margin: 0,
      fontSize: '14px',
      color: '#888',
      lineHeight: 1.6
    }
  }
}

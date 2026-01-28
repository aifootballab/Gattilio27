'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import {
  BookOpen,
  Brain,
  User,
  LayoutDashboard,
  Users,
  FileImage,
  Calendar,
  Trophy,
  Settings,
  ArrowRight,
  CheckCircle2,
  Circle,
  Sparkles,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Compass,
  Shield,
  UserRound
} from 'lucide-react'

export default function GuidaPage() {
  const { t, lang } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [expandedSections, setExpandedSections] = useState({})

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: session } = await supabase.auth.getSession()
        if (!session?.session) {
          router.push('/login')
          return
        }

        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.session.user.id)
          .maybeSingle()

        setProfile(profileData)
      } catch (error) {
        console.error('[Guida] Error loading profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  // Calcola completamento profilo
  const calculateProfileCompletion = () => {
    if (!profile) return 0
    
    let completed = 0
    const total = 8
    
    if (profile.first_name) completed++
    if (profile.last_name) completed++
    if (profile.team_name) completed++
    if (profile.current_division) completed++
    if (profile.favorite_team) completed++
    if (profile.ai_name) completed++
    if (profile.how_to_remember) completed++
    if (profile.common_problems && profile.common_problems.length > 0) completed++
    
    return Math.round((completed / total) * 100)
  }

  const profileCompletion = calculateProfileCompletion()

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  // Guide per ogni pagina
  const pageGuides = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      color: 'var(--neon-blue)',
      path: '/',
      title: t('guideDashboardTitle') || 'Dashboard',
      description: t('guideDashboardDesc') || 'Panoramica completa della tua squadra',
      steps: [
        t('guideDashboardStep1') || 'Visualizza statistiche squadra (titolari, riserve, totale)',
        t('guideDashboardStep2') || 'Consulta i top 3 giocatori per rating',
        t('guideDashboardStep3') || 'Accedi alle ultime partite con un click',
        t('guideDashboardStep4') || 'Naviga rapidamente alle altre sezioni'
      ]
    },
    {
      id: 'gestione-formazione',
      icon: Users,
      color: 'var(--neon-purple)',
      path: '/gestione-formazione',
      title: t('guideFormationTitle') || 'Gestione Formazione',
      description: t('guideFormationDesc') || 'Campo 2D interattivo per gestire la tua rosa',
      steps: [
        t('guideFormationStep1') || 'Scegli tra 14 formazioni ufficiali eFootball',
        t('guideFormationStep2') || 'Clicca sugli slot per assegnare giocatori',
        t('guideFormationStep3') || 'Carica giocatori con screenshot (fino a 3 immagini)',
        t('guideFormationStep4') || 'Gestisci riserve nella sezione dedicata',
        t('guideFormationStep5') || 'Visualizza dettagli giocatori cliccando sulle card'
      ]
    },
    {
      id: 'aggiungi-partita',
      icon: Calendar,
      color: 'var(--neon-orange)',
      path: '/match/new',
      title: t('guideAddMatchTitle') || 'Aggiungi Partita',
      description: t('guideAddMatchDesc') || 'Wizard 5 step per caricare dati partita',
      steps: [
        t('guideAddMatchStep1') || 'Step 1: Carica screenshot pagelle giocatori',
        t('guideAddMatchStep2') || 'Step 2: Carica screenshot statistiche squadra',
        t('guideAddMatchStep3') || 'Step 3: Carica screenshot aree di attacco',
        t('guideAddMatchStep4') || 'Step 4: Carica screenshot recuperi palla',
        t('guideAddMatchStep5') || 'Step 5: Carica screenshot formazione avversaria',
        t('guideAddMatchStep6') || 'Salva partita quando tutti gli step sono completati'
      ]
    },
    {
      id: 'dettaglio-partita',
      icon: Trophy,
      color: 'var(--neon-pink)',
      path: '/match',
      title: t('guideMatchDetailTitle') || 'Dettaglio Partita',
      description: t('guideMatchDetailDesc') || 'Analisi completa della partita',
      steps: [
        t('guideMatchDetailStep1') || 'Visualizza tutti i dati della partita',
        t('guideMatchDetailStep2') || 'Genera riassunto AI bilingue (IT/EN)',
        t('guideMatchDetailStep3') || 'Analizza performance giocatori',
        t('guideMatchDetailStep4') || 'Consulta suggerimenti tattici'
      ]
    },
    {
      id: 'dettaglio-giocatore',
      icon: User,
      color: 'var(--neon-cyan)',
      path: '/giocatore',
      title: t('guidePlayerDetailTitle') || 'Dettaglio Giocatore',
      description: t('guidePlayerDetailDesc') || 'Profilo completo del giocatore',
      steps: [
        t('guidePlayerDetailStep1') || 'Visualizza statistiche e abilità',
        t('guidePlayerDetailStep2') || 'Completa profilo con foto aggiuntive',
        t('guidePlayerDetailStep3') || 'Carica screenshot stats, skills, booster'
      ]
    },
    {
      id: 'impostazioni-profilo',
      icon: Settings,
      color: 'var(--neon-blue)',
      path: '/impostazioni-profilo',
      title: t('guideProfileTitle') || 'Impostazioni Profilo',
      description: t('guideProfileDesc') || 'Personalizza il tuo profilo e preferenze',
      steps: [
        t('guideProfileStep1') || 'Inserisci dati personali (nome, cognome)',
        t('guideProfileStep2') || 'Configura dati gioco (divisione, squadra preferita)',
        t('guideProfileStep3') || 'Personalizza preferenze IA (nome AI, come ricordarti)',
        t('guideProfileStep4') || 'Indica problemi comuni per suggerimenti mirati'
      ]
    },
    {
      id: 'contromisure-live',
      icon: Shield,
      color: 'var(--neon-orange)',
      path: '/contromisure-live',
      title: t('guideCountermeasuresTitle') || 'Contromisure Live',
      description: t('guideCountermeasuresDesc') || 'Carica formazione avversaria, estrai dati e genera contromisure tattiche con l\'IA.',
      steps: [
        t('guideCountermeasuresStep1') || 'Carica uno screenshot della formazione avversaria',
        t('guideCountermeasuresStep2') || 'Clicca "Estrai Formazione" per analizzare',
        t('guideCountermeasuresStep3') || 'Clicca "Genera Contromisure" per ottenere analisi e suggerimenti',
        t('guideCountermeasuresStep4') || 'Leggi analisi, aggiustamenti tattici e istruzioni; applica i suggerimenti'
      ]
    },
    {
      id: 'allenatori',
      icon: UserRound,
      color: 'var(--neon-cyan)',
      path: '/allenatori',
      title: t('guideCoachesTitle') || 'Allenatori',
      description: t('guideCoachesDesc') || 'Carica foto allenatori, imposta attivo e consulta competenze.',
      steps: [
        t('guideCoachesStep1') || 'Carica 1 o 2 screenshot (foto principale e connessione)',
        t('guideCoachesStep2') || 'L\'IA estrae nome, squadra e competenze',
        t('guideCoachesStep3') || 'Imposta un allenatore come attivo; vedi dettagli o elimina'
      ]
    }
  ]

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-darker)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'var(--neon-blue)',
          fontSize: '18px'
        }}>
          {t('loading') || 'Caricamento...'}
        </div>
      </div>
    )
  }

  return (
    <div data-tour-id="tour-guida-intro" style={{
      minHeight: '100vh',
      background: 'var(--bg-darker)',
      padding: '24px',
      paddingBottom: '100px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => router.push('/')}
              style={{
                background: 'rgba(0, 212, 255, 0.1)',
                border: '1px solid var(--neon-blue)',
                borderRadius: '8px',
                padding: '8px 12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--neon-blue)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.2)'
                e.currentTarget.style.boxShadow = 'var(--glow-blue)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <ArrowLeft size={18} />
              <span>{t('back') || 'Indietro'}</span>
            </button>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <BookOpen size={32} />
                {t('guideTitle') || 'Guida Completa'}
              </h1>
              <p style={{
                fontSize: '16px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideSubtitle') || 'Scopri come usare al meglio la piattaforma'}
              </p>
            </div>
          </div>
          <LanguageSwitch />
        </div>

        {/* Hero Section - Completa Profilo */}
        <div data-tour-id="tour-guida-profile-hero" className="card" style={{
          padding: '32px',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(168, 85, 247, 0.1))',
          border: '2px solid var(--neon-blue)',
          boxShadow: 'var(--glow-blue)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--neon-blue), var(--neon-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-blue)'
            }}>
              <Target size={32} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'white',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {t('guideCompleteProfileTitle') || 'Completa il Tuo Profilo'}
                {profileCompletion === 100 && <CheckCircle2 size={24} color="var(--neon-blue)" />}
              </h2>
              <p style={{
                fontSize: '16px',
                opacity: 0.9,
                color: 'white'
              }}>
                {t('guideCompleteProfileDesc') || 'Più completi il profilo, più l\'AI può aiutarti in modo personalizzato!'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{
                fontSize: '14px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideProfileProgress') || 'Completamento Profilo'}
              </span>
              <span style={{
                fontSize: '18px',
                fontWeight: 700,
                color: profileCompletion === 100 ? 'var(--neon-blue)' : 'var(--neon-orange)'
              }}>
                {profileCompletion}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div style={{
                width: `${profileCompletion}%`,
                height: '100%',
                background: profileCompletion === 100
                  ? 'linear-gradient(90deg, var(--neon-blue), var(--neon-cyan))'
                  : 'linear-gradient(90deg, var(--neon-orange), var(--neon-pink))',
                borderRadius: '6px',
                transition: 'width 0.5s ease',
                boxShadow: profileCompletion === 100 ? 'var(--glow-blue)' : 'var(--glow-orange)'
              }} />
            </div>
          </div>

          <button
            onClick={() => router.push('/impostazioni-profilo')}
            className="btn primary"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              background: profileCompletion === 100
                ? 'linear-gradient(135deg, var(--neon-blue), var(--neon-cyan))'
                : 'linear-gradient(135deg, var(--neon-orange), var(--neon-pink))',
              border: 'none',
              boxShadow: profileCompletion === 100 ? 'var(--glow-blue)' : 'var(--glow-orange)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.02)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <Settings size={20} />
            {profileCompletion === 100
              ? (t('guideProfileComplete') || 'Profilo Completo! ✅')
              : (t('guideCompleteProfileButton') || 'Completa il Profilo')
            }
            <ArrowRight size={20} />
          </button>
        </div>

        {/* Hero Section - Usa il Cervello AI */}
        <div data-tour-id="tour-guida-brain-hero" className="card" style={{
          padding: '32px',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(236, 72, 153, 0.1))',
          border: '2px solid var(--neon-purple)',
          boxShadow: 'var(--glow-purple)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--glow-purple)',
              animation: 'pulse 2s infinite'
            }}>
              <Brain size={32} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'white',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Sparkles size={24} color="var(--neon-purple)" />
                {t('guideUseBrainTitle') || 'Usa il Cervello AI'}
              </h2>
              <p style={{
                fontSize: '16px',
                opacity: 0.9,
                color: 'white',
                lineHeight: '1.6'
              }}>
                {t('guideUseBrainDesc') || 'Il tuo assistente personale è sempre disponibile! Clicca sul pulsante con il cervello in basso a destra per chiedere qualsiasi cosa. Ti guida, motiva e ti aiuta passo-passo!'}
              </p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginTop: '20px'
          }}>
            <div style={{
              padding: '16px',
              background: 'rgba(168, 85, 247, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(168, 85, 247, 0.3)'
            }}>
              <Zap size={20} color="var(--neon-purple)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--neon-purple)',
                marginBottom: '4px'
              }}>
                {t('guideBrainFeature1') || 'Guida Personale'}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideBrainFeature1Desc') || 'Ti accompagna in ogni passo'}
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(236, 72, 153, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(236, 72, 153, 0.3)'
            }}>
              <Target size={20} color="var(--neon-pink)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--neon-pink)',
                marginBottom: '4px'
              }}>
                {t('guideBrainFeature2') || 'Motivante'}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideBrainFeature2Desc') || 'Celebra i tuoi successi'}
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(0, 212, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 212, 255, 0.3)'
            }}>
              <Sparkles size={20} color="var(--neon-blue)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--neon-blue)',
                marginBottom: '4px'
              }}>
                {t('guideBrainFeature3') || 'Sempre Disponibile'}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideBrainFeature3Desc') || '24/7 al tuo servizio'}
              </div>
            </div>
          </div>
        </div>

        {/* Hero Section - Mostrami come (Tour interattivo) */}
        <div className="card" style={{
          padding: '32px',
          marginBottom: '32px',
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(34, 197, 94, 0.1))',
          border: '2px solid var(--neon-cyan)',
          boxShadow: '0 0 24px rgba(0, 245, 255, 0.2)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(0, 245, 255, 0.4)'
            }}>
              <Compass size={32} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: 'white',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Sparkles size={24} color="var(--neon-cyan)" />
                {t('guideShowMeHowTitle') || 'Mostrami come'}
              </h2>
              <p style={{
                fontSize: '16px',
                opacity: 0.9,
                color: 'white',
                lineHeight: '1.6'
              }}>
                {t('guideShowMeHowDesc') || 'Tour interattivo su ogni pagina! Clicca il pulsante con la bussola in alto a destra per una guida passo-passo.'}
              </p>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginTop: '20px'
          }}>
            <div style={{
              padding: '16px',
              background: 'rgba(0, 245, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 245, 255, 0.3)'
            }}>
              <Compass size={20} color="var(--neon-cyan)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--neon-cyan)',
                marginBottom: '4px'
              }}>
                {t('guideShowMeHowFeature1') || 'Tour contestuali'}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideShowMeHowFeature1Desc') || 'Un tour diverso per ogni pagina'}
              </div>
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(0, 212, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 212, 255, 0.3)'
            }}>
              <Zap size={20} color="var(--neon-blue)" style={{ marginBottom: '8px' }} />
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--neon-blue)',
                marginBottom: '4px'
              }}>
                {t('guideShowMeHowFeature2') || 'Sempre disponibile'}
              </div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                color: 'white'
              }}>
                {t('guideShowMeHowFeature2Desc') || 'Riavvia quando vuoi'}
              </div>
            </div>
          </div>
        </div>

        {/* Guide per Pagina */}
        <div data-tour-id="tour-guida-pages" style={{
          marginBottom: '32px'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 700,
            color: 'white',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <BookOpen size={28} color="var(--neon-blue)" />
            {t('guidePagesTitle') || 'Guide per Pagina'}
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '24px'
          }}>
            {pageGuides.map((guide) => {
              const Icon = guide.icon
              const isExpanded = expandedSections[guide.id]

              return (
                <div
                  key={guide.id}
                  className="card"
                  style={{
                    padding: '24px',
                    border: `2px solid ${guide.color}`,
                    background: `rgba(${guide.color === 'var(--neon-blue)' ? '0, 212, 255' : guide.color === 'var(--neon-purple)' ? '168, 85, 247' : guide.color === 'var(--neon-orange)' ? '255, 107, 53' : guide.color === 'var(--neon-pink)' ? '236, 72, 153' : '0, 245, 255'}, 0.05)`,
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 0 20px ${guide.color.replace('var(--', '').replace(')', '')}40, 0 0 40px ${guide.color.replace('var(--', '').replace(')', '')}20`
                    e.currentTarget.style.transform = 'translateY(-4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                  onClick={() => toggleSection(guide.id)}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: guide.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: `0 0 15px ${guide.color}40`
                    }}>
                      <Icon size={24} color="white" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: 'white',
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span>{guide.title}</span>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </h3>
                      <p style={{
                        fontSize: '14px',
                        opacity: 0.8,
                        color: 'white',
                        lineHeight: '1.5'
                      }}>
                        {guide.description}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{
                      marginTop: '20px',
                      paddingTop: '20px',
                      borderTop: `1px solid ${guide.color}40`
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: guide.color,
                        marginBottom: '12px'
                      }}>
                        {t('guideSteps') || 'Come fare:'}
                      </div>
                      <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        {guide.steps.map((step, idx) => (
                          <li
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '12px',
                              padding: '12px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '8px',
                              border: `1px solid ${guide.color}20`
                            }}
                          >
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: guide.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontSize: '12px',
                              fontWeight: 700,
                              color: 'white'
                            }}>
                              {idx + 1}
                            </div>
                            <span style={{
                              fontSize: '14px',
                              color: 'white',
                              lineHeight: '1.6',
                              flex: 1
                            }}>
                              {step}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(guide.path)
                        }}
                        style={{
                          marginTop: '16px',
                          width: '100%',
                          padding: '12px',
                          background: guide.color,
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.02)'
                          e.currentTarget.style.boxShadow = `0 0 20px ${guide.color}60`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        {t('guideGoToPage') || 'Vai alla Pagina'}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer CTA */}
        <div data-tour-id="tour-guida-footer" className="card" style={{
          padding: '32px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(168, 85, 247, 0.1))',
          border: '2px solid var(--neon-blue)',
          boxShadow: 'var(--glow-blue)'
        }}>
          <Brain size={48} color="var(--neon-blue)" style={{
            marginBottom: '16px',
            animation: 'pulse 2s infinite'
          }} />
          <h3 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'white',
            marginBottom: '12px'
          }}>
            {t('guideFooterTitle') || 'Hai Domande?'}
          </h3>
          <p style={{
            fontSize: '16px',
            opacity: 0.9,
            color: 'white',
            marginBottom: '24px',
            lineHeight: '1.6'
          }}>
            {t('guideFooterDesc') || 'Chiedi al cervello AI! Clicca sul pulsante in basso a destra e fai qualsiasi domanda. Ti guiderà passo-passo! 💪'}
          </p>
        </div>
      </div>

    </div>
  )
}

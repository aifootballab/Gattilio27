// Simple i18n system - Italian/English
const translations = {
  it: {
    // Dashboard
    dashboard: 'Dashboard',
    roster: 'Roster',
    yourPlayers: 'I tuoi giocatori',
    squadOverview: 'Squad Overview',
    yourSquad: 'La tua rosa',
    tacticalGoals: 'Open Tactical Goals',
    goals: 'Obiettivi',
    userProfile: 'User Profile',
    anonymousUser: 'Utente Anonimo',
    masterLevel: 'Master Level',
    aiKnowledge: 'AI Knowledge',
    high: 'High',
    matchInsights: 'Match Insights',
    analysis: 'Analisi',
    quickLinks: 'Quick Links',
    navigation: 'Navigazione',
    home: 'Home',
    players: 'Players',
    squadBuilder: 'Squad Builder',
    dataAnalytics: 'Data & Analytics',
    memoryHub: 'Memory Hub',
    coaching: 'Coaching',
    memoryInsights: 'Memory Insights',
    aiLearning: 'AI Learning',
    startSession: 'Start Session',
    strugglesCoachingPress: 'Struggles coaching press',
    reluctantChangeFormation: 'Reluctant to change formation',
    prefersQuickTips: 'Prefers quick, actionable tips',
    strugglesHighPress: 'Struggles against high press',
    
    // Rosa
    squad: 'Rosa',
    uploadScreenshots: 'Carica Screenshot',
    dragDropHint: 'Trascina qui oppure clicca. Puoi caricare 2 o 3 foto per giocatore, anche miste.',
    imagesLoaded: 'Immagini caricate',
    analyzeBatch: 'Analizza batch',
    analyzing: 'Analisi…',
    reset: 'Reset',
    slot: 'Slot',
    starters: 'Titolari',
    bench: 'Panchina',
    insertPlayer: 'Inserisci questo giocatore',
    saveToSupabase: 'Salva in Supabase',
    slotSelected: 'slot selezionato',
    name: 'Nome',
    role: 'Ruolo',
    card: 'Carta',
    team: 'Team',
    boosters: 'Boosters',
    missing: 'Manca',
    myPlayers: 'I Miei Giocatori',
    playersSaved: 'giocatori salvati',
    loading: 'Caricamento...',
    noPlayersSaved: 'Nessun giocatore salvato',
    uploadScreenshotsToSee: 'Carica screenshot e salva giocatori per vederli qui',
    uploadScreenshots: 'Carica Screenshot',
    details: 'Dettagli',
    hide: 'Nascondi',
    edit: 'Modifica',
    complete: 'Completo',
    incomplete: 'Incompleto',
    missingFields: 'Manca',
    nationality: 'Nazionalità',
    physical: 'Fisico',
    age: 'Età',
    form: 'Forma',
    skills: 'Skills',
    resetMyData: 'Reset miei dati Supabase',
    saved: 'Salvato in Supabase',
    resetSuccess: 'Dati Supabase resettati per questo utente anonimo',
    error: 'Errore',
    backToDashboard: 'Dashboard Principale',
    backToSquad: 'Rosa',
  },
  en: {
    // Dashboard
    dashboard: 'Dashboard',
    roster: 'Roster',
    yourPlayers: 'Your Players',
    squadOverview: 'Squad Overview',
    yourSquad: 'Your Squad',
    tacticalGoals: 'Open Tactical Goals',
    goals: 'Goals',
    userProfile: 'User Profile',
    anonymousUser: 'Anonymous User',
    masterLevel: 'Master Level',
    aiKnowledge: 'AI Knowledge',
    high: 'High',
    matchInsights: 'Match Insights',
    analysis: 'Analysis',
    quickLinks: 'Quick Links',
    navigation: 'Navigation',
    home: 'Home',
    players: 'Players',
    squadBuilder: 'Squad Builder',
    dataAnalytics: 'Data & Analytics',
    memoryHub: 'Memory Hub',
    coaching: 'Coaching',
    memoryInsights: 'Memory Insights',
    aiLearning: 'AI Learning',
    startSession: 'Start Session',
    strugglesCoachingPress: 'Struggles coaching press',
    reluctantChangeFormation: 'Reluctant to change formation',
    prefersQuickTips: 'Prefers quick, actionable tips',
    strugglesHighPress: 'Struggles against high press',
    
    // Rosa
    squad: 'Squad',
    uploadScreenshots: 'Upload Screenshots',
    dragDropHint: 'Drag here or click. You can upload 2 or 3 photos per player, even mixed.',
    imagesLoaded: 'Images loaded',
    analyzeBatch: 'Analyze batch',
    analyzing: 'Analyzing…',
    reset: 'Reset',
    slot: 'Slot',
    starters: 'Starters',
    bench: 'Bench',
    insertPlayer: 'Insert this player',
    saveToSupabase: 'Save to Supabase',
    slotSelected: 'selected slot',
    name: 'Name',
    role: 'Role',
    card: 'Card',
    team: 'Team',
    boosters: 'Boosters',
    missing: 'Missing',
    myPlayers: 'My Players',
    playersSaved: 'players saved',
    loading: 'Loading...',
    noPlayersSaved: 'No players saved',
    uploadScreenshotsToSee: 'Upload screenshots and save players to see them here',
    uploadScreenshots: 'Upload Screenshots',
    details: 'Details',
    hide: 'Hide',
    edit: 'Edit',
    complete: 'Complete',
    incomplete: 'Incomplete',
    missingFields: 'Missing',
    nationality: 'Nationality',
    physical: 'Physical',
    age: 'Age',
    form: 'Form',
    skills: 'Skills',
    resetMyData: 'Reset my Supabase data',
    saved: 'Saved to Supabase',
    resetSuccess: 'Supabase data reset for this anonymous user',
    error: 'Error',
    backToDashboard: 'Main Dashboard',
    backToSquad: 'Squad',
  }
}

import React from 'react'

export function useTranslation() {
  const [lang, setLang] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_language')
      return saved || 'it'
    }
    return 'it'
  })

  const t = (key) => {
    return translations[lang]?.[key] || translations.en[key] || key
  }

  const changeLanguage = (newLang) => {
    setLang(newLang)
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_language', newLang)
    }
  }

  return { t, lang, changeLanguage }
}

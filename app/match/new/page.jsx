'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useTranslation } from '@/lib/i18n'
import LanguageSwitch from '@/components/LanguageSwitch'
import HeroPointsBalance from '@/components/HeroPointsBalance'
import { ArrowLeft, Upload, AlertCircle, CheckCircle2, RefreshCw, Info, X, Image as ImageIcon, FileImage, TrendingUp, Sparkles } from 'lucide-react'

const PHOTO_TYPES = [
  { key: 'formation_image', label: 'Formazione in Campo', icon: '⚽', description: 'Screenshot formazione giocata', knowledgeBonus: 3 },
  { key: 'ratings_image', label: 'Pagelle Giocatori', icon: '📊', description: 'Screenshot voti giocatori', knowledgeBonus: 5 },
  { key: 'team_stats_image', label: 'Statistiche Squadra', icon: '📈', description: 'Screenshot statistiche squadra', knowledgeBonus: 5 },
  { key: 'attack_areas_image', label: 'Aree di Attacco', icon: '🎯', description: 'Screenshot aree attacco', knowledgeBonus: 3 },
  { key: 'recovery_zones_image', label: 'Zone Recupero Palla', icon: '🔄', description: 'Screenshot zone recupero', knowledgeBonus: 3 },
  { key: 'goals_chart_image', label: 'Grafico Rete/Gol', icon: '⚡', description: 'Screenshot grafico gol', knowledgeBonus: 2 }
]

export default function NewMatchPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [toast, setToast] = React.useState(null)
  const [photos, setPhotos] = React.useState({})
  const [uploading, setUploading] = React.useState(false)
  const [result, setResult] = React.useState(null)

  // Verifica autenticazione
  React.useEffect(() => {
    if (!supabase) {
      router.push('/login')
      return
    }

    const checkAuth = async () => {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session) {
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  const handlePhotoUpload = (photoType, file) => {
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotos(prev => ({
        ...prev,
        [photoType]: reader.result
      }))
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = (photoType) => {
    setPhotos(prev => {
      const newPhotos = { ...prev }
      delete newPhotos[photoType]
      return newPhotos
    })
  }

  const calculateKnowledgeBonus = () => {
    return Object.keys(photos).reduce((sum, key) => {
      const photoType = PHOTO_TYPES.find(p => p.key === key)
      return sum + (photoType?.knowledgeBonus || 0)
    }, 0)
  }

  const getMissingPhotosMessages = () => {
    const uploaded = Object.keys(photos)
    const missing = PHOTO_TYPES.filter(p => !uploaded.includes(p.key))
    
    if (missing.length === 0) {
      return { message: '🎉 Perfetto! Hai caricato tutte le foto. La IA avrà la massima conoscenza!', type: 'success' }
    }
    
    if (uploaded.length === 0) {
      return { 
        message: '💡 Va bene così! Se vuoi, puoi caricare più foto per aumentare la conoscenza della IA. Più la IA sa, più ti aiuta! Ogni foto conta 😊', 
        type: 'info' 
      }
    }

    const messages = missing.map(p => {
      return `📸 ${p.icon} ${p.label}: ${p.description} (+${p.knowledgeBonus}% conoscenza)`
    })

    return {
      message: `💡 Vuoi caricare anche queste foto? Più la IA sa, più ti aiuta!\n\n${messages.join('\n')}`,
      type: 'info'
    }
  }

  const handleSubmit = async () => {
    setUploading(true)
    setError(null)
    setResult(null)

    try {
      const { data: session } = await supabase.auth.getSession()
      if (!session?.session?.access_token) {
        throw new Error('Sessione scaduta')
      }

      // Verifica che almeno una foto sia caricata
      if (Object.keys(photos).length === 0) {
        throw new Error('Carica almeno una foto per analizzare la partita')
      }

      // 1. Estrai dati dalle foto
      const extractRes = await fetch('/api/extract-match-data', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(photos)
      })

      if (!extractRes.ok) {
        const extractData = await extractRes.json()
        throw new Error(extractData.error || 'Errore estrazione dati partita')
      }

      const extractResult = await extractRes.json()

      // 2. Prepara dati per salvataggio (aggiungi campi opzionali)
      const matchDataToSave = {
        ...extractResult.match_data,
        match_date: new Date().toISOString(), // Data corrente se non estratta
        opponent_name: null, // Da aggiungere in futuro se estratto
        opponent_formation_id: null, // Da aggiungere in futuro se estratto
        playing_style_played: null, // Da aggiungere in futuro se estratto
        team_strength: null, // Da aggiungere in futuro se estratto
        result: null, // Da aggiungere in futuro se estratto
        is_home: true, // Default
        ai_summary: null, // Sarà popolato da analisi AI
        ai_insights: [],
        ai_recommendations: [],
        credits_used: extractResult.credits_used || 0
      }

      // 3. Salva match in database
      const saveRes = await fetch('/api/supabase/save-match', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(matchDataToSave)
      })

      if (!saveRes.ok) {
        const saveData = await saveRes.json()
        throw new Error(saveData.error || 'Errore salvataggio partita')
      }

      const saveResult = await saveRes.json()

      setResult({
        match_id: saveResult.match_id,
        credits_used: extractResult.credits_used || 0,
        photos_processed: extractResult.photos_processed || Object.keys(photos).length,
        photos_missing: extractResult.photos_missing || [],
        data_completeness: extractResult.data_completeness || 'partial',
        analysis_status: saveResult.analysis_status || 'pending'
      })

      setToast({ message: 'Partita salvata con successo!', type: 'success' })
      
      // Reset form dopo 3 secondi
      setTimeout(() => {
        setPhotos({})
        setResult(null)
      }, 3000)

    } catch (err) {
      setError(err.message || 'Errore durante il salvataggio della partita')
      setToast({ message: err.message || 'Errore durante il salvataggio', type: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const missingInfo = getMissingPhotosMessages()
  const knowledgeBonus = calculateKnowledgeBonus()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold">Nuova Partita</h1>
            </div>
            <div className="flex items-center gap-4">
              <HeroPointsBalance />
              <LanguageSwitch />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-200">
                <strong>💡 Pay-Per-Use:</strong> Credits spesi solo per foto effettivamente processate. 
                Nessuna foto è obbligatoria - il sistema funziona anche con dati parziali. 
                <strong> Più la IA sa, più ti aiuta!</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Knowledge Bar */}
        {knowledgeBonus > 0 && (
          <div className="mb-6 p-4 bg-purple-900/30 border border-purple-700/50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="font-semibold text-purple-200">Conoscenza IA</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(knowledgeBonus, 100)}%` }}
              />
            </div>
            <p className="text-xs text-purple-300">
              Bonus conoscenza: +{knowledgeBonus}% ({Object.keys(photos).length} foto caricate)
            </p>
          </div>
        )}

        {/* Missing Photos Info */}
        {missingInfo && (
          <div className={`mb-6 p-4 rounded-lg border ${
            missingInfo.type === 'success' 
              ? 'bg-green-900/30 border-green-700/50' 
              : 'bg-yellow-900/30 border-yellow-700/50'
          }`}>
            <p className="text-sm whitespace-pre-line">{missingInfo.message}</p>
          </div>
        )}

        {/* Photo Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {PHOTO_TYPES.map(photoType => {
            const hasPhoto = !!photos[photoType.key]
            return (
              <div
                key={photoType.key}
                className={`p-4 rounded-lg border-2 border-dashed transition-all ${
                  hasPhoto
                    ? 'border-green-500 bg-green-900/20'
                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{photoType.icon}</span>
                    <div>
                      <h3 className="font-semibold text-sm">{photoType.label}</h3>
                      <p className="text-xs text-gray-400">{photoType.description}</p>
                    </div>
                  </div>
                  {hasPhoto && (
                    <button
                      onClick={() => removePhoto(photoType.key)}
                      className="p-1 hover:bg-red-900/50 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>

                {hasPhoto ? (
                  <div className="mt-3 p-2 bg-green-900/30 rounded flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-300">Foto caricata (+{photoType.knowledgeBonus}%)</span>
                  </div>
                ) : (
                  <label className="mt-3 block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handlePhotoUpload(photoType.key, file)
                      }}
                      className="hidden"
                    />
                    <div className="cursor-pointer p-3 bg-gray-700/50 hover:bg-gray-700 rounded text-center text-sm transition-colors">
                      <Upload className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-xs">Carica foto</span>
                    </div>
                  </label>
                )}
              </div>
            )
          })}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="mb-6 p-4 bg-green-900/30 border border-green-700/50 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-200 mb-2">Partita salvata con successo!</h3>
                <div className="text-sm text-green-300 space-y-1">
                  <p>Match ID: {result.match_id}</p>
                  <p>Foto processate: {result.photos_processed}</p>
                  <p>Credits usati: {result.credits_used}</p>
                  <p>Completezza dati: {result.data_completeness}</p>
                  <p>Stato analisi: {result.analysis_status}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={uploading || Object.keys(photos).length === 0}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            {uploading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Elaborazione...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Salva Partita</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          <p className="text-white text-sm">{toast.message}</p>
        </div>
      )}
    </div>
  )
}

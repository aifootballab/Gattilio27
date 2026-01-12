import React, { useState } from 'react'
import { useRosa } from '../../contexts/RosaContext'
import './RosaVoiceInput.css'

function RosaVoiceInput({ onBack, onRosaCreated }) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState('')
  const { createRosa, addPlayer } = useRosa()

  const handleStartRecording = () => {
    setIsRecording(true)
    // TODO: Implementare registrazione audio reale
    // Per ora mock
    setTimeout(() => {
      setTranscription('Ho Ronaldinho come trequartista, Mbappé in attacco, Thuram ala sinistra...')
      setIsRecording(false)
    }, 2000)
  }

  const handleStopRecording = () => {
    setIsRecording(false)
    // TODO: Stop registrazione e invio a Speech-to-Text
  }

  const handleProcessTranscription = async () => {
    // TODO: Processare trascrizione e estrarre giocatori
    // Mock per ora
    const mockPlayers = [
      {
        player_id: 'ronaldinho_1',
        player_name: 'Ronaldinho',
        overall_rating: 98,
        position: 'AMF',
        source: 'voice',
        transcription: transcription
      }
    ]

    try {
      const rosa = await createRosa({ 
        name: 'Rosa da Voce',
        players: mockPlayers 
      })
      
      mockPlayers.forEach(player => addPlayer(player))
      onRosaCreated()
    } catch (error) {
      console.error('Errore creazione rosa:', error)
    }
  }

  return (
    <div className="rosa-voice-input">
      <button onClick={onBack} className="back-button">← Indietro</button>
      
      <div className="voice-input-container">
        <h3>Dettatura Vocale</h3>
        <p className="instruction">
          Descrivi i giocatori della tua squadra. Es: "Ho Ronaldinho come trequartista, 
          Mbappé in attacco, Thuram ala sinistra..."
        </p>

        <div className="recording-section">
          {!isRecording ? (
            <button 
              onClick={handleStartRecording}
              className="record-button"
            >
              🎤 Inizia Registrazione
            </button>
          ) : (
            <button 
              onClick={handleStopRecording}
              className="record-button recording"
            >
              ⏹️ Stop Registrazione
            </button>
          )}

          {transcription && (
            <div className="transcription-box">
              <h4>Trascrizione:</h4>
              <p>{transcription}</p>
              <button 
                onClick={handleProcessTranscription}
                className="process-button"
              >
                Processa e Crea Rosa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RosaVoiceInput

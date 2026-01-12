import React, { useState } from 'react'
import { useRosa } from '../../contexts/RosaContext'
import './RosaScreenshotInput.css'

function RosaScreenshotInput({ onBack, onRosaCreated }) {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const { createRosa, addPlayer } = useRosa()

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    setUploadedFiles(prev => [...prev, ...files])
  }

  const handleProcessScreenshots = async () => {
    setIsProcessing(true)
    
    // TODO: Invio a Vision AI per OCR e parsing
    // Mock per ora
    setTimeout(() => {
      const mockPlayers = [
        {
          player_id: 'beckenbauer_1',
          player_name: 'Franz Beckenbauer',
          overall_rating: 98,
          position: 'DC',
          source: 'screenshot',
          confidence: 0.95
        }
      ]

      createRosa({ 
        name: 'Rosa da Screenshot',
        players: mockPlayers 
      }).then(() => {
        mockPlayers.forEach(player => addPlayer(player))
        setIsProcessing(false)
        onRosaCreated()
      })
    }, 2000)
  }

  return (
    <div className="rosa-screenshot-input">
      <button onClick={onBack} className="back-button">← Indietro</button>
      
      <div className="screenshot-input-container">
        <h3>Carica Screenshot</h3>
        <p className="instruction">
          Carica screenshot dei profili giocatori da eFootball. 
          Puoi caricare più screenshot contemporaneamente.
        </p>

        <div className="upload-section">
          <label className="upload-area">
            <input 
              type="file" 
              multiple 
              accept="image/*"
              onChange={handleFileUpload}
              className="file-input"
            />
            <div className="upload-content">
              <span className="upload-icon">📸</span>
              <span className="upload-text">
                {uploadedFiles.length > 0 
                  ? `${uploadedFiles.length} file selezionati`
                  : 'Clicca o trascina qui i tuoi screenshot'
                }
              </span>
            </div>
          </label>

          {uploadedFiles.length > 0 && (
            <div className="files-preview">
              <h4>File caricati:</h4>
              <div className="files-list">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={handleProcessScreenshots}
                disabled={isProcessing}
                className="process-button"
              >
                {isProcessing ? '⏳ Elaborazione...' : '🔍 Analizza Screenshot'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RosaScreenshotInput

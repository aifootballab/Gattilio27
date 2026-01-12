'use client'

import React, { useState, useRef } from 'react'
import { Upload, CheckCircle, XCircle, Loader2, FileText, Clipboard, Download, AlertCircle } from 'lucide-react'
import * as importService from '../../services/importService'
import './AdminImportJSON.css'

function AdminImportJSON() {
  const [jsonText, setJsonText] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  const handleFileSelect = (file) => {
    if (!file || !file.name.endsWith('.json')) {
      setError('Seleziona un file JSON valido')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target.result
        setJsonText(content)
        setError(null)
        validateAndPreview(content)
      } catch (err) {
        setError('Errore lettura file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) {
        setJsonText(text)
        setError(null)
        validateAndPreview(text)
      }
    } catch (err) {
      setError('Errore accesso alla clipboard. Usa Ctrl+V per incollare direttamente.')
    }
  }

  const validateAndPreview = (text) => {
    try {
      const jsonData = JSON.parse(text)
      const players = Array.isArray(jsonData) ? jsonData : jsonData.players || jsonData.data || []
      const playerCount = Array.isArray(players) ? players.length : 0
      
      setPreview({
        valid: true,
        playerCount,
        firstPlayer: players[0] || null
      })
      setError(null)
    } catch (err) {
      setPreview({
        valid: false,
        error: err.message
      })
      setError('JSON non valido: ' + err.message)
    }
  }

  const handleTextChange = (e) => {
    const newValue = e.target.value
    setJsonText(newValue)
    setError(null)
    
    if (newValue.trim()) {
      validateAndPreview(newValue)
    } else {
      setPreview(null)
    }
  }

  const handleImport = async () => {
    if (!jsonText.trim()) {
      setError('Inserisci o carica un file JSON valido')
      return
    }

    if (!preview || !preview.valid) {
      setError('Il JSON non è valido. Controlla la sintassi.')
      return
    }

    setIsImporting(true)
    setError(null)
    setResult(null)

    try {
      const jsonData = JSON.parse(jsonText)
      
      const data = await importService.importPlayersFromJSON(jsonData, {
        batchSize: 50
      })

      setResult({
        success: true,
        total: data.total,
        imported: data.imported,
        updated: data.updated,
        skipped: data.skipped || 0,
        errors: data.errors,
        errorsList: data.errorsList || [],
        skippedList: data.skippedList || []
      })
      
      // Pulisci dopo successo
      setJsonText('')
      setPreview(null)
    } catch (err) {
      if (err.message.includes('JSON')) {
        setError('JSON non valido: ' + err.message)
      } else {
        setError(err.message || 'Errore durante l\'importazione')
      }
      setResult({
        success: false,
        error: err.message
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="admin-import-json">
      <div className="import-header">
        <h2>Importa Giocatori da JSON</h2>
        <p className="import-description">
          Carica un file JSON o incolla i dati direttamente. Il sistema validerà automaticamente il formato.
        </p>
      </div>

      <div className="import-form">
        {/* Drag & Drop Zone */}
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${jsonText ? 'has-content' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileUpload}
            disabled={isImporting}
            style={{ display: 'none' }}
          />
          <div className="drop-zone-content">
            <Upload size={32} className="drop-icon" />
            <div className="drop-text">
              <strong>Trascina il file JSON qui</strong>
              <span>oppure clicca per selezionare</span>
            </div>
            <span className="drop-hint">Supportati: file .json fino a 10MB</span>
          </div>
        </div>

        {/* Actions */}
        <div className="import-actions">
          <label className="action-btn file-btn">
            <FileText size={18} />
            Seleziona File
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              disabled={isImporting}
              style={{ display: 'none' }}
            />
          </label>
          
          <button
            type="button"
            onClick={handlePaste}
            disabled={isImporting}
            className="action-btn paste-btn"
          >
            <Clipboard size={18} />
            Incolla
          </button>

          {jsonText && (
            <button
              type="button"
              onClick={() => {
                setJsonText('')
                setPreview(null)
                setError(null)
              }}
              disabled={isImporting}
              className="action-btn clear-btn"
            >
              <XCircle size={18} />
              Cancella
            </button>
          )}
        </div>

        {/* Textarea */}
        <div className="textarea-field">
          <label>Contenuto JSON</label>
          <textarea
            ref={textareaRef}
            value={jsonText}
            onChange={handleTextChange}
            onPaste={(e) => {
              setTimeout(() => {
                const pastedText = e.target.value
                if (pastedText) {
                  validateAndPreview(pastedText)
                }
              }, 0)
            }}
            placeholder='[{"Giocatori": "90\\nStandard\\nNome Giocatore", "position": "CF", ...}, ...]'
            disabled={isImporting}
            rows={12}
          />
          {jsonText && (
            <div className="textarea-stats">
              <span>{jsonText.length.toLocaleString()} caratteri</span>
              <span>•</span>
              <span>{jsonText.split('\n').length} righe</span>
              {preview && preview.valid && (
                <>
                  <span>•</span>
                  <span className="preview-count">{preview.playerCount} giocatori trovati</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        {preview && preview.valid && preview.firstPlayer && (
          <div className="import-preview">
            <div className="preview-header">
              <AlertCircle size={18} />
              <span>Anteprima - Primo giocatore rilevato</span>
            </div>
            <div className="preview-content">
              <div className="preview-item">
                <span className="preview-label">Nome:</span>
                <span className="preview-value">{preview.firstPlayer.Giocatori?.split('\n')[2] || preview.firstPlayer.name || preview.firstPlayer.player_name || 'N/A'}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Posizione:</span>
                <span className="preview-value">{preview.firstPlayer.position || 'N/A'}</span>
              </div>
              <div className="preview-item">
                <span className="preview-label">Totale giocatori:</span>
                <span className="preview-value highlight">{preview.playerCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={isImporting || !jsonText.trim() || !preview?.valid}
          className="import-btn"
        >
          {isImporting ? (
            <>
              <Loader2 size={20} className="spinner" />
              Importazione in corso...
            </>
          ) : (
            <>
              <Upload size={20} />
              Importa Giocatori
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="import-message error">
          <XCircle size={20} />
          <div>
            <strong>Errore</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {result && result.success && (
        <div className="import-message success">
          <CheckCircle size={20} />
          <div className="result-content">
            <strong>Importazione Completata!</strong>
            <div className="result-stats">
              <div className="stat-item">
                <span className="stat-label">Totale</span>
                <span className="stat-value">{result.total}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Creati</span>
                <span className="stat-value success-value">{result.imported}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Aggiornati</span>
                <span className="stat-value">{result.updated}</span>
              </div>
              {result.errors > 0 && (
                <div className="stat-item">
                  <span className="stat-label">Errori</span>
                  <span className="stat-value error-value">{result.errors}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Failure Message */}
      {result && !result.success && (
        <div className="import-message error">
          <XCircle size={20} />
          <div>
            <strong>Errore durante l'importazione</strong>
            <p>{result.error}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminImportJSON

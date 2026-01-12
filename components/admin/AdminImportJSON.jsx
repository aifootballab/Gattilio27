'use client'

import React, { useState } from 'react'
import { Upload, CheckCircle, XCircle, Loader, FileText } from 'lucide-react'
import * as importService from '../../services/importService'
import './AdminImportJSON.css'

function AdminImportJSON() {
  const [jsonText, setJsonText] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target.result
        setJsonText(content)
        setError(null)
      } catch (err) {
        setError('Errore lettura file: ' + err.message)
      }
    }
    reader.readAsText(file)
  }

  const handlePaste = () => {
    navigator.clipboard.readText().then(text => {
      try {
        // Valida che sia JSON valido
        JSON.parse(text)
        setJsonText(text)
        setError(null)
      } catch (err) {
        setError('JSON non valido. Controlla che il testo incollato sia un JSON corretto.')
      }
    }).catch(err => {
      setError('Errore accesso clipboard: ' + err.message)
    })
  }

  const handleImport = async () => {
    if (!jsonText.trim()) {
      setError('Incolla o carica il file JSON')
      return
    }

    setIsImporting(true)
    setError(null)
    setResult(null)

    try {
      // Valida e parse JSON
      const jsonData = JSON.parse(jsonText)
      
      const data = await importService.importPlayersFromJSON(jsonData, {
        batchSize: 50
      })

      setResult({
        success: true,
        total: data.total,
        imported: data.imported,
        updated: data.updated,
        errors: data.errors
      })
      
      // Pulisci campo dopo successo
      setJsonText('')
    } catch (err) {
      if (err.message.includes('JSON')) {
        setError('JSON non valido: ' + err.message)
      } else {
        setError(err.message || 'Errore durante l\'import')
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
        <h3>Importa Giocatori da JSON</h3>
        <p className="import-description">
          Incolla il contenuto del file JSON o carica il file direttamente
        </p>
      </div>

      <div className="import-form">
        <div className="import-actions">
          <label className="file-upload-btn">
            <FileText size={18} />
            Carica File JSON
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
            className="paste-btn"
          >
            Incolla da Clipboard
          </button>
        </div>

        <div className="textarea-field">
          <label>Contenuto JSON</label>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value)
              setError(null)
            }}
            placeholder='[{"name": "Nome Giocatore", "position": "CF", ...}, ...]'
            disabled={isImporting}
            rows={10}
          />
          {jsonText && (
            <small>
              {jsonText.length} caratteri • 
              {jsonText.split('\n').length} righe
            </small>
          )}
        </div>

        <button
          onClick={handleImport}
          disabled={isImporting || !jsonText.trim()}
          className="import-btn"
        >
          {isImporting ? (
            <>
              <Loader className="spinning" size={18} />
              Importazione in corso...
            </>
          ) : (
            <>
              <Upload size={18} />
              Importa Giocatori
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="import-error">
          <XCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {result && result.success && (
        <div className="import-success">
          <CheckCircle size={20} />
          <div className="import-stats">
            <h4>Import Completato!</h4>
            <ul>
              <li><strong>Totale:</strong> {result.total}</li>
              <li><strong>Creati:</strong> {result.imported}</li>
              <li><strong>Aggiornati:</strong> {result.updated}</li>
              {result.errors > 0 && (
                <li><strong>Errori:</strong> {result.errors}</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="import-error">
          <XCircle size={20} />
          <span>Errore: {result.error}</span>
        </div>
      )}
    </div>
  )
}

export default AdminImportJSON

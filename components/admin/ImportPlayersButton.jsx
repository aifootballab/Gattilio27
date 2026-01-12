'use client'

import React, { useState } from 'react'
import { Download, CheckCircle, XCircle, Loader } from 'lucide-react'
import * as importService from '../../services/importService'
import './ImportPlayersButton.css'

function ImportPlayersButton() {
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [googleDriveUrl, setGoogleDriveUrl] = useState('')

  // Estrae File ID da URL Google Drive
  const extractFileId = (url) => {
    const match = url.match(/[\/=]([a-zA-Z0-9_-]{25,})/)
    return match ? match[1] : null
  }

  const handleImport = async () => {
    if (!googleDriveUrl.trim()) {
      setError('Inserisci un URL Google Drive valido')
      return
    }

    setIsImporting(true)
    setError(null)
    setResult(null)

    try {
      // Converti URL in formato diretto se necessario
      const fileId = extractFileId(googleDriveUrl)
      const directUrl = fileId 
        ? `https://drive.google.com/uc?export=download&id=${fileId}`
        : googleDriveUrl

      console.log('Importing from:', directUrl)
      
      const data = await importService.importPlayersFromDrive(directUrl, {
        batchSize: 50
      })

      setResult({
        success: true,
        total: data.total,
        imported: data.imported,
        updated: data.updated,
        errors: data.errors
      })
    } catch (err) {
      setError(err.message || 'Errore durante l\'import')
      setResult({
        success: false,
        error: err.message
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="import-players-button">
      <div className="import-header">
        <h3>Importa Giocatori da Google Drive</h3>
        <p className="import-description">
          Importa giocatori dal file JSON su Google Drive. Il file deve essere pubblico o condiviso.
        </p>
      </div>

      <div className="import-form">
        <div className="input-field">
          <label>URL Google Drive</label>
          <input
            type="text"
            value={googleDriveUrl}
            onChange={(e) => setGoogleDriveUrl(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..."
            disabled={isImporting}
          />
          <small>
            Esempio: https://drive.google.com/file/d/FILE_ID/view
            <br />
            Oppure: https://drive.google.com/uc?export=download&id=FILE_ID
          </small>
        </div>

        <button
          onClick={handleImport}
          disabled={isImporting || !googleDriveUrl.trim()}
          className="import-btn"
        >
          {isImporting ? (
            <>
              <Loader className="spinning" size={18} />
              Importazione in corso...
            </>
          ) : (
            <>
              <Download size={18} />
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

export default ImportPlayersButton

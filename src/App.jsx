import React from 'react'
import './App.css'

function App() {
  const appName = import.meta.env.VITE_APP_NAME || 'Gattilio27'
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">Benvenuto Gattilio</h1>
        <p className="subtitle">Plattaforma eFootball</p>
        
        <div className="info-box">
          <h2>Configurazione</h2>
          <div className="config-info">
            <p><strong>App Name:</strong> {appName}</p>
            <p><strong>Supabase URL:</strong> {supabaseUrl ? '✅ Configurato' : '❌ Non configurato'}</p>
            <p><strong>Ambiente:</strong> {import.meta.env.MODE || 'development'}</p>
          </div>
        </div>

        <div className="status">
          <p className="status-text">✅ Repository collegato a GitHub</p>
          <p className="status-text">✅ Deploy automatico configurato per Vercel</p>
          <p className="status-text">✅ Supabase connesso tramite MCP</p>
        </div>
      </div>
    </div>
  )
}

export default App

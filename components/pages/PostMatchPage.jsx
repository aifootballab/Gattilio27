import React from 'react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import PostMatchStats from '../components/post-match/PostMatchStats'
import './PostMatchPage.css'

function PostMatchPage() {
  return (
    <DashboardLayout>
      <div className="post-match-page">
        <div className="page-header">
          <h1>Analisi Post-Partita</h1>
          <p>Inserisci le statistiche per ricevere analisi dettagliate</p>
        </div>

        <div className="post-match-content">
          <div className="stats-section">
            <PostMatchStats />
          </div>

          <div className="analysis-section">
            <h2>Analisi e Insights</h2>
            <div className="analysis-placeholder">
              <p>Inserisci le statistiche per vedere l'analisi completa</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default PostMatchPage

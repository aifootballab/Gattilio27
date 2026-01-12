import React from 'react'
import DashboardLayout from '../dashboard/DashboardLayout'
import MatchOverview from '../analisi/MatchOverview'
import LiveMatchData from '../analisi/LiveMatchData'
import PostMatchAnalysis from '../analisi/PostMatchAnalysis'
import './AnalisiPartitePage.css'

function AnalisiPartitePage() {
  return (
    <DashboardLayout>
      <div className="analisi-partite-page">
        <div className="analisi-header">
          <h1>Analisi Partite</h1>
          <p>Vista panoramica completa per l'analisi delle partite</p>
        </div>

        <div className="analisi-content">
          <div className="analisi-panoramic">
            <div className="analisi-left">
              <LiveMatchData />
            </div>
            
            <div className="analisi-center">
              <MatchOverview />
            </div>
            
            <div className="analisi-right">
              <PostMatchAnalysis />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AnalisiPartitePage

import React from 'react'
import DashboardLayout from '../dashboard/DashboardLayout'
import SinergieAnalysis from '../sinergie/SinergieAnalysis'
import BuildOptimizer from '../sinergie/BuildOptimizer'
import TeamStats from '../sinergie/TeamStats'
import './SinergiePage.css'

function SinergiePage() {
  return (
    <DashboardLayout>
      <div className="sinergie-page">
        <div className="sinergie-header">
          <h1>Sinergie & Build</h1>
          <p>Analizza le sinergie tra i tuoi giocatori e ottimizza la formazione</p>
        </div>

        <div className="sinergie-content">
          <div className="sinergie-main">
            <SinergieAnalysis />
            <BuildOptimizer />
          </div>
          
          <div className="sinergie-sidebar">
            <TeamStats />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default SinergiePage

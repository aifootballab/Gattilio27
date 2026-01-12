import React from 'react'
import DashboardLayout from '../dashboard/DashboardLayout'
import MatchHistory from '../statistiche/MatchHistory'
import PerformanceCharts from '../statistiche/PerformanceCharts'
import StatsComparison from '../statistiche/StatsComparison'
import './StatistichePage.css'

function StatistichePage() {
  return (
    <DashboardLayout>
      <div className="statistiche-page">
        <div className="statistiche-header">
          <h1>Le Mie Statistiche</h1>
          <p>Monitora le tue performance e migliora il tuo gioco</p>
        </div>

        <div className="statistiche-content">
          <div className="statistiche-main">
            <MatchHistory />
            <PerformanceCharts />
          </div>
          
          <div className="statistiche-sidebar">
            <StatsComparison />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default StatistichePage

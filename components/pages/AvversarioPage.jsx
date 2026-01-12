import React from 'react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import OpponentFormation2D from '../components/avversario/OpponentFormation2D'
import CounterMeasures from '../components/avversario/CounterMeasures'
import OpponentAnalysis from '../components/avversario/OpponentAnalysis'
import './AvversarioPage.css'

function AvversarioPage() {
  return (
    <DashboardLayout>
      <div className="avversario-page">
        <div className="avversario-header">
          <h1>Formazione Avversaria</h1>
          <p>Analizza l'avversario e ricevi contromisure tattiche</p>
        </div>

        <div className="avversario-content">
          <div className="avversario-main">
            <OpponentFormation2D />
            <CounterMeasures />
          </div>
          
          <div className="avversario-sidebar">
            <OpponentAnalysis />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default AvversarioPage

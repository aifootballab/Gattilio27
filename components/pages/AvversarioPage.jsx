import React from 'react'
import DashboardLayout from '../dashboard/DashboardLayout'
import OpponentFormation2D from '../avversario/OpponentFormation2D'
import CounterMeasures from '../avversario/CounterMeasures'
import OpponentAnalysis from '../avversario/OpponentAnalysis'
import './AvversarioPage.css'

function AvversarioPage() {
  return (
    <DashboardLayout>
      <div className="avversario-page">
        <div className="avversario-header">
          <h1>Formazione Avversaria</h1>
          <p>Analizza l&apos;avversario e ricevi contromisure tattiche</p>
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

import React from 'react'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import RosaProfiling from '../components/rosa/RosaProfiling'
import './RosaPage.css'

function RosaPage() {
  return (
    <DashboardLayout>
      <div className="rosa-page">
        <div className="rosa-header">
          <h1>Profilazione Rosa</h1>
          <p>Crea e gestisci la tua squadra</p>
        </div>
        <RosaProfiling />
      </div>
    </DashboardLayout>
  )
}

export default RosaPage

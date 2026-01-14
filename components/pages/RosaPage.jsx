'use client'

import React from 'react'
import DashboardLayout from '../dashboard/DashboardLayout'
import RosaTitolari from '../rosa/RosaTitolari'
import RosaPanchina from '../rosa/RosaPanchina'
import './RosaPage.css'

function RosaPage() {
  return (
    <DashboardLayout>
      <div className="rosa-page">
        <div className="rosa-header">
          <h1>La Mia Rosa</h1>
          <p className="rosa-hint">Usa il pulsante "Cervello" per aggiungere giocatori via screenshot o conversazione</p>
        </div>

        <div className="rosa-content">
          <div className="rosa-main">
            <RosaTitolari />
          </div>
          
          <div className="rosa-sidebar">
            <RosaPanchina />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default RosaPage

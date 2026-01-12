import React, { useState } from 'react'
import DashboardLayout from '../dashboard/DashboardLayout'
import RosaTitolari from '../rosa/RosaTitolari'
import RosaPanchina from '../rosa/RosaPanchina'
import RosaInputSelector from '../rosa/RosaInputSelector'
import './RosaPage.css'

function RosaPage() {
  const [showInputSelector, setShowInputSelector] = useState(false)

  return (
    <DashboardLayout>
      <div className="rosa-page">
        <div className="rosa-header">
          <h1>La Mia Rosa</h1>
          <button 
            className="add-player-btn"
            onClick={() => setShowInputSelector(true)}
          >
            + Aggiungi Giocatore
          </button>
        </div>

        {showInputSelector && (
          <div className="input-selector-overlay">
            <div className="input-selector-modal">
              <button 
                className="close-btn"
                onClick={() => setShowInputSelector(false)}
              >
                ×
              </button>
              <RosaInputSelector onClose={() => setShowInputSelector(false)} />
            </div>
          </div>
        )}

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

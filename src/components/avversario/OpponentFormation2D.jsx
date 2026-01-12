import React from 'react'
import OpponentFormation from '../opponent/OpponentFormation'
import './OpponentFormation2D.css'

function OpponentFormation2D() {
  return (
    <div className="opponent-formation-2d">
      <h2>Formazione Avversaria 2D</h2>
      <div className="formation-container">
        <OpponentFormation />
        {/* TODO: Aggiungere visualizzazione 2D campo con posizionamento */}
      </div>
    </div>
  )
}

export default OpponentFormation2D

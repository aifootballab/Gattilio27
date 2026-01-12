import React from 'react'
import './TacticalPitch.css'

function TacticalPitch() {
  return (
    <div className="tactical-pitch">
      <div className="pitch-container">
        {/* Field Background */}
        <div className="football-field">
          {/* Center Line */}
          <div className="center-line"></div>
          
          {/* Center Circle */}
          <div className="center-circle"></div>
          
          {/* Penalty Areas */}
          <div className="penalty-area top"></div>
          <div className="penalty-area bottom"></div>
          
          {/* Goal Areas */}
          <div className="goal-area top"></div>
          <div className="goal-area bottom"></div>
          
          {/* Player Icons - Mock */}
          <div className="player player-1" style={{ top: '20%', left: '30%' }}>1</div>
          <div className="player player-2" style={{ top: '40%', left: '25%' }}>2</div>
          <div className="player player-3" style={{ top: '60%', left: '30%' }}>3</div>
          <div className="player player-4" style={{ top: '80%', left: '35%' }}>4</div>
        </div>
      </div>
    </div>
  )
}

export default TacticalPitch

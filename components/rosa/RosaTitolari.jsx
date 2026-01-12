'use client'

import React from 'react'
import { useRosa } from '../../contexts/RosaContext'
import FormationView from './FormationView'
import PlayerCardDetailed from './PlayerCardDetailed'
import './RosaTitolari.css'

function RosaTitolari() {
  const { rosa } = useRosa()
  
  // Filtra titolari (slot 0-10) - rosa.players è array di 21 elementi (con null per slot vuoti)
  // IMPORTANTE: rosa.players mantiene l'ordine degli slot (0-20)
  const titolari = (rosa.players || [])
    .slice(0, 11) // Primi 11 slot (0-10)
    .filter(player => player !== null && player !== undefined) // Rimuovi slot vuoti

  return (
    <div className="rosa-titolari">
      <div className="titolari-header">
        <h2>Titolari</h2>
        <span className="players-count">{titolari.length}/11</span>
      </div>

      {titolari.length === 0 ? (
        <div className="empty-formation">
          <p>Nessun giocatore in formazione</p>
          <p className="hint">Aggiungi giocatori per vedere la formazione</p>
        </div>
      ) : (
        <>
          <FormationView players={titolari} />
          
          <div className="titolari-list">
            <h3>Dettagli Giocatori</h3>
            <div className="players-grid">
              {titolari.map((player) => (
                <PlayerCardDetailed key={player.player_id} player={player} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default RosaTitolari

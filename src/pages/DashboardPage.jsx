import React from 'react'
import { useRosa } from '../contexts/RosaContext'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import MatchCenterPanel from '../components/match-center/MatchCenterPanel'
import TacticalPitch from '../components/match-center/TacticalPitch'
import UserInfoPanel from '../components/dashboard/UserInfoPanel'
import './DashboardPage.css'

function DashboardPage() {
  const { rosa, hasRosa, playerCount } = useRosa()

  return (
    <DashboardLayout>
      <div className="dashboard-page">
        {/* Layout a 3 colonne - Vista Panoramica Completa */}
        <div className="dashboard-panoramic">
          {/* Left Panel */}
          <div className="dashboard-left">
            <MatchCenterPanel />
          </div>

          {/* Center Panel */}
          <div className="dashboard-center">
            <TacticalPitch />
          </div>

          {/* Right Panel */}
          <div className="dashboard-right">
            <UserInfoPanel />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DashboardPage

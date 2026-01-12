import React from 'react'
import DashboardLayout from '../dashboard/DashboardLayout'
import MatchCenterPanel from '../match-center/MatchCenterPanel'
import TacticalPitch from '../match-center/TacticalPitch'
import UserInfoPanel from '../dashboard/UserInfoPanel'
import './MatchCenterPage.css'

function MatchCenterPage() {
  return (
    <DashboardLayout>
      <div className="match-center-page">
        {/* Left Panel - Match Center Info */}
        <div className="match-center-left">
          <MatchCenterPanel />
        </div>

        {/* Center Panel - Tactical Pitch */}
        <div className="match-center-center">
          <TacticalPitch />
        </div>

        {/* Right Panel - User Info */}
        <div className="match-center-right">
          <UserInfoPanel />
        </div>
      </div>
    </DashboardLayout>
  )
}

export default MatchCenterPage

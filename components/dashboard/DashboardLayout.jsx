import React from 'react'
import SidebarNavigation from './SidebarNavigation'
import MainHeader from './MainHeader'
import './DashboardLayout.css'

function DashboardLayout({ children }) {
  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <SidebarNavigation />

      {/* Main Header */}
      <MainHeader />

      {/* Main Content Area */}
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  )
}

export default DashboardLayout

import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { RosaProvider } from './contexts/RosaContext'

// Pages
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import RosaPage from './pages/RosaPage'
import CoachingPage from './pages/CoachingPage'
import MatchCenterPage from './pages/MatchCenterPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <RosaProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/rosa" element={<RosaPage />} />
          <Route path="/match-center" element={<MatchCenterPage />} />
          <Route path="/coaching" element={<CoachingPage />} />
          <Route path="/analisi" element={<DashboardPage />} />
          <Route path="/impostazioni" element={<DashboardPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Router>
    </RosaProvider>
  )
}

export default App

import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { RosaProvider } from './contexts/RosaContext'

// Pages
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import RosaPage from './pages/RosaPage'
import SinergiePage from './pages/SinergiePage'
import StatistichePage from './pages/StatistichePage'
import AnalisiPartitePage from './pages/AnalisiPartitePage'
import AvversarioPage from './pages/AvversarioPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <RosaProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/rosa" element={<RosaPage />} />
          <Route path="/sinergie" element={<SinergiePage />} />
          <Route path="/statistiche" element={<StatistichePage />} />
          <Route path="/analisi-partite" element={<AnalisiPartitePage />} />
          <Route path="/avversario" element={<AvversarioPage />} />
          <Route path="/impostazioni" element={<DashboardPage />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Router>
    </RosaProvider>
  )
}

export default App

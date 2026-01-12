// NOTA: Questo file non è usato in Next.js
// Next.js usa la struttura app/ per il routing
// Questo file è mantenuto per compatibilità ma non viene compilato

import React from 'react'
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
  // In Next.js, il routing è gestito automaticamente dalla struttura app/
  // Questo componente non viene usato
  return (
    <RosaProvider>
      <div>
        {/* Routing gestito da Next.js app/ directory */}
        <HomePage />
      </div>
    </RosaProvider>
  )
}

export default App

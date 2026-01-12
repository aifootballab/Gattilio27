import React from 'react'
import Link from 'next/link'
import './NotFoundPage.css'

function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1>404</h1>
        <p>Pagina non trovata</p>
        <Link href="/" className="back-link">
          Torna alla Home
        </Link>
      </div>
    </div>
  )
}

export default NotFoundPage

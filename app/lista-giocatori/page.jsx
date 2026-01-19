'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ListaGiocatoriPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect a gestione-formazione (lista visibile lì: campo + riserve)
    router.push('/gestione-formazione')
  }, [router])
  
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div className="neon-text" style={{ fontSize: '24px', marginBottom: '20px' }}>
        Reindirizzamento a Gestione Formazione...
      </div>
    </div>
  )
}

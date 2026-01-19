'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function UploadPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect a gestione-formazione (tutto centralizzato lì)
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

'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()
  
  useEffect(() => {
    router.push('/login')
  }, [router])
  
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <div className="neon-text" style={{ fontSize: '24px', marginBottom: '20px' }}>Redirecting to login...</div>
    </div>
  )
}

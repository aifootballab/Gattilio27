import { redirect } from 'next/navigation'

export default function SinergieRedirect() {
  // Questa pagina è stata rimossa nella pulizia.
  // Manteniamo un redirect per evitare 404 da link/cache/prefetch vecchi.
  redirect('/dashboard')
}


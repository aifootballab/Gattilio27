'use client'

import { useTranslation } from '@/lib/i18n'
import Link from 'next/link'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <main style={{ padding: 24, textAlign: 'center' }}>
      <h1>{t('notFoundTitle')}</h1>
      <p>{t('notFoundMessage')}</p>
      <Link href="/" style={{ color: 'var(--neon-blue)', marginTop: 16, display: 'inline-block' }}>
        {t('back')}
      </Link>
    </main>
  )
}

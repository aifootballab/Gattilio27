import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const hasOpenaiKey = !!process.env.OPENAI_API_KEY
  return NextResponse.json({
    ok: true,
    hasOpenaiKey,
    // Nota: non esporre mai il valore della key
    vercelEnv: process.env.VERCEL_ENV || null,
  })
}


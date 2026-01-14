import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const hasOpenaiKey = !!process.env.OPENAI_API_KEY
  return NextResponse.json({
    ok: true,
    hasOpenaiKey,
    vercelEnv: process.env.VERCEL_ENV || null,
  })
}


import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const hasOpenaiKey = !!process.env.OPENAI_API_KEY
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasSupabaseAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasSupabaseServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
  return NextResponse.json({
    ok: true,
    hasOpenaiKey,
    hasSupabaseUrl,
    hasSupabaseAnonKey,
    hasSupabaseServiceRoleKey,
    vercelEnv: process.env.VERCEL_ENV || null,
  })
}


import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

function keyKind(key) {
  if (!key || typeof key !== 'string') return null
  if (key.startsWith('sb_secret_')) return 'sb_secret'
  if (key.startsWith('sb_publishable_')) return 'sb_publishable'
  // legacy jwt-looking keys (anon/service role)
  if (key.includes('.') && key.split('.').length >= 3) return 'jwt'
  return 'unknown'
}

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
    supabaseAnonKeyKind: keyKind(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabaseServiceRoleKeyKind: keyKind(process.env.SUPABASE_SERVICE_ROLE_KEY),
    vercelEnv: process.env.VERCEL_ENV || null,
  })
}


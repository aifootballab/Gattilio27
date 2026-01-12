import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL o Anon Key non configurati!')
  console.error('📝 Configura le variabili d\'ambiente:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Log di debug (solo in sviluppo)
if (process.env.NODE_ENV === 'development' && supabase) {
  console.log('✅ Supabase configurato correttamente')
}

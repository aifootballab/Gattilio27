import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase URL o Anon Key non configurati!')
  console.error('📝 Configura le variabili d\'ambiente:')
  console.error('   - VITE_SUPABASE_URL')
  console.error('   - VITE_SUPABASE_ANON_KEY')
  console.error('📖 Vedi: CONFIGURAZIONE_VARIABILI_AMBIENTE.md')
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Log di debug (solo in sviluppo)
if (import.meta.env.DEV && supabase) {
  console.log('✅ Supabase configurato correttamente')
}

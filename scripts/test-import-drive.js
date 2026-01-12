/**
 * Script di Test Import da Google Drive
 * 
 * Testa l'import dei giocatori chiamando direttamente l'Edge Function
 * 
 * Uso:
 *   node scripts/test-import-drive.js <google-drive-url>
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Configura variabili d\'ambiente:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL')
  console.error('   - NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_ANON_KEY')
  process.exit(1)
}

async function testImport(googleDriveUrl) {
  console.log('🧪 Test Import da Google Drive')
  console.log(`📂 URL: ${googleDriveUrl}\n`)

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/import-players-from-drive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        google_drive_url: googleDriveUrl,
        batch_size: 10 // Test con batch piccolo
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Errore:', data.error || data)
      if (data.details) {
        console.error('📋 Dettagli:', data.details)
      }
      process.exit(1)
    }

    console.log('✅ Import completato!')
    console.log('📊 Risultati:')
    console.log(`   Totale: ${data.total}`)
    console.log(`   Creati: ${data.imported}`)
    console.log(`   Aggiornati: ${data.updated}`)
    console.log(`   Errori: ${data.errors}`)
    
    if (data.errorsList && data.errorsList.length > 0) {
      console.log('\n⚠️  Prime 10 errori:')
      data.errorsList.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`)
      })
    }

  } catch (error) {
    console.error('❌ Errore durante il test:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// Estrae File ID da URL Google Drive
function extractFileId(url) {
  // Formato 1: https://drive.google.com/file/d/FILE_ID/view
  // Formato 2: https://drive.google.com/open?id=FILE_ID
  // Formato 3: https://drive.google.com/uc?export=download&id=FILE_ID
  
  const match = url.match(/[\/=]([a-zA-Z0-9_-]{25,})/)
  return match ? match[1] : null
}

const googleDriveUrl = process.argv[2]

if (!googleDriveUrl) {
  console.error('❌ Uso: node scripts/test-import-drive.js <google-drive-url>')
  console.error('\n💡 Esempi:')
  console.error('   node scripts/test-import-drive.js "https://drive.google.com/file/d/FILE_ID/view"')
  console.error('   node scripts/test-import-drive.js "https://drive.google.com/uc?export=download&id=FILE_ID"')
  process.exit(1)
}

// Estrai File ID e crea URL diretto
const fileId = extractFileId(googleDriveUrl)
if (!fileId) {
  console.error('❌ Impossibile estrarre File ID dall\'URL')
  console.error('   Assicurati che l\'URL contenga un File ID valido')
  process.exit(1)
}

const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`
console.log(`📋 File ID estratto: ${fileId}`)
console.log(`🔗 URL diretto: ${directUrl}\n`)

testImport(directUrl)
  .then(() => {
    console.log('\n✅ Test completato!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Test fallito:', error)
    process.exit(1)
  })

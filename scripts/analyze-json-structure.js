/**
 * Script di Analisi Struttura JSON
 * 
 * Analizza il file JSON e mostra la struttura per aiutare a configurare l'import
 * 
 * Uso:
 *   node scripts/analyze-json-structure.js <path-to-json-file>
 */

const fs = require('fs')

function analyzeJSON(filePath) {
  console.log(`📂 Analizzando: ${filePath}\n`)

  let jsonData
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    jsonData = JSON.parse(fileContent)
  } catch (error) {
    console.error('❌ Errore lettura file:', error.message)
    process.exit(1)
  }

  console.log('📊 TIPO DATI:')
  console.log(`   ${Array.isArray(jsonData) ? 'Array' : 'Oggetto'}`)
  
  if (Array.isArray(jsonData)) {
    console.log(`\n📦 DIMENSIONE: ${jsonData.length} elementi`)
    if (jsonData.length > 0) {
      console.log('\n📋 STRUTTURA PRIMO ELEMENTO:')
      console.log(JSON.stringify(jsonData[0], null, 2).substring(0, 2000))
      
      console.log('\n🔑 CHIAVI PRIMO ELEMENTO:')
      console.log('   ' + Object.keys(jsonData[0]).join(', '))
      
      if (jsonData.length > 1) {
        console.log('\n📋 STRUTTURA SECONDO ELEMENTO (per confronto):')
        console.log(JSON.stringify(jsonData[1], null, 2).substring(0, 1000))
      }
    }
  } else {
    console.log('\n🔑 CHIAVI OGGETTO PRINCIPALE:')
    console.log('   ' + Object.keys(jsonData).join(', '))
    
    // Cerca array dentro l'oggetto
    for (const key of Object.keys(jsonData)) {
      if (Array.isArray(jsonData[key])) {
        console.log(`\n📦 Trovato array in "${key}": ${jsonData[key].length} elementi`)
        if (jsonData[key].length > 0) {
          console.log(`\n📋 STRUTTURA PRIMO ELEMENTO di "${key}":`)
          console.log(JSON.stringify(jsonData[key][0], null, 2).substring(0, 2000))
          
          console.log(`\n🔑 CHIAVI PRIMO ELEMENTO di "${key}":`)
          console.log('   ' + Object.keys(jsonData[key][0]).join(', '))
        }
        break
      }
    }
  }

  // Statistiche campi comuni
  if (Array.isArray(jsonData) && jsonData.length > 0) {
    console.log('\n📈 STATISTICHE CAMPI:')
    const first = jsonData[0]
    const stats = {}
    
    for (const key of Object.keys(first)) {
      const values = jsonData.slice(0, Math.min(100, jsonData.length))
        .map(p => p[key])
        .filter(v => v !== null && v !== undefined && v !== '')
      
      stats[key] = {
        present: values.length,
        sample: values[0],
        type: typeof values[0],
        isArray: Array.isArray(values[0]),
        isObject: typeof values[0] === 'object' && !Array.isArray(values[0]) && values[0] !== null
      }
    }
    
    for (const [key, stat] of Object.entries(stats)) {
      console.log(`\n   ${key}:`)
      console.log(`      Tipo: ${stat.type}${stat.isArray ? ' (array)' : ''}${stat.isObject ? ' (oggetto)' : ''}`)
      console.log(`      Presente in: ${stat.present}/${Math.min(100, jsonData.length)} campioni`)
      if (stat.sample !== undefined) {
        const sampleStr = typeof stat.sample === 'object' 
          ? JSON.stringify(stat.sample).substring(0, 100)
          : String(stat.sample).substring(0, 100)
        console.log(`      Esempio: ${sampleStr}`)
      }
    }
  }

  console.log('\n✅ Analisi completata!')
  console.log('\n💡 Prossimi passi:')
  console.log('   1. Controlla la struttura sopra')
  console.log('   2. Adatta mapPlayerData() in import-players-from-json.js')
  console.log('   3. Testa con: node scripts/import-players-from-json.js <file>')
}

const filePath = process.argv[2]

if (!filePath) {
  console.error('❌ Uso: node scripts/analyze-json-structure.js <path-to-json-file>')
  process.exit(1)
}

analyzeJSON(filePath)

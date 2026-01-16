/**
 * Normalizza un input in un array di stringhe.
 * Gestisce tutti i casi edge: array, stringa (JSON o semplice), oggetto, undefined, null.
 * 
 * @param input - Input da normalizzare (array, stringa, oggetto, null, undefined)
 * @returns Array di stringhe (sempre, anche se vuoto)
 */
export function normalizeStringArray(input: unknown): string[] {
  // Se è già un array di stringhe, ok
  if (Array.isArray(input)) {
    // Filtra solo stringhe valide
    return input.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  }

  // Se è una stringa, prova a fare JSON.parse, altrimenti tratta come stringa semplice
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!trimmed) return []
    
    // Prova JSON.parse (es: '["stats","skills"]')
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      }
      // Se parse ha successo ma non è un array, tratta come stringa semplice
    } catch {
      // JSON.parse fallito, tratta come stringa semplice
    }
    
    // Stringa semplice (es: "stats,skills" o "stats")
    // Se contiene virgole, splitta, altrimenti array con un elemento
    if (trimmed.includes(',')) {
      return trimmed.split(',').map(s => s.trim()).filter(s => s.length > 0)
    }
    return [trimmed]
  }

  // Se è un oggetto, prova a estrarre valori
  if (input !== null && typeof input === 'object') {
    const values = Object.values(input).filter(v => typeof v === 'string' && v.trim().length > 0)
    if (values.length > 0) {
      return values.map(v => String(v).trim())
    }
  }

  // Caso default: array vuoto
  return []
}

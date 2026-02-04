/**
 * Helper per mappare errori tecnici a messaggi user-friendly.
 * Usato per non spaventare l'utente con errori tecnici.
 */

// Mappatura errori tecnici → messaggi utente
const ERROR_MAPPINGS = [
  // Errori OpenAI/Quota
  {
    patterns: ['quota', 'billing', 'exceeded your current quota', 'rate limit exceeded'],
    message: 'Servizio momentaneamente sovraccarico. Riprova tra qualche minuto.',
    code: 'QUOTA_EXCEEDED'
  },
  // Errori di rete/timeout
  {
    patterns: ['timeout', 'request took too long', 'network error', 'fetch', 'failed to fetch'],
    message: 'Connessione lenta o interrotta. Verifica la tua rete e riprova.',
    code: 'NETWORK_ERROR'
  },
  // Errori sessione
  {
    patterns: ['sessione scaduta', 'session expired', 'invalid authentication', 'token', 'jwt'],
    message: 'Sessione scaduta. Accedi di nuovo per continuare.',
    code: 'SESSION_EXPIRED',
    action: 'redirect_login'
  },
  // Errori Supabase/RLS
  {
    patterns: ['pgrst', 'new row violates row-level security', 'rls', 'permission denied'],
    message: 'Non hai i permessi per questa operazione. Ricarica la pagina.',
    code: 'PERMISSION_DENIED'
  },
  // Errori immagine
  {
    patterns: ['image too large', 'immagine troppo grande', 'max 10mb', 'invalid image'],
    message: 'Immagine troppo grande o non valida. Usa un file più piccolo (max 10MB).',
    code: 'IMAGE_ERROR'
  },
  // Errori estrazione
  {
    patterns: ['extract', 'estrazione', 'failed to parse', 'json parse', 'parsing'],
    message: 'Errore nella lettura dei dati. Prova con un altro screenshot più nitido.',
    code: 'EXTRACTION_ERROR'
  },
  // Errori duplicati
  {
    patterns: ['duplicate', 'duplicato', 'already exists', 'già presente'],
    message: 'Dato già esistente. Verifica se hai già caricato questi dati.',
    code: 'DUPLICATE_ERROR'
  },
  // Errori server generici
  {
    patterns: ['500', 'internal server error', '502', '503', 'bad gateway'],
    message: 'Errore del server. Riprova tra poco.',
    code: 'SERVER_ERROR'
  },
  // Errori validazione
  {
    patterns: ['required', 'obbligatorio', 'invalid', 'non valido', 'missing'],
    message: 'Dati mancanti o non validi. Verifica i campi inseriti.',
    code: 'VALIDATION_ERROR'
  }
];

/**
 * Trasforma un errore tecnico in un messaggio user-friendly.
 * @param {Error|string} error - Errore da mappare
 * @param {string} [fallbackMessage='Si è verificato un errore. Riprova.'] - Messaggio di fallback
 * @returns {{message: string, code: string, action?: string}} - Messaggio e codice errore
 */
export function mapErrorToUserMessage(error, fallbackMessage = 'Si è verificato un errore. Riprova.') {
  const errorString = (error?.message || error || '').toLowerCase();
  
  for (const mapping of ERROR_MAPPINGS) {
    const matches = mapping.patterns.some(pattern => 
      errorString.includes(pattern.toLowerCase())
    );
    
    if (matches) {
      return {
        message: mapping.message,
        code: mapping.code,
        action: mapping.action
      };
    }
  }
  
  // Se non trovato mappatura, ritorna messaggio fallback
  return {
    message: fallbackMessage,
    code: 'UNKNOWN_ERROR'
  };
}

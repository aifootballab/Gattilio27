/**
 * Helper Centralizzato per Gestione Alert Enterprise-Grade
 * 
 * Fornisce API unificata per mostrare alert e conferme.
 * Retrocompatibile: può essere usato parallelamente a showToast() esistente.
 */

/**
 * Mostra un alert (toast, banner, o inline)
 * 
 * @param {string} message - Messaggio principale
 * @param {string} variant - 'info' | 'success' | 'warning' | 'error'
 * @param {object} options - Opzioni aggiuntive
 * @param {string} options.type - 'toast' | 'banner' | 'inline' (default: 'toast')
 * @param {string} options.details - Dettagli opzionali
 * @param {array} options.actions - Array di { label, onClick } per azioni
 * @param {function} options.onDismiss - Callback per dismiss
 * @param {number} options.autoDismiss - ms per auto-dismiss (solo toast)
 * @param {boolean} options.persistent - Se true, non auto-dismiss (solo toast)
 * 
 * @returns {function} Funzione per chiudere l'alert manualmente
 */
export function showAlert(message, variant = 'info', options = {}) {
  const {
    type = 'toast',
    details = null,
    actions = [],
    onDismiss = null,
    autoDismiss = type === 'toast' ? 4000 : null,
    persistent = false
  } = options

  // In un'app React, questo dovrebbe essere integrato con un Context/Provider
  // Per ora, ritorna una funzione che può essere chiamata per mostrare l'alert
  // L'implementazione completa richiede un AlertProvider nel layout
  
  console.warn('[alertHelper] showAlert chiamato. Richiede AlertProvider nel layout per funzionare completamente.')
  
  // Ritorna funzione per chiudere (per uso futuro con Context)
  return () => {
    if (onDismiss) onDismiss()
  }
}

/**
 * Mostra un modal di conferma
 * 
 * @param {object} options - Opzioni del modal
 * @param {string} options.title - Titolo del modal
 * @param {string} options.message - Messaggio principale
 * @param {string} options.details - Dettagli opzionali
 * @param {string} options.confirmLabel - Etichetta bottone conferma
 * @param {string} options.cancelLabel - Etichetta bottone annulla
 * @param {string} options.variant - 'info' | 'warning' | 'error'
 * @param {string} options.confirmVariant - 'primary' | 'danger'
 * @param {function} options.onConfirm - Callback conferma
 * @param {function} options.onCancel - Callback annulla
 * 
 * @returns {function} Funzione per chiudere il modal manualmente
 */
export function showConfirm(options = {}) {
  const {
    title,
    message,
    details = null,
    confirmLabel = 'Conferma',
    cancelLabel = 'Annulla',
    variant = 'warning',
    confirmVariant = 'primary',
    onConfirm,
    onCancel
  } = options

  // In un'app React, questo dovrebbe essere integrato con un Context/Provider
  // Per ora, ritorna una funzione che può essere chiamata per mostrare il modal
  // L'implementazione completa richiede un ConfirmModalProvider nel layout
  
  console.warn('[alertHelper] showConfirm chiamato. Richiede ConfirmModalProvider nel layout per funzionare completamente.')
  
  // Ritorna funzione per chiudere (per uso futuro con Context)
  return () => {
    if (onCancel) onCancel()
  }
}

/**
 * Helper per creare messaggi di errore specifici
 * 
 * @param {Error|string} error - Errore o messaggio
 * @param {object} context - Contesto aggiuntivo
 * @returns {object} Oggetto con message, details, variant, actions
 */
export function createErrorAlert(error, context = {}) {
  const errorMessage = error?.message || error || 'Errore sconosciuto'
  const { operation = null, suggestions = [], retryAction = null } = context

  let message = errorMessage
  let details = null
  let variant = 'error'
  let actions = []

  // Identifica tipo errore e crea messaggio specifico
  if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
    message = 'Connessione persa'
    details = 'Impossibile connettersi al server. Verifica la tua connessione internet e riprova.'
    if (retryAction) {
      actions.push({ label: 'Riprova', onClick: retryAction })
    }
  } else if (errorMessage.includes('session') || errorMessage.includes('token') || errorMessage.includes('auth')) {
    message = 'Sessione scaduta'
    details = 'La tua sessione è scaduta. Ricarica la pagina per accedere di nuovo.'
    actions.push({ label: 'Ricarica Pagina', onClick: () => window.location.reload() })
  } else if (errorMessage.includes('quota') || errorMessage.includes('billing')) {
    message = 'Quota OpenAI esaurita'
    details = 'Controlla il tuo piano e i dettagli di fatturazione su https://platform.openai.com/account/billing'
    actions.push({ 
      label: 'Vai a Billing', 
      onClick: () => window.open('https://platform.openai.com/account/billing', '_blank') 
    })
  } else if (errorMessage.includes('timeout')) {
    message = 'Timeout operazione'
    details = 'L\'operazione ha richiesto troppo tempo. Riprova.'
    if (retryAction) {
      actions.push({ label: 'Riprova', onClick: retryAction })
    }
  } else if (operation) {
    message = `Errore durante ${operation}`
    details = errorMessage
    if (retryAction) {
      actions.push({ label: 'Riprova', onClick: retryAction })
    }
  }

  // Aggiungi suggerimenti se forniti
  if (suggestions.length > 0) {
    details = details 
      ? `${details}\n\nSuggerimenti:\n${suggestions.map(s => `- ${s}`).join('\n')}`
      : `Suggerimenti:\n${suggestions.map(s => `- ${s}`).join('\n')}`
  }

  return {
    message,
    details,
    variant,
    actions,
    type: 'toast',
    autoDismiss: actions.length > 0 ? 8000 : 4000, // Più tempo se ci sono azioni
    persistent: actions.length > 0 // Persistent se ci sono azioni
  }
}

/**
 * Helper per creare messaggi di successo specifici
 * 
 * @param {string} operation - Operazione completata
 * @param {object} details - Dettagli aggiuntivi
 * @returns {object} Oggetto con message, variant
 */
export function createSuccessAlert(operation, details = null) {
  return {
    message: operation || 'Operazione completata con successo',
    details,
    variant: 'success',
    type: 'toast',
    autoDismiss: 4000
  }
}

/**
 * Helper per creare messaggi di warning specifici
 * 
 * @param {string} message - Messaggio warning
 * @param {string} details - Dettagli opzionali
 * @param {array} actions - Azioni opzionali
 * @returns {object} Oggetto con message, variant
 */
export function createWarningAlert(message, details = null, actions = []) {
  return {
    message,
    details,
    variant: 'warning',
    actions,
    type: 'toast',
    autoDismiss: actions.length > 0 ? 8000 : 5000,
    persistent: actions.length > 0
  }
}

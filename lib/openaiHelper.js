/**
 * Helper per chiamate OpenAI con timeout, retry e error handling migliorato
 */

const OPENAI_TIMEOUT_MS = 60000 // 60 secondi
const MAX_RETRIES = 2
const RETRY_DELAY_MS = {
  rate_limit: 5000, // 5 secondi per rate limit
  timeout: 10000, // 10 secondi per timeout
  server_error: 5000 // 5 secondi per errori server
}

/**
 * Esegue chiamata OpenAI con timeout e retry automatico
 * @param {string} apiKey - OpenAI API key
 * @param {Object} requestBody - Body della richiesta OpenAI
 * @param {string} operationType - Tipo operazione per logging (es. 'extract-player')
 * @returns {Promise<Response>} - Risposta OpenAI
 */
export async function callOpenAIWithRetry(apiKey, requestBody, operationType = 'openai-call') {
  let lastError = null
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Crea AbortController per timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS)
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // Se risposta OK, ritorna
      if (response.ok) {
        return response
      }
      
      // Gestisci errori specifici
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      const errorCode = errorData.error?.code || errorData.error?.type || 'unknown'
      const statusCode = response.status
      
      // Rate limit: retry dopo 5 secondi
      if (statusCode === 429 || errorCode === 'rate_limit_exceeded') {
        if (attempt < MAX_RETRIES) {
          console.log(`[${operationType}] Rate limit hit, retrying in ${RETRY_DELAY_MS.rate_limit}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS.rate_limit))
          continue
        }
        lastError = { type: 'rate_limit', message: 'Rate limit reached. Please try again in a minute.' }
        break
      }
      
      // Server error (500-503): retry dopo 5 secondi
      if (statusCode >= 500 && statusCode < 504) {
        if (attempt < MAX_RETRIES) {
          console.log(`[${operationType}] Server error ${statusCode}, retrying in ${RETRY_DELAY_MS.server_error}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS.server_error))
          continue
        }
        lastError = { type: 'server_error', message: 'Service temporarily unavailable. Please try again.' }
        break
      }
      
      // Altri errori: non retry, ritorna errore
      lastError = { type: 'client_error', message: 'Unable to process request. Please check your input and try again.' }
      break
      
    } catch (err) {
      // Timeout o abort
      if (err.name === 'AbortError' || err.message?.includes('timeout')) {
        if (attempt < MAX_RETRIES) {
          console.log(`[${operationType}] Timeout, retrying in ${RETRY_DELAY_MS.timeout}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS.timeout))
          continue
        }
        lastError = { type: 'timeout', message: 'Request took too long. Please try again with a smaller image or different image.' }
        break
      }
      
      // Altri errori di rete
      if (attempt < MAX_RETRIES) {
        console.log(`[${operationType}] Network error, retrying in ${RETRY_DELAY_MS.server_error}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS.server_error))
        continue
      }
      
      lastError = { type: 'network_error', message: 'Network error. Please check your connection and try again.' }
      break
    }
  }
  
  // Se arriviamo qui, tutti i retry sono falliti
  throw lastError || { type: 'unknown_error', message: 'Unable to complete request. Please try again.' }
}

/**
 * Estrae e valida risposta JSON da OpenAI
 * @param {Response} response - Risposta OpenAI
 * @param {string} operationType - Tipo operazione per logging
 * @returns {Promise<Object>} - Dati estratti
 */
export async function parseOpenAIResponse(response, operationType = 'openai-call') {
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content
  
  if (!content) {
    throw { type: 'no_content', message: 'No content in response. Please try again with a different image.' }
  }
  
  try {
    const parsed = JSON.parse(content)
    return parsed
  } catch (parseErr) {
    console.error(`[${operationType}] JSON parse error:`, parseErr)
    throw { type: 'parse_error', message: 'Unable to process extracted data. Please try again with a different image.' }
  }
}

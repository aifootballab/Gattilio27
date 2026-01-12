// Service per gestire upload screenshot e chiamata Vision API

import { supabase } from '@/lib/supabase'

const MAX_IMAGE_SIZE_MB = 10
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

/**
 * Upload screenshot a Supabase Storage
 */
export async function uploadScreenshot(file, userId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // Validazione file
  if (!file) {
    throw new Error('File non fornito')
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Tipo file non supportato. Usa: ${ALLOWED_IMAGE_TYPES.join(', ')}`)
  }

  const fileSizeMB = file.size / (1024 * 1024)
  if (fileSizeMB > MAX_IMAGE_SIZE_MB) {
    throw new Error(`File troppo grande. Massimo: ${MAX_IMAGE_SIZE_MB}MB`)
  }

  // Genera nome file univoco
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = `player-screenshots/${fileName}`

  // Upload a Supabase Storage
  const { data, error } = await supabase.storage
    .from('player-screenshots')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(`Errore upload: ${error.message}`)
  }

  // Ottieni URL pubblico
  const { data: { publicUrl } } = supabase.storage
    .from('player-screenshots')
    .getPublicUrl(filePath)

  return {
    path: filePath,
    url: publicUrl,
    fileName: fileName
  }
}

/**
 * Processa screenshot con Vision API
 */
export async function processScreenshot(imageUrl, imageType, userId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  // Chiama Edge Function
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('Utente non autenticato')
  }

  const { data, error } = await supabase.functions.invoke('process-screenshot', {
    body: {
      image_url: imageUrl,
      image_type: imageType,
      user_id: userId || session.user.id
    }
  })

  if (error) {
    throw new Error(`Errore processing: ${error.message}`)
  }

  return data
}

/**
 * Ottieni log processing
 */
export async function getProcessingLog(logId) {
  if (!supabase) {
    throw new Error('Supabase non configurato')
  }

  const { data, error } = await supabase
    .from('screenshot_processing_log')
    .select('*')
    .eq('id', logId)
    .single()

  if (error) {
    throw new Error(`Errore recupero log: ${error.message}`)
  }

  return data
}

/**
 * Upload e processa screenshot in un'unica chiamata
 */
export async function uploadAndProcessScreenshot(file, imageType, userId) {
  try {
    // 1. Upload
    const uploadResult = await uploadScreenshot(file, userId)
    
    // 2. Process
    const processResult = await processScreenshot(
      uploadResult.url,
      imageType,
      userId
    )

    return {
      upload: uploadResult,
      processing: processResult
    }
  } catch (error) {
    console.error('Error in uploadAndProcessScreenshot:', error)
    throw error
  }
}

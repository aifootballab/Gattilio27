'use client'

import React from 'react'

/**
 * Hook React per Gestione Alert Enterprise-Grade
 * 
 * Fornisce API semplice per mostrare alert e conferme.
 * Retrocompatibile: può essere usato parallelamente a showToast() esistente.
 */

const AlertContext = React.createContext(null)

/**
 * Provider per Alert System
 * Deve essere wrappato attorno all'app nel layout
 */
export function AlertProvider({ children }) {
  const [alerts, setAlerts] = React.useState([])
  const [confirmModal, setConfirmModal] = React.useState(null)

  const showAlert = React.useCallback((message, variant = 'info', options = {}) => {
    const id = Math.random().toString(36).substr(2, 9)
    const alert = {
      id,
      message,
      variant,
      ...options
    }
    setAlerts(prev => [...prev, alert])
    
    // Ritorna funzione per chiudere
    return () => {
      setAlerts(prev => prev.filter(a => a.id !== id))
    }
  }, [])

  const hideAlert = React.useCallback((id) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }, [])

  const showConfirm = React.useCallback((options) => {
    setConfirmModal({
      show: true,
      ...options
    })
    
    // Ritorna funzione per chiudere
    return () => {
      setConfirmModal(null)
    }
  }, [])

  const hideConfirm = React.useCallback(() => {
    setConfirmModal(null)
  }, [])

  const value = {
    alerts,
    confirmModal,
    showAlert,
    hideAlert,
    showConfirm,
    hideConfirm
  }

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertRenderer />
      <ConfirmModalRenderer />
    </AlertContext.Provider>
  )
}

/**
 * Componente interno per renderizzare alert
 */
function AlertRenderer() {
  const { alerts, hideAlert } = React.useContext(AlertContext)
  
  if (!alerts || alerts.length === 0) return null

  // Import dinamico per evitare circular dependencies
  const Alert = React.lazy(() => import('@/components/Alert').then(m => ({ default: m.default })))

  return (
    <>
      {alerts.map(alert => (
        <React.Suspense key={alert.id} fallback={null}>
          <Alert
            {...alert}
            onDismiss={() => hideAlert(alert.id)}
          />
        </React.Suspense>
      ))}
    </>
  )
}

/**
 * Componente interno per renderizzare confirm modal
 */
function ConfirmModalRenderer() {
  const { confirmModal, hideConfirm } = React.useContext(AlertContext)
  
  if (!confirmModal) return null

  // Import dinamico per evitare circular dependencies
  const ConfirmModal = React.lazy(() => import('@/components/ConfirmModal').then(m => ({ default: m.default })))

  return (
    <React.Suspense fallback={null}>
      <ConfirmModal
        {...confirmModal}
        onCancel={() => {
          confirmModal.onCancel?.()
          hideConfirm()
        }}
        onConfirm={() => {
          confirmModal.onConfirm?.()
          hideConfirm()
        }}
      />
    </React.Suspense>
  )
}

/**
 * Hook per usare Alert System
 * 
 * @returns {object} { showAlert, showConfirm, hideAlert, hideConfirm }
 */
export function useAlert() {
  const context = React.useContext(AlertContext)
  if (!context) {
    // Fallback: ritorna funzioni no-op se provider non presente
    // Questo garantisce retrocompatibilità
    return {
      showAlert: () => {
        console.warn('[useAlert] AlertProvider non trovato. Aggiungi <AlertProvider> nel layout.')
        return () => {}
      },
      showConfirm: () => {
        console.warn('[useAlert] AlertProvider non trovato. Aggiungi <AlertProvider> nel layout.')
        return () => {}
      },
      hideAlert: () => {},
      hideConfirm: () => {}
    }
  }
  return context
}

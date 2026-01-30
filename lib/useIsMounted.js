import { useEffect, useRef } from 'react';

/**
 * Hook per verificare se il componente è ancora montato.
 * Utile per prevenire memory leaks e aggiornamenti su componenti smontati.
 * 
 * @example
 * const isMounted = useIsMounted();
 * 
 * useEffect(() => {
 *   fetchData().then(data => {
 *     if (isMounted()) {
 *       setData(data);
 *     }
 *   });
 * }, []);
 */
export function useIsMounted() {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return () => isMountedRef.current;
}

/**
 * Wrapper per funzioni async che verifica se il componente è montato
 * prima di eseguire il callback.
 * 
 * @example
 * const safeAsync = useSafeAsync();
 * 
 * const handleClick = async () => {
 *   const result = await safeAsync(fetchData());
 *   if (result) {
 *     setData(result); // Solo se componente ancora montato
 *   }
 * };
 */
export function useSafeAsync() {
  const isMounted = useIsMounted();

  return async (promise) => {
    try {
      const result = await promise;
      return isMounted() ? result : null;
    } catch (error) {
      if (isMounted()) {
        throw error;
      }
      return null;
    }
  };
}

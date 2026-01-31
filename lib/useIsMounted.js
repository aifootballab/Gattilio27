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


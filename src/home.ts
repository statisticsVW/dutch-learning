import { createContext } from 'preact';
import { useContext, useEffect, useRef } from 'preact/hooks';

/**
 * The Home button lives in the header (PersonaliseGate), outside the app's own screens. Each tap
 * counts up, and the app goes back to its home screen whenever the count changes.
 */
export const HomeRequests = createContext(0);

/** Calls `goHome` each time the Home button is tapped (not on first render). */
export function useHomeRequests(goHome: () => void) {
  const requests = useContext(HomeRequests);
  const seen = useRef(requests);
  useEffect(() => {
    if (requests === seen.current) return;
    seen.current = requests;
    goHome();
  }, [requests]);
}

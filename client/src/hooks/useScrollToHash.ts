import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Scrolls to `#id` in the URL once the page's content is ready (React Router doesn't do this itself). */
export function useScrollToHash(ready: boolean) {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready || !hash) return;
    const el = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [ready, hash]);
}

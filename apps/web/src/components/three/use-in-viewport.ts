import { useEffect, useState, type RefObject } from 'react';

/** Whether the element is on screen, so 3D scenes stop rendering when it isn't. */
export function useInViewport(ref: RefObject<Element | null>, rootMargin = '120px'): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  return visible;
}

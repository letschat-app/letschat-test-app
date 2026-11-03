import { useState, useEffect } from 'react';

export const DESKTOP_BREAKPOINT = 1024;

/**
 * Hook to centralize mobile/tablet vs desktop layout switching.
 * Viewport width >= 1024px is considered desktop (split view, sidebar).
 * Viewport width < 1024px (including 768px-1023px tablet) uses the mobile layout
 * with bottom navigation and single-pane views.
 *
 * @returns {boolean} Whether the current viewport is desktop width (>= 1024px).
 */
export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= DESKTOP_BREAKPOINT;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isDesktop;
}

export default useIsDesktop;

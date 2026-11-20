import { useState, useRef, useCallback } from 'react';

/**
 * useMediaGalleryGestures
 * Handles touch gestures for the full-screen media viewer:
 * - 1x zoom: Horizontal swipe (next/prev) with rubber-banding at boundaries
 * - 1x zoom: Vertical swipe-down (>100px) to dismiss with backdrop fade
 * - Pinch-to-zoom: 1x to 4x scaling with 2-finger touch
 * - Double-tap / double-click: Toggle between 1x and 2.5x
 * - Pan clamping when zoomed in (scale > 1)
 */
export function useMediaGalleryGestures({
  onNext,
  onPrev,
  onClose,
  canGoNext,
  canGoPrev,
  enabled = true,
}) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isSwiping, setIsSwiping] = useState(false);

  // References for tracking touch points
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const lastTouchRef = useRef({ x: 0, y: 0 });
  const initialPinchDistRef = useRef(null);
  const initialScaleRef = useRef(1);
  const lastTapTimeRef = useRef(0);
  const isAxisLockedRef = useRef(null); // 'x' | 'y' | null

  // Reset zoom and pan
  const resetZoom = useCallback(() => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
    setIsSwiping(false);
    isAxisLockedRef.current = null;
  }, []);

  // Clamping helper for panning when zoomed
  const clampPan = useCallback((newPan, currentScale) => {
    if (currentScale <= 1) return { x: 0, y: 0 };
    // Estimate max allowable pan bounds based on viewport
    const maxX = (window.innerWidth * (currentScale - 1)) / 2;
    const maxY = (window.innerHeight * (currentScale - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, newPan.x)),
      y: Math.max(-maxY, Math.min(maxY, newPan.y)),
    };
  }, []);

  // Double tap / click handler
  const handleDoubleTap = useCallback((clientX, clientY) => {
    if (scale > 1) {
      resetZoom();
    } else {
      const targetScale = 2.5;
      // Focus zoom towards tapped point
      const originX = (window.innerWidth / 2 - clientX) * 0.8;
      const originY = (window.innerHeight / 2 - clientY) * 0.8;
      const clamped = clampPan({ x: originX, y: originY }, targetScale);
      setScale(targetScale);
      setPan(clamped);
    }
  }, [scale, resetZoom, clampPan]);

  const onTouchStart = useCallback((e) => {
    if (!enabled) return;

    if (e.touches.length === 2) {
      // Pinch started
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistRef.current = Math.hypot(dx, dy);
      initialScaleRef.current = scale;
      isAxisLockedRef.current = 'pinch';
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();

      // Double-tap detection (< 300ms between taps)
      if (now - lastTapTimeRef.current < 300) {
        handleDoubleTap(touch.clientX, touch.clientY);
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: now };
      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
      setIsSwiping(true);
      isAxisLockedRef.current = null;
    }
  }, [enabled, scale, handleDoubleTap]);

  const onTouchMove = useCallback((e) => {
    if (!enabled) return;

    // Handle 2-finger pinch
    if (e.touches.length === 2 && initialPinchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / initialPinchDistRef.current;
      const nextScale = Math.max(1, Math.min(4.5, initialScaleRef.current * ratio));
      setScale(nextScale);
      if (nextScale <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;

      if (scale > 1) {
        // Pan while zoomed
        const moveX = touch.clientX - lastTouchRef.current.x;
        const moveY = touch.clientY - lastTouchRef.current.y;
        lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
        setPan((prev) => clampPan({ x: prev.x + moveX, y: prev.y + moveY }, scale));
        return;
      }

      // Scale === 1: Determine gesture direction axis
      if (!isAxisLockedRef.current) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          isAxisLockedRef.current = Math.abs(dy) > Math.abs(dx) ? 'y' : 'x';
        }
      }

      if (isAxisLockedRef.current === 'y') {
        // Vertical pull (dismiss gesture) - allow downward swipe, slight upward resistance
        const clampedY = dy > 0 ? dy : dy * 0.3;
        setDragOffset({ x: 0, y: clampedY });
      } else if (isAxisLockedRef.current === 'x') {
        // Horizontal gallery swipe with rubber-banding at boundaries
        let activeX = dx;
        if ((dx > 0 && !canGoPrev) || (dx < 0 && !canGoNext)) {
          activeX = dx * 0.3; // Rubber-band resistance
        }
        setDragOffset({ x: activeX, y: 0 });
      }
    }
  }, [enabled, scale, clampPan, canGoNext, canGoPrev]);

  const onTouchEnd = useCallback(() => {
    if (!enabled) return;
    setIsSwiping(false);
    initialPinchDistRef.current = null;

    if (scale > 1) {
      return; // Keep pan position when zoomed
    }

    const { x, y } = dragOffset;
    const axis = isAxisLockedRef.current;
    isAxisLockedRef.current = null;

    // 1. Vertical Swipe Down to Dismiss (threshold > 110px)
    if (axis === 'y' && y > 110) {
      onClose?.();
      return;
    }

    // 2. Horizontal Swipe Navigation (threshold > 60px)
    if (axis === 'x') {
      if (x < -60 && canGoNext) {
        onNext?.();
      } else if (x > 60 && canGoPrev) {
        onPrev?.();
      }
    }

    // Snap back if threshold not met
    setDragOffset({ x: 0, y: 0 });
  }, [enabled, scale, dragOffset, canGoNext, canGoPrev, onNext, onPrev, onClose]);

  // Desktop wheel zoom support (Ctrl + wheel or standard wheel when centered)
  const onWheel = useCallback((e) => {
    if (!enabled) return;
    if (e.ctrlKey || Math.abs(e.deltaY) < 100) {
      e.preventDefault();
      const zoomDelta = -e.deltaY * 0.005;
      setScale((prev) => {
        const next = Math.max(1, Math.min(4.5, prev + zoomDelta));
        if (next <= 1) setPan({ x: 0, y: 0 });
        return next;
      });
    }
  }, [enabled]);

  return {
    scale,
    setScale,
    pan,
    setPan,
    dragOffset,
    isSwiping,
    resetZoom,
    handleDoubleTap,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onWheel,
      onDoubleClick: (e) => handleDoubleTap(e.clientX, e.clientY),
    },
  };
}

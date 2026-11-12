import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, RotateCcw, X } from 'lucide-react';
import useBackClose from '../../hooks/useBackClose';
import { loadToCanvas, canvasPoint } from '../../editor/editorUtils';

const MIN_CROP_SIZE = 48;

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function createInitialBox(cw, ch) {
  const minDim = Math.min(cw, ch);
  const size = Math.max(Math.min(MIN_CROP_SIZE, minDim), Math.round(minDim * 0.88));
  return {
    x: Math.round((cw - size) / 2),
    y: Math.round((ch - size) / 2),
    size,
  };
}

function drawCropOverlay(overlay, box) {
  if (!overlay || !box) return;
  const ctx = overlay.getContext('2d');
  const cw = overlay.width;
  const ch = overlay.height;
  const rect = overlay.getBoundingClientRect();
  const cssW = rect.width || Math.min(cw, (typeof window !== 'undefined' ? window.innerWidth - 32 : cw));
  const k = cw / Math.max(1, cssW);

  ctx.clearRect(0, 0, cw, ch);

  // Dim area outside 1:1 square using even-odd fill rule
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  ctx.rect(box.x, box.y, box.size, box.size);
  ctx.fill('evenodd');
  ctx.restore();

  // Crisp square border
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 * k;
  ctx.strokeRect(box.x, box.y, box.size, box.size);

  // Subtle rule-of-thirds lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1 * k;
  ctx.beginPath();
  ctx.moveTo(box.x + box.size / 3, box.y);
  ctx.lineTo(box.x + box.size / 3, box.y + box.size);
  ctx.moveTo(box.x + (2 * box.size) / 3, box.y);
  ctx.lineTo(box.x + (2 * box.size) / 3, box.y + box.size);
  ctx.moveTo(box.x, box.y + box.size / 3);
  ctx.lineTo(box.x + box.size, box.y + box.size / 3);
  ctx.moveTo(box.x, box.y + (2 * box.size) / 3);
  ctx.lineTo(box.x + box.size, box.y + (2 * box.size) / 3);
  ctx.stroke();

  // Circular avatar framing preview ring inside the 1:1 square
  ctx.strokeStyle = 'rgba(0, 168, 132, 0.9)';
  ctx.lineWidth = 1.75 * k;
  ctx.setLineDash([6 * k, 4 * k]);
  ctx.beginPath();
  ctx.arc(box.x + box.size / 2, box.y + box.size / 2, box.size / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner resize handles
  const handleR = 7 * k;
  const corners = [
    [box.x, box.y],
    [box.x + box.size, box.y],
    [box.x, box.y + box.size],
    [box.x + box.size, box.y + box.size],
  ];
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, handleR, 0, Math.PI * 2);
    ctx.fillStyle = '#00a884';
    ctx.fill();
    ctx.lineWidth = 2 * k;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
  ctx.restore();
}

export default function ProfileCropModal({
  file,
  onDone,
  onCancel,
  title = 'Crop Profile Picture (1:1)',
}) {
  useBackClose(Boolean(file), onCancel);

  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const boxRef = useRef(null);
  const dragRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [applying, setApplying] = useState(false);

  const renderOverlay = useCallback(() => {
    drawCropOverlay(overlayRef.current, boxRef.current);
  }, []);

  useEffect(() => {
    if (!file) return;
    let isMounted = true;
    setLoading(true);
    setLoadError(false);
    setApplying(false);

    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    loadToCanvas(file, canvas, overlay)
      .then(() => {
        if (!isMounted) return;
        boxRef.current = createInitialBox(canvas.width, canvas.height);
        setLoading(false);
        requestAnimationFrame(() => drawCropOverlay(overlay, boxRef.current));
      })
      .catch((err) => {
        console.error('[ProfileCropModal] Failed to load image:', err);
        if (!isMounted) return;
        setLoading(false);
        setLoadError(true);
      });

    return () => {
      isMounted = false;
      if (canvasRef.current) {
        canvasRef.current.width = 0;
        canvasRef.current.height = 0;
      }
      if (overlayRef.current) {
        overlayRef.current.width = 0;
        overlayRef.current.height = 0;
      }
    };
  }, [file]);

  useEffect(() => {
    if (!loading && !loadError && boxRef.current) {
      const raf = requestAnimationFrame(() => renderOverlay());
      return () => cancelAnimationFrame(raf);
    }
  }, [loading, loadError, renderOverlay]);

  useEffect(() => {
    const onResize = () => renderOverlay();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [renderOverlay]);

  const handleReset = () => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.width || !canvas.height) return;
    boxRef.current = createInitialBox(canvas.width, canvas.height);
    renderOverlay();
  };

  const handlePointerDown = (e) => {
    if (loading || loadError || !boxRef.current || !overlayRef.current) return;
    const overlay = overlayRef.current;
    e.currentTarget.setPointerCapture(e.pointerId);

    const [px, py] = canvasPoint(e, overlay);
    const box = boxRef.current;
    const scale = overlay.width / Math.max(1, overlay.getBoundingClientRect().width || overlay.width);
    const hitR = 24 * scale;

    const corners = {
      nw: [box.x, box.y],
      ne: [box.x + box.size, box.y],
      sw: [box.x, box.y + box.size],
      se: [box.x + box.size, box.y + box.size],
    };

    for (const [mode, [cx, cy]] of Object.entries(corners)) {
      if (Math.hypot(px - cx, py - cy) <= hitR) {
        dragRef.current = { mode, startX: px, startY: py, startBox: { ...box } };
        return;
      }
    }

    if (px >= box.x && px <= box.x + box.size && py >= box.y && py <= box.y + box.size) {
      dragRef.current = { mode: 'move', startX: px, startY: py, startBox: { ...box } };
      return;
    }

    // Reposition centered on tap/click outside without leaving 1:1 lock
    const cw = overlay.width;
    const ch = overlay.height;
    const newX = clamp(px - box.size / 2, 0, Math.max(0, cw - box.size));
    const newY = clamp(py - box.size / 2, 0, Math.max(0, ch - box.size));
    boxRef.current = { x: newX, y: newY, size: box.size };
    dragRef.current = { mode: 'move', startX: px, startY: py, startBox: { ...boxRef.current } };
    renderOverlay();
  };

  const handlePointerMove = (e) => {
    if (!dragRef.current || !overlayRef.current) return;
    const overlay = overlayRef.current;
    const cw = overlay.width;
    const ch = overlay.height;
    const minSide = Math.min(MIN_CROP_SIZE, Math.min(cw, ch));
    const [rawX, rawY] = canvasPoint(e, overlay);
    const px = clamp(rawX, 0, cw);
    const py = clamp(rawY, 0, ch);
    const { mode, startX, startY, startBox } = dragRef.current;

    if (mode === 'move') {
      const dx = px - startX;
      const dy = py - startY;
      boxRef.current = {
        x: clamp(startBox.x + dx, 0, Math.max(0, cw - startBox.size)),
        y: clamp(startBox.y + dy, 0, Math.max(0, ch - startBox.size)),
        size: startBox.size,
      };
      renderOverlay();
      return;
    }

    let nextBox = startBox;
    if (mode === 'se') {
      const ax = startBox.x;
      const ay = startBox.y;
      const maxS = Math.min(cw - ax, ch - ay);
      const size = clamp(Math.max(px - ax, py - ay), minSide, maxS);
      nextBox = { x: ax, y: ay, size };
    } else if (mode === 'nw') {
      const ax = startBox.x + startBox.size;
      const ay = startBox.y + startBox.size;
      const maxS = Math.min(ax, ay);
      const size = clamp(Math.max(ax - px, ay - py), minSide, maxS);
      nextBox = { x: ax - size, y: ay - size, size };
    } else if (mode === 'ne') {
      const ax = startBox.x;
      const ay = startBox.y + startBox.size;
      const maxS = Math.min(cw - ax, ay);
      const size = clamp(Math.max(px - ax, ay - py), minSide, maxS);
      nextBox = { x: ax, y: ay - size, size };
    } else if (mode === 'sw') {
      const ax = startBox.x + startBox.size;
      const ay = startBox.y;
      const maxS = Math.min(ax, ch - ay);
      const size = clamp(Math.max(ax - px, py - ay), minSide, maxS);
      nextBox = { x: ax - size, y: ay, size };
    }

    boxRef.current = nextBox;
    renderOverlay();
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    if (applying || loading || loadError || !canvasRef.current || !boxRef.current) return;
    setApplying(true);
    try {
      const srcCanvas = canvasRef.current;
      const box = boxRef.current;
      const sx = clamp(Math.round(box.x), 0, Math.max(0, srcCanvas.width - 1));
      const sy = clamp(Math.round(box.y), 0, Math.max(0, srcCanvas.height - 1));
      const sSize = Math.max(
        1,
        Math.min(Math.round(box.size), srcCanvas.width - sx, srcCanvas.height - sy)
      );
      const outSide = Math.min(1024, sSize);

      const out = document.createElement('canvas');
      out.width = outSide;
      out.height = outSide;
      const octx = out.getContext('2d');
      octx.drawImage(srcCanvas, sx, sy, sSize, sSize, 0, 0, outSide, outSide);

      const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to export cropped image');
      const croppedFile = new File([blob], 'profile-1x1.png', { type: 'image/png' });
      onDone(croppedFile);
    } catch (err) {
      console.error('[ProfileCropModal] Crop failed:', err);
      setApplying(false);
    }
  };

  if (!file) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100500,
        backgroundColor: '#0b141a',
        color: '#e9edef',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header */}
      <div
        style={{
          height: 'calc(56px + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: '16px',
          paddingRight: '16px',
          background: 'rgba(18, 27, 34, 0.96)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#aebac1',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            padding: '8px 10px',
            borderRadius: '8px',
          }}
        >
          <X size={18} />
          Cancel
        </button>

        <div style={{ fontSize: '14px', fontWeight: '700', color: '#f3f4f6' }}>{title}</div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading || loadError || applying}
          style={{
            background: '#00a884',
            color: '#ffffff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: loading || loadError || applying ? 'not-allowed' : 'pointer',
            opacity: loading || loadError || applying ? 0.5 : 1,
          }}
        >
          <Check size={16} />
          {applying ? 'Applying...' : 'Apply 1:1'}
        </button>
      </div>

      {/* Center Canvas */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          overflow: 'hidden',
          background: '#0b141a',
        }}
      >
        {loading && <div style={{ color: '#8696a0', fontSize: '14px' }}>Loading image...</div>}
        {loadError && (
          <div style={{ color: '#f87171', fontSize: '14px' }}>
            Could not open this image. Please select another picture.
          </div>
        )}
        <div
          style={{
            position: 'relative',
            display: loading || loadError ? 'none' : 'inline-block',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: 'block',
              maxWidth: 'calc(100vw - 32px)',
              maxHeight: 'calc(100vh - 170px)',
              width: 'auto',
              height: 'auto',
            }}
          />
          <canvas
            ref={overlayRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              touchAction: 'none',
              cursor: 'move',
            }}
          />
        </div>
      </div>

      {/* Footer Info / Reset */}
      <div
        style={{
          minHeight: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))',
          background: '#111b21',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px',
          flexWrap: 'wrap',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>
          Ratio locked to 1:1 square — drag box to move or corners to resize
        </span>
        <button
          type="button"
          onClick={handleReset}
          disabled={loading || loadError}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            color: '#e5e7eb',
            borderRadius: '16px',
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={13} />
          Reset 1:1
        </button>
      </div>
    </div>,
    document.body
  );
}

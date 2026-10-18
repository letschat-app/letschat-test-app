import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Pencil,
  Eraser,
  Type,
  Crop,
  Scissors,
  Wand2,
  Sparkles,
  Undo2,
  Check,
  X
} from 'lucide-react';
import {
  loadToCanvas,
  History,
  canvasPoint,
  startStroke,
  continueStroke,
  endStroke,
  placeText,
  floodRemove,
  autoRemoveBackground,
  cropTo,
  lassoCut,
  drawOverlay,
  exportPng
} from './editorUtils';
import './ImageEditor.css';

const PRESET_COLORS = [
  '#ffffff',
  '#000000',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
];

export default function ImageEditor({ src, onDone, onCancel }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const historyRef = useRef(new History());

  const [isLoading, setIsLoading] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const [activeTool, setActiveTool] = useState('draw'); // draw, erase, text, crop, lasso, wand, auto_bg
  const [brushColor, setBrushColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(8);
  const [textInput, setTextInput] = useState('');
  const [tolerance, setTolerance] = useState(25);
  const [hasPendingTransform, setHasPendingTransform] = useState(false);

  const isPointerDownRef = useRef(false);
  const cropRectRef = useRef(null);
  const lassoPointsRef = useRef(null);

  // Initialize and load image
  useEffect(() => {
    let isMounted = true;
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay || !src) return;

    loadToCanvas(src, canvas, overlay)
      .then(() => {
        if (!isMounted) return;
        historyRef.current.push(canvas, true); // Base untouched original
        setCanUndo(false);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('[ImageEditor] Failed to load image:', err);
        alert("Can't edit this image");
        onCancel();
      });

    return () => {
      isMounted = false;
      historyRef.current.clear();
      if (canvasRef.current) {
        canvasRef.current.width = 0;
        canvasRef.current.height = 0;
      }
      if (overlayRef.current) {
        overlayRef.current.width = 0;
        overlayRef.current.height = 0;
      }
    };
  }, [src, onCancel]);

  // Handle Tool Changes - clear any pending overlay transform
  const selectTool = (tool) => {
    if (hasPendingTransform) {
      cropRectRef.current = null;
      lassoPointsRef.current = null;
      drawOverlay(overlayRef.current, null, null);
      setHasPendingTransform(false);
    }
    setActiveTool(tool);
  };

  // Undo Action
  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    const undone = historyRef.current.undo(canvas, overlay);
    if (undone) {
      setCanUndo(historyRef.current.stack.length > 1);
      cropRectRef.current = null;
      lassoPointsRef.current = null;
      drawOverlay(overlay, null, null);
      setHasPendingTransform(false);
    }
  }, []);

  // Apply Pending Crop or Lasso
  const handleApplyTransform = () => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!canvas || !overlay) return;

    if (activeTool === 'crop' && cropRectRef.current) {
      const ok = cropTo(canvas, overlay, cropRectRef.current);
      if (ok) {
        historyRef.current.push(canvas);
        setCanUndo(true);
      }
    } else if (activeTool === 'lasso' && lassoPointsRef.current) {
      const ok = lassoCut(canvas, overlay, lassoPointsRef.current);
      if (ok) {
        historyRef.current.push(canvas);
        setCanUndo(true);
      }
    }

    cropRectRef.current = null;
    lassoPointsRef.current = null;
    drawOverlay(overlay, null, null);
    setHasPendingTransform(false);
  };

  // Cancel Pending Crop or Lasso preview
  const handleCancelTransform = () => {
    cropRectRef.current = null;
    lassoPointsRef.current = null;
    drawOverlay(overlayRef.current, null, null);
    setHasPendingTransform(false);
  };

  // Run Auto Background Removal
  const handleAutoRemoveBg = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    autoRemoveBackground(canvas, tolerance);
    historyRef.current.push(canvas);
    setCanUndo(true);
  };

  // Pointer Down
  const handlePointerDown = (e) => {
    if (isLoading || hasPendingTransform) return;
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    if (!overlay || !canvas) return;

    e.target.setPointerCapture(e.pointerId);
    isPointerDownRef.current = true;
    const [x, y] = canvasPoint(e, overlay);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (activeTool === 'draw' || activeTool === 'erase') {
      startStroke(ctx, x, y, {
        color: brushColor,
        size: brushSize,
        erase: activeTool === 'erase'
      });
    } else if (activeTool === 'text') {
      if (!textInput.trim()) {
        alert('Type text in the box below first, then tap to place.');
        return;
      }
      placeText(ctx, textInput, x, y, { color: brushColor, size: brushSize });
      historyRef.current.push(canvas);
      setCanUndo(true);
    } else if (activeTool === 'wand') {
      floodRemove(canvas, [[x, y]], tolerance);
      historyRef.current.push(canvas);
      setCanUndo(true);
    } else if (activeTool === 'crop') {
      cropRectRef.current = { x, y, w: 0, h: 0 };
    } else if (activeTool === 'lasso') {
      lassoPointsRef.current = [[x, y]];
    }
  };

  // Pointer Move
  const handlePointerMove = (e) => {
    if (!isPointerDownRef.current || hasPendingTransform) return;
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    if (!overlay || !canvas) return;

    const [x, y] = canvasPoint(e, overlay);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (activeTool === 'draw' || activeTool === 'erase') {
      continueStroke(ctx, x, y);
    } else if (activeTool === 'crop' && cropRectRef.current) {
      cropRectRef.current.w = x - cropRectRef.current.x;
      cropRectRef.current.h = y - cropRectRef.current.y;
      drawOverlay(overlay, cropRectRef.current, null);
    } else if (activeTool === 'lasso' && lassoPointsRef.current) {
      lassoPointsRef.current.push([x, y]);
      drawOverlay(overlay, null, lassoPointsRef.current);
    }
  };

  // Pointer Up
  const handlePointerUp = (e) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;
    const overlay = overlayRef.current;
    const canvas = canvasRef.current;
    if (!overlay || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (activeTool === 'draw' || activeTool === 'erase') {
      endStroke(ctx);
      historyRef.current.push(canvas);
      setCanUndo(true);
    } else if (activeTool === 'crop' && cropRectRef.current) {
      if (Math.abs(cropRectRef.current.w) > 4 && Math.abs(cropRectRef.current.h) > 4) {
        setHasPendingTransform(true);
      } else {
        cropRectRef.current = null;
        drawOverlay(overlay, null, null);
      }
    } else if (activeTool === 'lasso' && lassoPointsRef.current) {
      if (lassoPointsRef.current.length > 4) {
        setHasPendingTransform(true);
      } else {
        lassoPointsRef.current = null;
        drawOverlay(overlay, null, null);
      }
    }
  };

  // Finish / Done Export
  const handleDone = async () => {
    if (!historyRef.current.isDirty()) {
      onCancel(); // Nothing changed, keep untouched original
      return;
    }

    try {
      const blob = await exportPng(canvasRef.current);
      if (blob) {
        const file = new File([blob], 'edited.png', { type: 'image/png' });
        onDone(file);
      } else {
        onCancel();
      }
    } catch (err) {
      console.error('[ImageEditor] Export failed:', err);
      onCancel();
    }
  };

  return (
    <div className="image-editor-root">
      {/* Top Header */}
      <div className="image-editor-header">
        <button type="button" className="image-editor-header-btn" onClick={onCancel}>
          Cancel
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="image-editor-header-btn"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Undo"
          >
            <Undo2 size={18} />
            <span style={{ display: 'none' }}>Undo</span>
          </button>
        </div>

        <button type="button" className="image-editor-header-btn image-editor-done-btn" onClick={handleDone}>
          Done
        </button>
      </div>

      {/* Main Center Canvas Viewport */}
      <div className="image-editor-viewport">
        {isLoading && (
          <div style={{ color: '#8696a0', fontSize: '14px' }}>Loading image...</div>
        )}
        <div
          className="image-editor-canvas-wrap"
          style={{ display: isLoading ? 'none' : 'inline-block' }}
        >
          <canvas ref={canvasRef} className="image-editor-canvas" />
          <canvas
            ref={overlayRef}
            className="image-editor-overlay"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
        </div>
      </div>

      {/* Tool Sub-bar / Options */}
      <div className="image-editor-subbar">
        {/* Draw tool controls */}
        {activeTool === 'draw' && (
          <>
            <div className="image-editor-colors">
              {PRESET_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  className={`image-editor-color-btn ${brushColor === col ? 'active' : ''}`}
                  style={{ backgroundColor: col }}
                  onClick={() => setBrushColor(col)}
                />
              ))}
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                style={{ width: '24px', height: '24px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                title="Custom color"
              />
            </div>
            <div className="image-editor-slider-wrap">
              <span>Size:</span>
              <input
                type="range"
                min="2"
                max="40"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
              />
            </div>
          </>
        )}

        {/* Erase tool controls */}
        {activeTool === 'erase' && (
          <div className="image-editor-slider-wrap">
            <span>Eraser Size:</span>
            <input
              type="range"
              min="4"
              max="60"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
            />
          </div>
        )}

        {/* Text tool controls */}
        {activeTool === 'text' && (
          <>
            <input
              type="text"
              placeholder="Type text..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#fff',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '13px',
                outline: 'none',
                width: '130px'
              }}
            />
            <div className="image-editor-colors">
              {PRESET_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  className={`image-editor-color-btn ${brushColor === col ? 'active' : ''}`}
                  style={{ backgroundColor: col }}
                  onClick={() => setBrushColor(col)}
                />
              ))}
            </div>
            <span style={{ fontSize: '11px', color: '#8696a0' }}>Tap image to place</span>
          </>
        )}

        {/* Crop tool controls */}
        {activeTool === 'crop' && (
          hasPendingTransform ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="image-editor-action-btn primary" onClick={handleApplyTransform}>
                <Check size={16} /> Apply Crop
              </button>
              <button type="button" className="image-editor-action-btn" onClick={handleCancelTransform}>
                <X size={16} /> Cancel
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: '#8696a0' }}>Drag a box over the area to crop</span>
          )
        )}

        {/* Lasso tool controls */}
        {activeTool === 'lasso' && (
          hasPendingTransform ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="image-editor-action-btn primary" onClick={handleApplyTransform}>
                <Check size={16} /> Apply Cut
              </button>
              <button type="button" className="image-editor-action-btn" onClick={handleCancelTransform}>
                <X size={16} /> Cancel
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: '#8696a0' }}>Trace around the object you want to keep</span>
          )
        )}

        {/* Magic wand controls */}
        {activeTool === 'wand' && (
          <div className="image-editor-slider-wrap">
            <span>Tolerance: {tolerance}</span>
            <input
              type="range"
              min="5"
              max="90"
              value={tolerance}
              onChange={(e) => setTolerance(parseInt(e.target.value, 10))}
            />
            <span style={{ fontSize: '11px', color: '#8696a0' }}>Tap color to erase</span>
          </div>
        )}

        {/* Auto remove background controls */}
        {activeTool === 'auto_bg' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="image-editor-slider-wrap">
              <span>Tolerance: {tolerance}</span>
              <input
                type="range"
                min="5"
                max="90"
                value={tolerance}
                onChange={(e) => setTolerance(parseInt(e.target.value, 10))}
              />
            </div>
            <button type="button" className="image-editor-action-btn primary" onClick={handleAutoRemoveBg}>
              <Sparkles size={16} /> Remove Background
            </button>
          </div>
        )}
      </div>

      {/* Bottom Tool Selector Toolbar */}
      <div className="image-editor-toolbar">
        <button
          type="button"
          className={`image-editor-tool-btn ${activeTool === 'draw' ? 'active' : ''}`}
          onClick={() => selectTool('draw')}
        >
          <Pencil size={18} />
          <span>Draw</span>
        </button>

        <button
          type="button"
          className={`image-editor-tool-btn ${activeTool === 'erase' ? 'active' : ''}`}
          onClick={() => selectTool('erase')}
        >
          <Eraser size={18} />
          <span>Erase</span>
        </button>

        <button
          type="button"
          className={`image-editor-tool-btn ${activeTool === 'text' ? 'active' : ''}`}
          onClick={() => selectTool('text')}
        >
          <Type size={18} />
          <span>Text</span>
        </button>

        <button
          type="button"
          className={`image-editor-tool-btn ${activeTool === 'crop' ? 'active' : ''}`}
          onClick={() => selectTool('crop')}
        >
          <Crop size={18} />
          <span>Crop</span>
        </button>

        <button
          type="button"
          className={`image-editor-tool-btn ${activeTool === 'lasso' ? 'active' : ''}`}
          onClick={() => selectTool('lasso')}
        >
          <Scissors size={18} />
          <span>Lasso</span>
        </button>

        <button
          type="button"
          className={`image-editor-tool-btn ${activeTool === 'wand' ? 'active' : ''}`}
          onClick={() => selectTool('wand')}
        >
          <Wand2 size={18} />
          <span>Wand</span>
        </button>

        <button
          type="button"
          className={`image-editor-tool-btn ${activeTool === 'auto_bg' ? 'active' : ''}`}
          onClick={() => selectTool('auto_bg')}
        >
          <Sparkles size={18} />
          <span>Auto BG</span>
        </button>
      </div>
    </div>
  );
}

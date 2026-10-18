// editorUtils.js - plain Canvas helpers for the image editor. No dependencies.
// canvas = the image canvas, overlay = the canvas stacked on top for previews.
// Create the image context with: canvas.getContext('2d', { willReadFrequently: true })

export const MAX_SIDE = 1280;
export const MAX_UNDO = 7;

// Pointer position in canvas pixels (the canvas is shown at CSS size, drawn at pixel size).
export function canvasPoint(e, overlay) {
  const r = overlay.getBoundingClientRect();
  return [
    ((e.clientX - r.left) * overlay.width) / r.width,
    ((e.clientY - r.top) * overlay.height) / r.height,
  ];
}

// Resize both canvases. Setting width or height clears a canvas, so redraw afterwards.
export function resize(canvas, overlay, w, h) {
  canvas.width = overlay.width = w;
  canvas.height = overlay.height = h;
}

// Load a Blob, File or URL onto the canvas, scaled so the long side is at most MAX_SIDE.
export function loadToCanvas(src, canvas, overlay) {
  return new Promise((resolve, reject) => {
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    const img = new Image();
    img.crossOrigin = 'anonymous'; // needed so toBlob works for images from another origin
    img.onload = () => {
      const s = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      resize(canvas, overlay, Math.round(img.width * s), Math.round(img.height * s));
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      if (typeof src !== 'string') URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = (err) => {
      if (typeof src !== 'string') URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

// ---------- Undo: keeps at most MAX_UNDO snapshots ----------
export class History {
  constructor() { this.stack = []; this.edits = 0; }
  // Call history.push(canvas, true) once after loading (the untouched original).
  // Every later call counts as one edit.
  push(canvas, isBase = false) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.stack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (this.stack.length > MAX_UNDO) this.stack.shift();
    if (!isBase) this.edits++;
  }
  // True only if something was changed. Use it on Done: if false, export nothing.
  isDirty() { return this.edits > 0; }
  // Restores the previous snapshot. Returns false if there is nothing to undo.
  undo(canvas, overlay) {
    if (this.stack.length < 2) return false;
    this.stack.pop();
    this.edits = Math.max(0, this.edits - 1);
    const d = this.stack[this.stack.length - 1];
    resize(canvas, overlay, d.width, d.height);
    canvas.getContext('2d', { willReadFrequently: true }).putImageData(d, 0, 0);
    return true;
  }
  clear() { this.stack = []; }
}
// Call history.push(canvas, true) once after loading, then history.push(canvas) after each finished action
// (pointerup for brush/erase, or right after text, wand, auto, crop and lasso).

// ---------- Draw and erase ----------
export function startStroke(ctx, x, y, { color, size, erase }) {
  ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
  ctx.strokeStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 0.01, y); // makes a single tap leave a dot
  ctx.stroke();
}
export function continueStroke(ctx, x, y) {
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}
export function endStroke(ctx) {
  ctx.globalCompositeOperation = 'source-over'; // always reset after erasing
}

// ---------- Text ----------
export function placeText(ctx, text, x, y, { color, size }) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = color;
  ctx.font = `bold ${size * 3}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

// ---------- Flood fill (magic wand and auto background) ----------
// Makes every pixel connected to a seed point transparent, as long as its color is
// within `tol` (0-255, per channel) of the seed pixel's color.
export function floodRemove(canvas, seeds, tol) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const w = canvas.width, h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const seen = new Uint8Array(w * h);

  for (const [sx, sy] of seeds) {
    const x0 = Math.min(w - 1, Math.max(0, Math.round(sx)));
    const y0 = Math.min(h - 1, Math.max(0, Math.round(sy)));
    const i0 = (y0 * w + x0) * 4;
    const r = d[i0], g = d[i0 + 1], b = d[i0 + 2];
    const stack = [x0, y0];
    while (stack.length) {
      const y = stack.pop(), x = stack.pop();
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const p = y * w + x;
      if (seen[p]) continue;
      seen[p] = 1;
      const i = p * 4;
      if (
        Math.abs(d[i] - r) > tol ||
        Math.abs(d[i + 1] - g) > tol ||
        Math.abs(d[i + 2] - b) > tol
      ) continue;
      d[i + 3] = 0; // transparent
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Auto background removal: flood from the four corners.
export function autoRemoveBackground(canvas, tol) {
  const w = canvas.width - 1, h = canvas.height - 1;
  floodRemove(canvas, [[0, 0], [w, 0], [0, h], [w, h]], tol);
}

// ---------- Crop ----------
// rect = { x, y, w, h }. w and h can be negative if the user dragged up or left.
export function cropTo(canvas, overlay, rect) {
  const x = Math.max(0, Math.round(Math.min(rect.x, rect.x + rect.w)));
  const y = Math.max(0, Math.round(Math.min(rect.y, rect.y + rect.h)));
  const w = Math.min(Math.round(Math.abs(rect.w)), canvas.width - x);
  const h = Math.min(Math.round(Math.abs(rect.h)), canvas.height - y);
  if (w < 2 || h < 2) return false;
  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  tmp.getContext('2d').drawImage(canvas, -x, -y);
  resize(canvas, overlay, w, h);
  canvas.getContext('2d', { willReadFrequently: true }).drawImage(tmp, 0, 0);
  return true;
}

// ---------- Lasso cut ----------
// points = [[x, y], ...] traced by the user. Keeps the inside, makes the outside
// transparent, and trims the canvas to the outline's bounding box.
export function lassoCut(canvas, overlay, points) {
  const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
  const x0 = Math.max(0, Math.floor(Math.min(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const w = Math.min(Math.ceil(Math.max(...xs)), canvas.width) - x0;
  const h = Math.min(Math.ceil(Math.max(...ys)), canvas.height) - y0;
  if (w < 2 || h < 2) return false;

  const tmp = document.createElement('canvas');
  tmp.width = w; tmp.height = h;
  const t = tmp.getContext('2d');
  t.beginPath();
  points.forEach(([px, py], i) => (i ? t.lineTo(px - x0, py - y0) : t.moveTo(px - x0, py - y0)));
  t.closePath();
  t.clip();                       // only what is inside the outline is drawn
  t.drawImage(canvas, -x0, -y0);  // copy the matching part of the photo

  resize(canvas, overlay, w, h);  // this clears the canvas, so draw the result after
  canvas.getContext('2d', { willReadFrequently: true }).drawImage(tmp, 0, 0);
  return true;
}

// ---------- Overlay preview (dashed crop box or lasso outline) ----------
export function drawOverlay(overlay, rect, points) {
  const o = overlay.getContext('2d');
  const k = overlay.width / overlay.getBoundingClientRect().width; // keep the line width constant on screen
  o.clearRect(0, 0, overlay.width, overlay.height);
  o.lineWidth = 2 * k;
  o.setLineDash([8 * k, 6 * k]);
  o.strokeStyle = '#2f6fdb';
  if (rect) {
    o.strokeRect(rect.x, rect.y, rect.w, rect.h);
  } else if (points && points.length) {
    o.beginPath();
    points.forEach(([x, y], i) => (i ? o.lineTo(x, y) : o.moveTo(x, y)));
    o.closePath();
    o.stroke();
  }
}

// ---------- Export ----------
// Exports a lossless PNG (keeps transparency). The app's own media uploader compresses
// and converts to WebP afterwards, so the editor does not convert to WebP itself
// (that would compress the image twice).
export function exportPng(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

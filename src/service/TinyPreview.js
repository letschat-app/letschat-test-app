/**
 * TinyPreview: RGB565 packed pixel grid for ephemeral media preview frames.
 * 
 * Senders pack a tiny preview (~750 base64 chars = ~560 bytes) representing a tiny w x h
 * pixel grid matching the media's natural aspect ratio. No external libraries, no JPEG overhead.
 * Receivers decode this directly onto a canvas or data URL to render an instant blur-up
 * placeholder while media uploads to Cloudflare R2.
 */

export const PREVIEW_BUDGET = 750;
export const PREVIEW_BLUR_PX = 4;
export const PREVIEW_PX_CHAT_TYPES = ['private', 'group', 'classroom'];

export function previewDims(budget, ratio) {
  const px = Math.floor((Math.floor(budget * 3 / 4) - 2) / 2);
  let w = Math.max(2, Math.floor(Math.sqrt(px * ratio))), h = Math.max(2, Math.round(w / ratio));
  while (w * h > px && w > 2) { w--; h = Math.max(2, Math.round(w / ratio)); }
  return [w, h];
}

export function packPreview(canvas) {
  const sw = canvas.width, sh = canvas.height, [w, h] = previewDims(PREVIEW_BUDGET, sw / sh);
  const d = canvas.getContext('2d').getImageData(0, 0, sw, sh).data, by = new Uint8Array(2 + w * h * 2);
  by[0] = w; by[1] = h;
  for (let ty = 0; ty < h; ty++) for (let tx = 0; tx < w; tx++) {
    const x0 = Math.floor(tx * sw / w), x1 = Math.max(x0 + 1, Math.floor((tx + 1) * sw / w));
    const y0 = Math.floor(ty * sh / h), y1 = Math.max(y0 + 1, Math.floor((ty + 1) * sh / h));
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = (y * sw + x) * 4; r += d[p]; g += d[p + 1]; b += d[p + 2]; n++; }
    const v = ((Math.round(r / n) >> 3) << 11) | ((Math.round(g / n) >> 2) << 5) | (Math.round(b / n) >> 3), o = 2 + (ty * w + tx) * 2;
    by[o] = v >> 8; by[o + 1] = v & 255;
  }
  return btoa(String.fromCharCode(...by));
}

export function previewToDataURL(str) {
  if (!str || typeof str !== 'string') return null;
  const bin = atob(str), w = bin.charCodeAt(0), h = bin.charCodeAt(1), img = new ImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = (bin.charCodeAt(2 + i * 2) << 8) | bin.charCodeAt(3 + i * 2), r = (v >> 11) & 31, g = (v >> 5) & 63, b = v & 31;
    img.data.set([(r << 3) | (r >> 2), (g << 2) | (g >> 4), (b << 3) | (b >> 2), 255], i * 4);
  }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').putImageData(img, 0, 0);
  return c.toDataURL('image/png'); // tiny dataURL; lets components use standard <img>
}

/**
 * Creates packed RGB565 preview string from an image file or thumbnail blob.
 * Returns null if chat type is public room, media has no thumbnail, or packing fails.
 */
export async function createPackedPreview(file, kind, existingThumbBlob, chatType) {
  if (!PREVIEW_PX_CHAT_TYPES.includes(chatType)) return null;
  if (!['image', 'video', 'pdf'].includes(kind)) return null;

  try {
    let sourceBlob = existingThumbBlob;
    if (!sourceBlob && kind === 'image' && file instanceof Blob) {
      sourceBlob = file;
    }
    if (!sourceBlob) return null;

    return await new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(sourceBlob);
      let settled = false;

      const cleanup = () => {
        if (!settled) {
          settled = true;
          URL.revokeObjectURL(url);
        }
      };

      img.onload = () => {
        try {
          const maxDim = 240;
          let w = img.naturalWidth || img.width || 240;
          let h = img.naturalHeight || img.height || 240;
          if (w <= 0 || h <= 0) {
            cleanup();
            return resolve(null);
          }

          if (w > maxDim || h > maxDim) {
            if (w >= h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(2, w);
          canvas.height = Math.max(2, h);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const px = packPreview(canvas);
          cleanup();
          resolve(px);
        } catch (packErr) {
          console.warn('[TinyPreview] packPreview error:', packErr);
          cleanup();
          resolve(null);
        }
      };

      img.onerror = () => {
        cleanup();
        resolve(null);
      };

      img.src = url;
    });
  } catch (err) {
    console.warn('[TinyPreview] createPackedPreview error:', err);
    return null;
  }
}

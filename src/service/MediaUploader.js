/**
 * MediaUploader.js
 * Global media upload service for LetsChat.
 */
import { API } from './UserAuth';

export const STAGE_LABELS = {
  requesting_urls: 'Preparing…',
  compressing_image: 'Compressing…',
  creating_thumbnail: 'Thumbnail…',
  extracting_frame: 'Video frame…',
  rendering_pdf: 'Reading PDF…',
  uploading_main: 'Uploading…',
  uploading_thumbnail: 'Uploading…',
  done: 'Done ✓',
};

/** Calculate SHA-256 hash of a file for integrity/deduplication. */
const calculateFileHash = async (file) => {
  try {
    if (typeof crypto !== 'undefined' && crypto?.subtle?.digest) {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('[MediaUploader] crypto.subtle digest failed, using fallback hash:', e);
  }
  return `${file.name || 'file'}_${file.size || 0}_${file.lastModified || Date.now()}_${Math.random().toString(36).slice(2)}`;
};

/** Get duration of audio file in seconds. */
const getAudioDuration = (file) =>
  new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(audio.duration) || 0);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });

// ─── Helpers ────────────────────────────────────────────────────────────────

const inferMimeFromName = (mime = '', fileName = '') => {
  if (mime && mime !== 'application/octet-stream') return mime;
  const ext = (fileName || '').split('.').pop()?.toLowerCase() || '';
  const map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    gif: 'image/gif', heic: 'image/heic', heif: 'image/heif', bmp: 'image/bmp',
    mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
    mkv: 'video/x-matroska', '3gp': 'video/3gpp', pdf: 'application/pdf',
    mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', ogg: 'audio/ogg'
  };
  return map[ext] || mime || 'application/octet-stream';
};

/** Compress an image File/Blob via canvas with WebP->JPEG fallback and DataURL decode retry. */
export const compressImageBlob = (file, maxW, maxH, quality) =>
  new Promise((resolve) => {
    let settled = false;
    let objectUrl = null;
    let triedDataUrl = false;
    const finish = (res) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl); } catch {}
      }
      resolve(res);
    };
    const timer = setTimeout(() => finish(file), 6000);

    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) return finish(file);
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.max(1, Math.round(w * ratio));
      h = Math.max(1, Math.round(h * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return finish(file);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (blob && blob.size > 0) {
          finish(blob);
        } else {
          canvas.toBlob(jpegBlob => {
            finish((jpegBlob && jpegBlob.size > 0) ? jpegBlob : file);
          }, 'image/jpeg', quality);
        }
      }, 'image/webp', quality);
    };
    img.onerror = () => {
      if (!triedDataUrl && file instanceof Blob) {
        triedDataUrl = true;
        try {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') img.src = reader.result;
            else finish(file);
          };
          reader.onerror = () => finish(file);
          reader.readAsDataURL(file);
          return;
        } catch {}
      }
      console.warn('[MediaUploader] Image decode failed for compression, using original file');
      finish(file);
    };
    try {
      objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    } catch {
      img.onerror();
    }
  });

/** Extract a frame from a video as a WebP (or JPEG fallback) Blob. */
export const getVideoThumbnail = (file) =>
  new Promise((resolve) => {
    let resolved = false;
    let url = null;
    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      if (url) {
        try { URL.revokeObjectURL(url); } catch (e) {}
      }
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ blob: null, duration: 0 });
    }, 7000);

    try {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      url = URL.createObjectURL(file);

      const captureFrame = (duration) => {
        try {
          const vw = video.videoWidth || 320;
          const vh = video.videoHeight || 180;
          if (!video.videoWidth || !video.videoHeight) return false;
          const scale = Math.min(320 / vw, 1);
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(vw * scale));
          canvas.height = Math.max(1, Math.round(vh * scale));
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => {
            if (blob && blob.size > 0) {
              finish({ blob, duration });
            } else {
              canvas.toBlob(jpegBlob => finish({ blob: jpegBlob && jpegBlob.size > 0 ? jpegBlob : null, duration }), 'image/jpeg', 0.65);
            }
          }, 'image/webp', 0.45);
          return true;
        } catch {
          return false;
        }
      };

      video.onerror = () => {
        finish({ blob: null, duration: 0 });
      };

      video.onloadedmetadata = () => {
        const rawDur = Number.isFinite(video.duration) ? video.duration : 0;
        const duration = Math.round(rawDur) || 0;
        const targetTime = rawDur > 0.2 ? Math.min(1, rawDur * 0.1) : 0.05;
        video.onseeked = () => {
          if (!captureFrame(duration)) finish({ blob: null, duration });
        };
        video.onloadeddata = () => {
          if (video.currentTime === 0 && !captureFrame(duration)) {
            try { video.currentTime = targetTime; } catch {}
          }
        };
        try {
          video.currentTime = targetTime;
        } catch {
          if (!captureFrame(duration)) finish({ blob: null, duration });
        }
      };

      video.src = url;
    } catch (e) {
      finish({ blob: null, duration: 0 });
    }
  });

let pdfjsLibPromise = null;

const loadPdfJs = async () => {
  if (window.pdfjsLib) return window.pdfjsLib;
  if (pdfjsLibPromise) return pdfjsLibPromise;

  pdfjsLibPromise = (async () => {
    // 1. Try dynamic import of ESM build (works in modern browsers & Vite)
    try {
      const mod = await import(/* @vite-ignore */ 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs');
      const lib = mod?.getDocument ? mod : mod?.default;
      if (lib?.getDocument) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';
        window.pdfjsLib = lib;
        return lib;
      }
    } catch (e) {
      console.warn('[loadPdfJs] ESM dynamic import failed, trying fallback:', e);
    }

    // 2. Try classic UMD script tag fallback (which assigns to window.pdfjsLib)
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      const lib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        window.pdfjsLib = lib;
        return lib;
      }
    } catch (e) {
      console.warn('[loadPdfJs] UMD script fallback failed:', e);
    }

    return null;
  })();

  return pdfjsLibPromise;
};

/** Render page 1 of a PDF to a high-resolution WebP Blob using pdf.js. */
export const getPdfThumbnail = async (file) => {
  try {
    const pdfjs = await loadPdfJs();
    if (!pdfjs) {
      console.warn('[getPdfThumbnail] pdfjs library not available');
      return { blob: null, noOfPages: 0 };
    }

    let arrayBuffer;
    if (typeof file === 'string') {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`Failed to fetch PDF for thumbnail: ${res.status}`);
      arrayBuffer = await res.arrayBuffer();
    } else if (file instanceof ArrayBuffer) {
      arrayBuffer = file;
    } else if (file && typeof file.arrayBuffer === 'function') {
      arrayBuffer = await file.arrayBuffer();
    } else {
      return { blob: null, noOfPages: 0 };
    }

    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages || 1;
    const page = await pdf.getPage(1);
    const unscaledViewport = page.getViewport({ scale: 1.0 });
    // Crisp preview: scale up to sharp resolution (target ~1000px width or scale 1.5 - 2.5)
    const targetWidth = 1000;
    const scale = Math.max(1.5, Math.min(2.5, targetWidth / unscaledViewport.width));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const blob = await new Promise(resolve => canvas.toBlob(blob => resolve(blob ?? null), 'image/webp', 0.8));
    return { blob, noOfPages: numPages };
  } catch (err) {
    console.warn('[getPdfThumbnail] Error generating PDF thumbnail:', err);
    return { blob: null, noOfPages: 0 };
  }
};

/** PUT a Blob/File to a pre-signed URL. */
const putToUrl = async (url, blob, mimeType, signal) => {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: blob,
    signal // Pass through the abort signal
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
};

/** Main Media Upload Flow */
export const uploadMedia = async (file, onProgress = () => { }, signal, precomputedThumbBlob = null) => {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('File exceeds the 50MB size limit.');
  }
  const originalMime = inferMimeFromName(file.type, file.name);
  const category = getFileCategory(originalMime, file.name);
  const userId = localStorage.getItem('userid');

  let mainBlob = file;
  let mainMime = originalMime;

  // Compress image before upload and derive MIME from actual output blob
  if (category === 'image') {
    onProgress({ stage: 'compressing_image', progress: 10 });
    try {
      mainBlob = await compressImageBlob(file, 1920, 1080, 0.75);
      mainMime = inferMimeFromName(mainBlob?.type, file.name);
    } catch (err) {
      console.warn('[MediaUploader] Image compression failed, using original file:', err);
    }
  }

  let thumbBlob = (precomputedThumbBlob instanceof Blob && precomputedThumbBlob.size > 0) ? precomputedThumbBlob : null;
  let noOfPages = 0;
  let finalDuration = 0;
  const supportsThumbnail = ['image', 'video', 'pdf'].includes(category);

  if (category === 'image') {
    if (!thumbBlob) {
      onProgress({ stage: 'creating_thumbnail', progress: 18 });
      try {
        thumbBlob = await compressImageBlob(file, 320, 320, 0.4);
      } catch {}
    }
    if ((!thumbBlob || thumbBlob.size === 0) && mainBlob && mainBlob.size > 0) {
      thumbBlob = mainBlob;
    }
  } else if (category === 'video') {
    if (!thumbBlob) {
      onProgress({ stage: 'extracting_frame', progress: 18 });
      try {
        const videoResult = await getVideoThumbnail(file);
        thumbBlob = videoResult?.blob || null;
        finalDuration = videoResult?.duration || 0;
      } catch {}
    }
  } else if (category === 'pdf') {
    if (!thumbBlob) {
      onProgress({ stage: 'rendering_pdf', progress: 18 });
      try {
        const pdfResult = await getPdfThumbnail(file);
        thumbBlob = pdfResult?.blob || null;
        noOfPages = pdfResult?.noOfPages || 0;
      } catch {}
    }
  }

  const thumbMime = (thumbBlob?.type && thumbBlob.type.startsWith('image/')) ? thumbBlob.type : 'image/webp';

  onProgress({ stage: 'preparing_metadata', progress: 25 });
  const [fileHash, fileDuration] = await Promise.all([
    calculateFileHash(mainBlob),
    (category === 'audio') ? getAudioDuration(file) : Promise.resolve(0)
  ]);
  if (!finalDuration) finalDuration = fileDuration;

  onProgress({ stage: 'requesting_urls', progress: 30 });
  const urlRes = await fetch(`${API}/files/put-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({
      mime: mainMime,
      thumbMime: (supportsThumbnail && thumbBlob) ? thumbMime : null,
      hash: fileHash
    }),
    signal
  });
  if (!urlRes.ok) throw new Error(`Server error: ${urlRes.status}`);
  const { mainKey, thumbKey, mainPutUrl, thumbPutUrl, exist, mediaId: existingMediaId } = await urlRes.json();

  if (exist) {
    console.log("[MediaUploader] File already exists (deduplicated). Reusing mediaId:", existingMediaId);
    onProgress({ stage: 'done', progress: 100 });
    return { mainKey, thumbKey, mediaId: existingMediaId };
  }
  onProgress({ stage: 'uploading_main', progress: 45 });
  await putToUrl(mainPutUrl, mainBlob, mainMime, signal);

  let resolvedThumbKey = null;
  if (supportsThumbnail && thumbBlob && thumbPutUrl) {
    onProgress({ stage: 'uploading_thumbnail', progress: 85 });
    try {
      await putToUrl(thumbPutUrl, thumbBlob, thumbMime, signal);
      resolvedThumbKey = thumbKey;
    } catch (err) {
      console.warn('[MediaUploader] Failed to upload thumbnail to R2:', err);
      resolvedThumbKey = null;
    }
  }

  onProgress({ stage: 'registering', progress: 95 });
  const registerRes = await fetch(`${API}/files/set-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({
      fileName: file.name,
      fileType: category,
      mimeType: mainMime,
      fileHash: fileHash,
      fileKey: mainKey,
      thumbnailKey: resolvedThumbKey,
      fileSize: mainBlob.size,
      createdAt: new Date().toISOString(),
      userId: userId,
      noOfPages: noOfPages,
      duration: finalDuration
    }),
    signal // Final registration call — if aborted now, media record won't be created
  });
  const registerData = await registerRes.json();
  const mediaId = registerData?.mediaId || registerData?.id;
  if (!mediaId) throw new Error('Registration failed');

  onProgress({ stage: 'done', progress: 100 });
  return { mainKey, thumbKey: resolvedThumbKey, mediaId };
};

export const getFileCategory = (mimeType = '', fileName = '') => {
  if (!mimeType && !fileName) return 'file';
  
  const m = (mimeType || '').toLowerCase();
  const f = (fileName || '').toLowerCase();

  if (m.startsWith('image/') || f.startsWith('image:') || f.startsWith('photo:')) return 'image';
  if (m.startsWith('video/') || f.startsWith('video:')) return 'video';
  if (m.startsWith('audio/') || f.startsWith('audio:')) return 'audio';
  if (m.includes('pdf') || f.endsWith('.pdf')) return 'pdf';

  const [type, sub] = mimeType?.split('/') || ['', ''];
  if (type === 'image') return 'image';
  if (type === 'video') return 'video';
  if (type === 'audio') return 'audio';
  if (sub === 'pdf') return 'pdf';

  // Extension fallback
  if (fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'bmp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'mov', 'm4v', '3gp', 'mkv', 'avi'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus', 'flac'].includes(ext)) return 'audio';
    if (ext === 'pdf') return 'pdf';
  }

  return 'file';
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Force Download */
export const downloadFile = async (url, fileName) => {
  try {
    const res = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', fileName || 'download');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Download failed:', err);
    window.open(url, '_blank');
  }
};

/** Open in Native-style Viewer (uses Blob to bypass attachment headers) */
export const openFile = async (url) => {
  try {
    const res = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    // On mobile, opening a blob PDF often triggers the native viewer
    window.open(blobUrl, '_blank');
  } catch (err) {
    console.error('Open failed:', err);
    window.open(url, '_blank');
  }
};

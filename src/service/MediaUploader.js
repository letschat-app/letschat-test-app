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
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

/** Compress an image File/Blob via canvas. Returns a Blob (image/jpeg). */
export const compressImageBlob = (file, maxW, maxH, quality) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { naturalWidth: w, naturalHeight: h } = img;
      const ratio = Math.min(maxW / w, maxH / h, 1); // never upscale
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))), 'image/webp', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });

/** Extract first meaningful frame from a video as a JPEG Blob. */
export const getVideoThumbnail = (file) =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);

    const capture = () => {
      const vw = video.videoWidth || 320;
      const vh = video.videoHeight || 180;
      const scale = Math.min(320 / vw, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => resolve(blob ?? null), 'image/webp', 0.3);
    };

    video.onseeked = capture;
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve({ blob: null, duration: 0 }); };

    const metaPromise = new Promise(r => {
      video.addEventListener('loadedmetadata', () => r(Math.round(video.duration) || 0), { once: true });
    });

    video.src = url;
    const originalResolve = resolve;
    resolve = (blob) => metaPromise.then(duration => originalResolve({ blob, duration }));
  });

/** Render page 1 of a PDF to a JPEG Blob using pdf.js. */
export const getPdfThumbnail = async (file) => {
  try {
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.mjs';
        s.type = 'module';
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      }).catch(() => null);
      await new Promise(r => setTimeout(r, 300));
      if (!window.pdfjsLib) return null;
    }
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.6 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    const blob = await new Promise(resolve => canvas.toBlob(blob => resolve(blob ?? null), 'image/webp', 0.3));
    return { blob, noOfPages: pdf.numPages };
  } catch {
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
export const uploadMedia = async (file, onProgress = () => { }, signal) => {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('File exceeds the 50MB size limit.');
  }
  const originalMime = file.type || 'application/octet-stream';
  const category = getFileCategory(originalMime, file.name);
  const userId = localStorage.getItem('userid');

  onProgress({ stage: 'preparing_metadata', progress: 2 });
  const [fileHash, fileDuration] = await Promise.all([
    calculateFileHash(file),
    (category === 'audio') ? getAudioDuration(file) : Promise.resolve(0)
  ]);

  let mainBlob = file;
  let mainMime = originalMime;

  if (category === 'image') {
    onProgress({ stage: 'compressing_image', progress: 10 });
    try {
      mainBlob = await compressImageBlob(file, 1920, 1080, 0.75);
      mainMime = 'image/webp';
    } catch { /* skip */ }
  }

  onProgress({ stage: 'requesting_urls', progress: 15 });
  const urlRes = await fetch(`${API}/files/put-url`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ mime: mainMime, hash: fileHash }),
    signal // Pass through the abort signal
  });
  if (!urlRes.ok) throw new Error(`Server error: ${urlRes.status}`);
  const { mainKey, thumbKey, mainPutUrl, thumbPutUrl, exist, mediaId: existingMediaId } = await urlRes.json();

  if (exist) {
    console.log("[MediaUploader] File already exists (deduplicated). Reusing mediaId:", existingMediaId);
    onProgress({ stage: 'done', progress: 100 });
    return { mainKey, thumbKey, mediaId: existingMediaId };
  }

  let thumbBlob = null;
  let thumbMime = 'image/webp';
  let noOfPages = 0;
  let finalDuration = fileDuration;

  const supportsThumbnail = ['image', 'video', 'pdf'].includes(category);

  if (category === 'image') {
    onProgress({ stage: 'creating_thumbnail', progress: 25 });
    try { thumbBlob = await compressImageBlob(file, 320, 320, 0.3); } catch { }
  } else if (category === 'video') {
    onProgress({ stage: 'extracting_frame', progress: 25 });
    try {
      const videoResult = await getVideoThumbnail(file);
      thumbBlob = videoResult.blob;
      finalDuration = videoResult.duration;
    } catch { }
  } else if (category === 'pdf') {
    onProgress({ stage: 'rendering_pdf', progress: 25 });
    try {
      const pdfResult = await getPdfThumbnail(file);
      thumbBlob = pdfResult.blob;
      noOfPages = pdfResult.noOfPages;
    } catch { }
  }
  onProgress({ stage: 'uploading_main', progress: 45 });
  await putToUrl(mainPutUrl, mainBlob, mainMime, signal);

  let resolvedThumbKey = null;
  if (supportsThumbnail && thumbBlob && thumbPutUrl) {
    onProgress({ stage: 'uploading_thumbnail', progress: 85 });
    await putToUrl(thumbPutUrl, thumbBlob, thumbMime, signal);
    resolvedThumbKey = thumbKey;
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
  
  const [type, sub] = mimeType?.split('/') || ['', ''];
  if (type === 'image') return 'image';
  if (type === 'video') return 'video';
  if (type === 'audio') return 'audio';
  if (sub === 'pdf') return 'pdf';

  // Extension fallback
  if (fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic'].includes(ext)) return 'image';
    if (['mp4', 'webm', 'mov', 'm4v', '3gp'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'opus'].includes(ext)) return 'audio';
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

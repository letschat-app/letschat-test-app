import React, { useState, useEffect, useRef } from 'react';
import { Download, Play, Pause, Loader2, RotateCcw } from 'lucide-react';
import { API } from '../../service/UserAuth';
import { downloadFile, getPdfThumbnail } from '../../service/MediaUploader';
import { getMediaInfo, getMediaBlob, saveBlobToCache, memoryThumbCache } from '../../service/MediaCache';
import { formatTime12Hour } from '../../service/ChatUtils';
import EyeIcon from './EyeIcon';
import messageStore from '../../pages/MessageStore';
import { PREVIEW_BLUR_PX } from '../../service/TinyPreview';
import './messages.css';

export { PREVIEW_BLUR_PX };

/**
 * Format bytes to human readable size
 */
const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const num = typeof bytes === 'number' ? bytes : parseFloat(bytes);
  if (isNaN(num) || num <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(num) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((num / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

/**
 * Format seconds to MM:SS
 */
const formatDuration = (seconds) => {
  const num = typeof seconds === 'number' ? seconds : parseFloat(seconds);
  if (isNaN(num) || num <= 0) return '0:00';
  const mins = Math.floor(num / 60);
  const secs = Math.floor(num % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const isPdfFile = (name) => {
  if (!name || typeof name !== 'string') return false;
  return name.toLowerCase().endsWith('.pdf');
};

const getFileExtension = (name, type) => {
  if (typeof name === 'string' && name.includes('.')) {
    const ext = name.split('.').pop().trim().toUpperCase();
    if (ext.length <= 5) return ext;
  }
  if (type === 'pdf') return 'PDF';
  return (type || 'DOC').toUpperCase();
};

// Module-level audio tracker so only one audio plays at a time
let activeAudioInstance = null;

// Fallback 30 waveform bar heights
const FALLBACK_BARS = [
  8, 12, 16, 12, 8, 14, 20, 24, 18, 12, 10, 16, 22, 18, 10,
  8, 12, 16, 12, 8, 14, 20, 24, 18, 12, 10, 16, 22, 18, 10
];

export default function MediaMessage({
  msg,
  isReceived,
  isSelectionMode,
  onOpenViewer,
  onRetry
}) {
  const [mediaInfo, setMediaInfo] = useState(() => {
    if (msg?.isOptimistic || msg?.optimisticUrl) {
      return {
        fileType: msg?.type,
        fileName: msg?.fileName,
        fileSize: msg?.fileSize,
        fileKey: msg?.optimisticUrl,
        thumbnailKey: msg?.optimisticThumbUrl || msg?.optimisticUrl,
        width: msg?.width,
        height: msg?.height,
        duration: msg?.duration,
        noOfPages: msg?.noOfPages,
      };
    }
    if (msg?.pendingid && messageStore.pendingInfo?.has(msg.pendingid)) {
      const p = messageStore.pendingInfo.get(msg.pendingid);
      return {
        fileType: p.kind || msg.type,
        fileName: p.fileName || msg.fileName,
        fileSize: p.fileSize || msg.fileSize,
        duration: p.duration || msg.duration,
        noOfPages: p.noOfPages || msg.noOfPages,
        width: p.w || msg.width,
        height: p.h || msg.height,
        thumbnailUrl: p.thumb || null,
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(!msg?.isOptimistic && !msg?.optimisticUrl && !msg?.optimisticThumbUrl && !(msg?.pendingid && messageStore.pendingInfo?.has(msg.pendingid)));
  const [error, setError] = useState(null);
  const [thumbError, setThumbError] = useState(false);
  const [mainLoaded, setMainLoaded] = useState(false);

  const mediaId = msg?.content;
  const isOptimistic = msg?.isOptimistic;
  const uploadProgress = msg?.uploadProgress || 0;
  const status = msg?.status; // 'uploading', 'failed', 'sent', 'delivered', 'read'

  // Resolution states for cached URLs
  const [resolvedThumb, setResolvedThumb] = useState(() => {
    const idbKey = isOptimistic ? `${msg?.tempmsgid}_thumb` : `${mediaId}_thumb`;
    return (
      memoryThumbCache?.get(idbKey) ||
      (msg?.tempmsgid ? memoryThumbCache?.get(`${msg?.tempmsgid}_thumb`) : null) ||
      msg?.optimisticThumbUrl ||
      (msg?.pendingid && messageStore.pendingInfo?.get(msg.pendingid)?.thumb) ||
      null
    );
  });
  const [resolvedMain, setResolvedMain] = useState(() => msg?.optimisticUrl || null);
  const blobUrls = useRef(new Set());

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const audioRef = useRef(null);
  const waveformRef = useRef(null);

  // Keep optimistic blob URLs synced if they arrive after mount
  useEffect(() => {
    if (msg.optimisticThumbUrl && !resolvedThumb) {
      setResolvedThumb(msg.optimisticThumbUrl);
    }
    if (msg.optimisticUrl && !resolvedMain) {
      setResolvedMain(msg.optimisticUrl);
    }
  }, [msg.optimisticThumbUrl, msg.optimisticUrl]);

  const s = (val) => (val === 'null' || val === 'undefined' ? null : val);

  const fileKey = mediaInfo?.fileKey;
  const thumbnailKey = mediaInfo?.thumbnailKey;
  const fileType = mediaInfo?.fileType || msg.type;
  const fileName = mediaInfo?.fileName || msg.fileName;
  const fileSize = mediaInfo?.fileSize || msg.fileSize;
  const duration = mediaInfo?.duration || msg.duration;
  const noOfPages = mediaInfo?.noOfPages || msg.noOfPages;

  // Final fallback URLs
  const fileUrl =
    s(mediaInfo?.url) ||
    s(mediaInfo?.fileUrl) ||
    (s(fileKey)
      ? fileKey.startsWith('http') || fileKey.startsWith('blob:')
        ? fileKey
        : `${API}/files/media/serve/${fileKey}`
      : null);
  const thumbnailUrl =
    s(mediaInfo?.thumbnailUrl) ||
    (s(thumbnailKey)
      ? thumbnailKey.startsWith('http') || thumbnailKey.startsWith('blob:')
        ? thumbnailKey
        : `${API}/files/media/serve/${thumbnailKey}`
      : null);

  // 1. Fetch Media Metadata
  useEffect(() => {
    if (isOptimistic) {
      setMediaInfo({
        fileType: msg.type,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        fileKey: msg.optimisticUrl,
        thumbnailKey: msg.optimisticThumbUrl || msg.optimisticUrl,
      });
      setLoading(false);
      return;
    }

    if (!mediaId || mediaId === msg.tempmsgid) {
      if (!isOptimistic) setLoading(false);
      return;
    }

    let isMounted = true;
    const loadInfo = async () => {
      try {
        const data = await getMediaInfo(mediaId);
        if (isMounted) setMediaInfo(data);
      } catch (err) {
        console.error('[MediaMessage] Info Load Error:', err);
        if (isMounted) setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadInfo();
    return () => { isMounted = false; };
  }, [mediaId, isOptimistic, msg.type, msg.fileName, msg.fileSize, msg.optimisticUrl, msg.optimisticThumbUrl, msg.tempmsgid]);

  // 2. Fetch Blobs
  useEffect(() => {
    if (!mediaInfo && !isOptimistic) return;

    let isMounted = true;
    const resolveUrls = async () => {
      try {
        const getFetchUrl = (key, fallback) => {
          if (!key) return fallback;
          if (key.startsWith('http') || key.startsWith('blob:')) return key;
          return `${API}/files/media/serve/${key}`;
        };

        // Thumbnail Resolution
        if (thumbnailKey || isOptimistic) {
          const thumbSrc = isOptimistic ? (msg?.optimisticThumbUrl || msg?.optimisticUrl) : null;
          const cacheKey = isOptimistic ? `${msg?.tempmsgid}_thumb` : `${mediaId}_thumb`;
          const fetchUrl = isOptimistic ? thumbSrc : getFetchUrl(thumbnailKey, mediaInfo?.thumbnailUrl);

          if (fetchUrl && !fetchUrl.endsWith('/null')) {
            const url = await getMediaBlob(cacheKey, fetchUrl, 'thumbCache');
            if (isMounted && url) setResolvedThumb(url);
            if (url && url.startsWith('blob:')) blobUrls.current.add(url);
          }
        }

        // Main Blob Resolution
        const shouldResolveMain = isOptimistic ||
          fileType === 'audio' ||
          fileType === 'image' ||
          fileType === 'pdf';

        if (shouldResolveMain) {
          const mainSrc = isOptimistic ? msg?.optimisticUrl : null;
          const cacheKey = isOptimistic ? msg?.tempmsgid : `${mediaId}_full`;
          const fetchUrl = isOptimistic ? mainSrc : getFetchUrl(fileKey, mediaInfo?.url || mediaInfo?.fileUrl);

          if (fetchUrl && !fetchUrl.endsWith('/null')) {
            const url = await getMediaBlob(cacheKey, fetchUrl, 'mainCache');
            if (isMounted && url) setResolvedMain(url);
            if (url && url.startsWith('blob:')) blobUrls.current.add(url);
          } else if (!isOptimistic && msg.tempmsgid) {
            const cachedUrl = await getMediaBlob(msg.tempmsgid, null, 'mainCache');
            if (isMounted && cachedUrl) setResolvedMain(cachedUrl);
          }
        }
      } catch (err) {
        console.warn('[MediaMessage] URL Resolution failed:', err);
      }
    };

    resolveUrls();
    return () => { isMounted = false; };
  }, [mediaInfo, isOptimistic, msg?.tempmsgid, msg?.optimisticUrl, msg?.optimisticThumbUrl, mediaId, fileKey, thumbnailKey, fileType]);

  // 3. Fallback PDF thumbnail generator client-side
  useEffect(() => {
    const isPDF = isPdfFile(fileName) || fileType === 'pdf' || fileType === 'application/pdf';
    if (!isPDF) return;
    if (resolvedThumb || thumbnailUrl || thumbError) return;
    if (isOptimistic) return;

    const sourceUrl = resolvedMain || fileUrl;
    if (!sourceUrl || !mediaId) return;

    let isMounted = true;
    const generateFallbackThumb = async () => {
      try {
        const cacheKey = `${mediaId}_thumb`;
        const cached = await getMediaBlob(cacheKey, null, 'thumbCache');
        if (cached && isMounted) {
          setResolvedThumb(cached);
          return;
        }

        const result = await getPdfThumbnail(sourceUrl);
        if (result?.blob && isMounted) {
          await saveBlobToCache(cacheKey, result.blob, 'thumbCache');
          const blobUrl = URL.createObjectURL(result.blob);
          setResolvedThumb(blobUrl);
        }
      } catch (err) {
        console.warn('[MediaMessage] PDF client-side thumbnail generation failed:', err);
      }
    };

    generateFallbackThumb();
    return () => { isMounted = false; };
  }, [mediaId, isOptimistic, fileType, fileName, resolvedThumb, thumbnailUrl, thumbError, resolvedMain, fileUrl]);

  // Cleanup Blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrls.current.forEach((url) => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      blobUrls.current.clear();
      if (activeAudioInstance === audioRef.current) {
        activeAudioInstance = null;
      }
    };
  }, []);

  useEffect(() => {
    setThumbError(false);
  }, [resolvedThumb, thumbnailUrl]);

  // Audio Playback Controls
  const togglePlayPause = (e) => {
    if (isSelectionMode) return;
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (activeAudioInstance && activeAudioInstance !== audioRef.current) {
        activeAudioInstance.pause();
      }
      activeAudioInstance = audioRef.current;
      audioRef.current.playbackRate = playbackSpeed;

      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('[MediaMessage] Audio play failed:', err);
          setIsPlaying(false);
        });
      }
      setIsPlaying(true);
    }
  };

  const cycleSpeed = (e) => {
    if (isSelectionMode) return;
    e.stopPropagation();
    const next = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleWaveformSeek = (e) => {
    if (isSelectionMode) return;
    e.stopPropagation();
    if (!audioRef.current || !duration) return;

    const rect = waveformRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const newTime = (clickX / rect.width) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleWaveformKeyDown = (e) => {
    if (!audioRef.current || !duration) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const newTime = Math.max(0, currentTime - 5);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const newTime = Math.min(duration, currentTime + 5);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Guard against missing msg after all hooks have run
  if (!msg) return null;

  // Loading and Error States (Part A: Immediate Skeletons matching real dimensions)
  if (loading && !resolvedMain && !resolvedThumb && !msg.optimisticUrl && !msg.optimisticThumbUrl) {
    const rawType = msg.type || 'file';
    let aspectRatioStyle = '4 / 3';
    if (msg.width && msg.height && msg.height > 0) {
      const r = msg.width / msg.height;
      const clamped = Math.min(Math.max(r, 0.75), 1.777);
      aspectRatioStyle = `${clamped}`;
    }

    if (rawType === 'image' || rawType === 'video') {
      return (
        <div
          className="msg-skeleton-shimmer"
          style={{
            width: '280px',
            maxWidth: '100%',
            aspectRatio: aspectRatioStyle,
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="msg-glass-chip bottom-right">
            <span>{formatTime12Hour(msg.timestamp)}</span>
          </div>
        </div>
      );
    }

    if (rawType === 'audio') {
      return (
        <div
          className="msg-skeleton-shimmer"
          style={{
            width: '300px',
            maxWidth: '100%',
            height: '68px',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--border-color)', opacity: 0.5 }} />
          <div style={{ flex: 1, margin: '0 12px', height: '14px', background: 'var(--border-color)', borderRadius: '6px', opacity: 0.4 }} />
          <div className="msg-time-row" style={{ margin: 0 }}>
            <span>{formatTime12Hour(msg.timestamp)}</span>
          </div>
        </div>
      );
    }

    // Default: document / file / pdf
    return (
      <div
        className="msg-skeleton-shimmer"
        style={{
          width: '300px',
          maxWidth: '100%',
          height: '64px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ width: '40px', height: '44px', borderRadius: '6px', background: 'var(--border-color)', opacity: 0.5 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ width: '60%', height: '12px', background: 'var(--border-color)', borderRadius: '4px', opacity: 0.5 }} />
          <div style={{ width: '35%', height: '10px', background: 'var(--border-color)', borderRadius: '4px', opacity: 0.4 }} />
        </div>
      </div>
    );
  }

  if ((error || !mediaInfo) && !resolvedMain && !resolvedThumb && !msg.optimisticUrl && !msg.optimisticThumbUrl) {
    return (
      <div style={{ padding: '8px 12px', borderLeft: '3px solid var(--danger-color)', background: 'var(--danger-tint)', fontSize: '12px', borderRadius: '4px' }}>
        Media unavailable
      </div>
    );
  }

  // ── Renderers ─────────────────────────────────────────────────────────────

  // 1. Image Renderer
  const renderImage = () => {
    const isUploading = status === 'uploading';
    const isFailed = status === 'failed';
    const imageSrc = resolvedMain || resolvedThumb || thumbnailUrl || fileUrl || msg.optimisticThumbUrl || msg.optimisticUrl;

    // Aspect ratio clamping between 3:4 (0.75) and 16:9 (1.777)
    let aspectRatioStyle = '4 / 3';
    if (msg.width && msg.height && msg.height > 0) {
      const r = msg.width / msg.height;
      const clamped = Math.min(Math.max(r, 0.75), 1.777);
      aspectRatioStyle = `${clamped}`;
    }

    const isBlurry = !isOptimistic && !mainLoaded && Boolean(resolvedThumb || thumbnailUrl);

    return (
      <div
        className="msg-image-wrap"
          style={{ aspectRatio: aspectRatioStyle }}
          onClick={(e) => {
            if (isSelectionMode) return;
            e.stopPropagation();
            if (isFailed) return;
            if (!resolvedMain && !fileUrl) return; // Tap guard: do not open viewer until full media exists!
            onOpenViewer?.({ fileUrl: resolvedMain || fileUrl, fileName, fileType: 'image' });
          }}
        >
          <img
            src={imageSrc}
            alt={fileName || 'Image'}
            loading="lazy"
            onLoad={() => {
              if (resolvedMain) setMainLoaded(true);
            }}
            style={{
              filter: isBlurry ? `blur(${PREVIEW_BLUR_PX}px)` : 'none',
              transition: 'filter 0.6s ease',
              transform: isBlurry ? 'scale(1.08)' : 'none',
            }}
            className={`msg-image-img ${isUploading ? 'msg-media-overlay-dim' : ''} ${isFailed ? 'msg-media-overlay-dim' : ''}`}
          />

          {/* Bottom gradient overlay for glass chip legibility */}
          <div className="msg-image-gradient" />

          {/* Centered Upload Progress Ring */}
          {isUploading && (
            <div className="msg-progress-circle">
              <div style={{ position: 'relative', width: '44px', height: '44px' }}>
                <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3.5" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3.5"
                    strokeDasharray="100"
                    strokeDashoffset={100 - (uploadProgress || 0)}
                    style={{ transition: 'stroke-dashoffset 0.2s ease' }}
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Centered Retry Pill on Failed State */}
          {isFailed && (
            <button
              type="button"
              className="msg-retry-pill"
              onClick={(e) => {
                if (isSelectionMode) return;
                e.stopPropagation();
                onRetry?.(msg);
              }}
              aria-label="Retry upload"
            >
              <RotateCcw size={13} />
              <span>Retry upload</span>
            </button>
          )}

          {/* Bottom Right Glass Chip (Time + Status or Uploading %) */}
          <div className="msg-glass-chip bottom-right">
            {isUploading ? (
              <span>Uploading {uploadProgress || 0}%</span>
            ) : (
              <>
                <span>{formatTime12Hour(msg.timestamp)}</span>
                {!isReceived && <EyeIcon status={msg.status || 'sending'} />}
              </>
            )}
          </div>
      </div>
    );
  };

  // 2. Video Renderer
  const renderVideo = () => {
    const isUploading = status === 'uploading';
    const isFailed = status === 'failed';
    const videoThumb = resolvedThumb || thumbnailUrl || msg.optimisticThumbUrl;

    const isVideoBlurry = !isOptimistic && !resolvedMain && Boolean(videoThumb);

    return (
      <div
        className="msg-video-wrap"
        onClick={(e) => {
          if (isSelectionMode) return;
          e.stopPropagation();
          if (isFailed) return;
          if (!resolvedMain && !fileUrl) return; // Tap guard
          onOpenViewer?.({ fileUrl: resolvedMain || fileUrl, fileName, fileType: 'video' });
        }}
      >
        {videoThumb ? (
          <img
            src={videoThumb}
            alt="Video preview"
            loading="lazy"
            style={{
              filter: isVideoBlurry ? `blur(${PREVIEW_BLUR_PX}px)` : 'none',
              transition: 'filter 0.6s ease',
              transform: isVideoBlurry ? 'scale(1.08)' : 'none',
            }}
            className={`msg-video-thumb ${isUploading || isFailed ? 'msg-media-overlay-dim' : ''}`}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#09090b' }} />
        )}

        {/* Centered 52px Play Button Overlay */}
        {!isUploading && !isFailed && (
          <div className="msg-video-play-btn" aria-hidden="true">
            <Play fill="#111827" color="#111827" size={26} style={{ marginLeft: '3px' }} />
          </div>
        )}

        {/* Centered Upload Progress Ring */}
        {isUploading && (
          <div className="msg-progress-circle">
            <div style={{ position: 'relative', width: '44px', height: '44px' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.5"
                  strokeDasharray="100"
                  strokeDashoffset={100 - (uploadProgress || 0)}
                  style={{ transition: 'stroke-dashoffset 0.2s ease' }}
                />
              </svg>
            </div>
          </div>
        )}

        {/* Centered Retry Pill on Failed State */}
        {isFailed && (
          <button
            type="button"
            className="msg-retry-pill"
            onClick={(e) => {
              if (isSelectionMode) return;
              e.stopPropagation();
              onRetry?.(msg);
            }}
            aria-label="Retry upload"
          >
            <RotateCcw size={13} />
            <span>Retry upload</span>
          </button>
        )}

        {/* Duration Glass Chip Bottom Left */}
        {duration && (
          <div className="msg-glass-chip bottom-left">
            <span>{formatDuration(duration)}</span>
          </div>
        )}

        {/* Time + Status Glass Chip Bottom Right */}
        <div className="msg-glass-chip bottom-right">
          {isUploading ? (
            <span>Uploading {uploadProgress || 0}%</span>
          ) : (
            <>
              <span>{formatTime12Hour(msg.timestamp)}</span>
              {!isReceived && <EyeIcon status={msg.status || 'sending'} />}
            </>
          )}
        </div>
      </div>
    );
  };

  // 3. Audio / Voice Note Renderer
  const renderAudio = () => {
    const barsData = (Array.isArray(msg.waveform) && msg.waveform.length >= 20)
      ? msg.waveform.slice(0, 30)
      : FALLBACK_BARS;

    const audioSrc = resolvedMain || fileUrl;

    return (
      <div className="msg-audio-wrap">
        <div className="msg-audio-row">
          {/* Circular 40px Play/Pause Button */}
          <button
            type="button"
            className="msg-audio-play-btn"
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {isPlaying ? (
              <Pause size={20} fill="currentColor" color="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" color="currentColor" style={{ marginLeft: '2px' }} />
            )}
          </button>

          {/* Tappable/Scrubbable Waveform Slider */}
          <div
            ref={waveformRef}
            className="msg-waveform"
            role="slider"
            tabIndex={0}
            aria-label="Audio scrubber"
            aria-valuenow={Math.round(currentTime)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration || 1)}
            onClick={handleWaveformSeek}
            onKeyDown={handleWaveformKeyDown}
            onTouchStart={handleWaveformSeek}
            onTouchMove={handleWaveformSeek}
          >
            {barsData.map((h, i) => {
              const progress = (currentTime / (duration || 1)) * barsData.length;
              const isActive = i < progress;
              const barHeight = Math.max(6, Math.min(Number(h) || 12, 28));

              let barBg;
              if (isReceived) {
                barBg = isActive ? 'var(--accent-solid)' : 'var(--border-color)';
              } else {
                barBg = isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.35)';
              }

              return (
                <div
                  key={i}
                  className="msg-waveform-bar"
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: barBg,
                  }}
                />
              );
            })}
          </div>

          {/* Speed Chip (Cycles 1x -> 1.5x -> 2x) */}
          <button
            type="button"
            className="msg-speed-chip"
            onClick={cycleSpeed}
            aria-label={`Playback speed: ${playbackSpeed}x`}
          >
            {playbackSpeed}x
          </button>
        </div>

        {/* Bottom Details Row: Elapsed/Total Duration on Left, Time + Status on Right */}
        <div className="msg-audio-bottom">
          <span>
            {formatDuration(isPlaying || currentTime > 0 ? currentTime : duration)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{formatTime12Hour(msg.timestamp)}</span>
            {!isReceived && <EyeIcon status={msg.status || 'sending'} />}
          </div>
        </div>

        {/* Native Audio Element */}
        <audio
          ref={audioRef}
          src={audioSrc}
          onTimeUpdate={onTimeUpdate}
          onEnded={onEnded}
          style={{ display: 'none' }}
        />
      </div>
    );
  };

  // 4. Document / PDF Renderer
  const renderDocument = () => {
    const ext = getFileExtension(fileName, fileType);
    const isPDF = ext === 'PDF' || isPdfFile(fileName) || fileType === 'pdf';
    const hasThumb = isPDF && Boolean(resolvedThumb || thumbnailUrl || msg.optimisticThumbUrl) && !thumbError;
    const downloadTargetUrl = resolvedMain || fileUrl;

    const handleDownload = (e) => {
      e.stopPropagation();
      if (!downloadTargetUrl) return;
      downloadFile(downloadTargetUrl, fileName || 'document');
    };

    const handleCardOpen = (e) => {
      if (isSelectionMode) return;
      e.stopPropagation();
      if (downloadTargetUrl) {
        window.open(downloadTargetUrl, '_blank');
      }
    };

    // A) Paper in a Pocket (First-Page Thumbnail Present)
    if (hasThumb) {
      return (
        <div className="msg-doc-stack-wrap" onClick={handleCardOpen}>
          {/* Stack Area */}
          <div className="msg-doc-stack-area">
            {/* Background Sheet 1 (-4.5deg) */}
            {noOfPages !== 1 && <div className="msg-doc-back-sheet-1" />}

            {/* Background Sheet 2 (3deg) */}
            {noOfPages !== 1 && <div className="msg-doc-back-sheet-2" />}

            {/* Front Sheet with Folded Corner */}
            <div className="msg-doc-front-sheet">
              <img
                src={resolvedThumb || thumbnailUrl || msg.optimisticThumbUrl}
                alt="Document preview"
                className="msg-doc-front-img"
                onError={() => setThumbError(true)}
              />
              <div className="msg-doc-corner-triangle" />
            </div>
          </div>

          {/* Pocket Overlap */}
          <div className="msg-doc-pocket">
            <div className="msg-doc-pocket-info">
              <span className="msg-doc-pocket-title">
                {fileName || 'Document.pdf'}
              </span>
              <span className="msg-doc-pocket-sub">
                {noOfPages ? `${noOfPages} pages · ` : ''}
                {formatSize(fileSize)} · {formatTime12Hour(msg.timestamp)}
              </span>
            </div>

            {/* 36px Circular Download Button */}
            <button
              type="button"
              className="msg-doc-download-btn"
              onClick={handleDownload}
              aria-label="Download document"
            >
              <Download size={16} />
            </button>
          </div>
        </div>
      );
    }

    // B) Generic Row Tile (Without Thumbnail)
    return (
      <div className="msg-doc-row" onClick={handleCardOpen}>
        {/* 40x48px Extension Tile */}
        <div className={`msg-doc-ext-tile ${isPDF ? 'is-pdf' : 'is-other'}`}>
          <div className="msg-doc-ext-tile-flap" />
          <span>{ext}</span>
        </div>

        {/* Text Information */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {fileName || 'Document'}
          </span>
          <span style={{ fontSize: '11px', opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>
            {noOfPages ? `${noOfPages} pages · ` : ''}
            {formatSize(fileSize)} · {formatTime12Hour(msg.timestamp)}
          </span>
        </div>

        {/* 36px Download Button */}
        <button
          type="button"
          className="msg-doc-download-btn"
          onClick={handleDownload}
          aria-label="Download document"
        >
          <Download size={16} />
        </button>
      </div>
    );
  };

  switch (fileType) {
    case 'image':
      return renderImage();
    case 'video':
      return renderVideo();
    case 'audio':
      return renderAudio();
    default:
      return renderDocument();
  }
}

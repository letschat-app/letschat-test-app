import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  ArrowLeft,
  Download,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Play,
  Pause,
  RotateCw,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import useBackClose from '../../hooks/useBackClose';
import { useMediaGalleryGestures } from '../../hooks/useMediaGalleryGestures';
import { downloadFile } from '../../service/MediaUploader';
import { getMediaInfo, getMediaBlob } from '../../service/MediaCache';
import { formatTime12Hour, formatDateWithLabel } from '../../utils/chatFormatting';
import './messages.css';

const R2_PUBLIC_URL = 'https://pub-91d12b8ece574bde8ccd1c26b5367b6d.r2.dev/';
const resolveR2 = (val) => {
  if (!val || val === 'null' || val === 'undefined') return null;
  const s = String(val).trim();
  if (!s || s === 'null' || s === 'undefined') return null;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:') || s.startsWith('data:')) return s;
  return `${R2_PUBLIC_URL}${s.replace(/^\/+/, '')}`;
};

const formatSeconds = (sec) => {
  if (!sec || isNaN(sec) || sec <= 0) return '0:00';
  const mins = Math.floor(sec / 60);
  const secs = Math.floor(sec % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function MediaViewer({
  media,           // Backwards compatibility: single media object
  mediaList = [],  // Seamless gallery: array of media messages
  initialIndex = 0,
  initialId = null,
  onClose,
  onEdit,
}) {
  useBackClose(true, onClose);

  // Normalize media items into an array
  const items = useMemo(() => {
    if (Array.isArray(mediaList) && mediaList.length > 0) {
      return mediaList;
    }
    if (media) {
      return [media];
    }
    return [];
  }, [mediaList, media]);

  // Determine starting index
  const resolvedInitialIndex = useMemo(() => {
    if (initialId && items.length > 0) {
      const idx = items.findIndex((m) => (m.id === initialId || m.msgid === initialId || m.mediaId === initialId || m.content === initialId));
      if (idx !== -1) return idx;
    }
    if (typeof initialIndex === 'number' && initialIndex >= 0 && initialIndex < items.length) {
      return initialIndex;
    }
    return 0;
  }, [items, initialId, initialIndex]);

  const [currentIndex, setCurrentIndex] = useState(resolvedInitialIndex);
  const [rotation, setRotation] = useState(0);
  const [resolvedUrls, setResolvedUrls] = useState({});

  // Video playback states
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [videoProgress, setVideoProgress] = useState({ current: 0, duration: 0 });
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  const videoRef = useRef(null);
  const filmstripRef = useRef(null);

  const activeItem = items[currentIndex] || items[0] || null;

  // Navigation handlers
  const canGoNext = currentIndex < items.length - 1;
  const canGoPrev = currentIndex > 0;

  const goToNext = useCallback(() => {
    if (canGoNext) {
      setCurrentIndex((prev) => prev + 1);
      setRotation(0);
      setIsPlaying(true);
    }
  }, [canGoNext]);

  const goToPrev = useCallback(() => {
    if (canGoPrev) {
      setCurrentIndex((prev) => prev - 1);
      setRotation(0);
      setIsPlaying(true);
    }
  }, [canGoPrev]);

  // Gesture engine
  const { scale, setScale, pan, dragOffset, isSwiping, resetZoom, handlers } = useMediaGalleryGestures({
    onNext: goToNext,
    onPrev: goToPrev,
    onClose,
    canGoNext,
    canGoPrev,
    enabled: true,
  });

  // Reset zoom & pan whenever index changes
  useEffect(() => {
    resetZoom();
    setRotation(0);
  }, [currentIndex, resetZoom]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'ArrowLeft') {
        goToPrev();
      } else if (e.key === 'Escape') {
        onClose?.();
      } else if (e.key === ' ' && activeItem?.fileType === 'video') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, onClose, activeItem]);

  // Scroll active thumbnail to center of filmstrip
  useEffect(() => {
    if (filmstripRef.current && items.length > 1) {
      const activeEl = filmstripRef.current.children[currentIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentIndex, items.length]);

  // Resolve media URL for an item (using cache / network)
  const resolveItemUrl = useCallback(async (item) => {
    if (!item) return null;
    const key = item.id || item.msgid || item.tempmsgid || item.content;
    if (resolvedUrls[key]) return resolvedUrls[key];
    if (item.fileUrl) return item.fileUrl;
    if (item.optimisticUrl) return item.optimisticUrl;

    const mediaId = item.content || item.mediaId;
    if (mediaId) {
      try {
        const info = await getMediaInfo(mediaId);
        const sourceUrl = resolveR2(info?.fileKey || info?.url || info?.fileUrl);
        if (sourceUrl) {
          const blobUrl = await getMediaBlob(`${mediaId}_full`, sourceUrl, 'mainCache');
          if (blobUrl) {
            setResolvedUrls((prev) => ({ ...prev, [key]: blobUrl }));
            return blobUrl;
          }
        }
      } catch (err) {
        console.warn('[MediaViewer] URL resolve error:', err);
      }
    }
    return null;
  }, [resolvedUrls]);

  // Preload current, previous, and next items
  useEffect(() => {
    if (items.length === 0) return;
    resolveItemUrl(items[currentIndex]);
    if (currentIndex > 0) resolveItemUrl(items[currentIndex - 1]);
    if (currentIndex < items.length - 1) resolveItemUrl(items[currentIndex + 1]);
  }, [currentIndex, items, resolveItemUrl]);

  // Auto-hide video controls after inactivity
  const handleUserActivity = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3500);
  }, [isPlaying]);

  const activeUrl = useMemo(() => {
    if (!activeItem) return null;
    const key = activeItem.id || activeItem.msgid || activeItem.tempmsgid || activeItem.content;
    return resolvedUrls[key] || activeItem.fileUrl || activeItem.optimisticUrl || resolveR2(activeItem.fileKey) || null;
  }, [activeItem, resolvedUrls]);

  const fileName = activeItem?.fileName || (activeItem?.fileType === 'video' ? 'Video' : 'Image');
  const isVideo = activeItem?.fileType === 'video' || activeItem?.type === 'video';
  const isGif = fileName?.toLowerCase().endsWith('.gif') || activeUrl?.toLowerCase().includes('.gif');
  const canEdit = !isVideo && !isGif && typeof onEdit === 'function';

  const handleDownload = (e) => {
    e.stopPropagation();
    if (!activeUrl) return;
    if (activeUrl.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = activeUrl;
      link.setAttribute('download', fileName || 'download');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadFile(activeUrl, fileName);
    }
  };

  const cycleSpeed = () => {
    const nextSpeed = playbackSpeed === 1 ? 1.5 : playbackSpeed === 1.5 ? 2 : 1;
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) videoRef.current.playbackRate = nextSpeed;
  };

  const skipVideoTime = (delta) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + delta));
    }
  };

  if (!activeItem) return null;

  // Compute pull-down backdrop opacity
  const backdropOpacity = Math.max(0.2, 1 - Math.abs(dragOffset.y) / 300);

  return (
    <div
      className="media-viewer-root"
      onMouseMove={handleUserActivity}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: `rgba(0, 0, 0, ${backdropOpacity * 0.96})`,
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'viewerFadeIn 0.2s ease-out',
      }}
    >
      {/* ─── Top Bar ────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 'calc(60px + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: 'max(14px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(14px, env(safe-area-inset-right, 0px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
          zIndex: 20,
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            aria-label="Close viewer"
          >
            <ArrowLeft size={22} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ color: '#ffffff', fontWeight: '600', fontSize: '14.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {activeItem.sendername || 'Media'}
            </div>
            {activeItem.timestamp && (
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '11.5px' }}>
                {formatDateWithLabel(activeItem.timestamp)} • {formatTime12Hour(activeItem.timestamp)}
              </div>
            )}
          </div>
        </div>

        {/* Counter Pill in center (desktop/tablet) */}
        {items.length > 1 && (
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#ffffff',
              padding: '3px 12px',
              borderRadius: '16px',
              fontSize: '12.5px',
              fontWeight: '600',
              backdropFilter: 'blur(4px)',
            }}
          >
            {currentIndex + 1} / {items.length}
          </div>
        )}

        {/* Top Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!isVideo && (
            <>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(4, s + 0.5))}
                style={topActionBtnStyle}
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(1, s - 0.5))}
                style={topActionBtnStyle}
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                style={topActionBtnStyle}
                title="Rotate 90°"
              >
                <RotateCw size={18} />
              </button>
            </>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.({ fileUrl: activeUrl, fileName, fileType: 'image' });
              }}
              style={topActionBtnStyle}
              title="Edit image"
            >
              <Pencil size={18} />
            </button>
          )}

          <button
            type="button"
            onClick={handleDownload}
            style={topActionBtnStyle}
            title="Download"
          >
            <Download size={18} />
          </button>

          <button
            type="button"
            onClick={onClose}
            style={topActionBtnStyle}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* ─── Main Content Canvas with Swipe & Gestures ──────────────────────── */}
      <div
        className="media-viewer-canvas"
        {...handlers}
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        {/* Desktop Prev Button */}
        {canGoPrev && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goToPrev(); }}
            className="media-viewer-nav-btn prev"
            aria-label="Previous item"
          >
            <ChevronLeft size={28} />
          </button>
        )}

        {/* Media Item Container */}
        <div
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `translate3d(${dragOffset.x + pan.x}px, ${dragOffset.y + pan.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
            transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0, 0.2, 1)',
            cursor: scale > 1 ? 'grab' : 'default',
          }}
        >
          {isVideo ? (
            <div
              style={{ position: 'relative', maxWidth: '100vw', maxHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying((p) => !p);
              }}
            >
              <video
                ref={videoRef}
                src={activeUrl}
                playsInline
                autoPlay
                muted={isMuted}
                onTimeUpdate={(e) => {
                  setVideoProgress({
                    current: e.currentTarget.currentTime,
                    duration: e.currentTarget.duration || 0,
                  });
                }}
                onEnded={() => setIsPlaying(false)}
                style={{
                  maxWidth: '92vw',
                  maxHeight: '76vh',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  objectFit: 'contain',
                }}
              />

              {/* Big Center Play/Pause button on pause */}
              {!isPlaying && (
                <div
                  style={{
                    position: 'absolute',
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(4px)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    pointerEvents: 'none',
                  }}
                >
                  <Play size={32} fill="#ffffff" style={{ marginLeft: '4px' }} />
                </div>
              )}
            </div>
          ) : (
            <img
              src={activeUrl}
              alt={fileName}
              draggable={false}
              style={{
                maxWidth: '94vw',
                maxHeight: '78vh',
                objectFit: 'contain',
                boxShadow: '0 8px 36px rgba(0,0,0,0.6)',
                borderRadius: '8px',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* Desktop Next Button */}
        {canGoNext && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); goToNext(); }}
            className="media-viewer-nav-btn next"
            aria-label="Next item"
          >
            <ChevronRight size={28} />
          </button>
        )}
      </div>

      {/* ─── Video Control Bar (when active item is a video) ─────────────────── */}
      {isVideo && (
        <div
          style={{
            position: 'absolute',
            bottom: items.length > 1 ? '76px' : '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(92vw, 680px)',
            background: 'rgba(17, 24, 39, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#ffffff',
            zIndex: 30,
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.25s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            style={iconBtnStyle}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} fill="#ffffff" /> : <Play size={18} fill="#ffffff" style={{ marginLeft: '2px' }} />}
          </button>

          <span style={{ fontSize: '11.5px', fontFamily: 'monospace', opacity: 0.9, minWidth: '34px' }}>
            {formatSeconds(videoProgress.current)}
          </span>

          {/* Scrubber slider */}
          <input
            type="range"
            min={0}
            max={videoProgress.duration || 1}
            step={0.1}
            value={videoProgress.current}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVideoProgress((prev) => ({ ...prev, current: val }));
              if (videoRef.current) videoRef.current.currentTime = val;
            }}
            style={{
              flex: 1,
              accentColor: 'var(--accent-color)',
              cursor: 'pointer',
              height: '4px',
            }}
          />

          <span style={{ fontSize: '11.5px', fontFamily: 'monospace', opacity: 0.7, minWidth: '34px' }}>
            {formatSeconds(videoProgress.duration)}
          </span>

          <button
            type="button"
            onClick={() => skipVideoTime(-10)}
            style={{ ...iconBtnStyle, fontSize: '11px', fontWeight: '700' }}
            title="Rewind 10s"
          >
            -10s
          </button>

          <button
            type="button"
            onClick={() => skipVideoTime(10)}
            style={{ ...iconBtnStyle, fontSize: '11px', fontWeight: '700' }}
            title="Fast forward 10s"
          >
            +10s
          </button>

          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            style={iconBtnStyle}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
          </button>

          <button
            type="button"
            onClick={cycleSpeed}
            style={{ ...iconBtnStyle, fontSize: '11.5px', fontWeight: '700', minWidth: '32px' }}
            title="Playback Speed"
          >
            {playbackSpeed}x
          </button>
        </div>
      )}

      {/* ─── Bottom Filmstrip Tray ──────────────────────────────────────────── */}
      {items.length > 1 && (
        <div
          ref={filmstripRef}
          className="hide-scrollbar"
          style={{
            height: '66px',
            padding: '8px 16px calc(8px + env(safe-area-inset-bottom, 0px))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: items.length < 8 ? 'center' : 'flex-start',
            gap: '8px',
            overflowX: 'auto',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
            zIndex: 20,
            opacity: showControls ? 1 : 0,
            transition: 'opacity 0.25s ease',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, idx) => {
            const isSelected = idx === currentIndex;
            const itemKey = item.id || item.msgid || item.tempmsgid || item.content;
            const thumbSrc = resolvedUrls[itemKey] || item.optimisticThumbUrl || item.thumbUrl || item.fileUrl || item.optimisticUrl || resolveR2(item.thumbnailKey || item.thumbKey);
            const isItemVideo = item.fileType === 'video' || item.type === 'video';

            return (
              <button
                key={itemKey || idx}
                type="button"
                onClick={() => {
                  setCurrentIndex(idx);
                  setIsPlaying(true);
                }}
                style={{
                  position: 'relative',
                  width: '46px',
                  height: '46px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  padding: 0,
                  border: isSelected ? '2px solid var(--accent-color)' : '1px solid rgba(255, 255, 255, 0.2)',
                  opacity: isSelected ? 1 : 0.5,
                  transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.2s cubic-bezier(0.2, 0, 0.2, 1)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  backgroundColor: '#111827',
                }}
              >
                {thumbSrc ? (
                  <img
                    src={thumbSrc}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', backgroundColor: '#1e293b' }} />
                )}
                {isItemVideo && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <Play size={12} fill="#ffffff" color="#ffffff" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Embedded Styles ────────────────────────────────────────────────── */}
      <style>{`
        @keyframes viewerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .media-viewer-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(17, 24, 39, 0.7);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          display: flex;
          align-items: center;
          justifyContent: center;
          cursor: pointer;
          transition: all 0.2s ease;
          z-index: 25;
        }
        .media-viewer-nav-btn:hover {
          background: rgba(17, 24, 39, 0.95);
          transform: translateY(-50%) scale(1.08);
        }
        .media-viewer-nav-btn.prev {
          left: 18px;
        }
        .media-viewer-nav-btn.next {
          right: 18px;
        }
        @media (max-width: 768px) {
          .media-viewer-nav-btn {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

const topActionBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '6px',
  transition: 'background 0.2s',
};

const iconBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#ffffff',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.15s ease',
};

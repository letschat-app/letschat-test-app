import React, { useState, useEffect, useRef } from 'react';
import { Download, FileText, Play, Pause, Music, ExternalLink, Loader2, Mic, RotateCcw } from 'lucide-react';
import { API } from '../../service/UserAuth';
import { downloadFile } from '../../service/MediaUploader';
import { getMediaInfo, getMediaBlob, memoryThumbCache } from '../../service/MediaCache';

/**
 * Format bytes to human readable size
 */
const formatSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Format seconds to MM:SS
 */
const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const isPdfFile = (name) => {
  if (!name) return false;
  return name.toLowerCase().endsWith('.pdf');
};

export default function MediaMessage({ msg, isReceived, isMobile, isSelectionMode, onOpenViewer, onRetry }) {
  const [mediaInfo, setMediaInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFull, setShowFull] = useState(false);
  const [error, setError] = useState(null);
  const [thumbError, setThumbError] = useState(false);

  const mediaId = msg.content;
  const isOptimistic = msg.isOptimistic;
  const uploadProgress = msg.uploadProgress || 0;
  const status = msg.status; // 'uploading', 'failed', 'sent'

  // Resolution states for cached URLs
  const [resolvedThumb, setResolvedThumb] = useState(() => {
    const idbKey = isOptimistic ? `${msg.tempmsgid}_thumb` : `${mediaId}_thumb`;
    return memoryThumbCache?.get(idbKey) || null;
  });
  const [resolvedMain, setResolvedMain] = useState(null);
  const blobUrls = useRef(new Set());

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);

  // 1. Fetch Media Info (Metadata)
  useEffect(() => {
    // If optimistic, we already have basic info from msg object
    if (isOptimistic) {
      setMediaInfo({
        fileType: msg.type,
        fileName: msg.fileName,
        fileSize: msg.fileSize,
        fileKey: msg.optimisticUrl,
        thumbnailKey: msg.optimisticThumbUrl || msg.optimisticUrl, // Support native fast-path thumb injection
      });
      setLoading(false);
      return;
    }

    if (!mediaId || mediaId === msg.tempmsgid) {
      // Still in optimistic state or invalid
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
  }, [mediaId, isOptimistic, msg]);

  // 2. Resolve Thumbnail and Main URLs
  useEffect(() => {
    if (!mediaInfo) return;

    let isMounted = true;
    const { thumbnailKey, fileKey, fileType } = mediaInfo;

    const resolveUrls = async () => {
      try {
        // Helper to get correct fetch URL for non-optimistic messages
        const getFetchUrl = (key, explicitUrl) => {
          const cleanExplicit = explicitUrl === 'null' || explicitUrl === 'undefined' ? null : explicitUrl;
          const cleanKey = key === 'null' || key === 'undefined' ? null : key;
          if (cleanExplicit) return cleanExplicit;
          if (!cleanKey) return null;
          return cleanKey.startsWith('http') ? cleanKey : `${API}/files/media/serve/${cleanKey}`;
        };

        // A. Resolve Thumbnail
        if (isOptimistic) {
          // Try IDB-persisted thumb first (survives reload/offline), then fall back to session blob URL
          const idbKey = `${msg.tempmsgid}_thumb`;
          const sessionBlobUrl = msg.optimisticThumbUrl || null;
          console.log('[THUMB DEBUG] MediaMessage resolving thumb | idbKey:', idbKey, '| sessionBlobUrl:', sessionBlobUrl);

          // getMediaBlob will return IDB-cached blob URL if available, else try to fetch sessionBlobUrl
          const cachedUrl = await getMediaBlob(idbKey, sessionBlobUrl, 'thumbCache');
          console.log('[THUMB DEBUG] getMediaBlob returned:', cachedUrl);
          if (cachedUrl && isMounted) {
            setResolvedThumb(cachedUrl);
            // DO NOT track thumbCache blob URLs here! MediaCache manages their memory globally.
          } else if (sessionBlobUrl && isMounted) {
            console.log('[THUMB DEBUG] Falling back to sessionBlobUrl:', sessionBlobUrl);
            // Same-session fallback: blob URL still valid. 
            // DO NOT add this to blobUrls.current! We did not create this URL, ChatBox did.
            // Revoking it on unmount breaks the optimistic state globally.
            setResolvedThumb(sessionBlobUrl);
          } else {
            console.warn('[THUMB DEBUG] No thumb resolved! msg.optimisticThumbUrl:', msg.optimisticThumbUrl);
          }
        } else {
          // Finalized message
          const cacheKey = `${mediaId}_thumb`;
          const fetchUrl = getFetchUrl(thumbnailKey, mediaInfo.thumbnailUrl);

          // ALWAYS check cache first, even if fetchUrl is null (since we locally generate & cache PDF thumbs)
          const url = await getMediaBlob(cacheKey, fetchUrl, 'thumbCache');
          if (isMounted && url) {
            setResolvedThumb(url);
            // DO NOT track thumbCache blob URLs here! MediaCache manages their memory globally.
          }
        }

        // B. Resolve Main
        const shouldResolveMain = isOptimistic ||
          fileType === 'audio' ||
          showFull ||
          fileType === 'image' ||
          fileType === 'pdf';

        if (shouldResolveMain) {
          const mainSrc = isOptimistic ? msg.optimisticUrl : null;
          const cacheKey = isOptimistic ? msg.tempmsgid : `${mediaId}_full`;
          const fetchUrl = isOptimistic ? mainSrc : getFetchUrl(fileKey, mediaInfo.url || mediaInfo.fileUrl);

          if (fetchUrl) {
            const url = await getMediaBlob(cacheKey, fetchUrl, 'mainCache');
            if (isMounted) setResolvedMain(url);
            if (url && url.startsWith('blob:')) blobUrls.current.add(url);
          }
        }
      } catch (err) {
        console.warn('[MediaMessage] URL Resolution failed:', err);
      }
    };

    resolveUrls();

    return () => { isMounted = false; };
  }, [mediaInfo, showFull, isOptimistic, msg.tempmsgid, msg.optimisticUrl, msg.optimisticThumbUrl]);

  // 3. Final Cleanup: Revoke all tracked Blob URLs when component truly unmounts
  useEffect(() => {
    return () => {
      blobUrls.current.forEach(url => {
        // Check if it's a blob URL before revoking
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      blobUrls.current.clear();
    };
  }, []);



  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
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

  const s = (val) => val === 'null' || val === 'undefined' ? null : val;

  const fileKey = mediaInfo?.fileKey;
  const thumbnailKey = mediaInfo?.thumbnailKey;
  const fileType = mediaInfo?.fileType;
  const fileName = mediaInfo?.fileName;
  const fileSize = mediaInfo?.fileSize;
  const duration = mediaInfo?.duration;
  const noOfPages = mediaInfo?.noOfPages;

  // Final fallback URLs (if not resolved to blob, and preserving exact presigned URLs if backend gave them)
  const fileUrl = s(mediaInfo?.url) || s(mediaInfo?.fileUrl) || (s(fileKey) ? (fileKey.startsWith('http') || fileKey.startsWith('blob:') ? fileKey : `${API}/files/media/serve/${fileKey}`) : null);
  const thumbnailUrl = s(mediaInfo?.thumbnailUrl) || (s(thumbnailKey) ? (thumbnailKey.startsWith('http') || thumbnailKey.startsWith('blob:') ? thumbnailKey : `${API}/files/media/serve/${thumbnailKey}`) : null);

  // 4. Recover from transient errors if the image source successfully recovers/swaps
  useEffect(() => {
    setThumbError(false);
  }, [resolvedThumb, thumbnailUrl]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px' }}>
        <Loader2 className="animate-spin" size={18} color="#9ca3af" />
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Loading media...</span>
      </div>
    );
  }

  if (error || !mediaInfo) {
    return (
      <div style={{ padding: '8px', borderLeft: '3px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)', fontSize: '12px' }}>
        Media unavailable
      </div>
    );
  }

  // ── Renderers ─────────────────────────────────────────────────────────────

  const renderOptimisticOverlay = () => {
    if (!isOptimistic || status === 'sent') return null;

    return (
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.2)', // Very light dimming
        zIndex: 5,
        borderRadius: 'inherit',
        backdropFilter: 'none', // Remove blur
        pointerEvents: 'none' // Let clicks pass through to media while uploading
      }}>
        {status === 'uploading' && (
          <div style={{ 
            width: '40px', height: '40px', 
            background: 'rgba(0,0,0,0.5)', 
            borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <div style={{ position: 'relative', width: '30px', height: '30px' }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                <circle 
                  cx="18" cy="18" r="16" fill="none" stroke="#60a5fa" strokeWidth="4" 
                  strokeDasharray="100" strokeDashoffset={100 - uploadProgress}
                  style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
              </svg>
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderImage = () => (
    <div
      onClick={(e) => {
        if (isSelectionMode) return;
        e.stopPropagation();
        if (status === 'failed') return;
        // Immediate full screen on first click
        onOpenViewer?.({ fileUrl: resolvedMain || fileUrl, fileName, fileType });
      }}
      style={{
        position: 'relative',
        width: isMobile ? '100%' : '280px',
        maxWidth: '280px',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <img
        src={resolvedMain || resolvedThumb || thumbnailUrl || fileUrl}
        alt={fileName}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          maxHeight: '400px',
          objectFit: 'contain',
          transition: 'filter 0.3s ease',
          opacity: status === 'uploading' ? 0.6 : 1
        }}
      />

      {renderOptimisticOverlay()}

      {(!isOptimistic || status === 'failed') && (
        <div
          style={{
            position: 'absolute', bottom: '8px', right: '8px',
            display: 'flex', alignItems: 'center', gap: '8px',
            zIndex: 6
          }}
        >
          {status === 'failed' && (
            <div
              onClick={(e) => {
                if (isSelectionMode) return;
                e.stopPropagation();
                onRetry?.(msg);
              }}
              title="Retry Upload"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(239, 68, 68, 0.8)', padding: '4px 8px', borderRadius: '12px',
                color: 'white', fontSize: '11px', fontWeight: '500',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer', transition: 'background 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.8)'}
            >
              <RotateCcw size={14} />
              <span>Retry</span>
            </div>
          )}

          {!isOptimistic && (
            <div
              onClick={(e) => {
                if (isSelectionMode) return;
                e.stopPropagation();
                const url = resolvedMain || fileUrl;
                if (url.startsWith('blob:')) {
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', fileName || 'download');
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                } else {
                  downloadFile(url, fileName);
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                padding: '4px 8px', borderRadius: '12px',
                color: 'white', fontSize: '11px', fontWeight: '500',
                border: '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer', transition: 'background 0.2s ease',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.8)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
            >
              <span>{formatSize(fileSize)}</span>
              <Download size={14} />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderVideo = () => (
    <div 
      onClick={(e) => {
        if (isSelectionMode) return;
        e.stopPropagation();
        onOpenViewer?.({ fileUrl: resolvedMain || fileUrl, fileName, fileType });
      }}
      style={{
        width: isMobile ? '100%' : '280px',
        maxWidth: '280px',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#000',
        position: 'relative',
        cursor: 'pointer'
      }}
    >
      <img 
        src={resolvedThumb || thumbnailUrl} 
        style={{ 
          width: '100%', 
          height: 'auto',
          display: 'block',
          opacity: status === 'uploading' ? 0.3 : 0.7 
        }} 
        alt="Video thumbnail" 
      />
      
      {renderOptimisticOverlay()}

      {/* Play Button Overlay */}
      <div style={{ 
        position: 'absolute', 
        inset: 0, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        pointerEvents: 'none' // Let clicks pass through to the main container
      }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.25)', 
          borderRadius: '50%', 
          padding: '12px', 
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Play fill="white" color="white" size={32} style={{ marginLeft: '4px' }} />
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: '8px', right: '8px',
        display: 'flex', alignItems: 'center', gap: '8px',
        zIndex: 6
      }}>
        {status === 'failed' && (
          <div
            onClick={(e) => {
              if (isSelectionMode) return;
              e.stopPropagation();
              onRetry?.(msg);
            }}
            title="Retry Upload"
            style={{
              padding: '6px 10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.8)',
              border: '1px solid rgba(255,255,255,0.2)', color: 'white',
              display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
              fontSize: '11px', fontWeight: '500'
            }}
          >
            <RotateCcw size={14} />
            <span>Retry</span>
          </div>
        )}
        <div style={{
          background: 'rgba(0,0,0,0.7)', padding: '4px 8px', borderRadius: '12px',
          fontSize: '11px', color: 'white', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {formatDuration(duration)}
        </div>
      </div>
    </div>
  );

  const renderAudio = () => {
    // Simulated waveform bars
    const bars = [8, 12, 16, 12, 8, 14, 20, 24, 18, 12, 10, 16, 22, 18, 10, 8, 12, 16, 12, 8, 14, 20, 24, 18, 12, 10, 16, 22, 18, 10, 24, 18, 10, 8, 12, 16, 12, 8, 14, 20];

    return (
      <div style={{
        width: isMobile ? '100%' : '300px',
        maxWidth: '300px',
        padding: '12px 16px',
        background: 'rgba(15, 23, 42, 0.4)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
      }}>
        {renderOptimisticOverlay()}
        {/* Main row: Icon + Waveform */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Action Button: Download or Play */}
          {!showFull ? (
            <button
              onClick={(e) => { 
                if (isSelectionMode) return;
                e.stopPropagation(); 
                setShowFull(true); 
              }}
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#60a5fa', cursor: 'pointer', flexShrink: 0, outline: 'none'
              }}
            >
              <Download size={24} />
            </button>
          ) : (
            <button
              onClick={(e) => { 
                if (isSelectionMode) return;
                e.stopPropagation(); 
                togglePlayPause(); 
              }}
              style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'transparent', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer', flexShrink: 0, outline: 'none'
              }}
            >
              {isPlaying ? <Pause size={30} fill="#fff" /> : <Play size={30} fill="#fff" />}
            </button>
          )}

          {/* Waveform Visualization */}
          <div style={{
            flex: 1, height: '32px', display: 'flex', alignItems: 'center', gap: '2.5px',
            opacity: showFull ? 1 : 0.6
          }}>
            {bars.map((h, i) => {
              const progress = (currentTime / (duration || 1)) * bars.length;
              const isActive = i < progress;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1, height: `${h}px`, borderRadius: '1.5px',
                    background: isActive ? '#60a5fa' : 'rgba(148, 163, 184, 0.3)',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 0 8px rgba(96, 165, 250, 0.4)' : 'none'
                  }}
                />
              );
            })}
          </div>

          {/* Hidden Audio Element */}
          {showFull && (
            <audio
              ref={audioRef}
              src={resolvedMain || fileUrl}
              onTimeUpdate={onTimeUpdate}
              onEnded={onEnded}
              style={{ display: 'none' }}
            />
          )}

          {/* Mic Icon (Standard Voice Note Indicator) */}
          <div style={{ 
            color: '#60a5fa', 
            display: 'flex', 
            alignItems: 'center', 
            opacity: isOptimistic ? 0.4 : 1,
            filter: 'drop-shadow(0 0 8px rgba(96, 165, 250, 0.4))'
          }}>
            <Mic size={20} fill="#60a5fa" />
          </div>
        </div>

        {/* Info row: Duration only (since parent renders timestamp) */}
        {!isOptimistic && (
          <div style={{
            display: 'flex', justifyContent: 'flex-start',
            paddingLeft: '60px', opacity: 0.8
          }}>
            <span style={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}>
              {isPlaying || currentTime > 0 ? formatDuration(currentTime) : formatDuration(duration)} • {formatSize(fileSize)}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderDocument = () => {
    // 1. Consolidated PDF detection (Safe, single declaration)
    const isPDF = isPdfFile(fileName) || fileType === 'pdf' || fileType === 'application/pdf';

    // 2. Resolve thumbnail presence logic — only show thumbnail for PDFs, not generic docs
    const hasThumb = isPDF && !!(resolvedThumb || thumbnailUrl) && !thumbError;

    const docColor = isPDF ? '#ef4444' : '#6366f1';

    return (
      <div
        style={{
          width: isMobile ? '100%' : '300px',
          maxWidth: '300px',
          background: '#232b36',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.05)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
        }}
        onClick={(e) => {
          if (isSelectionMode) return;
          e.stopPropagation();
          const url = resolvedMain || fileUrl;
          window.open(url, '_blank');
        }}
      >
        {renderOptimisticOverlay()}

        {/* Thumbnail Hero Section (Top-Crop Style) */}
        {hasThumb && (
          <div style={{
            width: '100%', height: '120px', 
            background: '#1a1a1a', 
            position: 'relative',
            overflow: 'hidden'
          }}>
            <img
              src={resolvedThumb || thumbnailUrl}
              style={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                objectPosition: 'top'
              }}
              alt="Document preview"
              onError={() => setThumbError(true)}
            />
            {/* Bottom Gradient Fade */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '40px',
              background: 'linear-gradient(to top, #232b36, transparent)'
            }}/>
          </div>
        )}

        {/* Bottom Details Block (Original Theme Color) */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '12px 14px',
          background: '#232b36' 
        }}>

          {/* Folded Document Icon */}
          <div style={{
            width: '38px', height: '46px',
            background: docColor,
            borderRadius: '6px',
            position: 'relative',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            paddingBottom: '4px', flexShrink: 0,
            overflow: 'hidden'
          }}>
            {/* The folded dog-ear corner */}
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: '12px', height: '12px',
              background: 'rgba(0,0,0,0.2)',
              borderBottomLeftRadius: '6px'
            }} />
            <div style={{
              position: 'absolute', top: '-12px', right: '-12px',
              width: '24px', height: '24px',
              background: '#232b36',
              transform: 'rotate(45deg)'
            }} />

            <span style={{ fontSize: '10px', fontWeight: '900', color: 'white', letterSpacing: '0.2px', zIndex: 1 }}>
              {isPDF ? 'PDF' : 'DOC'}
            </span>
          </div>

          {/* Text Information */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{
              fontSize: '14px', fontWeight: '600', color: '#ffffff',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
            }}>
              {fileName}
            </div>
            <div style={{ fontSize: '11px', color: '#a0aec0', fontWeight: '500' }}>
              {mediaInfo.noOfPages ? `${mediaInfo.noOfPages} pages • ` : ''}
              {isPDF ? 'PDF' : (fileType || 'Doc').toUpperCase()} • {formatSize(fileSize)}
            </div>
          </div>

          {/* Action Buttons Area */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {status === 'failed' && (
              <div
                onClick={(e) => {
                  if (isSelectionMode) return;
                  e.stopPropagation();
                  onRetry?.(msg);
                }}
                title="Retry Upload"
                style={{
                  padding: '8px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  transition: 'background 0.2s', color: '#ef4444'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
              >
                <RotateCcw size={16} />
              </div>
            )}

            <div
              onClick={(e) => {
                if (isSelectionMode) return;
                e.stopPropagation();
                const url = resolvedMain || fileUrl;
                downloadFile(url, fileName);
              }}
              style={{
                padding: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              <Download size={18} color="#ffffff" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes muSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: muSpin 1s linear infinite; }
      `}</style>
      {(() => {
        switch (fileType) {
          case 'image': return renderImage();
          case 'video': return renderVideo();
          case 'audio': return renderAudio();
          default: return renderDocument();
        }
      })()}
    </>
  );
}

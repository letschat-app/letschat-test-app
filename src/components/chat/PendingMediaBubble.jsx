import React from 'react';
import { Download, Play, Music, FileText, Loader2 } from 'lucide-react';
import { formatTime12Hour, getDocIconInfo } from '../../service/ChatUtils';
import { PREVIEW_BLUR_PX } from '../../service/TinyPreview';
import './messages.css';

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

const getFileExtension = (name, type) => {
  if (typeof name === 'string' && name.includes('.')) {
    const ext = name.split('.').pop().trim().toUpperCase();
    if (ext.length <= 5) return ext;
  }
  if (type === 'pdf') return 'PDF';
  return (type || 'DOC').toUpperCase();
};

const FALLBACK_BARS = [
  8, 12, 16, 12, 8, 14, 20, 24, 18, 12, 10, 16, 22, 18, 10,
  8, 12, 16, 12, 8, 14, 20, 24, 18, 12, 10, 16, 22, 18, 10
];

export function PendingMedia({ msg }) {
  if (!msg) return null;

  const kind = msg.kind || 'file';
  const { fileName, fileSize, duration, noOfPages, thumb } = msg;

  // Aspect ratio calculation matching MediaMessage
  let aspectRatioStyle = '4 / 3';
  if (msg.w && msg.h && msg.h > 0) {
    const r = msg.w / msg.h;
    const clamped = Math.min(Math.max(r, 0.75), 1.777);
    aspectRatioStyle = `${clamped}`;
  }

  // 1. Image Placeholder
  if (kind === 'image') {
    return (
      <div
        className="msg-image-wrap"
        style={{
          aspectRatio: aspectRatioStyle,
          overflow: 'hidden',
          position: 'relative',
          background: 'var(--bg-secondary)',
          borderRadius: '12px'
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt="Incoming preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: `blur(${PREVIEW_BLUR_PX}px)`,
              transform: 'scale(1.08)',
              display: 'block'
            }}
          />
        ) : null}

        {/* Shimmer sweep overlay */}
        <div
          className="msg-skeleton-shimmer"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: thumb ? 0.45 : 1,
            pointerEvents: 'none'
          }}
        />

        {/* Bottom gradient */}
        <div className="msg-image-gradient" />

        {/* Subtle center spinner without hiding shimmer sweep */}
        <div className="msg-progress-circle" style={{ pointerEvents: 'none', background: thumb ? 'rgba(0,0,0,0.22)' : 'transparent' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" size={22} color="#ffffff" style={{ opacity: 0.9 }} />
          </div>
        </div>

        {/* Bottom Right Glass Chip */}
        <div className="msg-glass-chip bottom-right">
          <span>{formatTime12Hour(msg.timestamp)}</span>
        </div>
      </div>
    );
  }

  // 2. Video Placeholder
  if (kind === 'video') {
    return (
      <div
        className="msg-video-wrap"
        style={{
          overflow: 'hidden',
          position: 'relative',
          background: 'var(--bg-secondary)',
          borderRadius: '12px'
        }}
      >
        {thumb ? (
          <img
            src={thumb}
            alt="Incoming video preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: `blur(${PREVIEW_BLUR_PX}px)`,
              transform: 'scale(1.08)',
              display: 'block'
            }}
          />
        ) : null}

        {/* Shimmer sweep overlay */}
        <div
          className="msg-skeleton-shimmer"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: thumb ? 0.45 : 1,
            pointerEvents: 'none'
          }}
        />

        {/* Subtle center spinner without hiding shimmer sweep */}
        <div className="msg-progress-circle" style={{ pointerEvents: 'none', background: thumb ? 'rgba(0,0,0,0.22)' : 'transparent' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="animate-spin" size={22} color="#ffffff" style={{ opacity: 0.9 }} />
          </div>
        </div>

        {/* Duration Glass Chip Bottom Left */}
        {duration ? (
          <div className="msg-glass-chip bottom-left">
            <span>{formatDuration(duration)}</span>
          </div>
        ) : null}

        {/* Time Glass Chip Bottom Right */}
        <div className="msg-glass-chip bottom-right">
          <span>{formatTime12Hour(msg.timestamp)}</span>
        </div>
      </div>
    );
  }

  // 3. Audio / Voice Note Placeholder
  if (kind === 'audio') {
    return (
      <div className="msg-audio-wrap" style={{ position: 'relative', overflow: 'hidden' }}>
        <div
          className="msg-skeleton-shimmer"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.2,
            pointerEvents: 'none'
          }}
        />
        <div className="msg-audio-row">
          <div
            className="msg-audio-play-btn"
            style={{ opacity: 0.6, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Loader2 className="animate-spin" size={18} color="currentColor" />
          </div>

          <div className="msg-waveform" style={{ pointerEvents: 'none' }}>
            {FALLBACK_BARS.map((h, i) => (
              <div
                key={i}
                className="msg-waveform-bar"
                style={{
                  height: `${Math.max(6, Math.min(h, 28))}px`,
                  backgroundColor: 'var(--border-color)',
                  opacity: 0.45
                }}
              />
            ))}
          </div>
        </div>

        <div className="msg-audio-bottom">
          <span>{duration ? formatDuration(duration) : 'Incoming audio...'}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{formatTime12Hour(msg.timestamp)}</span>
          </div>
        </div>
      </div>
    );
  }

  // 4. Document / PDF Placeholder
  const ext = getFileExtension(fileName, kind);
  const isPDF = ext === 'PDF' || kind === 'pdf';

  return (
    <div className="msg-doc-row" style={{ position: 'relative', overflow: 'hidden', pointerEvents: 'none' }}>
      <div
        className="msg-skeleton-shimmer"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.2,
          pointerEvents: 'none'
        }}
      />
      {/* Extension Tile or Blur Thumbnail */}
      {isPDF && thumb ? (
        <div
          style={{
            width: '40px',
            height: '48px',
            borderRadius: '6px',
            overflow: 'hidden',
            position: 'relative',
            flexShrink: 0
          }}
        >
          <img
            src={thumb}
            alt="PDF preview"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: `blur(${PREVIEW_BLUR_PX}px)`,
              transform: 'scale(1.1)'
            }}
          />
        </div>
      ) : (
        (() => {
          const docInfo = getDocIconInfo(ext);
          const DocIcon = docInfo.icon;
          return (
            <div className={`msg-doc-ext-tile ${docInfo.className}`} style={{ opacity: 0.85 }}>
              <div className="msg-doc-ext-tile-flap" />
              <div className="msg-doc-ext-icon">
                <DocIcon size={18} strokeWidth={2.2} />
              </div>
              <span>{docInfo.label}</span>
            </div>
          );
        })()
      )}

      {/* Info text */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {fileName || 'Document'}
        </span>
        <span style={{ fontSize: '11px', opacity: 0.8, fontVariantNumeric: 'tabular-nums' }}>
          {noOfPages ? `${noOfPages} pages · ` : ''}
          {fileSize ? formatSize(fileSize) : 'Incoming...'} · {formatTime12Hour(msg.timestamp)}
        </span>
      </div>

      <div
        className="msg-doc-download-btn"
        style={{ opacity: 0.6, pointerEvents: 'none' }}
      >
        <Loader2 className="animate-spin" size={16} />
      </div>
    </div>
  );
}

export default function PendingMediaBubble({ msg, isMobile, showSenderName }) {
  if (!msg) return null;

  const isMediaCard = ['image', 'video'].includes(msg.kind);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        marginBottom: '8px',
        animation: 'fadeIn 0.25s ease-in'
      }}
    >
      <div
        className={`msg-bubble msg-bubble-received ${isMediaCard ? 'msg-bubble-media' : 'msg-bubble-text'}`}
        style={{
          alignSelf: 'flex-start',
          opacity: 0.95
        }}
      >
        {showSenderName && msg.sendername && (
          <div
            style={{
              fontSize: isMobile ? '11px' : '12px',
              fontWeight: '600',
              color: 'var(--accent-color)',
              marginBottom: '4px',
              padding: isMediaCard ? '4px 8px 0' : '0'
            }}
          >
            {msg.sendername}
          </div>
        )}
        <PendingMedia msg={msg} />
      </div>
    </div>
  );
}

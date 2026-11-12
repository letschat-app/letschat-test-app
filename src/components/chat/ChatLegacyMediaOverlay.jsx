import React from 'react';
import { Download, Pencil } from 'lucide-react';
import CachedMediaImage from './CachedMediaImage';
import { getMediaInfo } from '../../service/MediaCache';
import { resolveChatMediaUrl } from '../../utils/chatFormatting';

/** Fullscreen legacy media overlay for previewing, downloading, or editing a clicked media item. */
export default function ChatLegacyMediaOverlay({ showmedia, onClose, onEditImage, toast }) {
  if (!showmedia) return null;

  const canEdit =
    showmedia?.type === 'image' &&
    !showmedia?.fileName?.toLowerCase().endsWith('.gif') &&
    !showmedia?.content?.toLowerCase().endsWith('.gif');

  const handleEditClick = async () => {
    let editUrl = showmedia.optimisticUrl || resolveChatMediaUrl(showmedia.fileKey);
    if (!editUrl && showmedia.content) {
      try {
        const info = await getMediaInfo(showmedia.content);
        editUrl = resolveChatMediaUrl(info?.fileKey);
      } catch {
        // Ignore lookup failure; user sees toast below if URL missing
      }
    }
    if (editUrl) onEditImage(editUrl);
    else toast?.error?.('Image URL unavailable for editing');
  };

  const handleDownloadClick = async () => {
    let downloadUrl = showmedia.optimisticUrl || resolveChatMediaUrl(showmedia.fileKey);
    try {
      if (!downloadUrl && showmedia.content) {
        const info = await getMediaInfo(showmedia.content);
        downloadUrl = resolveChatMediaUrl(info?.fileKey);
      }
      if (!downloadUrl) throw new Error('Missing file URL');
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = showmedia.fileName || showmedia.content || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      if (downloadUrl) window.open(downloadUrl, '_blank');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.9)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: '#111',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              &larr;
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={handleEditClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--border-color)',
                  border: 'none',
                  color: '#fff',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--border-color)')}
                title="Edit Image"
              >
                <Pencil size={16} />
                <span>Edit</span>
              </button>
            )}

            <span style={{ color: '#fff', fontSize: '18px', fontWeight: '500' }}>
              {showmedia.status == null ? showmedia.sendername : 'You'}
            </span>
          </div>

          <a
            onClick={handleDownloadClick}
            download
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--border-color)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--border-color)';
            }}
          >
            <Download size={18} />
          </a>
        </div>

        <CachedMediaImage
          mediaId={showmedia.content}
          optimisticUrl={showmedia.optimisticThumbUrl || showmedia.optimisticUrl}
          alt="preview"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            borderRadius: '8px',
          }}
        />
      </div>
    </div>
  );
}

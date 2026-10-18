import React from 'react';
import { X, Download, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { downloadFile } from '../../service/MediaUploader';

export default function MediaViewer({ media, onClose, onEdit }) {
  if (!media) return null;

  const { fileUrl, fileName, fileType } = media;
  const isGif = fileName?.toLowerCase().endsWith('.gif') || fileUrl?.toLowerCase().includes('.gif') || fileType === 'image/gif';
  const canEdit = (fileType === 'image' || fileType?.startsWith('image/')) && !isGif && typeof onEdit === 'function';

  const handleDownload = (e) => {
    e.stopPropagation();
    // If it's already a blob, we don't need to fetch it again
    if (fileUrl.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.setAttribute('download', fileName || 'download');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      downloadFile(fileUrl, fileName);
    }
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        animation: 'viewerFadeIn 0.25s ease-out',
        backdropFilter: 'blur(5px)'
      }}
    >
      {/* Header bar */}
      <div style={{
        height: '64px',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.5)',
        zIndex: 2010
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={onClose}
            style={{ 
              background: 'transparent', border: 'none', color: 'white', 
              cursor: 'pointer', padding: '8px', borderRadius: '50%'
            }}
          >
            <span style={{ fontSize: '28px', fontWeight: '700' }}>X</span>
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(media);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(255, 255, 255, 0.15)',
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
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
              title="Edit image"
            >
              <Pencil size={16} />
              <span>Edit</span>
            </button>
          )}
          <span style={{ color: 'white', fontWeight: '500', fontSize: '15px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName}
          </span>
        </div>

        <button 
          onClick={handleDownload}
          style={{ 
            background: 'transparent', border: 'none', color: 'white', 
            cursor: 'pointer', padding: '8px', borderRadius: '50%'
          }}
          title="Download"
        >
          <Download size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px',
        overflow: 'hidden'
      }} onClick={(e) => e.stopPropagation()}>
        {fileType === 'image' ? (
          <img 
            src={fileUrl} 
            alt={fileName}
            style={{ 
              maxWidth: '100%', 
              maxHeight: '100%', 
              objectFit: 'contain',
              boxShadow: '0 0 40px rgba(0,0,0,0.5)'
            }} 
          />
        ) : (
          <video 
            src={fileUrl} 
            controls 
            autoPlay
            style={{ 
              width: '100%', 
              height: '100%',
              objectFit: 'contain',
              boxShadow: '0 0 40px rgba(0,0,0,0.5)'
            }} 
          />
        )}
      </div>

      <style>{`
        @keyframes viewerFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

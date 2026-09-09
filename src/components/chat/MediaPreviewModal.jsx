import React, { useState, useEffect } from 'react';
import { X, Send, FileText, Music, Trash2 } from 'lucide-react';
import { formatFileSize, getFileCategory, getPdfThumbnail, getVideoThumbnail } from '../../service/MediaUploader';

export default function MediaPreviewModal({ file, onSend, onCancel, isUploading = false, uploadProgress = 0 }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingThumb, setLoadingThumb] = useState(false);
  const [thumbBlob, setThumbBlob] = useState(null); // Store the actual Blob for reliable handoff
  const category = getFileCategory(file?.type, file?.name);
  // Direct detection bypasses category for PDFs with non-standard MIME types
  const isPdfFile = file?.type === 'application/pdf' || file?.name?.toLowerCase().endsWith('.pdf');
  const isVideoFile = category === 'video' || file?.type?.startsWith('video/');

  useEffect(() => {
    if (!file) return;
    
    let url = null;
    let isActive = true;

    if (category === 'image') {
      url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else if (isVideoFile) {
      url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setLoadingThumb(true);
      getVideoThumbnail(file).then(res => {
         if (isActive && res.blob) {
           setThumbBlob(res.blob);
           setPreviewUrl(URL.createObjectURL(res.blob));
         }
         if (isActive) setLoadingThumb(false);
      });
    } else if (category === 'pdf' || isPdfFile) {
      setLoadingThumb(true);
      getPdfThumbnail(file).then(res => {
         if (isActive && res?.blob) {
            const tUrl = URL.createObjectURL(res.blob);
            setThumbBlob(res.blob);
            setPreviewUrl(tUrl);
         }
         if (isActive) setLoadingThumb(false);
      });
    }

    return () => {
      isActive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, category]);

  if (!file) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0,
      backgroundColor: 'rgba(0,0,0,0.95)',
      zIndex: 2000,
      display: 'flex', flexDirection: 'column',
      animation: 'previewFadeIn 0.2s ease-out',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={onCancel}
            style={{ 
              background: 'transparent', border: 'none', color: '#8696a0', 
              cursor: 'pointer', padding: '4px' 
            }}
          >
            <span style={{ fontSize: '24px', fontWeight: '700' }}>X</span>
          </button>
          <span style={{ color: 'white', fontWeight: '500', fontSize: '16px' }}>Preview</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', 
        padding: '20px', overflow: 'hidden' 
      }}>
        {(category === 'image' || category === 'pdf') && previewUrl && (
          <img 
            src={previewUrl} 
            alt="preview" 
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }} 
          />
        )}
        
        {category === 'video' && previewUrl && (
          <video 
            src={previewUrl} 
            controls 
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '8px' }} 
          />
        )}

        {(category === 'pdf' ? !previewUrl : (category === 'file' || category === 'audio')) && (
          <div style={{ 
            textAlign: 'center', background: '#202c33', padding: '40px', 
            borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)',
            width: '100%', maxWidth: '320px'
          }}>
            <div style={{ color: '#00a884', marginBottom: '16px' }}>
              {category === 'audio' ? <Music size={64} /> : <FileText size={64} />}
            </div>
            <div style={{ color: 'white', fontSize: '15px', fontWeight: '500', marginBottom: '4px', wordBreak: 'break-all' }}>
              {file.name}
            </div>
            <div style={{ color: '#8696a0', fontSize: '13px' }}>
              {formatFileSize(file.size)}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Send Button */}
      <div style={{ 
        padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)'
      }}>
        {isUploading || loadingThumb ? (
          <div style={{ textAlign: 'center', width: '100%', maxWidth: '300px' }}>
            <div style={{ 
              width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', 
              borderTop: '3px solid #00a884', borderRadius: '50%', margin: '0 auto 12px',
              animation: 'previewSpin 1s linear infinite'
            }} />
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginBottom: '8px', overflow: 'hidden' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#00a884', transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>
              {loadingThumb ? 'Generating preview...' : 'Uploading...'}
            </div>
            <div style={{ color: '#8696a0', fontSize: '12px', marginTop: '4px' }}>Do not close the app</div>
          </div>
        ) : (
          <button
            onClick={() => onSend(thumbBlob)}
            style={{
              background: '#00a884', color: 'white', border: 'none',
              borderRadius: '50%', width: '60px', height: '60px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Send size={28} style={{ marginLeft: '4px' }} />
          </button>
        )}
      </div>

      <style>{`
        @keyframes previewSpin { to { transform: rotate(360deg); } }
        @keyframes previewFadeIn {
          from { opacity: 0; transform: scale(1.05); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

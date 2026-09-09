/**
 * MediaUploadButton.jsx
 * WhatsApp-style upward popup menu.
 * Uses position:fixed + getBoundingClientRect to escape parent stacking contexts.
 */
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { uploadMedia, formatFileSize, getFileCategory, STAGE_LABELS } from '../service/MediaUploader';
import MediaPreviewModal from './chat/MediaPreviewModal';

const MENU_OPTIONS = [
  {
    id: 'camera', label: 'Camera', color: '#e040fb',
    accept: 'image/*', capture: 'environment',
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>,
  },
  {
    id: 'gallery', label: 'Photos & Videos', color: '#2196f3',
    accept: 'image/*,video/*', capture: undefined,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
  },
  {
    id: 'document', label: 'Document', color: '#7c4dff',
    accept: '.pdf,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,text/plain,.mp3,.bin', capture: undefined,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
  },
  {
    id: 'audio', label: 'Audio', color: '#ff6d00',
    accept: 'audio/*,.mp3,.wav,.m4a,.aac', capture: undefined,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
  },
  {
    id: 'schedule', label: 'Schedule Message', color: '#10b981',
    accept: undefined, capture: undefined,
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
  }
];

// ─── Progress toast ───────────────────────────────────────────────────────────
function UploadProgressToast({ file, progress, stage, onCancel }) {
  const isDone = stage === 'done';
  return (
    <div style={{
      position: 'fixed', bottom: '90px', right: '16px', zIndex: 999999,
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: '14px', padding: '12px 16px', width: '260px',
      boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', gap: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file?.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatFileSize(file?.size ?? 0)}</div>
        </div>
        {!isDone && <button onClick={onCancel} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: 0 }}>×</button>}
      </div>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: '4px', height: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: isDone ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,var(--accent-color),#a78bfa)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ fontSize: '11px', color: isDone ? '#10b981' : 'var(--text-secondary)' }}>{STAGE_LABELS[stage] ?? stage}</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function MediaUploadButton({ 
  onUploadComplete, 
  onError, 
  onCameraClick,
  onScheduleClick,
  onFileSelect, 
  disabled = false, 
  style = {}, 
  children 
}) {
  const inputRefs = useRef({});
  const abortRef = useRef(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ bottom: 0, left: 0 });
  const [uploading, setUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [pendingFile, setPendingFile] = useState(null);

  // Calculate fixed position from trigger bounding rect
  const openMenu = (e) => {
    e?.stopPropagation(); 
    if (disabled || uploading) return;
    
    if (!menuOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        bottom: window.innerHeight - rect.top + 8,
        left: Math.max(8, rect.left - 10),
      });
      setMenuOpen(true);
    } else {
      setMenuOpen(false);
    }
  };

  // Close on outside click — exclude both trigger AND menu
  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [menuOpen]);

  const handleFileSelect = (file) => {
    if (!file) return;
    
    if (file.size > 50 * 1024 * 1024) {
      alert("This file exceeds the 50MB size limit and cannot be attached.");
      // Clear inputs to allow re-selection
      Object.values(inputRefs.current).forEach(r => { if (r) r.value = ''; });
      return;
    }

    setMenuOpen(false);
    if (onFileSelect) {
      onFileSelect(file);
    } else {
      startUpload(file);
    }
  };

  const startUpload = async (directFile = null) => {
    const file = directFile || pendingFile;
    if (!file) return;
    
    setPendingFile(null); // Close preview
    abortRef.current = false;
    setCurrentFile(file);
    setUploading(true);
    setProgress(0);
    setStage('requesting_urls');
    try {
      const result = await uploadMedia(file, ({ stage: s, progress: p }) => {
        if (!abortRef.current) { setStage(s); setProgress(p); }
      });
      if (abortRef.current) return;
      setStage('done'); setProgress(100);
      await new Promise(r => setTimeout(r, 800));
      onUploadComplete?.({ ...result, mimeType: file.type, fileName: file.name, fileSize: file.size, mediaId: result.mediaId });
    } catch (err) {
      if (!abortRef.current) { console.error('[MediaUploader]', err); onError?.(err); }
    } finally {
      if (!abortRef.current) { setUploading(false); setCurrentFile(null); setProgress(0); setStage(''); }
    }
    Object.values(inputRefs.current).forEach(r => { if (r) r.value = ''; });
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Hidden file inputs */}
      {MENU_OPTIONS.filter(opt => opt.id !== 'schedule').map(opt => (
        <input
          key={opt.id}
          id={`mu-${opt.id}`}
          ref={el => inputRefs.current[opt.id] = el}
          type="file"
          accept={opt.accept}
          {...(opt.capture ? { capture: opt.capture } : {})}
          style={{ display: 'none' }}
          onChange={e => handleFileSelect(e.target.files?.[0])}
        />
      ))}

      {/* FIXED-position popup using Portal to escape ALL stacking contexts and backdrop-filters */}
      {menuOpen && createPortal(
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            bottom: `${menuPos.bottom}px`,
            left: `${menuPos.left}px`,
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '16px',
            padding: '8px',
            minWidth: '210px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
            zIndex: 999999,
            animation: 'muMenuUp 0.2s cubic-bezier(0.32,0.72,0,1)',
          }}
        >
          {MENU_OPTIONS.filter(opt => opt.id !== 'schedule' || onScheduleClick).map((opt, i) => (
            <button
              key={opt.id}
              onClick={() => {
                setMenuOpen(false);
                if (opt.id === 'camera' && onCameraClick) {
                  onCameraClick();
                } else if (opt.id === 'schedule' && onScheduleClick) {
                  onScheduleClick();
                } else {
                  inputRefs.current[opt.id]?.click();
                }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                width: '100%', padding: '10px 14px',
                background: 'transparent', border: 'none',
                borderRadius: '10px', cursor: 'pointer',
                color: '#f0f0f0', fontSize: '14px', fontWeight: '500',
                textAlign: 'left',
                marginBottom: i < MENU_OPTIONS.length - 1 ? '2px' : 0,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: opt.color + '22',
                border: `1.5px solid ${opt.color}55`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: opt.color, flexShrink: 0,
              }}>
                {opt.icon}
              </div>
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={openMenu}
        style={{
          cursor: disabled || uploading ? 'default' : 'pointer',
          opacity: disabled ? 0.4 : 1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: menuOpen ? 'var(--accent-color)' : 'var(--text-secondary)',
          transition: 'transform 0.2s ease, color 0.15s ease',
          transform: menuOpen ? 'rotate(45deg)' : 'rotate(0deg)',
          ...style,
        }}
        title="Attach"
      >
        {children ?? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
      </div>

      {/* Upload progress */}
      {uploading && currentFile && (
        <UploadProgressToast file={currentFile} progress={progress} stage={stage}
          onCancel={() => { abortRef.current = true; setUploading(false); setCurrentFile(null); setProgress(0); setStage(''); }}
        />
      )}


      <style>{`
        @keyframes muMenuUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}

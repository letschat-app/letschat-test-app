import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import EmojiPicker from 'emoji-picker-react';
import { Smile, Mic, ArrowUp, Trash2, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import MediaUploadButton from '../MediaUploadButton';
import MediaPreviewModal from '../chat/MediaPreviewModal';
import CameraCaptureModal from '../modals/CameraCaptureModal';

export default function BatchMessageComposer({
  onSendMessage,
  onSendMedia,
  onSendVoiceNote,
  disabled = false,
  placeholder = "Type a message to send to all selected..."
}) {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Modals state
  const [cameraOpen, setCameraOpen] = useState(false);
  const [pendingMediaFile, setPendingMediaFile] = useState(null);

  // Emoji picker state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiPickerPos, setEmojiPickerPos] = useState({ bottom: 80, left: 20 });
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleDocClick = (e) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(e.target)
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [showEmojiPicker]);

  const toggleEmojiPicker = (e) => {
    e?.stopPropagation();
    if (!showEmojiPicker && emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      setEmojiPickerPos({
        bottom: window.innerHeight - rect.top + 8,
        left: Math.max(8, rect.left - 20)
      });
      setShowEmojiPicker(true);
    } else {
      setShowEmojiPicker(false);
    }
  };

  // Camera handling
  const handleCameraClick = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraOpen(true);
    } catch (err) {
      console.error("Camera access denied or error:", err);
      alert("Camera permission was denied. Please allow camera access in your browser settings to use the camera.");
    }
  };

  // Audio Recording handling
  const formatRecordingTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("Microphone permission was denied. Please allow microphone access in your browser settings to record voice messages.");
    }
  };

  const stopRecording = (discard = false) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        clearInterval(timerIntervalRef.current);
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

        if (!discard && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType || 'audio/webm' });
          if (onSendVoiceNote) {
            onSendVoiceNote(audioBlob);
          }
        }
        setIsRecording(false);
        setRecordingTime(0);
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.stop();
    }
  };

  const handleSendClick = () => {
    if (disabled) return;
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
      setShowEmojiPicker(false);
    }
  };

  return (
    <>
      {/* Camera Capture Modal */}
      {cameraOpen && (
        <CameraCaptureModal
          onCapture={(file) => {
            setCameraOpen(false);
            setPendingMediaFile(file);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {/* Media Preview Modal */}
      {pendingMediaFile && (
        <MediaPreviewModal
          file={pendingMediaFile}
          onCancel={() => setPendingMediaFile(null)}
          onSend={(thumbBlob, editedFile) => {
            const file = editedFile || pendingMediaFile;
            setPendingMediaFile(null);
            if (onSendMedia) {
              onSendMedia(file, thumbBlob);
            }
          }}
          onFileChange={setPendingMediaFile}
        />
      )}

      {/* Fixed/Sticky Bottom Composer Container */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border-color)',
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 100,
        overflow: 'visible'
      }}>
        {/* Main Input Row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? '6px' : '10px',
          padding: isMobile ? '8px 10px 10px 8px' : '10px 20px 14px 20px',
          paddingBottom: isMobile ? 'max(10px, env(safe-area-inset-bottom))' : '14px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {/* Emoji picker — PORTAL */}
          {showEmojiPicker && createPortal(
            <div
              ref={emojiPickerRef}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                bottom: `${emojiPickerPos.bottom}px`,
                left: `${emojiPickerPos.left}px`,
                zIndex: 999999
              }}
            >
              <style>{`
                .epr-main { background: var(--bg-card) !important; border: 1px solid var(--border-color) !important; border-radius:16px !important; box-shadow: 0 16px 48px rgba(0,0,0,0.3) !important; }
                .epr-category-nav { background: transparent !important; border-bottom: 1px solid var(--border-color) !important; }
                .epr-search-container input { background: var(--bg-secondary) !important; border: 1px solid var(--border-color) !important; border-radius: 10px !important; color: var(--text-primary) !important; }
                .epr-emoji-category-label { background: var(--bg-card) !important; color: var(--text-secondary) !important; font-size: 11px !important; }
                .epr-btn:hover { background: var(--bg-hover) !important; }
                .epr-skin-tones { display: none !important; }
              `}</style>
              <EmojiPicker
                theme={theme === 'light' ? 'light' : 'dark'}
                onEmojiClick={(d) => {
                  setInput(p => p + d.emoji);
                  inputRef.current?.focus();
                }}
                height={360}
                width={310}
                skinTonesDisabled
                previewConfig={{ showPreview: false }}
              />
            </div>,
            document.body
          )}

          {/* Dynamic Input Bar (Recording vs Text) */}
          {isRecording ? (
            <div style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--danger-tint)',
              border: '1px solid var(--danger-tint-border)',
              borderRadius: '24px',
              padding: '2px 14px',
              minHeight: '44px',
              animation: 'muFadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  backgroundColor: 'var(--danger-color)',
                  borderRadius: '50%',
                  animation: 'recordBlink 1s infinite'
                }} />
                <span style={{ color: 'var(--danger-color)', fontSize: '14.5px', fontWeight: '600', fontFamily: 'monospace' }}>
                  {formatRecordingTime(recordingTime)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => stopRecording(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--danger-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px'
                }}
                title="Cancel Recording"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ) : (
            <div style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '24px',
              padding: isMobile ? '2px 6px 2px 4px' : '2px 8px 2px 6px',
              minHeight: '44px',
              transition: 'all 0.2s ease'
            }}>
              {/* Emoji button */}
              <div
                ref={emojiButtonRef}
                onClick={toggleEmojiPicker}
                title="Emoji"
                style={{
                  cursor: 'pointer',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: isMobile ? '32px' : '36px',
                  height: isMobile ? '32px' : '36px',
                  borderRadius: '50%',
                  color: showEmojiPicker ? 'var(--accent-color)' : 'var(--text-secondary)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Smile size={isMobile ? 18 : 20} strokeWidth={2.5} />
              </div>

              {/* Attach Button (+) */}
              <MediaUploadButton
                onUploadComplete={(result) => {
                  if (onSendMedia) {
                    onSendMedia(result);
                  }
                }}
                onFileSelect={setPendingMediaFile}
                onError={err => alert('Upload failed: ' + err.message)}
                onCameraClick={handleCameraClick}
                disabled={disabled}
                style={{
                  flexShrink: 0,
                  color: 'var(--text-secondary)',
                  width: isMobile ? '32px' : '36px',
                  height: isMobile ? '32px' : '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease'
                }}
              />

              {/* Text Input */}
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && input.trim()) handleSendClick();
                  if (e.key === 'Escape') setShowEmojiPicker(false);
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: isMobile ? '14.5px' : '15.5px',
                  color: 'var(--text-primary)',
                  padding: isMobile ? '8px 8px 8px 4px' : '10px 10px 10px 6px',
                  minWidth: 0
                }}
              />
            </div>
          )}

          {/* Send or Mic button */}
          <button
            type="button"
            onClick={isRecording ? () => stopRecording(false) : (input.trim() ? handleSendClick : startRecording)}
            disabled={disabled}
            style={{
              background: isRecording ? 'var(--success-color)' : (input.trim() ? 'var(--accent-text)' : 'var(--success-color)'),
              color: 'white',
              border: 'none',
              padding: 0,
              borderRadius: '50%',
              width: isMobile ? '40px' : '44px',
              height: isMobile ? '40px' : '44px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: isRecording ? 'scale(1.08)' : 'scale(1)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              marginRight: isMobile ? '2px' : '0'
            }}
            title={isRecording ? "Send Voice Note" : (input.trim() ? "Send Message" : "Record Voice Note")}
          >
            {isRecording ? <ArrowUp size={isMobile ? 22 : 24} /> : (input.trim() ? <ArrowUp size={isMobile ? 22 : 24} /> : <Mic size={isMobile ? 18 : 20} />)}
          </button>
        </div>
      </div>
    </>
  );
}

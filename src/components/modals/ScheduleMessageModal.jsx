import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, CalendarDays, Send, Image as ImageIcon, Trash2, Mic, Bird } from 'lucide-react';
import MediaUploadButton from '../MediaUploadButton';
import EmojiPicker from 'emoji-picker-react';
import { uploadMedia } from '../../service/MediaUploader';

const ScheduleMessageModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [message, setMessage] = useState('');
  const [mediaData, setMediaData] = useState(null);
  const [timeMode, setTimeMode] = useState('datetime');
  const [datetime, setDatetime] = useState('');
  const [timerValues, setTimerValues] = useState({ hours: 0, minutes: 15 });

  // Input Bar States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const [emojiPickerPos, setEmojiPickerPos] = useState({ bottom: 0, left: 0 });

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        if (initialData.messageType && initialData.messageType !== 'text') {
           setMediaData({
             message: initialData.message,
             messageType: initialData.messageType,
             fileName: `Attached ${initialData.messageType}`
           });
           setMessage('');
        } else {
           setMessage(initialData.message || '');
           setMediaData(null);
        }
        setTimeMode('datetime');
        if (initialData.time) {
          let parseTime = '';
          if (Array.isArray(initialData.time)) {
             const [y, m, d, h=0, min=0] = initialData.time;
             parseTime = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
          } else if (typeof initialData.time === 'string') {
             parseTime = initialData.time.replace(' ', 'T');
          }
          if (parseTime) {
             setDatetime(parseTime.substring(0, 16));
          }
        }
      } else {
        setMessage('');
        setMediaData(null);
        setTimeMode('datetime');
        const now = new Date();
        now.setMinutes(now.getMinutes() + 15);
        const tzOffset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 16);
        setDatetime(localISOTime);
        setTimerValues({ hours: 0, minutes: 15 });
      }
    }
  }, [isOpen, initialData]);

  // Click outside for emoji picker
  useEffect(() => {
    if (!showEmojiPicker) return;
    const close = (e) => {
      if (!emojiButtonRef.current?.contains(e.target) && !emojiPickerRef.current?.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [showEmojiPicker]);

  if (!isOpen) return null;

  const toggleEmojiPicker = (e) => {
    e?.stopPropagation();
    if (!showEmojiPicker && emojiButtonRef.current) {
      const rect = emojiButtonRef.current.getBoundingClientRect();
      setEmojiPickerPos({
        bottom: window.innerHeight - rect.top + 8,
        left: Math.max(8, rect.left - 20),
      });
      setShowEmojiPicker(true);
    } else {
      setShowEmojiPicker(false);
    }
  };

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
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
      alert("Microphone access is required to record voice notes.");
    }
  };

  const stopRecording = (discard = false) => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = async () => {
        clearInterval(timerIntervalRef.current);
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

        if (!discard && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current.mimeType || 'audio/webm' });
          const ext = mediaRecorderRef.current.mimeType?.includes('mp4') ? 'mp4' : 'webm';
          const file = new File([audioBlob], `VoiceNote_${Date.now()}.${ext}`, { type: audioBlob.type });
          
          setIsUploadingMedia(true);
          try {
             // Upload it directly
             const result = await uploadMedia(file, () => {});
             setMediaData({
                message: result.mediaId || result.mainKey,
                messageType: 'audio',
                fileName: file.name
             });
          } catch(e) {
             console.error("Audio upload failed", e);
             alert("Failed to upload audio.");
          } finally {
             setIsUploadingMedia(false);
          }
        }
        setIsRecording(false);
        setRecordingTime(0);
        audioChunksRef.current = [];
      };
      mediaRecorderRef.current.stop();
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    let finalMessage = message;
    let finalType = 'text';

    if (mediaData) {
      finalMessage = mediaData.message;
      finalType = mediaData.messageType;
    }

    if (!finalMessage.trim() && !mediaData) return;

    let finalTimeStr = '';
    if (timeMode === 'datetime') {
      if (!datetime) return;
      finalTimeStr = `${datetime}:00`;
    } else {
      const now = new Date();
      now.setHours(now.getHours() + (parseInt(timerValues.hours) || 0));
      now.setMinutes(now.getMinutes() + (parseInt(timerValues.minutes) || 0));
      
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      finalTimeStr = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    }

    onSubmit({
      message: finalMessage,
      messageType: finalType,
      time: finalTimeStr,
      msgid: initialData?.msgId || initialData?.msgid || null
    });
  };

  const handleWrapperClick = (e) => {
    // Only close if clicking perfectly on the wrapper
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      onClick={handleWrapperClick}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'transparent', // The user requested the modal not cover the whole screen with dark bg
        pointerEvents: 'auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999
      }}
    >
      <div style={{
        background: '#1e1e1e', borderRadius: '16px', width: '90%', maxWidth: '400px',
        border: '1px solid #444', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column', overflow: 'visible',
        pointerEvents: 'auto'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f3f4f6', fontSize: '16px' }}>
            <Clock size={18} color="#10b981" />
            {initialData ? 'Edit Scheduled Message' : 'Schedule Message'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px', fontWeight: '700' }}>
            X
          </button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* MEDIA PREVIEW IF ATTACHED */}
          {mediaData && (
             <div style={{
               background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px',
               padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
             }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ImageIcon size={20} color="#10b981" />
                  <span style={{ color: '#fff', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                    {mediaData.fileName}
                  </span>
               </div>
               <button type="button" onClick={() => setMediaData(null)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                 <Trash2 size={16} />
               </button>
             </div>
          )}

          <div style={{ display: 'flex', gap: '8px', background: '#2c2c2c', padding: '4px', borderRadius: '8px' }}>
            <button 
              type="button"
              onClick={() => setTimeMode('datetime')}
              style={{
                flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: '500',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: timeMode === 'datetime' ? '#3b82f6' : 'transparent',
                color: timeMode === 'datetime' ? '#fff' : '#9ca3af',
                border: 'none', cursor: 'pointer', transition: '0.2s'
              }}
            >
              <CalendarDays size={16} /> Date & Time
            </button>
            <button 
              type="button"
              onClick={() => setTimeMode('timer')}
              style={{
                flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: '500',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                background: timeMode === 'timer' ? '#3b82f6' : 'transparent',
                color: timeMode === 'timer' ? '#fff' : '#9ca3af',
                border: 'none', cursor: 'pointer', transition: '0.2s'
              }}
            >
              <Clock size={16} /> Timer
            </button>
          </div>

          <div style={{ background: '#2c2c2c', border: '1px solid #444', borderRadius: '8px', padding: '16px' }}>
            {timeMode === 'datetime' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ color: '#9ca3af', fontSize: '13px' }}>Select Exact Time</label>
                <input 
                  type="datetime-local" 
                  value={datetime}
                  onChange={(e) => setDatetime(e.target.value)}
                  style={{
                    background: '#1a1a1a', border: '1px solid #444', color: '#fff', 
                    padding: '10px', borderRadius: '6px', fontSize: '14px', width: '100%', boxSizing: 'border-box'
                  }}
                  required
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ color: '#9ca3af', fontSize: '13px' }}>Send in...</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input 
                      type="number" min="0" value={timerValues.hours}
                      onChange={(e) => setTimerValues({...timerValues, hours: e.target.value})}
                      style={{ background: '#1a1a1a', border: '1px solid #444', color: '#fff', padding: '10px', borderRadius: '6px', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>Hours</span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <input 
                      type="number" min="0" max="59" value={timerValues.minutes}
                      onChange={(e) => setTimerValues({...timerValues, minutes: e.target.value})}
                      style={{ background: '#1a1a1a', border: '1px solid #444', color: '#fff', padding: '10px', borderRadius: '6px', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '11px', color: '#6b7280', textAlign: 'center' }}>Minutes</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button 
            type="button"
            onClick={handleSubmit}
            disabled={(!message.trim() && !mediaData) || isUploadingMedia}
            style={{
              background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px',
              padding: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px',
              opacity: (!message.trim() && !mediaData) || isUploadingMedia ? 0.5 : 1
            }}
          >
            <Send size={18} />
            {initialData ? 'Update Schedule' : 'Schedule Send'}
          </button>

          {/* MINI INPUT BAR OVERRIDE */}
          <div style={{ marginTop: '4px' }}>
            <label style={{ color: '#9ca3af', fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
              Message Content
            </label>
            
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px', background: '#2c2c2c', borderRadius: '24px', border: '1px solid #444',
              position: 'relative'
            }}>
              {/* Emoji picker dropdown explicitly for modal */}
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'fixed',
                    bottom: `${emojiPickerPos.bottom}px`,
                    left: `${emojiPickerPos.left}px`,
                    zIndex: 999999,
                  }}
                >
                  <style>{`
                    .epr-main { background: #1a1a1a !important; border: 1px solid rgba(255,255,255,0.12) !important; border-radius:16px !important; box-shadow: 0 16px 48px rgba(0,0,0,0.7) !important; }
                    .epr-category-nav { background: transparent !important; border-bottom: 1px solid rgba(255,255,255,0.08) !important; }
                    .epr-search-container input { background: rgba(255,255,255,0.06) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 10px !important; color: #ddd !important; }
                    .epr-emoji-category-label { background: #1a1a1a !important; color: rgba(255,255,255,0.35) !important; font-size: 11px !important; }
                    .epr-btn:hover { background: rgba(255,255,255,0.08) !important; }
                    .epr-skin-tones { display: none !important; }
                  `}</style>
                  <EmojiPicker
                    theme="dark"
                    onEmojiClick={(d) => { setMessage(p => p + d.emoji); inputRef.current?.focus(); }}
                    height={320} width={300}
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}

              {isRecording ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, padding: '0 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '10px', height: '10px', backgroundColor: '#f15c6d',
                      borderRadius: '50%', animation: 'recordBlink 1s infinite'
                    }} />
                    <span style={{ color: '#eee', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace' }}>
                      {formatRecordingTime(recordingTime)}
                    </span>
                  </div>
                  <button onClick={() => stopRecording(true)} style={{ background: 'transparent', border: 'none', color: '#8696a0', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '6px' }} title="Cancel">
                    <Trash2 size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <div
                    ref={emojiButtonRef}
                    onClick={toggleEmojiPicker}
                    style={{
                      cursor: 'pointer', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: '50%',
                      color: showEmojiPicker ? 'var(--accent-color)' : '#777',
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 13s1.5 2 4 2 4-2 4-2" />
                      <line x1="9" y1="9" x2="9.01" y2="9" />
                      <line x1="15" y1="9" x2="15.01" y2="9" />
                    </svg>
                  </div>

                  {!mediaData && (
                    <MediaUploadButton
                      onUploadComplete={(result) => {
                        const { mainKey, mimeType, fileName, mediaId } = result;
                        let category = mimeType?.split('/')[0];
                        let msgType = 'file';
                        if (category === 'image') msgType = 'image';
                        else if (category === 'video') msgType = 'video';
                        else if (category === 'audio') msgType = 'audio';
                        
                        setMediaData({
                          message: mediaId || mainKey,
                          messageType: msgType,
                          fileName: fileName || `Attached ${msgType}`
                        });
                      }}
                      style={{ flexShrink: 0, color: '#777', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    />
                  )}

                  <input
                    ref={inputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message..."
                    disabled={!!mediaData}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSubmit(e);
                    }}
                    style={{
                      flex: 1, background: 'transparent', border: 'none', outline: 'none',
                      fontSize: '14px', color: '#eee', padding: '4px 8px', minWidth: 0,
                      opacity: mediaData ? 0.3 : 1
                    }}
                  />
                </>
              )}

              <button
                onClick={isRecording ? () => stopRecording(false) : (message.trim() || mediaData ? handleSubmit : startRecording)}
                style={{
                  background: isRecording ? '#00a884' : ((message.trim() || mediaData) ? '#2563eb' : '#00a884'),
                  color: 'white', border: 'none',
                  borderRadius: '50%', width: '38px', height: '38px',
                  flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
              >
                {isRecording ? <Send size={18} style={{ marginLeft: '2px' }} /> : ((message.trim() || mediaData) ? <Bird size={18} /> : <Mic size={18} />)}
              </button>
            </div>
            
            <style>{`
              @keyframes recordBlink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
            `}</style>
          </div>
          {/* END MINI INPUT BAR OVERRIDE */}
          
        </div>
      </div>
    </div>
  );
};

export default ScheduleMessageModal;

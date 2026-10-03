import React, { useState, useRef } from 'react';
import { X, Type, Image as ImageIcon, Video, Mic, Music, Lock, Globe, Upload, Loader2, Sparkles, Check } from 'lucide-react';
import { fetchPutUrls, uploadMediaToR2, savePulseMediaKeys, createPulse } from '../../service/PulseService';

const BG_COLORS = [
  '#1e293b', '#0f172a', '#7c2d12', '#14532d', '#1e3a8a', '#581c87', '#831843', '#713f12',
  'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
  'linear-gradient(135deg, #f97316 0%, #e11d48 100%)'
];

const FONT_STYLES = [
  { id: 'sans', label: 'Standard', fontFamily: 'sans-serif' },
  { id: 'serif', label: 'Serif', fontFamily: 'serif' },
  { id: 'monospace', label: 'Code', fontFamily: 'monospace' },
  { id: 'cursive', label: 'Script', fontFamily: 'cursive' },
  { id: 'bold', label: 'Impact', fontFamily: 'impact, sans-serif' }
];

const CreatePulseModal = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  const [type, setType] = useState('text'); // text, image, video, audio, image_audio
  const [content, setContent] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [fontStyle, setFontStyle] = useState('sans');
  const [visibility, setVisibility] = useState('chats_only'); // chats_only, everyone

  // Media File states
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  // Recording audio state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  // Status & Progress
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const imageInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAudioSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioPreview(URL.createObjectURL(file));
    }
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'voice_note.webm', { type: 'audio/webm' });
        setAudioFile(file);
        setAudioPreview(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert("Microphone permission denied or unsupported.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (type === 'text' && !content.trim()) {
      alert("Please enter text content for your pulse.");
      return;
    }
    if ((type === 'image' || type === 'image_audio') && !imageFile) {
      alert("Please select an image file.");
      return;
    }
    if ((type === 'audio' || type === 'image_audio') && !audioFile) {
      alert("Please select or record an audio file.");
      return;
    }
    if (type === 'video' && !videoFile) {
      alert("Please select a video file.");
      return;
    }

    setIsPublishing(true);
    setUploadProgress(10);
    setStatusMessage('Preparing upload request...');

    try {
      let pulseMediaId = null;

      // Determine upload needs
      const needsImage = type === 'image' || type === 'image_audio';
      const needsAudio = type === 'audio' || type === 'image_audio';
      const needsVideo = type === 'video';

      if (needsImage || needsAudio || needsVideo) {
        setStatusMessage('Getting secure upload URLs...');
        setUploadProgress(25);

        const putUrlsData = await fetchPutUrls({
          needsImage,
          imageMime: imageFile?.type || '',
          needsAudio,
          audioMime: audioFile?.type || '',
          needsVideo,
          videoMime: videoFile?.type || ''
        });

        setStatusMessage('Uploading media to storage...');
        setUploadProgress(50);

        if (needsImage && putUrlsData.imagePutUrl && imageFile) {
          await uploadMediaToR2(putUrlsData.imagePutUrl, imageFile);
        }
        if (needsAudio && putUrlsData.audioPutUrl && audioFile) {
          await uploadMediaToR2(putUrlsData.audioPutUrl, audioFile);
        }
        if (needsVideo && putUrlsData.videoPutUrl && videoFile) {
          await uploadMediaToR2(putUrlsData.videoPutUrl, videoFile);
        }

        setStatusMessage('Saving media keys...');
        setUploadProgress(75);

        const saveRes = await savePulseMediaKeys({
          imageFileKey: putUrlsData.imageFileKey || null,
          audioFileKey: putUrlsData.audioFileKey || null,
          videoFileKey: putUrlsData.videoFileKey || null
        });

        pulseMediaId = saveRes.pulseMediaId;
      }

      setStatusMessage('Creating status update...');
      setUploadProgress(90);

      await createPulse({
        type,
        content,
        pulseMediaId,
        bgColor: type === 'text' ? bgColor : '#000000',
        fontStyle,
        visibility
      });

      setUploadProgress(100);
      setStatusMessage('Published successfully! 🔥');

      setTimeout(() => {
        setIsPublishing(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 600);
    } catch (err) {
      console.error('[CreatePulseModal]', err);
      alert('Failed to publish pulse: ' + err.message);
      setIsPublishing(false);
    }
  };

  const selectedFontObj = FONT_STYLES.find(f => f.id === fontStyle) || FONT_STYLES[0];

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        width: '100%', maxWidth: '520px',
        maxHeight: '90vh',
        borderRadius: '24px',
        border: '1px solid var(--border-color)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} color="var(--accent-color)" />
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>Create Status Pulse</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Type Selector Tabs */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
              Pulse Type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setType('text')}
                style={typeBtnStyle(type === 'text')}
              >
                <Type size={16} />
                <span>Text</span>
              </button>
              <button
                type="button"
                onClick={() => setType('image')}
                style={typeBtnStyle(type === 'image')}
              >
                <ImageIcon size={16} />
                <span>Image</span>
              </button>
              <button
                type="button"
                onClick={() => setType('video')}
                style={typeBtnStyle(type === 'video')}
              >
                <Video size={16} />
                <span>Video</span>
              </button>
              <button
                type="button"
                onClick={() => setType('audio')}
                style={typeBtnStyle(type === 'audio')}
              >
                <Mic size={16} />
                <span>Voice</span>
              </button>
              <button
                type="button"
                onClick={() => setType('image_audio')}
                style={typeBtnStyle(type === 'image_audio')}
              >
                <Music size={16} />
                <span>Combo</span>
              </button>
            </div>
          </div>

          {/* Privacy Visibility Selector */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
              Privacy & Visibility
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setVisibility('chats_only')}
                style={visibilityBtnStyle(visibility === 'chats_only')}
              >
                <Lock size={15} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>Contacts Only</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>Visible to chat contacts</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setVisibility('everyone')}
                style={visibilityBtnStyle(visibility === 'everyone')}
              >
                <Globe size={15} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>Everyone</div>
                  <div style={{ fontSize: '10px', opacity: 0.8 }}>Contacts + Profile Viewers</div>
                </div>
              </button>
            </div>
          </div>

          {/* Media Pickers & Preview Box */}
          {type === 'text' && (
            <div style={{
              background: bgColor,
              borderRadius: '16px',
              padding: '24px 20px',
              minHeight: '180px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease'
            }}>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?..."
                rows={4}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: '#ffffff',
                  fontSize: '20px',
                  fontWeight: '700',
                  textAlign: 'center',
                  fontFamily: selectedFontObj.fontFamily,
                  resize: 'none'
                }}
              />
            </div>
          )}

          {/* Text Styling Controls */}
          {type === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Background Color
                </label>
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {BG_COLORS.map((col, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setBgColor(col)}
                      style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: col, border: bgColor === col ? '2px solid white' : 'none',
                        cursor: 'pointer', flexShrink: 0
                      }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                  Font Style
                </label>
                <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                  {FONT_STYLES.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontStyle(f.id)}
                      style={{
                        padding: '4px 10px', borderRadius: '8px',
                        backgroundColor: fontStyle === f.id ? 'var(--accent-color)' : 'var(--bg-secondary)',
                        color: fontStyle === f.id ? '#fff' : 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        fontSize: '12px', fontFamily: f.fontFamily, cursor: 'pointer'
                      }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Image / Poster File Picker */}
          {(type === 'image' || type === 'image_audio') && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                {type === 'image_audio' ? '1. Select Poster Image' : 'Select Image'}
              </label>
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
              />
              {imagePreview ? (
                <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', maxHeight: '200px' }}>
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => imageInputRef.current?.click()}
                  style={uploadDropzoneStyle}
                >
                  <ImageIcon size={32} color="var(--accent-color)" />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Click to upload image</span>
                </div>
              )}
            </div>
          )}

          {/* Audio File Picker & Voice Recorder */}
          {(type === 'audio' || type === 'image_audio') && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                {type === 'image_audio' ? '2. Select or Record Voiceover Audio' : 'Audio Track / Voice Note'}
              </label>
              <input
                type="file"
                ref={audioInputRef}
                accept="audio/*"
                onChange={handleAudioSelect}
                style={{ display: 'none' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <Music size={18} /> Upload Audio File
                </button>

                <button
                  type="button"
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  style={{ flex: 1, padding: '12px', borderRadius: '12px', backgroundColor: isRecording ? '#ef4444' : 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: isRecording ? '#fff' : 'var(--text-primary)', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <Mic size={18} /> {isRecording ? 'Stop Recording' : 'Record Voice'}
                </button>
              </div>

              {audioPreview && (
                <div style={{ marginTop: '10px', padding: '10px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <audio src={audioPreview} controls style={{ width: '100%', height: '36px' }} />
                </div>
              )}
            </div>
          )}

          {/* Video File Picker */}
          {type === 'video' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Select Video
              </label>
              <input
                type="file"
                ref={videoInputRef}
                accept="video/*"
                onChange={handleVideoSelect}
                style={{ display: 'none' }}
              />
              {videoPreview ? (
                <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', maxHeight: '220px' }}>
                  <video src={videoPreview} controls style={{ width: '100%', maxHeight: '220px', borderRadius: '16px' }} />
                  <button
                    type="button"
                    onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                    style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  style={uploadDropzoneStyle}
                >
                  <Video size={32} color="var(--accent-color)" />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Click to upload video</span>
                </div>
              )}
            </div>
          )}

          {/* Optional Caption Input for Media */}
          {type !== 'text' && (
            <div>
              <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                Caption (Optional)
              </label>
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add a caption..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Publishing Progress Feedback */}
          {isPublishing && (
            <div style={{
              padding: '12px 16px', borderRadius: '12px',
              backgroundColor: 'var(--nav-active-bg)', border: '1px solid var(--border-color)',
              display: 'flex', flexDirection: 'column', gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 className="animate-spin" size={16} /> {statusMessage}
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', backgroundColor: 'var(--accent-color)', transition: 'width 0.3s ease' }} />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'flex-end', gap: '10px'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isPublishing}
            style={{
              padding: '10px 18px', borderRadius: '12px',
              border: '1px solid var(--border-color)', background: 'transparent',
              color: 'var(--text-primary)', fontWeight: '600', cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPublishing}
            style={{
              padding: '10px 24px', borderRadius: '12px',
              border: 'none', background: 'var(--accent-gradient)',
              color: '#ffffff', fontWeight: '700', cursor: isPublishing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            {isPublishing ? 'Publishing...' : 'Publish Pulse'}
          </button>
        </div>
      </div>
    </div>
  );
};

const typeBtnStyle = (isActive) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  padding: '10px 4px',
  borderRadius: '12px',
  border: isActive ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
  backgroundColor: isActive ? 'var(--nav-active-bg)' : 'var(--bg-secondary)',
  color: isActive ? 'var(--accent-color)' : 'var(--text-primary)',
  fontWeight: '700',
  fontSize: '11px',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
});

const visibilityBtnStyle = (isActive) => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 12px',
  borderRadius: '12px',
  border: isActive ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
  backgroundColor: isActive ? 'var(--nav-active-bg)' : 'var(--bg-secondary)',
  color: isActive ? 'var(--accent-color)' : 'var(--text-primary)',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
});

const uploadDropzoneStyle = {
  border: '2px dashed var(--border-color)',
  borderRadius: '16px',
  padding: '30px 16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '10px',
  cursor: 'pointer',
  backgroundColor: 'var(--bg-secondary)',
  transition: 'all 0.2s ease'
};

export default CreatePulseModal;

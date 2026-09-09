/**
 * CameraCaptureModal.jsx
 * A real-time camera interface for both mobile and desktop.
 * Uses navigator.mediaDevices.getUserMedia for the live feed and Canvas to capture.
 */
import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, RefreshCw } from 'lucide-react';

export default function CameraCaptureModal({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const streamRef = useRef(null);
  const [facingMode, setFacingMode] = useState('environment'); // back camera by default
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize camera
  const initCamera = async () => {
    try {
      console.log('[CameraCaptureModal] Requesting stream...');
      setIsReady(false);
      setError(null);

      // Check for Insecure Context (HTTP instead of HTTPS)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[CameraCaptureModal] MediaDevices not supported or Insecure Context');
        setError('insecure');
        return;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (e) {
        console.warn('[CameraCaptureModal] facingMode fail, falling back:', e);
        newStream = await navigator.mediaDevices.getUserMedia({ video: true });
      }
      
      console.log('[CameraCaptureModal] Stream obtained:', newStream.id);
      setStream(newStream);
      streamRef.current = newStream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        // Force play
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log('[CameraCaptureModal] Autoplay successful');
            setIsReady(true);
          }).catch(e => {
            console.error('[CameraCaptureModal] Autoplay prevented:', e);
            // On some browsers, play() must be called after a user gesture.
            // But since this modal usually opens on click, it should be fine.
          });
        }
      }
      
      // Fallback: If no event fires in 2.5s, force it visible if stream exists
      setTimeout(() => {
        if (streamRef.current && !isReady) {
          console.log('[CameraCaptureModal] Force ready via timeout');
          setIsReady(true);
        }
      }, 2500);

    } catch (err) {
      console.error('[CameraCaptureModal] Error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('blocked');
      } else {
        setError('failed');
      }
    }
  };

  useEffect(() => {
    initCamera();
  }, [facingMode]);

  // Ensure stream is attached when video element or stream is ready
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Handle final unmount cleanup separately
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Match dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
    }, 'image/jpeg', 0.95);
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  return (
    <div style={{
      position: 'absolute', inset: 0, 
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0b141a', // WhatsApp dark background
      zIndex: 1000000,
    }}>
      <div 
        className="camera-modal-container"
        style={{
          position: 'relative', width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          animation: 'muFadeIn 0.3s ease-out'
        }}
      >
        {/* Header: X and Take photo on the left */}
        <div style={{
          padding: '20px', display: 'flex', alignItems: 'center', gap: '24px',
          color: '#e9edef', zIndex: 10
        }}>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'transparent', border: 'none', color: 'inherit', 
              cursor: 'pointer', padding: 0, display: 'flex' 
            }}
          >
            <span style={{ fontSize: '24px', fontWeight: '700' }}>X</span>
          </button>
          <h3 style={{ margin: 0, fontSize: '19px', fontWeight: '400' }}>Take photo</h3>
        </div>

        <div style={{ 
          flex: 1, position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#000'
        }}>
          {error ? (
            <div style={{ 
              padding: '40px', textAlign: 'center', color: '#e9edef',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px'
            }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '24px', borderRadius: '50%' }}>
                <Camera size={48} strokeWidth={1} color="#8696a0" />
              </div>
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: '500' }}>
                  {error === 'blocked' ? 'Camera Access Blocked' : 
                   error === 'insecure' ? 'Secure Connection Required' : 'Camera Error'}
                </h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#8696a0', maxWidth: '300px', lineHeight: '1.5' }}>
                  {error === 'blocked' 
                    ? 'Please click the lock icon in your browser address bar and set Camera to "Allow" to continue.' 
                    : error === 'insecure' 
                    ? 'Your browser requires a secure (HTTPS) connection to access the camera on mobile devices.'
                    : 'Something went wrong while opening your camera. Please try again or check your settings.'}
                </p>
              </div>
              <button 
                onClick={error === 'insecure' ? onClose : initCamera}
                style={{
                  background: '#00a884', color: '#fff', border: 'none', 
                  borderRadius: '24px', padding: '12px 40px', fontWeight: '600',
                  cursor: 'pointer', transition: 'all 0.2s', marginTop: '10px'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#06cf9c'}
                onMouseLeave={e => e.currentTarget.style.background = '#00a884'}
              >
                {error === 'blocked' ? 'Try Enabling Again' : 
                 error === 'insecure' ? 'Close' : 'Allow Access'}
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {!isReady && (
                <div style={{ 
                  position: 'absolute', zIndex: 5, color: '#8696a0', 
                  display: 'flex', flexFlow: 'column', alignItems: 'center', gap: '15px',
                  background: 'rgba(0,0,0,0.6)', padding: '20px', borderRadius: '12px'
                }}>
                  <RefreshCw size={32} className="mu-spin" />
                  <span style={{ fontSize: '14px' }}>Starting camera...</span>
                </div>
              )}
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                onLoadedMetadata={() => setIsReady(true)}
                onPlaying={() => setIsReady(true)}
                style={{ 
                  width: '100%', height: '100%', 
                  objectFit: 'cover', background: '#000',
                  display: 'block'
                }} 
              />
            </div>
          )}

          {/* Floating Capture Button: Green circle at bottom center */}
          {isReady && !error && (
            <button 
              onClick={handleCapture}
              style={{ 
                position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
                background: '#00a884', border: 'none', borderRadius: '50%', 
                width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: 20,
                transition: 'transform 0.1s active'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'translateX(-50%) scale(1)'}
            >
              <Camera size={28} />
            </button>
          )}

          {/* Optional: Flip camera button if mobile? The user's screenshot doesn't show it but I'll keep it subtle or remove if desktop-only */}
          {!error && (
            <button 
              onClick={toggleFacingMode}
              style={{ 
                position: 'absolute', top: '20px', right: '20px',
                background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%', 
                width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', cursor: 'pointer', zIndex: 20
              }}
              title="Switch Camera"
            >
              <RefreshCw size={20} />
            </button>
          )}
        </div>

        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <style>{`
        @keyframes muFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes muSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .mu-spin { animation: muSpin 1s linear infinite; }
      `}</style>
    </div>
  );
}

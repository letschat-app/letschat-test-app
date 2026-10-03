import React, { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import Avatar from '../chat/Avatar';
import StreakBadge from './StreakBadge';
import { recordPulseView } from '../../service/PulseService';

const DEFAULT_SLIDE_DURATION = 5000; // 5 seconds for text / image

const PulseStoryViewer = ({ contactsFeed = [], initialUserIndex = 0, onClose, onPulseViewed }) => {
  if (!contactsFeed || contactsFeed.length === 0) return null;

  const [userIndex, setUserIndex] = useState(initialUserIndex);
  const [pulseIndex, setPulseIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseIndicator, setShowPauseIndicator] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Swipe Gesture Tracking
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const currentUser = contactsFeed[userIndex] || contactsFeed[0];
  const pulses = currentUser?.pulses || [];
  const currentPulse = pulses[pulseIndex] || pulses[0];

  const timerRef = useRef(null);
  const elapsedRef = useRef(0);
  const audioRef = useRef(null);
  const videoRef = useRef(null);

  // Sync video/audio play and pause with isPaused state
  useEffect(() => {
    if (isPaused) {
      if (videoRef.current) videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
    } else {
      if (videoRef.current) videoRef.current.play().catch(() => {});
      if (audioRef.current) audioRef.current.play().catch(() => {});
    }
  }, [isPaused, currentPulse]);

  // Trigger view receipt whenever currentPulse changes
  useEffect(() => {
    if (currentPulse && currentPulse.pulseId) {
      recordPulseView(currentPulse.pulseId);
      if (onPulseViewed) {
        onPulseViewed(currentUser.userId, currentPulse.pulseId);
      }
    }
  }, [currentPulse?.pulseId]);

  // Reset slide progress when user or pulse changes
  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
    setIsPaused(false);
  }, [userIndex, pulseIndex]);

  // Auto-advance timer logic
  useEffect(() => {
    if (isPaused || !currentPulse) return;

    const interval = 50; // update progress every 50ms
    const duration = currentPulse.type === 'video' || currentPulse.type === 'audio' || currentPulse.type === 'image_audio'
      ? 10000
      : DEFAULT_SLIDE_DURATION;

    timerRef.current = setInterval(() => {
      elapsedRef.current += interval;
      const pct = Math.min((elapsedRef.current / duration) * 100, 100);
      setProgress(pct);

      if (elapsedRef.current >= duration) {
        handleNext();
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [userIndex, pulseIndex, isPaused, currentPulse]);

  // Keyboard Navigation Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === ' ') {
        e.preventDefault();
        togglePauseResume();
      }
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userIndex, pulseIndex, pulses.length, contactsFeed.length]);

  const handleNext = () => {
    if (pulseIndex < pulses.length - 1) {
      setPulseIndex(prev => prev + 1);
    } else if (userIndex < contactsFeed.length - 1) {
      setUserIndex(prev => prev + 1);
      setPulseIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (pulseIndex > 0) {
      setPulseIndex(prev => prev - 1);
    } else if (userIndex > 0) {
      setUserIndex(prev => prev - 1);
      const prevUserPulses = contactsFeed[userIndex - 1]?.pulses || [];
      setPulseIndex(Math.max(0, prevUserPulses.length - 1));
    }
  };

  const togglePauseResume = () => {
    setIsPaused(prev => !prev);
    setShowPauseIndicator(true);
    setTimeout(() => setShowPauseIndicator(false), 800);
  };

  // Touch Swipe Handlers
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Horizontal Swipe (left = next, right = prev)
    if (Math.abs(deltaX) > 40 && Math.abs(deltaY) < 60) {
      if (deltaX < 0) {
        handleNext();
      } else {
        handlePrev();
      }
      return;
    }

    // Vertical Swipe Down (swipe down = close viewer)
    if (deltaY > 80 && Math.abs(deltaX) < 60 && deltaTime < 400) {
      onClose();
      return;
    }
  };

  const handleMediaClick = (e) => {
    // Ignore clicks on top overlay controls or buttons
    if (e.target.closest('.story-viewer-top-bar') || e.target.closest('button')) return;

    const width = e.currentTarget.offsetWidth;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;

    // Left 25% tap: previous pulse
    if (x < width * 0.25) {
      handlePrev();
    }
    // Right 25% tap: next pulse
    else if (x > width * 0.75) {
      handleNext();
    }
    // Middle 50% tap: toggle pause & resume!
    else {
      togglePauseResume();
    }
  };

  return (
    <div
      className="pulse-story-viewer-overlay"
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        backgroundColor: '#000000',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        userSelect: 'none'
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleMediaClick}
    >
      <div style={{
        position: 'relative',
        width: '100%', maxWidth: '440px',
        height: '100%', maxHeight: '880px',
        backgroundColor: currentPulse?.bgColor || '#090d16',
        display: 'flex', flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)'
      }}>

        {/* Top Overlay: Segmented Progress Bars & Contact Info Header */}
        <div className="story-viewer-top-bar" style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          zIndex: 20,
          padding: '12px 16px 24px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)'
        }}>
          {/* Progress Bars */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
            {pulses.map((p, idx) => (
              <div
                key={idx}
                style={{
                  flex: 1, height: '3px',
                  backgroundColor: 'rgba(255, 255, 255, 0.35)',
                  borderRadius: '2px', overflow: 'hidden'
                }}
              >
                <div style={{
                  width: idx < pulseIndex ? '100%' : idx === pulseIndex ? `${progress}%` : '0%',
                  height: '100%',
                  backgroundColor: '#ffffff',
                  transition: idx === pulseIndex ? 'width 0.05s linear' : 'none'
                }} />
              </div>
            ))}
          </div>

          {/* User Info Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Avatar chat={{ profile: currentUser.profile, userName: currentUser.userName }} size={40} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#ffffff', fontWeight: '800', fontSize: '15px' }}>
                    {currentUser.userName || currentUser.userId}
                  </span>
                  <StreakBadge streak={currentUser.pulseStreak} size="sm" />
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '11px', marginTop: '2px' }}>
                  {currentPulse?.createdAt ? new Date(currentPulse.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {(currentPulse?.type === 'audio' || currentPulse?.type === 'image_audio' || currentPulse?.type === 'video') && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              )}

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); togglePauseResume(); }}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
              >
                {isPaused ? <Play size={18} /> : <Pause size={18} />}
              </button>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: '50%', padding: '6px', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Middle Slide Content */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', width: '100%', height: '100%'
        }}>
          {/* Pause / Play Animated Toast Indicator */}
          {showPauseIndicator && (
            <div style={{
              position: 'absolute', zIndex: 30,
              width: '64px', height: '64px', borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#ffffff', pointerEvents: 'none'
            }}>
              {isPaused ? <Pause size={32} /> : <Play size={32} />}
            </div>
          )}

          {/* Text Pulse */}
          {currentPulse?.type === 'text' && (
            <div style={{
              padding: '40px 24px', textAlign: 'center',
              color: '#ffffff', fontSize: '24px', fontWeight: '800',
              fontFamily: currentPulse.fontStyle || 'sans-serif',
              lineHeight: '1.4', wordBreak: 'break-word'
            }}>
              {currentPulse.content}
            </div>
          )}

          {/* Image Pulse */}
          {currentPulse?.type === 'image' && (
            <img
              src={currentPulse.imageUrl || currentPulse.mediaUrl}
              alt="Pulse"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}

          {/* Video Pulse */}
          {currentPulse?.type === 'video' && (
            <video
              ref={videoRef}
              src={currentPulse.videoUrl || currentPulse.mediaUrl}
              autoPlay
              muted={isMuted}
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}

          {/* Audio / Voice Note Pulse */}
          {currentPulse?.type === 'audio' && (
            <div style={{ textAlign: 'center', color: '#ffffff', padding: '24px' }}>
              <div style={{
                width: '100px', height: '100px', borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)'
              }}>
                <Volume2 size={48} color="#ffffff" />
              </div>
              <audio
                ref={audioRef}
                src={currentPulse.audioUrl || currentPulse.mediaUrl}
                autoPlay
                muted={isMuted}
                style={{ width: '80%', margin: '0 auto' }}
              />
            </div>
          )}

          {/* Image + Audio Combo Pulse */}
          {currentPulse?.type === 'image_audio' && (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <img
                src={currentPulse.imageUrl || currentPulse.mediaUrl}
                alt="Combo Poster"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <audio
                ref={audioRef}
                src={currentPulse.audioUrl}
                autoPlay
                muted={isMuted}
                style={{ display: 'none' }}
              />
              <div style={{
                position: 'absolute', bottom: '80px', left: '16px', right: '16px',
                backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                borderRadius: '16px', padding: '12px 16px', color: '#ffffff',
                display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <Volume2 size={20} color="#34d399" />
                <span style={{ fontSize: '13px', fontWeight: '700' }}>Voiceover / Audio playing</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Overlay: Caption */}
        {currentPulse?.content && currentPulse.type !== 'text' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '24px 16px 20px',
            background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
            color: '#ffffff', fontSize: '15px', fontWeight: '600',
            textAlign: 'center', zIndex: 20
          }}>
            {currentPulse.content}
          </div>
        )}
      </div>
    </div>
  );
};

export default PulseStoryViewer;

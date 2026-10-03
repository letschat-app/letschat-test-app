import React, { useState, useEffect } from 'react';
import { getMediaInfo, getMediaBlob, memoryThumbCache } from '../../service/MediaCache';
import { getChatIcon, getChatColor } from '../../service/ChatUtils';
import StreakBadge from '../pulse/StreakBadge';
import SquircleFireAvatar from '../pulse/SquircleFireAvatar';

/**
 * Avatar Component
 * Handles media resolution (metadata -> blob) and caching.
 * Provides stylized fallbacks for different chat types (private, group, classroom).
 * Updates: Universal Pulse Ring, Squircle Particle Fire Frame & Streak Badge support.
 */
const Avatar = ({
  chat,
  size = 48,
  style = {},
  onClick = null,
  isHovered = false,
  highRes = false,
  showStatus = false,
  isOnline = false,
  hasActivePulse: propHasActivePulse,
  allSeen: propAllSeen,
  pulseStreak: propPulseStreak,
  showStreak = false,
  children
}) => {
  const profileId = chat?.profile || chat?.profilePic;
  const cacheKey = profileId ? (profileId + (highRes ? '_full' : '_thumb')) : null;

  const hasActivePulse = propHasActivePulse ?? chat?.hasActivePulse ?? chat?.hasPulse ?? false;
  const allSeen = propAllSeen ?? chat?.allSeen ?? false;
  const pulseStreak = propPulseStreak ?? chat?.pulseStreak ?? 0;

  const getFireFrameClass = (streak) => {
    if (streak >= 50) return 'moving-blue-fire-frame';     // Tier 5: Mythic / Hyper-Blue (50+)
    if (streak >= 30) return 'moving-white-fire-frame';    // Tier 4: Platinum / Diamond White (30+)
    if (streak >= 14) return 'moving-yellow-fire-frame';   // Tier 3: Gold / Sun-Yellow (14+)
    if (streak >= 7) return 'moving-amber-fire-frame';     // Tier 2: Silver / Amber Orange (7+)
    if (streak >= 3) return 'moving-crimson-fire-frame';   // Tier 1: Bronze / Crimson Red (3+)
    return '';
  };

  const fireFrameClass = getFireFrameClass(pulseStreak);
  const isFireFrame = Boolean(fireFrameClass);

  const [resolvedThumb, setResolvedThumb] = useState(() => {
    return cacheKey ? memoryThumbCache.get(cacheKey) : null;
  });

  const Icon = getChatIcon(chat);
  const colors = getChatColor(chat?.chatId || chat?.id || chat?.userId || 'default');

  useEffect(() => {
    if (!profileId) {
      setResolvedThumb(null);
      return;
    }

    const cached = memoryThumbCache.get(cacheKey);
    if (cached) {
      setResolvedThumb(cached);
    } else {
      setResolvedThumb(null);
    }

    let isMounted = true;
    const resolve = async () => {
      try {
        const info = await getMediaInfo(profileId);
        if (!isMounted) return;

        const key = highRes ? (info.fileKey || info.thumbnailKey) : (info.thumbnailKey || info.fileKey);
        const store = highRes ? 'mainCache' : 'thumbCache';

        const url = await getMediaBlob(cacheKey, key, store);
        if (isMounted) setResolvedThumb(url);
      } catch (err) {
        console.warn('[Avatar] Failed to resolve:', err);
      }
    };

    resolve();
    return () => { isMounted = false; };
  }, [profileId, cacheKey, highRes]);

  if (isFireFrame) {
    return (
      <div 
        className="avatar-container fire-squircle-avatar"
        style={{ 
          position: 'relative', 
          width: `${size}px`, 
          height: `${size}px`, 
          flexShrink: 0,
          cursor: onClick ? 'pointer' : 'default',
          ...style 
        }} 
        onClick={onClick}
      >
        <SquircleFireAvatar
          pulseStreak={pulseStreak}
          src={resolvedThumb}
          size={size}
          fallbackText={chat?.userName || chat?.name || chat?.chatName || 'U'}
        />
        
        {/* Online Status Indicator */}
        {showStatus && isOnline && (
          <div
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              width: `${size * 0.22}px`,
              height: `${size * 0.22}px`,
              backgroundColor: '#10b981',
              borderRadius: '50%',
              border: `2px solid var(--bg-card)`,
              boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
              zIndex: 4,
            }}
            className="status-online-pulse"
          />
        )}

        {/* Streak Badge Overlay */}
        {showStreak && pulseStreak > 0 && (
          <div style={{ position: 'absolute', bottom: '-6px', right: '-6px', zIndex: 5 }}>
            <StreakBadge streak={pulseStreak} size="sm" />
          </div>
        )}

        {children}
      </div>
    );
  }

  const containerStyle = {
    position: 'relative',
    width: `${size}px`,
    height: `${size}px`,
    flexShrink: 0,
    cursor: onClick ? 'pointer' : 'default',
    padding: (hasActivePulse || isFireFrame) ? '3px' : '0px',
    boxSizing: 'content-box',
    ...style
  };

  const fireFrameStyle = isFireFrame ? {
    position: 'absolute',
    inset: '-3px',
    borderRadius: `calc(${size + 6}px * 0.32)`,
    pointerEvents: 'none',
    zIndex: 1,
  } : null;

  const ringStyle = hasActivePulse ? {
    position: 'absolute',
    inset: 0,
    borderRadius: `calc(${size + 6}px * 0.3)`,
    border: `2.5px solid ${allSeen ? 'var(--text-muted)' : 'var(--success-color)'}`,
    boxShadow: allSeen ? 'none' : '0 0 8px var(--success-color)',
    pointerEvents: 'none',
    transition: 'all 0.3s ease',
    zIndex: 2
  } : null;

  const circleStyle = {
    position: 'absolute',
    inset: (hasActivePulse || isFireFrame) ? '3px' : 0,
    borderRadius: `calc(${size}px * 0.28)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: resolvedThumb ? 'none' : `0 4px 12px ${colors.glow}`,
    background: resolvedThumb ? 'transparent' : `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    overflow: 'hidden',
    border: resolvedThumb ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    transform: isHovered ? 'scale(1.05)' : 'scale(1)',
    zIndex: 3
  };

  const imageLayerStyle = {
    position: 'absolute',
    inset: 0,
    backgroundImage: resolvedThumb ? `url(${resolvedThumb})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    opacity: resolvedThumb ? 1 : 0,
    transition: 'opacity 0.3s ease',
  };

  return (
    <div className="avatar-container" style={containerStyle} onClick={onClick}>
      {/* 5-Tier Burning Fire Frame (3, 7, 14, 30, 50 days) */}
      {isFireFrame && (
        <div
          style={fireFrameStyle}
          className={fireFrameClass}
        />
      )}

      {/* Pulse Ring Indicator */}
      {hasActivePulse && <div style={ringStyle} className={!allSeen ? 'pulse-ring-glow' : ''} />}

      <div style={circleStyle}>
        {/* Image Layer */}
        <div style={imageLayerStyle} />

        {/* Fallback Icon */}
        {!resolvedThumb && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.2,
                background: 'radial-gradient(circle at 30% 30%, white 0%, transparent 50%)',
              }}
            />
            {typeof Icon === 'string' ? (
              <span style={{ fontSize: `${size * 0.5}px`, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>{Icon}</span>
            ) : (
              <Icon
                style={{
                  color: 'white',
                  width: `${size * 0.5}px`,
                  height: `${size * 0.5}px`,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                  opacity: 0.9
                }}
                strokeWidth={2.5}
              />
            )}
          </>
        )}

        {/* Shine/Hover Mask */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: isHovered ? 0.2 : 0,
            background: 'linear-gradient(45deg, transparent 0%, white 50%, transparent 100%)',
            transition: 'opacity 0.3s ease',
          }}
        />

        {children}
      </div>

      {/* Online Status Indicator */}
      {showStatus && isOnline && (
        <div
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: `${size * 0.22}px`,
            height: `${size * 0.22}px`,
            backgroundColor: '#10b981',
            borderRadius: '50%',
            border: `2px solid var(--bg-card)`,
            boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
            zIndex: 4,
            transition: 'all 0.3s ease',
          }}
          className="status-online-pulse"
        />
      )}

      {/* Streak Badge Overlay */}
      {showStreak && pulseStreak > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '-6px',
          right: '-6px',
          zIndex: 5,
        }}>
          <StreakBadge streak={pulseStreak} size="sm" />
        </div>
      )}

      <style>{`
        .status-online-pulse {
          animation: status-pulse 2s infinite;
        }
        @keyframes status-pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .pulse-ring-glow {
          animation: pulse-ring-glow-anim 2.5s infinite ease-in-out;
        }
        @keyframes pulse-ring-glow-anim {
          0%, 100% { boxShadow: 0 0 4px var(--success-color); }
          50% { boxShadow: 0 0 10px var(--success-color); }
        }
      `}</style>
    </div>
  );
};

export default Avatar;

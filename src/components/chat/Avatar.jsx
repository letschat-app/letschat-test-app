import React, { useState, useEffect } from 'react';
import { getMediaInfo, getMediaBlob, memoryThumbCache } from '../../service/MediaCache';
import { getChatIcon, getChatColor } from '../../service/ChatUtils';

/**
 * Avatar Component
 * Handles media resolution (metadata -> blob) and caching.
 * Provides stylized fallbacks for different chat types (private, group, classroom).
 */
const Avatar = ({ chat, size = 48, style = {}, onClick = null, isHovered = false, highRes = false, showStatus = false, isOnline = false, children }) => {
  const profileId = chat?.profile || chat?.profilePic;
  const cacheKey = profileId ? (profileId + (highRes ? '_full' : '_thumb')) : null;

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

    // Synchronous check to avoid flash
    const cached = memoryThumbCache.get(cacheKey);
    if (cached) {
      setResolvedThumb(cached);
    } else {
      // Only reset if NOT in cache, to prevent flashing
      setResolvedThumb(null);
    }

    let isMounted = true;
    const resolve = async () => {
      try {
        const info = await getMediaInfo(profileId);
        if (!isMounted) return;
        
        // Prioritize fileKey if highRes is true, otherwise thumbnailKey
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

  const containerStyle = {
    position: 'relative',
    width: `${size}px`,
    height: `${size}px`,
    flexShrink: 0,
    cursor: onClick ? 'pointer' : 'default',
    ...style
  };

  const circleStyle = {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
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
  };

  const imageLayerStyle = {
    position: 'absolute',
    inset: 0,
    backgroundImage: resolvedThumb ? `url(${resolvedThumb})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    // Smooth transition for image loading
    opacity: resolvedThumb ? 1 : 0,
    transition: 'opacity 0.3s ease',
  };

  return (
    <div className="avatar-container" style={containerStyle} onClick={onClick}>
      <div style={circleStyle}>
        {/* Image Layer */}
        <div style={imageLayerStyle} />

        {/* Fallback Icon - only if no thumb */}
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

      {/* Online Status Indicator - Only shown when online */}
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
            zIndex: 2,
            transition: 'all 0.3s ease',
          }}
          className="status-online-pulse"
        />
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
      `}</style>
    </div>
  );
};

export default Avatar;

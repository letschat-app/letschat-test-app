import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, Check } from 'lucide-react';
import EyeIcon from './EyeIcon';
import StreakBadge from '../pulse/StreakBadge';
import { formatTime12Hour, MARBLE_URL } from '../../utils/chatFormatting';
import { getMediaBlob, memoryThumbCache } from '../../service/MediaCache';
import './messages.css';

const R2_PUBLIC_URL = 'https://pub-91d12b8ece574bde8ccd1c26b5367b6d.r2.dev/';
const resolveR2 = (val) => {
  if (!val || val === 'null' || val === 'undefined') return null;
  const s = String(val).trim();
  if (!s || s === 'null' || s === 'undefined') return null;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:') || s.startsWith('data:')) return s;
  return `${R2_PUBLIC_URL}${s.replace(/^\/+/, '')}`;
};

/** Single tile inside a collage */
function CollageTile({
  item,
  isLastTile,
  isReceived,
  moreCount = 0,
  height,
  style = {},
  isSelectionMode,
  isSelected,
  onClick,
  onRetry,
}) {
  const [thumbUrl, setThumbUrl] = useState(() => {
    const key = item.content || item.mediaId || item.tempmsgid;
    return (
      memoryThumbCache.get(`${key}_thumb`) ||
      item.optimisticThumbUrl ||
      item.optimisticUrl ||
      resolveR2(item.thumbKey || item.thumbnailKey) ||
      null
    );
  });

  useEffect(() => {
    if (thumbUrl && !thumbUrl.startsWith('data:')) return;
    const mediaId = item.content || item.mediaId;
    if (!mediaId || item.isOptimistic) return;

    let isMounted = true;
    const fetchThumb = async () => {
      try {
        const sourceUrl = resolveR2(item.thumbKey || item.thumbnailKey);
        const blobUrl = await getMediaBlob(`${mediaId}_thumb`, sourceUrl, 'thumbCache');
        if (isMounted && blobUrl) setThumbUrl(blobUrl);
      } catch (err) {
        console.warn('[CollageTile] Thumb load error:', err);
      }
    };
    fetchThumb();
    return () => { isMounted = false; };
  }, [item, thumbUrl]);

  const isVideo = item.type === 'video' || item.fileType === 'video';
  const isUploading = item.status === 'uploading';
  const isFailed = item.status === 'failed';

  return (
    <div
      className="media-collage-tile"
      onClick={onClick}
      style={{
        height: `${height}px`,
        ...style,
      }}
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          loading="lazy"
          className={isUploading || isFailed ? 'msg-media-overlay-dim' : ''}
        />
      ) : (
        <div className="msg-skeleton-shimmer" style={{ width: '100%', height: '100%' }} />
      )}

      {/* Video Play Badge */}
      {isVideo && !moreCount && !isUploading && !isFailed && (
        <div className="media-collage-tile-video-badge">
          <Play size={18} fill="#ffffff" color="#ffffff" style={{ marginLeft: '2px' }} />
        </div>
      )}

      {/* +N More Overlay */}
      {moreCount > 0 && (
        <div className="media-collage-more-overlay">
          +{moreCount}
        </div>
      )}

      {/* Uploading Spinner */}
      {isUploading && (
        <div className="msg-progress-circle">
          <div style={{ position: 'relative', width: '36px', height: '36px' }}>
            <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3.5" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeDasharray="100"
                strokeDashoffset={100 - (item.uploadProgress || 0)}
              />
            </svg>
          </div>
        </div>
      )}

      {/* Failed Retry Pill */}
      {isFailed && (
        <button
          type="button"
          className="msg-retry-pill"
          onClick={(e) => {
            e.stopPropagation();
            onRetry?.(item);
          }}
          aria-label="Retry upload"
        >
          <RotateCcw size={12} />
          <span>Retry</span>
        </button>
      )}

      {/* Selection checkbox indicator when in selection mode */}
      {isSelectionMode && (
        <div
          style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            backgroundColor: isSelected ? 'var(--accent-color)' : 'rgba(0, 0, 0, 0.45)',
            border: isSelected ? '2px solid #ffffff' : '2px solid rgba(255, 255, 255, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 6,
          }}
        >
          {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
        </div>
      )}

      {/* Time & ticks chip in bottom right of last tile */}
      {isLastTile && !isUploading && (
        <div className="msg-glass-chip bottom-right">
          <span>{formatTime12Hour(item.timestamp)}</span>
          {!isReceived && <EyeIcon status={item.status || 'sending'} />}
        </div>
      )}
    </div>
  );
}

export default function MediaGroupBubble({
  group,
  isReceived,
  isMobile,
  isSelectionMode,
  selectedMessages,
  onOpenViewer,
  onOpenAlbum,
  onClickMessage,
  onRetry,
  onShowReactors,
  chatType,
  userStreakMap = {},
}) {
  const items = group.items || [];
  if (items.length === 0) return null;

  const count = items.length;
  const lastItem = items[items.length - 1];

  // Combined reactions across all items in group or on group primary
  const hasReactions = items.some((it) => it.reactions && Object.values(it.reactions).some((r) => Array.isArray(r) && r.length > 0));

  const handleTileClick = (item, index, isOverflowTile = false) => {
    if (isSelectionMode) {
      onClickMessage?.(item);
      return;
    }
    if (isOverflowTile) {
      onOpenAlbum?.(group);
      return;
    }
    // Open full viewer starting at this item
    onOpenViewer?.({
      media: item,
      mediaList: items,
      initialIndex: index,
      initialId: item.msgid || item.tempmsgid || item.content,
    });
  };

  const senderId = group.senderId;
  const senderStreak = senderId ? (userStreakMap[senderId] || 0) : 0;

  // Render tile grid according to item count
  const renderGrid = () => {
    if (count === 2) {
      const tileH = isMobile ? 160 : 180;
      return (
        <div className="media-collage-row">
          {items.map((item, idx) => (
            <CollageTile
              key={item.msgid || item.tempmsgid || idx}
              item={item}
              height={tileH}
              isLastTile={idx === 1}
              isReceived={isReceived}
              isSelectionMode={isSelectionMode}
              isSelected={selectedMessages?.has(item)}
              onClick={() => handleTileClick(item, idx)}
              onRetry={onRetry}
              style={{ flex: 1 }}
            />
          ))}
        </div>
      );
    }

    if (count === 3) {
      const totalH = isMobile ? 210 : 230;
      const subH = (totalH - 3) / 2;
      return (
        <div className="media-collage-row">
          {/* Left tall tile */}
          <CollageTile
            item={items[0]}
            height={totalH}
            isLastTile={false}
            isReceived={isReceived}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMessages?.has(items[0])}
            onClick={() => handleTileClick(items[0], 0)}
            onRetry={onRetry}
            style={{ flex: 1.35 }}
          />
          {/* Right stacked column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <CollageTile
              item={items[1]}
              height={subH}
              isLastTile={false}
              isReceived={isReceived}
              isSelectionMode={isSelectionMode}
              isSelected={selectedMessages?.has(items[1])}
              onClick={() => handleTileClick(items[1], 1)}
              onRetry={onRetry}
              style={{ width: '100%' }}
            />
            <CollageTile
              item={items[2]}
              height={subH}
              isLastTile={true}
              isReceived={isReceived}
              isSelectionMode={isSelectionMode}
              isSelected={selectedMessages?.has(items[2])}
              onClick={() => handleTileClick(items[2], 2)}
              onRetry={onRetry}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      );
    }

    if (count === 4) {
      const tileH = isMobile ? 120 : 135;
      return (
        <>
          <div className="media-collage-row">
            <CollageTile
              item={items[0]}
              height={tileH}
              isLastTile={false}
              isReceived={isReceived}
              isSelectionMode={isSelectionMode}
              isSelected={selectedMessages?.has(items[0])}
              onClick={() => handleTileClick(items[0], 0)}
              onRetry={onRetry}
              style={{ flex: 1 }}
            />
            <CollageTile
              item={items[1]}
              height={tileH}
              isLastTile={false}
              isReceived={isReceived}
              isSelectionMode={isSelectionMode}
              isSelected={selectedMessages?.has(items[1])}
              onClick={() => handleTileClick(items[1], 1)}
              onRetry={onRetry}
              style={{ flex: 1 }}
            />
          </div>
          <div className="media-collage-row">
            <CollageTile
              item={items[2]}
              height={tileH}
              isLastTile={false}
              isReceived={isReceived}
              isSelectionMode={isSelectionMode}
              isSelected={selectedMessages?.has(items[2])}
              onClick={() => handleTileClick(items[2], 2)}
              onRetry={onRetry}
              style={{ flex: 1 }}
            />
            <CollageTile
              item={items[3]}
              height={tileH}
              isLastTile={true}
              isReceived={isReceived}
              isSelectionMode={isSelectionMode}
              isSelected={selectedMessages?.has(items[3])}
              onClick={() => handleTileClick(items[3], 3)}
              onRetry={onRetry}
              style={{ flex: 1 }}
            />
          </div>
        </>
      );
    }

    // 5+ Items: Top row 2 items, Bottom row 3 items (5th has +N)
    const topH = isMobile ? 130 : 145;
    const bottomH = isMobile ? 95 : 105;
    const moreCount = count - 4;

    return (
      <>
        <div className="media-collage-row">
          <CollageTile
            item={items[0]}
            height={topH}
            isLastTile={false}
            isReceived={isReceived}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMessages?.has(items[0])}
            onClick={() => handleTileClick(items[0], 0)}
            onRetry={onRetry}
            style={{ flex: 1 }}
          />
          <CollageTile
            item={items[1]}
            height={topH}
            isLastTile={false}
            isReceived={isReceived}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMessages?.has(items[1])}
            onClick={() => handleTileClick(items[1], 1)}
            onRetry={onRetry}
            style={{ flex: 1 }}
          />
        </div>
        <div className="media-collage-row">
          <CollageTile
            item={items[2]}
            height={bottomH}
            isLastTile={false}
            isReceived={isReceived}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMessages?.has(items[2])}
            onClick={() => handleTileClick(items[2], 2)}
            onRetry={onRetry}
            style={{ flex: 1 }}
          />
          <CollageTile
            item={items[3]}
            height={bottomH}
            isLastTile={false}
            isReceived={isReceived}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMessages?.has(items[3])}
            onClick={() => handleTileClick(items[3], 3)}
            onRetry={onRetry}
            style={{ flex: 1 }}
          />
          <CollageTile
            item={items[4]}
            height={bottomH}
            isLastTile={moreCount <= 0}
            isReceived={isReceived}
            moreCount={moreCount}
            isSelectionMode={isSelectionMode}
            isSelected={selectedMessages?.has(items[4])}
            onClick={() => handleTileClick(items[4], 4, moreCount > 0)}
            onRetry={onRetry}
            style={{ flex: 1 }}
          />
        </div>
      </>
    );
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        marginBottom: hasReactions ? '20px' : '6px',
      }}
    >
      <div
        className={`media-group-bubble ${isReceived ? 'media-group-bubble-received' : 'media-group-bubble-sent'}`}
      >
        {/* Sender Name in Group/Classroom Chats */}
        {isReceived && chatType !== 'private' && (
          <div
            style={{
              padding: '4px 10px 2px',
              fontSize: isMobile ? '11px' : '12px',
              fontWeight: '600',
              color: 'var(--accent-color)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{group.sendername || 'Sender'}</span>
            {senderStreak > 0 && <StreakBadge streak={senderStreak} size="sm" />}
          </div>
        )}

        {/* Collage Grid */}
        <div className="media-collage-grid">
          {renderGrid()}
        </div>
      </div>

      {/* Aggregate Reactions Pill */}
      {hasReactions && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShowReactors?.(lastItem);
          }}
          style={{
            position: 'absolute',
            bottom: '-10px',
            ...(isReceived ? { left: '8px' } : { right: '8px' }),
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 8px',
            borderRadius: '999px',
            zIndex: 3,
            cursor: 'pointer',
            fontSize: '12px',
            border: '1px solid rgba(255,255,255,0.4)',
            color: '#ffffff',
            backgroundImage: `${MARBLE_URL}, var(--accent-gradient)`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          <span>❤️</span>
        </button>
      )}
    </div>
  );
}

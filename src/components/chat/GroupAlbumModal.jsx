import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowLeft,
  Check,
  Play,
  Trash2,
  Forward,
  Star,
  Reply,
} from 'lucide-react';
import useBackClose from '../../hooks/useBackClose';
import { formatTime12Hour, formatDateWithLabel } from '../../utils/chatFormatting';
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

function AlbumTile({
  item,
  index,
  isSelectionMode,
  isSelected,
  onTap,
  onLongPress,
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

  const longPressTimerRef = useRef(null);

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
        console.warn('[AlbumTile] Thumb load error:', err);
      }
    };
    fetchThumb();
    return () => { isMounted = false; };
  }, [item, thumbUrl]);

  const handleTouchStart = () => {
    longPressTimerRef.current = setTimeout(() => {
      onLongPress?.(item);
    }, 450);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const isVideo = item.type === 'video' || item.fileType === 'video';

  return (
    <div
      onClick={() => onTap(item, index)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: '#1f2937',
        cursor: 'pointer',
        boxShadow: isSelected ? '0 0 0 2px var(--accent-color)' : 'none',
        transform: isSelected ? 'scale(0.96)' : 'scale(1)',
        transition: 'transform 0.15s ease',
      }}
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div className="msg-skeleton-shimmer" style={{ width: '100%', height: '100%' }} />
      )}

      {/* Video Indicator */}
      {isVideo && (
        <div
          style={{
            position: 'absolute',
            bottom: '6px',
            left: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            borderRadius: '12px',
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: '600',
          }}
        >
          <Play size={10} fill="#ffffff" />
          <span>Video</span>
        </div>
      )}

      {/* Selection Checkmark */}
      <div
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: isSelected ? 'var(--accent-color)' : 'rgba(0, 0, 0, 0.45)',
          border: isSelected ? '2px solid #ffffff' : '2px solid rgba(255, 255, 255, 0.7)',
          display: isSelectionMode || isSelected ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          transition: 'all 0.15s ease',
        }}
      >
        {isSelected && <Check size={14} color="#ffffff" strokeWidth={3} />}
      </div>
    </div>
  );
}

export default function GroupAlbumModal({
  group,
  onClose,
  onOpenViewer,
  selectedMessages,
  onClickMessage,
  onReply,
  onDelete,
  onForward,
  onToggleStar,
  isMobile,
}) {
  useBackClose(true, onClose);

  const items = group?.items || [];
  const [localSelectionMode, setLocalSelectionMode] = useState(false);

  // Derive which items from this group are currently selected
  const selectedInGroup = items.filter((it) => selectedMessages?.has(it));
  const hasSelected = selectedInGroup.length > 0;

  const handleTileTap = (item, index) => {
    if (localSelectionMode || hasSelected) {
      onClickMessage?.(item);
    } else {
      onOpenViewer?.({
        media: item,
        mediaList: items,
        initialIndex: index,
        initialId: item.msgid || item.tempmsgid || item.content,
      });
    }
  };

  const handleLongPress = (item) => {
    setLocalSelectionMode(true);
    onClickMessage?.(item);
  };

  const first = items[0] || {};

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          height: 'calc(60px + env(safe-area-inset-top, 0px))',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingLeft: 'max(16px, env(safe-area-inset-left, 0px))',
          paddingRight: 'max(16px, env(safe-area-inset-right, 0px))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          background: 'rgba(17, 24, 39, 0.8)',
          color: '#ffffff',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <div style={{ fontWeight: '700', fontSize: '16px' }}>
              {hasSelected ? `${selectedInGroup.length} selected` : `Album (${items.length} items)`}
            </div>
            {first.timestamp && (
              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                {group.sendername ? `${group.sendername} • ` : ''}
                {formatDateWithLabel(first.timestamp)} • {formatTime12Hour(first.timestamp)}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '8px',
          }}
        >
          <X size={22} />
        </button>
      </div>

      {/* ─── Grid Body ─────────────────────────────────────────────────────── */}
      <div
        className="hide-scrollbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: '8px',
          alignContent: 'start',
        }}
      >
        {items.map((item, idx) => (
          <AlbumTile
            key={item.msgid || item.tempmsgid || idx}
            item={item}
            index={idx}
            isSelectionMode={localSelectionMode || hasSelected}
            isSelected={selectedMessages?.has(item)}
            onTap={handleTileTap}
            onLongPress={handleLongPress}
          />
        ))}
      </div>

      {/* ─── Bottom Multi-Select Actions (when items are selected) ─────────── */}
      {hasSelected && (
        <div
          style={{
            height: 'calc(58px + env(safe-area-inset-bottom, 0px))',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            background: 'rgba(17, 24, 39, 0.95)',
            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            paddingLeft: '16px',
            paddingRight: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {selectedInGroup.length === 1 && (
            <button
              type="button"
              onClick={() => {
                onReply?.();
                onClose();
              }}
              style={actionBtnStyle}
              title="Reply"
            >
              <Reply size={20} color="var(--accent-text)" />
              <span style={{ fontSize: '11px', color: '#ffffff' }}>Reply</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              onDelete?.();
              onClose();
            }}
            style={actionBtnStyle}
            title="Delete"
          >
            <Trash2 size={20} color="var(--danger-color)" />
            <span style={{ fontSize: '11px', color: '#ffffff' }}>Delete</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onForward?.();
              onClose();
            }}
            style={actionBtnStyle}
            title="Forward"
          >
            <Forward size={20} color="var(--accent-text)" />
            <span style={{ fontSize: '11px', color: '#ffffff' }}>Forward</span>
          </button>

          {selectedInGroup.length === 1 && (
            <button
              type="button"
              onClick={(e) => {
                onToggleStar?.(e, selectedInGroup[0]);
              }}
              style={actionBtnStyle}
              title="Star"
            >
              <Star
                size={20}
                color={selectedInGroup[0]?.isStarred ? 'var(--warning-color)' : 'var(--accent-text)'}
                fill={selectedInGroup[0]?.isStarred ? 'var(--warning-color)' : 'none'}
              />
              <span style={{ fontSize: '11px', color: '#ffffff' }}>
                {selectedInGroup[0]?.isStarred ? 'Unstar' : 'Star'}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const actionBtnStyle = {
  background: 'transparent',
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '3px',
  cursor: 'pointer',
  padding: '6px 12px',
};

import React, { useState, useEffect } from 'react';
import { getMediaInfo, getMediaBlob, memoryThumbCache } from '../../service/MediaCache';
import { resolveChatMediaUrl } from '../../utils/chatFormatting';

/** Renders a cached chat image thumbnail or full blob from MediaCache with R2 fallback. */
export default function CachedMediaImage({ mediaId, optimisticUrl = null, alt = '', style = {} }) {
  const [imgError, setImgError] = useState(false);
  const [src, setSrc] = useState(() => {
    if (optimisticUrl) return optimisticUrl;
    if (mediaId && memoryThumbCache.has(`${mediaId}_thumb`)) {
      return memoryThumbCache.get(`${mediaId}_thumb`);
    }
    return null;
  });

  useEffect(() => {
    let isMounted = true;
    setImgError(false);
    if (optimisticUrl) {
      setSrc(optimisticUrl);
      return;
    }
    if (!mediaId) {
      setImgError(true);
      return;
    }

    getMediaInfo(mediaId).then((info) => {
      if (!isMounted) return null;
      const rawKey = info?.thumbnailKey || info?.fileKey;
      const fetchUrl = resolveChatMediaUrl(rawKey);
      if (!fetchUrl) {
        if (isMounted) setImgError(true);
        return null;
      }
      const cacheKey = info?.thumbnailKey ? `${mediaId}_thumb` : `${mediaId}_full`;
      const storeName = info?.thumbnailKey ? 'thumbCache' : 'mainCache';
      return getMediaBlob(cacheKey, fetchUrl, storeName);
    }).then((blobUrl) => {
      if (isMounted) {
        if (blobUrl) setSrc(blobUrl);
        else if (!optimisticUrl) setImgError(true);
      }
    }).catch((err) => {
      console.warn('CachedMediaImage failed to load blob:', err);
      if (isMounted) setImgError(true);
    });

    return () => { isMounted = false; };
  }, [mediaId, optimisticUrl]);

  if (!src || imgError) {
    return (
      <div style={{ width: '100%', height: '100%', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--border-color)', color: 'var(--text-secondary)', fontSize: '13px', borderRadius: '8px', ...style }}>
        <span>Preview unavailable</span>
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setImgError(true)} style={style} />;
}

import React, { useState, useEffect } from 'react';
import { getPulseFromStore, pulsePreviewCache } from '../../service/PulseMediaCache';

/** Compact inline preview card for quoted/tagged Pulse stories inside a message bubble. */
export default function PulseQuoteCard({ repliedtoStr, isReceived }) {
  const isPulseReply = repliedtoStr.startsWith('PULSE_REPLY:');
  const pulseId = repliedtoStr.split(':')[1];
  const headerTitle = isPulseReply ? 'Replied to Pulse' : 'Tagged a Pulse';

  const [pulseData, setPulseData] = useState(() => pulsePreviewCache.get(String(pulseId)) || null);

  useEffect(() => {
    if (!pulseData && pulseId) {
      let isMounted = true;
      getPulseFromStore(pulseId).then((res) => {
        if (isMounted && res) {
          setPulseData(res);
        }
      });
      return () => { isMounted = false; };
    }
  }, [pulseId, pulseData]);

  const mediaUrl = pulseData?.imageUrl || pulseData?.mediaUrl || (pulseData?.type !== 'text' ? pulseData?.content : null);
  const isImageOrVideo = pulseData?.type === 'image' || pulseData?.type === 'video' || pulseData?.type === 'image_audio';

  return (
    <div
      style={{
        backgroundColor: isReceived ? 'rgba(0,0,0,0.12)' : 'var(--border-color)',
        borderLeft: '3px solid var(--accent-color)',
        padding: '6px 10px',
        borderRadius: '6px',
        marginBottom: '8px',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        gap: '8px',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '700', color: 'var(--accent-color)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{isPulseReply ? '💬 ' : '🏷️ '}{headerTitle}</span>
        </div>
        <div style={{ opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {pulseData ? (
            pulseData.type === 'text'
              ? (pulseData.content || 'Text Pulse')
              : (pulseData.content || `${pulseData.type?.toUpperCase() || 'PULSE'} Story`)
          ) : (
            `Pulse #${pulseId}`
          )}
        </div>
      </div>
      {pulseData && isImageOrVideo && mediaUrl && (
        <div style={{ width: '36px', height: '36px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#000' }}>
          <img src={mediaUrl} alt="Pulse Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Eye, X } from 'lucide-react';
import { formatViewerTime } from '../../service/PulseService';

/**
 * PulseViewersModal Component
 * Shows who viewed the user's pulse with squircle profile avatars,
 * viewer name, and dynamic time formatting (refreshes once a minute).
 * Shows "No views" when viewers array is empty or view count is 0.
 */
const PulseViewersModal = ({ isOpen, onClose, pulse }) => {
  const [nowTime, setNowTime] = useState(() => new Date());

  // Refresh labels once a minute while modal is open
  useEffect(() => {
    if (!isOpen) return;
    setNowTime(new Date());

    const interval = setInterval(() => {
      setNowTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const viewers = pulse?.viewers || [];
  const createdAt = pulse?.createdAt;
  const totalViews = pulse?.totalViews ?? pulse?.viewersCount ?? viewers.length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100000,
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '24px 24px 0 0',
          border: '1px solid var(--border-color)',
          maxHeight: '75vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={20} color="var(--accent-color)" />
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Pulse Viewers ({totalViews})
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewers List */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {viewers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
              <Eye size={36} color="var(--text-secondary)" style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>No views</div>
              <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.8 }}>No contacts have viewed this pulse yet.</div>
            </div>
          ) : (
            viewers.map((v, idx) => {
              const name = v.viewerName || v.viewerUserId || 'User';
              const profile = v.viewerProfile;
              const timeLabel = formatViewerTime(v.viewedAt, createdAt, nowTime);

              return (
                <div
                  key={v.viewerUserId || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Squircle Profile Avatar */}
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1.5px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--bg-card)',
                      flexShrink: 0
                    }}>
                      {profile ? (
                        <img src={profile} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontWeight: '500' }}>
                        {timeLabel}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PulseViewersModal;

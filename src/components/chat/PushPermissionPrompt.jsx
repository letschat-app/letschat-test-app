/**
 * PushPermissionPrompt.jsx
 * A minimal, single-purpose toast-style banner to ask for push notification permission.
 * No chains, no steps — just a simple Allow / Not Now prompt.
 */
import React from 'react';
import { Bell, X } from 'lucide-react';

const PushPermissionPrompt = ({ onAllow, onDismiss }) => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      width: 'calc(100% - 32px)',
      maxWidth: '420px',
      background: 'var(--bg-card, #1f2937)',
      border: '1px solid var(--border-color, #374151)',
      borderRadius: '16px',
      padding: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'slideUpFade 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        background: 'rgba(59,130,246,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Bell size={22} color="#3b82f6" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary, #fff)', marginBottom: '2px' }}>
          Stay notified
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary, #9ca3af)', lineHeight: 1.4 }}>
          Get alerts for new messages even when the app is closed.
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={onAllow}
          style={{
            padding: '8px 14px',
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Allow
        </button>
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary, #9ca3af)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Dismiss"
        >
          <X size={18} />
        </button>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default PushPermissionPrompt;

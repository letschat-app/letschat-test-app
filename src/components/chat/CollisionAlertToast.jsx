import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock } from 'lucide-react';

const CollisionAlertToast = () => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const handleCollision = (e) => {
      const { title, collidingTitle, timeRange } = e.detail || {};
      const id = Date.now() + Math.random().toString(36);
      const newAlert = {
        id,
        title: title || 'New Event',
        collidingTitle: collidingTitle || 'Existing Event',
        timeRange: timeRange || ''
      };

      setAlerts((prev) => [...prev, newAlert]);

      // Auto dismiss after 7 seconds
      setTimeout(() => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }, 7000);
    };

    window.addEventListener('letschat_collision_alert', handleCollision);
    return () => window.removeEventListener('letschat_collision_alert', handleCollision);
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      maxWidth: '380px'
    }}>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          style={{
            backgroundColor: 'rgba(23, 23, 23, 0.96)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '14px',
            padding: '14px 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(245, 158, 11, 0.2)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div style={{
            padding: '6px',
            borderRadius: '10px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: 'var(--warning-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={20} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '4px'
            }}>
              <span style={{
                fontSize: '13px',
                fontWeight: '700',
                color: 'var(--warning-color)',
                letterSpacing: '0.3px',
                textTransform: 'uppercase'
              }}>
                Schedule Conflict Detected
              </span>
              <button
                onClick={() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={15} />
              </button>
            </div>

            <p style={{
              fontSize: '13px',
              color: 'var(--text-primary)',
              margin: '0 0 4px 0',
              lineHeight: '1.4'
            }}>
              <strong>"{alert.title}"</strong> overlaps with your schedule.
            </p>

            {alert.timeRange && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                <Clock size={12} />
                <span>{alert.timeRange}</span>
              </div>
            )}
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default CollisionAlertToast;

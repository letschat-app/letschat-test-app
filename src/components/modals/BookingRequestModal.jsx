import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, User, Mail, Check, X, AlertCircle } from 'lucide-react';
import { API } from '../../service/UserAuth';

const BookingRequestModal = () => {
  const [currentRequest, setCurrentRequest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    const handleRequest = (e) => {
      if (e.detail) {
        setCurrentRequest(e.detail);
        setStatusMessage(null);
      }
    };

    window.addEventListener('letschat_booking_request', handleRequest);
    return () => window.removeEventListener('letschat_booking_request', handleRequest);
  }, []);

  if (!currentRequest) return null;

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleAction = async (approve) => {
    setLoading(true);
    const userId = localStorage.getItem('userid');
    try {
      const res = await fetch(`${API}/user/event/book/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId
        },
        body: JSON.stringify({
          eventId: currentRequest.eventId,
          approve: approve
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMessage(approve ? 'Meeting approved and added to your calendar!' : 'Meeting request declined.');
        setTimeout(() => {
          setCurrentRequest(null);
          setStatusMessage(null);
          // If approved, trigger calendar refresh
          if (approve) {
            window.dispatchEvent(new CustomEvent('letschat_refresh_events'));
          }
        }, 1500);
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (err) {
      console.error('Error handling booking request:', err);
      alert('Network error while processing request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10001,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'rgba(23, 23, 28, 0.98)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '20px',
        padding: '24px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        animation: 'scaleIn 0.25s ease-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              display: 'inline-flex',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              fontSize: '12px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              External Meeting Request
            </span>
          </div>
          <button
            onClick={() => setCurrentRequest(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <h3 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#f9fafb',
          margin: '0 0 16px 0'
        }}>
          {currentRequest.agenda || 'New Meeting Booking'}
        </h3>

        {/* Booker details */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '12px',
          padding: '14px',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e5e7eb', fontSize: '14px' }}>
            <User size={16} color="#9ca3af" />
            <span style={{ fontWeight: '600' }}>{currentRequest.bookerName || 'Guest'}</span>
          </div>
          {currentRequest.bookerEmail && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca3af', fontSize: '13px' }}>
              <Mail size={16} />
              <span>{currentRequest.bookerEmail}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontSize: '13px', fontWeight: '500' }}>
            <Clock size={16} />
            <span>
              {formatDateTime(currentRequest.startTime)} - {formatDateTime(currentRequest.endTime)?.split(',').pop()?.trim()}
            </span>
          </div>

          {currentRequest.meetingType && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a78bfa', fontSize: '13px' }}>
              {currentRequest.meetingType === 'online' ? <Video size={16} /> : <MapPin size={16} />}
              <span style={{ textTransform: 'capitalize' }}>
                {currentRequest.meetingType === 'online' ? 'Online Video Meeting' : 'In-Person Meet'}
              </span>
            </div>
          )}

          {currentRequest.meetingLink && (
            <div style={{ fontSize: '12px', color: '#38bdf8', wordBreak: 'break-all', paddingLeft: '24px' }}>
              <a href={currentRequest.meetingLink} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'underline' }}>
                {currentRequest.meetingLink}
              </a>
            </div>
          )}

          {currentRequest.location && (
            <div style={{ fontSize: '12px', color: '#9ca3af', paddingLeft: '24px' }}>
              Venue: {currentRequest.location}
            </div>
          )}
        </div>

        {statusMessage ? (
          <div style={{
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            textAlign: 'center',
            fontWeight: '600',
            fontSize: '14px'
          }}>
            {statusMessage}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            <button
              onClick={() => handleAction(false)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <X size={16} /> Decline
            </button>
            <button
              onClick={() => handleAction(true)}
              disabled={loading}
              style={{
                flex: 1.5,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#10b981',
                color: '#ffffff',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Check size={16} /> Add to Calendar
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default BookingRequestModal;

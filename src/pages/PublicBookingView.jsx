import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, Video, MapPin, User, Mail, CheckCircle, 
  AlertCircle, XCircle, ArrowLeft, RefreshCw, MessageSquare, Download,
  ExternalLink, Check, Edit3, X
} from 'lucide-react';
import { API } from '../service/UserAuth';

const PublicBookingView = () => {
  const { tokenOrId } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  // Modals for negotiation
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Form states for reschedule
  const [rescheduleDate, setRescheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rescheduleTime, setRescheduleTime] = useState('10:00');
  const [rescheduleDuration, setRescheduleDuration] = useState(60);
  const [rescheduleNote, setRescheduleNote] = useState('');

  // Form states for location change
  const [newMeetingType, setNewMeetingType] = useState('online');
  const [newMeetingLink, setNewMeetingLink] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [locationNote, setLocationNote] = useState('');

  // Form states for cancel
  const [cancelReason, setCancelReason] = useState('');

  const authUserId = localStorage.getItem('userid');

  const fetchBooking = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = {};
      if (authUserId) {
        headers['User-Id'] = authUserId;
      }
      const res = await fetch(`${API}/booking/view/${tokenOrId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setBooking(data);
        if (data.startTime) {
          const d = new Date(data.startTime);
          setRescheduleDate(d.toISOString().split('T')[0]);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          setRescheduleTime(`${hh}:${mm}`);
        }
        if (data.meetingType) {
          setNewMeetingType(data.meetingType);
        }
        if (data.meetingLink) {
          setNewMeetingLink(data.meetingLink);
        }
        if (data.location) {
          setNewLocation(data.location);
        }
      } else {
        setError('Booking not found or link has expired.');
      }
    } catch (err) {
      console.error('Error fetching booking:', err);
      setError('Unable to load booking details. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenOrId) {
      fetchBooking();
    }
  }, [tokenOrId]);

  // Compute end time for reschedule
  const computeEndTime = (start, durMinutes) => {
    if (!start) return '';
    const [h, m] = start.split(':').map(Number);
    const totalMinutes = h * 60 + m + durMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const handleAction = async (payload) => {
    setActionLoading(true);
    setActionSuccess('');
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authUserId) {
        headers['User-Id'] = authUserId;
      }
      const res = await fetch(`${API}/booking/respond/${tokenOrId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setActionSuccess(data.message || 'Updated successfully!');
        setShowRescheduleModal(false);
        setShowLocationModal(false);
        setShowCancelModal(false);
        await fetchBooking();
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        alert(data.message || 'Failed to update booking.');
      }
    } catch (err) {
      console.error('Action error:', err);
      alert('Network error while updating booking.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = () => {
    handleAction({ action: 'ACCEPT' });
  };

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    const endT = computeEndTime(rescheduleTime, rescheduleDuration);
    const startIso = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();
    const endIso = new Date(`${rescheduleDate}T${endT}:00`).toISOString();

    handleAction({
      action: 'PROPOSE_TIME',
      startTime: startIso,
      endTime: endIso,
      message: rescheduleNote.trim() || undefined
    });
  };

  const handleLocationSubmit = (e) => {
    e.preventDefault();
    handleAction({
      action: 'CHANGE_LOCATION',
      meetingType: newMeetingType,
      meetingLink: newMeetingType === 'online' ? newMeetingLink.trim() : null,
      location: newMeetingType === 'offline' ? newLocation.trim() : null,
      message: locationNote.trim() || undefined
    });
  };

  const handleCancelSubmit = (e) => {
    e.preventDefault();
    handleAction({
      action: 'CANCEL',
      message: cancelReason.trim() || 'Meeting cancelled by participant.'
    });
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
            <CheckCircle size={15} /> Confirmed & Scheduled
          </span>
        );
      case 'proposed_by_host':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
            <Clock size={15} /> Host Proposed New Time
          </span>
        );
      case 'proposed_by_guest':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
            <Clock size={15} /> Guest Proposed New Time
          </span>
        );
      case 'location_changed_by_host':
      case 'location_changed_by_guest':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', border: '1px solid rgba(6, 182, 212, 0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
            <MapPin size={15} /> Location Updated
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
            <XCircle size={15} /> Meeting Cancelled
          </span>
        );
      case 'pending':
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '700' }}>
            <AlertCircle size={15} /> Pending Confirmation
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0b0f17', color: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0b0f17', color: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ maxWidth: '440px', width: '100%', backgroundColor: '#161e2e', borderRadius: '20px', padding: '36px', textAlign: 'center', border: '1px solid #374151' }}>
          <XCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px' }}>Booking Not Available</h2>
          <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '24px' }}>{error || 'The requested booking could not be found.'}</p>
          <button onClick={() => navigate('/')} style={{ padding: '10px 20px', borderRadius: '10px', backgroundColor: '#6366f1', color: '#ffffff', border: 'none', fontWeight: '600', cursor: 'pointer' }}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const isCancelled = booking.externalStatus === 'cancelled';
  const isApproved = booking.externalStatus === 'approved';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0b0f17', color: '#f3f4f6', padding: '32px 16px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Top brand header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: '#fff', fontSize: '18px' }}>
              L
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0, letterSpacing: '-0.3px', color: '#ffffff' }}>LetsChat</h1>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Meeting Management & Negotiation</span>
            </div>
          </div>
          {authUserId && (
            <button onClick={() => navigate('/calendar')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid #374151', borderRadius: '10px', color: '#cbd5e1', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}>
              <Calendar size={14} /> My Calendar
            </button>
          )}
        </div>

        {/* Action success alert */}
        {actionSuccess && (
          <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', color: '#34d399', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={18} /> {actionSuccess}
          </div>
        )}

        {/* Main Booking Card */}
        <div style={{ backgroundColor: '#131b2a', border: '1px solid #1e293b', borderRadius: '24px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', margin: '0 0 6px 0', color: '#f8fafc' }}>
                {booking.eventTitle || 'Meeting'}
              </h2>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                Organized between <strong>{booking.hostName}</strong> and <strong>{booking.bookerName}</strong>
              </span>
            </div>
            <div>{getStatusBadge(booking.externalStatus)}</div>
          </div>

          {/* Change Message Note */}
          {booking.changeMessage && (
            <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.08)', borderLeft: '4px solid #6366f1', borderRadius: '0 10px 10px 0', padding: '12px 16px', marginBottom: '20px', fontSize: '14px', color: '#cbd5e1' }}>
              <strong style={{ color: '#818cf8' }}>Note ({booking.lastModifiedBy || 'Update'}):</strong> {booking.changeMessage}
            </div>
          )}

          {/* Time & Date Box */}
          <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '18px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
                <Clock size={20} />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>Scheduled Time</div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9' }}>
                  {formatDateTime(booking.startTime)}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Ends at: {formatDateTime(booking.endTime)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: booking.meetingType === 'online' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: booking.meetingType === 'online' ? '#34d399' : '#fbbf24', flexShrink: 0 }}>
                {booking.meetingType === 'online' ? <Video size={20} /> : <MapPin size={20} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                  Format: {booking.meetingType === 'online' ? 'Virtual / Online' : 'In-Person / Offline'}
                </div>
                {booking.meetingType === 'online' ? (
                  booking.meetingLink ? (
                    <a href={booking.meetingLink.startsWith('http') ? booking.meetingLink : `https://${booking.meetingLink}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '14px', color: '#38bdf8', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', wordBreak: 'break-all' }}>
                      {booking.meetingLink} <ExternalLink size={13} />
                    </a>
                  ) : (
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>Link to be provided prior to meeting</span>
                  )
                ) : (
                  <span style={{ fontSize: '14px', color: '#f1f5f9' }}>
                    {booking.location || 'Location details will be shared by host.'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Participants Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
            {/* Host Card */}
            <div style={{ backgroundColor: '#182234', border: '1px solid #1e293b', borderRadius: '14px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#6366f1', marginBottom: '8px' }}>Host</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#fff', fontSize: '14px', overflow: 'hidden' }}>
                  {booking.hostProfilePic ? <img src={booking.hostProfilePic} alt={booking.hostName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (booking.hostName?.[0] || 'H')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.hostName}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>LetsChat User</div>
                </div>
              </div>
            </div>

            {/* Guest Card */}
            <div style={{ backgroundColor: '#182234', border: '1px solid #1e293b', borderRadius: '14px', padding: '14px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#10b981', marginBottom: '8px' }}>Guest</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#fff', fontSize: '14px', overflow: 'hidden' }}>
                  {booking.guestProfilePic ? <img src={booking.guestProfilePic} alt={booking.bookerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (booking.bookerName?.[0] || 'G')}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.bookerName}</div>
                  <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{booking.bookerEmail || 'Guest'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons (Accept, Propose, Location, Cancel) */}
          {!isCancelled && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8', marginBottom: '12px' }}>
                Actions & Negotiation:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {!isApproved && (
                  <button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                  >
                    <Check size={16} /> Accept
                  </button>
                )}

                <button
                  onClick={() => setShowRescheduleModal(true)}
                  disabled={actionLoading}
                  style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#334155', color: '#f8fafc', border: '1px solid #475569', fontWeight: '600', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                >
                  <Clock size={16} /> Propose Time
                </button>

                <button
                  onClick={() => setShowLocationModal(true)}
                  disabled={actionLoading}
                  style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#334155', color: '#f8fafc', border: '1px solid #475569', fontWeight: '600', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                >
                  <MapPin size={16} /> Location
                </button>

                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={actionLoading}
                  style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: '600', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.2s' }}
                >
                  <X size={16} /> Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer: LetsChat Download Banner */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '20px', padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '700', color: '#f9fafb' }}>
              Want to chat directly with {booking.hostName}?
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', maxWidth: '420px', lineHeight: '1.5' }}>
              Get instant messages, file sharing, voice notes, and seamless schedule updates right on LetsChat.
            </p>
          </div>
          <button
            onClick={() => window.open('https://letschat.com/download', '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px', borderRadius: '12px', backgroundColor: '#6366f1', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', marginTop: '6px', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)' }}
          >
            <Download size={16} /> Download LetsChat App
          </button>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#161e2e', border: '1px solid #374151', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>Propose Different Time</h3>
              <button onClick={() => setShowRescheduleModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleRescheduleSubmit}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Date</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setRescheduleDate(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '14px', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Start Time</label>
                  <input
                    type="time"
                    required
                    value={rescheduleTime}
                    onChange={e => setRescheduleTime(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Duration</label>
                  <select
                    value={rescheduleDuration}
                    onChange={e => setRescheduleDuration(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '14px', outline: 'none' }}
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Note / Reason (Optional)</label>
                <textarea
                  placeholder="e.g., I have a conflicting meeting then, can we shift to this slot?"
                  rows={3}
                  value={rescheduleNote}
                  onChange={e => setRescheduleNote(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', outline: 'none', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowRescheduleModal(false)} style={{ padding: '10px 16px', borderRadius: '10px', backgroundColor: '#334155', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ padding: '10px 18px', borderRadius: '10px', backgroundColor: '#6366f1', color: '#ffffff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                  {actionLoading ? 'Proposing...' : 'Submit Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Location Modal */}
      {showLocationModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#161e2e', border: '1px solid #374151', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f8fafc' }}>Update Meeting Location</h3>
              <button onClick={() => setShowLocationModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleLocationSubmit}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setNewMeetingType('online')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: newMeetingType === 'online' ? '2px solid #6366f1' : '1px solid #334155', backgroundColor: newMeetingType === 'online' ? 'rgba(99, 102, 241, 0.15)' : '#0f172a', color: '#f8fafc', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Video size={16} /> Virtual / Link
                </button>
                <button
                  type="button"
                  onClick={() => setNewMeetingType('offline')}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: newMeetingType === 'offline' ? '2px solid #6366f1' : '1px solid #334155', backgroundColor: newMeetingType === 'offline' ? 'rgba(99, 102, 241, 0.15)' : '#0f172a', color: '#f8fafc', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <MapPin size={16} /> In-Person / Physical
                </button>
              </div>

              {newMeetingType === 'online' ? (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Meeting Link (Google Meet, Zoom, etc.)</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={newMeetingLink}
                    onChange={e => setNewMeetingLink(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Address / Location Name</label>
                  <input
                    type="text"
                    placeholder="Office Room 3B / Coffee shop address..."
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '14px', outline: 'none' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Note (Optional)</label>
                <textarea
                  placeholder="e.g., Switched to Google Meet link or updated room number"
                  rows={2}
                  value={locationNote}
                  onChange={e => setLocationNote(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowLocationModal(false)} style={{ padding: '10px 16px', borderRadius: '10px', backgroundColor: '#334155', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={actionLoading} style={{ padding: '10px 18px', borderRadius: '10px', backgroundColor: '#6366f1', color: '#ffffff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                  {actionLoading ? 'Updating...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#161e2e', border: '1px solid #374151', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '700', color: '#ef4444' }}>Cancel Meeting?</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 16px 0', lineHeight: '1.5' }}>
              Are you sure you want to cancel this meeting? Both participants will be notified.
            </p>
            <form onSubmit={handleCancelSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Reason (Optional)</label>
                <textarea
                  placeholder="Provide reason for cancellation..."
                  rows={2}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', outline: 'none', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCancelModal(false)} style={{ padding: '10px 16px', borderRadius: '10px', backgroundColor: '#334155', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}>Nevermind</button>
                <button type="submit" disabled={actionLoading} style={{ padding: '10px 18px', borderRadius: '10px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                  {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicBookingView;

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, Video, MapPin, User, Mail, CheckCircle, AlertTriangle, Shield } from 'lucide-react';
import { API } from '../service/UserAuth';

const PublicBookingPage = () => {
  const { userIdentifier } = useParams();
  const [hostInfo, setHostInfo] = useState({ name: userIdentifier || 'Host' });
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState(60); // default 1 hr (60 mins)
  const [agenda, setAgenda] = useState('');
  const [bookerName, setBookerName] = useState('');
  const [bookerEmail, setBookerEmail] = useState('');
  
  // Optional meeting details
  const [showAdditional, setShowAdditional] = useState(false);
  const [meetingType, setMeetingType] = useState('online'); // 'online' or 'offline'
  const [meetingLink, setMeetingLink] = useState('');
  const [location, setLocation] = useState('');

  // Busy slots from host
  const [busySlots, setBusySlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch busy slots for selected date
  useEffect(() => {
    if (!userIdentifier || !date) return;
    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await fetch(`${API}/public/book/slots/${userIdentifier}?date=${date}`);
        if (res.ok) {
          const slots = await res.json();
          setBusySlots(slots || []);
        } else {
          setBusySlots([]);
        }
      } catch (err) {
        console.error('Failed to fetch busy slots:', err);
        setBusySlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [userIdentifier, date]);

  // Compute end time based on duration
  const computeEndTime = (start, durMinutes) => {
    if (!start) return '';
    const [h, m] = start.split(':').map(Number);
    const totalMinutes = h * 60 + m + durMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  const endTime = computeEndTime(startTime, duration);

  // Check real-time conflict
  useEffect(() => {
    if (!date || !startTime || !endTime || busySlots.length === 0) {
      setConflictWarning(null);
      return;
    }

    const proposedStart = new Date(`${date}T${startTime}:00Z`).getTime();
    const proposedEnd = new Date(`${date}T${endTime}:00Z`).getTime();

    const hasConflict = busySlots.some((slot) => {
      const slotStart = new Date(slot.startTime).getTime();
      const slotEnd = new Date(slot.endTime).getTime();
      return proposedStart < slotEnd && proposedEnd > slotStart;
    });

    if (hasConflict) {
      setConflictWarning(`Selected time (${startTime} - ${endTime}) overlaps with host's busy schedule.`);
    } else {
      setConflictWarning(null);
    }
  }, [date, startTime, endTime, busySlots]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agenda.trim() || !bookerName.trim() || !bookerEmail.trim()) {
      alert('Please provide your name, email, and meeting agenda.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    const startIso = new Date(`${date}T${startTime}:00`).toISOString();
    const endIso = new Date(`${date}T${endTime}:00`).toISOString();

    const payload = {
      agenda: agenda.trim(),
      bookerName: bookerName.trim(),
      bookerEmail: bookerEmail.trim(),
      startTime: startIso,
      endTime: endIso,
      meetingType: meetingType,
      meetingLink: meetingType === 'online' ? meetingLink.trim() : null,
      location: meetingType === 'offline' ? location.trim() : null
    };

    try {
      const res = await fetch(`${API}/public/book/request/${userIdentifier}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else {
        setErrorMessage(data.message || 'Could not schedule meeting. Please try another slot.');
      }
    } catch (err) {
      console.error('Booking submission error:', err);
      setErrorMessage('Network error submitting request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // 15-minute intervals only
  const timeOptions = [];
  for (let h = 8; h <= 21; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 || 12;
      timeOptions.push({
        value: `${hh}:${mm}`,
        label: `${displayH}:${mm} ${period}`
      });
    }
  }

  if (submitted) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#0b0f17',
        color: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#161e2e',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '24px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)'
        }}>
          <CheckCircle size={56} color="#10b981" style={{ margin: '0 auto 20px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: '#ffffff' }}>
            Meeting Request Sent!
          </h2>
          <p style={{ color: '#9ca3af', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px' }}>
            Your meeting request for <strong>"{agenda}"</strong> on <strong>{date}</strong> from <strong>{startTime} to {endTime}</strong> has been submitted to <strong>{hostInfo.name}</strong>.
          </p>
          <div style={{
            padding: '16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#34d399',
            fontSize: '13px'
          }}>
            The host will review your request and accept it into their LetsChat calendar.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0b0f17',
      color: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        maxWidth: '560px',
        width: '100%',
        backgroundColor: '#161e2e',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '36px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6',
            fontWeight: '700',
            fontSize: '20px'
          }}>
            <Calendar size={28} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Schedule a Meeting with
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#ffffff', margin: '2px 0 0 0' }}>
              {hostInfo.name}
            </h1>
          </div>
        </div>

        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {conflictWarning && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '12px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>⚠️ {conflictWarning}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Booker Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Your Name *</label>
              <div style={inputContainerStyle}>
                <User size={16} color="#9ca3af" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Smith"
                  value={bookerName}
                  onChange={(e) => setBookerName(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Your Email *</label>
              <div style={inputContainerStyle}>
                <Mail size={16} color="#9ca3af" />
                <input
                  type="email"
                  required
                  placeholder="alex@example.com"
                  value={bookerEmail}
                  onChange={(e) => setBookerEmail(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Agenda */}
          <div>
            <label style={labelStyle}>Meeting Agenda / Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Project Discussion & Roadmap"
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              style={{ ...inputStyle, width: '100%', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
            />
          </div>

          {/* Date & Time Picker */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Date *</label>
              <input
                type="date"
                required
                value={date}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...inputStyle, width: '100%', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label style={labelStyle}>Start Time *</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ ...inputStyle, width: '100%', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                {timeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ backgroundColor: '#1e293b', color: '#fff' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Duration</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                style={{ ...inputStyle, width: '100%', padding: '12px', borderRadius: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <option value={15} style={{ backgroundColor: '#1e293b' }}>15 mins</option>
                <option value={30} style={{ backgroundColor: '#1e293b' }}>30 mins</option>
                <option value={45} style={{ backgroundColor: '#1e293b' }}>45 mins</option>
                <option value={60} style={{ backgroundColor: '#1e293b' }}>1 hour (Default)</option>
                <option value={90} style={{ backgroundColor: '#1e293b' }}>1.5 hours</option>
                <option value={120} style={{ backgroundColor: '#1e293b' }}>2 hours</option>
              </select>
            </div>
          </div>

          {/* Busy Slots Preview (if host revealed busy blocks) */}
          {busySlots.length > 0 && (
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase' }}>
                Host Busy Blocks (Time Only)
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {busySlots.map((slot, idx) => {
                  const s = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const e = new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <span
                      key={idx}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      ⛔ {s} - {e} (Busy)
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Collapsible Additional Information (Optional) */}
          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={() => setShowAdditional(!showAdditional)}
              style={{
                background: 'none',
                border: 'none',
                color: '#60a5fa',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 0 12px 0'
              }}
            >
              {showAdditional ? '▲' : '▼'} Additional Information (Optional: Online/Offline, Links, Venue)
            </button>

            {showAdditional && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '14px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                <div>
                  <label style={labelStyle}>Meeting Mode (Optional)</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setMeetingType('online')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        border: meetingType === 'online' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: meetingType === 'online' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                        color: meetingType === 'online' ? '#60a5fa' : '#9ca3af',
                        fontWeight: '600',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <Video size={16} /> Online (Video Call)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingType('offline')}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        border: meetingType === 'offline' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: meetingType === 'offline' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        color: meetingType === 'offline' ? '#34d399' : '#9ca3af',
                        fontWeight: '600',
                        fontSize: '13px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <MapPin size={16} /> In-Person
                    </button>
                  </div>
                </div>

                {meetingType === 'online' ? (
                  <div>
                    <label style={labelStyle}>Google Meet / Zoom Link (Optional)</label>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/xyz or https://zoom.us/j/..."
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      style={{ ...inputStyle, width: '100%', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    />
                  </div>
                ) : (
                  <div>
                    <label style={labelStyle}>Venue / Location Address (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Conference Room A, Building 3"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      style={{ ...inputStyle, width: '100%', padding: '10px 14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '16px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '700',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.2s'
            }}
          >
            {submitting ? 'Sending Request...' : 'Schedule Meeting'}
          </button>
        </form>
      </div>
    </div>
  );
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#9ca3af',
  marginBottom: '6px',
  textTransform: 'uppercase'
};

const inputContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 14px',
  borderRadius: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)'
};

const inputStyle = {
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: '#ffffff',
  fontSize: '14px',
  width: '100%'
};

export default PublicBookingPage;

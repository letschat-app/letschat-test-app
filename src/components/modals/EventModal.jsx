import React, { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, Check, AlertTriangle, Trash2, ArrowRight, Plus,
  Video, MapPin, Users, Globe, Lock, Bell, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';
import { getChatName } from '../../service/ChatUtils';
import { API } from '../../service/UserAuth';

const EventModal = ({
  event,
  onClose,
  onEventCreated,
  isReceived,
  hasChanges,
  setHasChanges,
  onCancelEvent,
  onDraftChange,
  updateEventApi,
  isPanel = false
}) => {
  const currentUserId = localStorage.getItem('userid');
  const currentUsername = localStorage.getItem('username');

  // Detect whether this event is an NLP/regex auto-detected event from a chat message
  const isAutoDetected = Boolean(
    event?.isAutoDetected === true ||
    (event?.purpose && !event?.groupEventId) ||
    (event?.tempid && !event?.groupEventId)
  );

  const eventCreatorId = event?.creatorId || event?.userId;
  const isExplicitGroupEvent = Boolean(
    event?.groupEventId ||
    (eventCreatorId && eventCreatorId !== currentUserId) ||
    (event?.isGroup && eventCreatorId && eventCreatorId !== currentUserId)
  );

  const isReceivingPerson = !isAutoDetected && (
    (eventCreatorId && eventCreatorId !== currentUserId) ||
    (event?.creatorName && currentUsername && event?.creatorName !== currentUsername && eventCreatorId !== currentUserId) ||
    (isReceived && isExplicitGroupEvent)
  );

  const isNewEvent = Boolean(
    !isAutoDetected &&
    !event?.msgref &&
    !event?.id &&
    !event?.groupEventId &&
    !event?.eventId &&
    (event?.isGroup || event?.chatid || event?.chatId)
  );

  // Enforce: creator or new events can edit freely
  const canEdit = isNewEvent || isAutoDetected || !isReceivingPerson;

  // Compute default end time (1 hr default duration)
  const computeDefaultEndTime = (startTime) => {
    if (!startTime) return '11:00';
    const parts = startTime.split(':').map(Number);
    const h = parts[0];
    const m = parts[1];
    if (isNaN(h)) return '11:00';
    const endH = (h + 1) % 24;
    return `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
  };

  const parseInitialTime = (timeVal, defaultVal) => {
    if (!timeVal) return defaultVal;
    if (typeof timeVal === 'string' && timeVal.includes('T')) {
      const d = new Date(timeVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      }
    }
    return timeVal;
  };

  const parseInitialDate = (ev) => {
    if (ev?.date) {
      const d = new Date(ev.date);
      if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    }
    const rawTime = ev?.startTime;
    if (rawTime) {
      if (typeof rawTime === 'number') {
        const d = new Date(rawTime < 1e11 ? rawTime * 1000 : rawTime);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }
      if (typeof rawTime === 'string' && rawTime.includes('T')) {
        const d = new Date(rawTime);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      }
    }
    return new Date().toISOString().split('T')[0];
  };

  const initialStart = parseInitialTime(event?.startTime, '10:00');
  const initialEnd = parseInitialTime(event?.endTime, computeDefaultEndTime(initialStart));
  const initialDate = parseInitialDate(event);
  const toSafeIso = (dVal, tVal, fallbackH = 10) => {
    try {
      const dStr = typeof dVal === 'string' ? dVal.split('T')[0] : new Date(dVal).toISOString().split('T')[0];
      if (!tVal) return new Date(`${dStr}T${String(fallbackH).padStart(2, '0')}:00:00`).toISOString();
      if (typeof tVal === 'string' && tVal.includes('T')) {
        const d = new Date(tVal);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      const cleanTime = String(tVal).trim();
      const parts = cleanTime.split(':');
      if (parts.length >= 2) {
        const h = String(parseInt(parts[0], 10) || 0).padStart(2, '0');
        const m = String(parseInt(parts[1], 10) || 0).padStart(2, '0');
        return new Date(`${dStr}T${h}:${m}:00`).toISOString();
      }
      const d = new Date(`${dStr} ${cleanTime}`);
      if (!isNaN(d.getTime())) return d.toISOString();
      return new Date(`${dStr}T${String(fallbackH).padStart(2, '0')}:00:00`).toISOString();
    } catch (e) {
      return new Date().toISOString();
    }
  };


  const [formData, setFormData] = useState({
    title: event?.title || event?.eventTitle || '',
    description: event?.description || event?.eventDetails || '',
    date: initialDate,
    startTime: initialStart,
    endTime: initialEnd,
    action: event?.action || 'scheduled',
    isAdded: event?.isAdded ?? false,
    id: event?.id || event?.eventId,
    msgref: event?.msgref || event?.msgId,
    chatid: event?.chatid || event?.chatId,
    color: event?.color || event?.eventColor || 'var(--accent-text)',
    isSync: event?.isSync ?? true,
    isSimulation: event?.isSimulation,
    // Group ecosystem fields
    groupEventId: event?.groupEventId || '',
    scope: event?.scope || (event?.chatid || event?.chatId ? 'ALL' : 'PERSONAL'),
    isGroupVisible: event?.isGroupVisible ?? true,
    meetingType: event?.meetingType || 'online',
    meetingLink: event?.meetingLink || '',
    location: event?.location || '',
    reminderEnabled: event?.reminderEnabled ?? true,
    reminderOffset: event?.reminderOffset ?? 60, // 1 hr default
    rsvpStatus: event?.rsvpStatus || null,
    rsvpCounts: event?.rsvpCounts || null
  });

  const [showAdditional, setShowAdditional] = useState(Boolean(event?.meetingLink || event?.location));
  const [conflictWarning, setConflictWarning] = useState(null);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editTime, setEditTime] = useState({
    startHour: '10',
    startMinute: '00',
    startPeriod: 'AM',
    endHour: '11',
    endMinute: '00',
    endPeriod: 'AM'
  });

  // Check schedule conflict in real time for creator
  useEffect(() => {
    const checkScheduleConflict = async () => {
      if (!currentUserId || !formData.date || !formData.startTime || !formData.endTime) return;
      try {
        const cleanDate = typeof formData.date === "string" ? formData.date.split("T")[0] : new Date(formData.date).toISOString().split("T")[0];
      const startIso = new Date(`${cleanDate}T${formData.startTime}:00`).toISOString();
        const endIso = new Date(`${cleanDate}T${formData.endTime}:00`).toISOString();

        const res = await fetch(
          `${API}/user/event/check-conflict?userId=${currentUserId}&startTime=${encodeURIComponent(startIso)}&endTime=${encodeURIComponent(endIso)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.hasConflict) {
            setConflictWarning('⚠️ Time Conflict: Overlaps with an existing event on your calendar.');
          } else {
            setConflictWarning(null);
          }
        }
      } catch (err) {
        // Non-blocking error
      }
    };

    checkScheduleConflict();
  }, [formData.date, formData.startTime, formData.endTime, currentUserId]);

  const handleChange = (field, value) => {
    if (!canEdit) return;
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (onDraftChange) onDraftChange(updated);
      return updated;
    });
    if (setHasChanges) setHasChanges(true);
  };

  const handleScopeChange = (newScope) => {
    handleChange('scope', newScope);
  };

  const handleGroupVisibilityToggle = () => {
    const newVis = !formData.isGroupVisible;
    setFormData((prev) => ({
      ...prev,
      isGroupVisible: newVis,
      // If turned off, event becomes strictly personal
      chatid: newVis ? (event?.chatid || event?.chatId) : null
    }));
    if (setHasChanges) setHasChanges(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateEvent = async () => {
    if (!formData.title || !formData.title.trim()) {
      alert("Please enter an event title");
      return;
    }

    setIsSubmitting(true);
    try {
      const startIso = toSafeIso(formData.date, formData.startTime, 10);
      const endIso = toSafeIso(formData.date, formData.endTime, 11);
      const targetChatId = formData.chatid || event?.chatid || event?.chatId;

      const payload = {
        chatId: targetChatId,
        eventTitle: formData.title.trim(),
        eventDetails: formData.description || '',
        eventColor: formData.color || '#3b82f6',
        startTime: startIso,
        endTime: endIso,
        scope: formData.scope || 'ALL',
        isGroupVisible: formData.isGroupVisible !== false,
        meetingType: formData.meetingType || 'online',
        meetingLink: formData.meetingLink?.trim() || null,
        location: formData.location?.trim() || null,
        reminderOffset: formData.reminderOffset || 60,
        action: 'scheduled'
      };

      const res = await fetch(`${API}/user/event/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': currentUserId || localStorage.getItem('userid'),
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        window.dispatchEvent(new CustomEvent('letschat_refresh_events'));
        window.dispatchEvent(new CustomEvent('letschat_event_sync', { detail: { chatId: targetChatId } }));
        if (setHasChanges) setHasChanges(false);
        if (onEventCreated) {
          onEventCreated();
        } else if (onClose) {
          onClose();
        }
      } else {
        const errorText = await res.text();
        console.error("Failed to create event:", res.status, errorText);
        alert("Failed to create event. Please try again.");
      }
    } catch (err) {
      console.error("Network error creating group event:", err);
      alert("Network error creating group event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToggle = async () => {
    const newIsAdded = !formData.isAdded;
    const startIso = toSafeIso(formData.date, formData.startTime, 10);
    const endIso = toSafeIso(formData.date, formData.endTime, 11);

    const payload = {
      ...formData,
      isAdded: newIsAdded,
      isSync: true,
      startTime: startIso,
      endTime: endIso,
      eventTitle: formData.title,
      eventDetails: formData.description,
      eventColor: formData.color,
      chatId: formData.isGroupVisible ? formData.chatid : null,
      msgId: formData.msgref,
      meetingType: formData.meetingType,
      meetingLink: formData.meetingLink?.trim() || null,
      location: formData.location?.trim() || null,
      reminderOffset: formData.reminderOffset || 60
    };

    setFormData((prev) => ({ ...prev, isAdded: newIsAdded, isSync: true }));

    // Send to backend group event endpoint if inside group or standard API
    if (formData.chatid && formData.isGroupVisible) {
      try {
        const res = await fetch(`${API}/user/event/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Id': currentUserId
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          window.dispatchEvent(new CustomEvent('letschat_refresh_events'));
          if (setHasChanges) setHasChanges(false);
          if (onClose) onClose();
          return;
        }
      } catch (err) {
        console.error('Failed to create group event:', err);
      }
    } else if (updateEventApi) {
      updateEventApi(payload);
      if (setHasChanges) setHasChanges(false);
    }

    if (onDraftChange) onDraftChange(payload);
  };

  // Convert 12h to 24h helper
  const convertTo24Hour = (hour, minute, period) => {
    let h = parseInt(hour, 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute}`;
  };

  const parseTimeForEdit = (timeString) => {
    if (!timeString) return { hour: '10', minute: '00', period: 'AM' };
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    // Snap to nearest 15-min interval
    let min = parseInt(minutes, 10);
    const validMinutes = ['00', '15', '30', '45'];
    let nearestMin = '00';
    let minDiff = 999;
    validMinutes.forEach((m) => {
      const diff = Math.abs(parseInt(m, 10) - min);
      if (diff < minDiff) {
        minDiff = diff;
        nearestMin = m;
      }
    });
    return { hour: displayHour.toString(), minute: nearestMin, period };
  };

  const startEditingTime = () => {
    const startParsed = parseTimeForEdit(formData.startTime);
    const endParsed = parseTimeForEdit(formData.endTime);

    setEditTime({
      startHour: startParsed.hour,
      startMinute: startParsed.minute,
      startPeriod: startParsed.period,
      endHour: endParsed.hour,
      endMinute: endParsed.minute,
      endPeriod: endParsed.period
    });
    setIsEditingTime(true);
  };

  const saveTimeChanges = () => {
    const newStartTime = convertTo24Hour(editTime.startHour, editTime.startMinute, editTime.startPeriod);
    const newEndTime = convertTo24Hour(editTime.endHour, editTime.endMinute, editTime.endPeriod);

    handleChange('startTime', newStartTime);
    handleChange('endTime', newEndTime);
    setIsEditingTime(false);
  };

  const formatDisplayTime = (timeString) => {
    if (!timeString) return '';
    const [h, m] = timeString.split(':');
    const hour = parseInt(h, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${period}`;
  };

  const isGroupContext = Boolean(formData.chatid);

  const content = (
    <div
      className="event-panel-content"
      onClick={(e) => e.stopPropagation()}
      style={{
        backgroundColor: isPanel ? 'transparent' : 'rgba(17, 24, 39, 0.98)',
        borderRadius: isPanel ? '0' : '20px',
        padding: '24px',
        width: '100%',
        maxWidth: isPanel ? 'none' : '500px',
        maxHeight: isPanel ? 'none' : '90vh',
        overflowY: 'auto',
        position: 'relative',
        border: isPanel ? 'none' : '1px solid var(--border-color)',
        boxShadow: isPanel ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        height: isPanel ? '100%' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* Panel Sticky Header */}
      {isPanel && (
        <div style={{
          position: 'sticky', top: -24, left: -24, right: -24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 24px', zIndex: 10,
          background: 'rgba(17, 24, 39, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--border-color)',
          margin: '-24px -24px 20px -24px'
        }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700' }}>Event Details</h3>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-hover)', border: 'none',
              borderRadius: '50%', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)'
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Standard Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '6px 14px', borderRadius: '12px',
            backgroundColor: 'var(--accent-tint)',
            border: '1px solid var(--accent-tint-border)'
          }}>
            <Calendar size={18} color="var(--accent-text)" />
            <span style={{ fontWeight: '600', color: '#f3f4f6', fontSize: '13px', textTransform: 'capitalize' }}>
              {isGroupContext ? 'Group Event' : 'Personal Event'}
            </span>
          </div>
          {formData.chatid && (() => {
            const chatName = getChatName(formData.chatid);
            return chatName ? (
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                in {chatName}
              </span>
            ) : null;
          })()}
        </div>

        {!isPanel && (
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-hover)', border: 'none',
              borderRadius: '50%', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)'
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* PROMINENT ONLINE VIDEO / IN-PERSON SECTION (TOP DISPLAY IN VIEW MODE) */}
      {formData.isAdded && (
        <div style={{ marginBottom: '20px' }}>
          {formData.meetingType === 'online' && formData.meetingLink && (
            <div style={{
              backgroundColor: 'var(--accent-tint)',
              border: '1px solid var(--accent-tint-border)',
              borderRadius: '14px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Video size={20} color="var(--accent-text)" />
                <div>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                    Online Meeting
                  </span>
                  <span style={{ fontSize: '13px', color: '#f3f4f6', fontWeight: '600' }}>Google Meet / Zoom</span>
                </div>
              </div>
              <a
                href={formData.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--accent-solid)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  boxShadow: '0 4px 12px color-mix(in srgb, var(--accent-solid) 45%, transparent)'
                }}
              >
                Join Now <ExternalLink size={14} />
              </a>
            </div>
          )}

          {formData.meetingType === 'offline' && formData.location && (
            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '14px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <MapPin size={20} color="var(--success-color)" />
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '700' }}>
                  Venue Location
                </span>
                <span style={{ fontSize: '13px', color: '#f3f4f6', fontWeight: '600' }}>{formData.location}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conflict Warning Banner (Non-blocking) */}
      {conflictWarning && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '12px',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: 'var(--warning-color)',
          fontSize: '13px',
          marginBottom: '20px'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{conflictWarning}</span>
        </div>
      )}

      {/* Creator-only Lock Notice for Receiving Persons */}
      {!canEdit && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderRadius: '12px',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          color: 'var(--accent-text)',
          fontSize: '13px',
          fontWeight: '500',
          marginBottom: '20px'
        }}>
          <Lock size={16} style={{ flexShrink: 0 }} />
          <span>
            Created by <strong>@{event?.creatorName || eventCreatorId || 'host'}</strong> • Only the event creator can edit the date, time, or details.
          </span>
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Event Title</label>
        <input
          type="text"
          value={formData.title}
          disabled={!canEdit}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="What's happening?"
          style={{
            width: '100%', padding: '14px 16px', borderRadius: '12px',
            backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)',
            color: '#f3f4f6', fontSize: '18px', fontWeight: '600', outline: 'none',
            cursor: !canEdit ? 'default' : 'text',
            opacity: !canEdit ? 0.9 : 1
          }}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Description</label>
        <textarea
          value={formData.description}
          disabled={!canEdit}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Add agenda or details..."
          style={{
            width: '100%', padding: '12px 16px', borderRadius: '12px',
            backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)',
            color: '#d1d5db', fontSize: '14px', outline: 'none', minHeight: '70px', resize: 'none',
            cursor: !canEdit ? 'default' : 'text',
            opacity: !canEdit ? 0.9 : 1
          }}
        />
      </div>

      {/* Date & Time Section (Default 1-hr duration, 15-min strict intervals) */}
      <div style={{
        backgroundColor: 'var(--bg-hover)',
        borderRadius: '16px', padding: '18px',
        border: '1px solid var(--bg-hover)',
        marginBottom: '20px'
      }}>
        {/* Date */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} /> Date
          </label>
          <input
            type="date"
            value={formData.date}
            disabled={!canEdit}
            onChange={(e) => handleChange('date', e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-color)',
              color: '#f3f4f6', colorScheme: 'dark',
              cursor: !canEdit ? 'default' : 'pointer',
              opacity: !canEdit ? 0.9 : 1
            }}
          />
        </div>

        {/* Time display & Change */}
        {!isEditingTime ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f3f4f6', fontSize: '15px', fontWeight: '600' }}>
              <Clock size={16} color="var(--accent-text)" />
              <span>{formatDisplayTime(formData.startTime)}</span>
              <ArrowRight size={14} color="var(--text-muted)" />
              <span>{formatDisplayTime(formData.endTime)}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '400' }}>(1 hr default)</span>
            </div>
            {canEdit && (
              <button
                onClick={startEditingTime}
                style={{
                  padding: '6px 14px', borderRadius: '8px',
                  backgroundColor: 'var(--accent-tint)', color: 'var(--accent-text)',
                  border: '1px solid var(--accent-tint-border)', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Change
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Start time 15-min strict */}
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>START</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <select
                    value={editTime.startHour}
                    onChange={(e) => setEditTime({ ...editTime, startHour: e.target.value })}
                    style={timeSelectStyle}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <select
                    value={editTime.startMinute}
                    onChange={(e) => setEditTime({ ...editTime, startMinute: e.target.value })}
                    style={timeSelectStyle}
                  >
                    {['00', '15', '30', '45'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={editTime.startPeriod}
                    onChange={(e) => setEditTime({ ...editTime, startPeriod: e.target.value })}
                    style={timeSelectStyle}
                  >
                    <option>AM</option><option>PM</option>
                  </select>
                </div>
              </div>

              {/* End time 15-min strict */}
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>END</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <select
                    value={editTime.endHour}
                    onChange={(e) => setEditTime({ ...editTime, endHour: e.target.value })}
                    style={timeSelectStyle}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <select
                    value={editTime.endMinute}
                    onChange={(e) => setEditTime({ ...editTime, endMinute: e.target.value })}
                    style={timeSelectStyle}
                  >
                    {['00', '15', '30', '45'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={editTime.endPeriod}
                    onChange={(e) => setEditTime({ ...editTime, endPeriod: e.target.value })}
                    style={timeSelectStyle}
                  >
                    <option>AM</option><option>PM</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveTimeChanges} style={{ ...smallBtnStyle, backgroundColor: 'var(--accent-solid)', color: 'var(--text-on-accent)' }}>
                Save Time
              </button>
              <button onClick={() => setIsEditingTime(false)} style={{ ...smallBtnStyle, backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reminder Setting (Default: 1 hr) */}
      <div style={{
        backgroundColor: 'var(--bg-hover)',
        borderRadius: '16px', padding: '16px',
        border: '1px solid var(--bg-hover)',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={16} color="var(--warning-color)" />
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Reminder</span>
        </div>
        <select
          value={formData.reminderOffset}
          onChange={(e) => handleChange('reminderOffset', Number(e.target.value))}
          style={{
            padding: '6px 12px', borderRadius: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)', border: '1px solid var(--border-color)',
            color: '#f3f4f6', fontSize: '13px', outline: 'none'
          }}
        >
          <option value={15}>15 mins before</option>
          <option value={30}>30 mins before</option>
          <option value={60}>1 hour before (Default)</option>
          <option value={120}>2 hours before</option>
          <option value={1440}>1 day before</option>
        </select>
      </div>

      {/* GROUP VISIBILITY & SCOPE CONTROLS (IF CREATING IN GROUP) */}
      {isGroupContext && canEdit && (
        <div style={{
          backgroundColor: 'var(--accent-tint)',
          border: '1px solid var(--accent-tint)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-text)' }}>
              Group Sharing & Scope
            </span>
            {/* Visibility Toggle (Default: ON) */}
            <button
              type="button"
              onClick={handleGroupVisibilityToggle}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: formData.isGroupVisible ? 'var(--accent-text)' : 'var(--border-color)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Users size={13} /> {formData.isGroupVisible ? '👥 Group Visible: ON' : '🔒 Personal Only'}
            </button>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            {formData.isGroupVisible
              ? 'Group members will see this in the group calendar. Toggle OFF if you want to keep it personal.'
              : 'This event will be created strictly on your personal calendar.'}
          </p>

          {formData.isGroupVisible && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleScopeChange('ALL')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '10px',
                  border: formData.scope === 'ALL' ? '1px solid var(--accent-solid)' : '1px solid var(--border-color)',
                  backgroundColor: formData.scope === 'ALL' ? 'var(--accent-tint)' : 'transparent',
                  color: formData.scope === 'ALL' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Add for Everyone in Group
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('PERSONAL')}
                style={{
                  flex: 1, padding: '8px', borderRadius: '10px',
                  border: formData.scope === 'PERSONAL' ? '1px solid var(--accent-solid)' : '1px solid var(--border-color)',
                  backgroundColor: formData.scope === 'PERSONAL' ? 'var(--accent-tint)' : 'transparent',
                  color: formData.scope === 'PERSONAL' ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Add for Me Only
              </button>
            </div>
          )}
        </div>
      )}

      {/* COLLAPSIBLE ADDITIONAL INFORMATION (PURELY OPTIONAL: ONLINE/OFFLINE, MEET LINKS, VENUE) */}
      <div style={{ borderTop: '1px solid var(--bg-hover)', paddingTop: '16px', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setShowAdditional(!showAdditional)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--accent-text)',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0
          }}
        >
          {showAdditional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Additional Information (Optional: Online/Offline, Links, Venue)
        </button>

        {showAdditional && (
          <div style={{
            marginTop: '14px',
            backgroundColor: 'var(--bg-hover)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div>
              <label style={labelStyle}>Meeting Mode (Optional)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => canEdit && handleChange('meetingType', 'online')}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px',
                    border: formData.meetingType === 'online' ? '1px solid var(--accent-solid)' : '1px solid var(--border-color)',
                    backgroundColor: formData.meetingType === 'online' ? 'var(--accent-tint-border)' : 'transparent',
                    color: formData.meetingType === 'online' ? 'var(--accent-text)' : 'var(--text-secondary)',
                    fontWeight: '600', fontSize: '12px',
                    cursor: !canEdit ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    opacity: !canEdit && formData.meetingType !== 'online' ? 0.5 : 1
                  }}
                >
                  <Video size={14} /> Online
                </button>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => canEdit && handleChange('meetingType', 'offline')}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px',
                    border: formData.meetingType === 'offline' ? '1px solid var(--success-color)' : '1px solid var(--border-color)',
                    backgroundColor: formData.meetingType === 'offline' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: formData.meetingType === 'offline' ? 'var(--success-color)' : 'var(--text-secondary)',
                    fontWeight: '600', fontSize: '12px',
                    cursor: !canEdit ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    opacity: !canEdit && formData.meetingType !== 'offline' ? 0.5 : 1
                  }}
                >
                  <MapPin size={14} /> In-Person
                </button>
              </div>
            </div>

            {formData.meetingType === 'online' ? (
              <div>
                <label style={labelStyle}>Google Meet / Zoom Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://meet.google.com/xyz or Zoom link"
                  value={formData.meetingLink}
                  disabled={!canEdit}
                  onChange={(e) => handleChange('meetingLink', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)',
                    color: '#f3f4f6', fontSize: '13px', outline: 'none',
                    cursor: !canEdit ? 'default' : 'text',
                    opacity: !canEdit ? 0.9 : 1
                  }}
                />
              </div>
            ) : (
              <div>
                <label style={labelStyle}>Venue / Location Address (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Building 4, Conference Room B"
                  value={formData.location}
                  disabled={!canEdit}
                  onChange={(e) => handleChange('location', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    backgroundColor: 'var(--bg-hover)', border: '1px solid var(--border-color)',
                    color: '#f3f4f6', fontSize: '13px', outline: 'none',
                    cursor: !canEdit ? 'default' : 'text',
                    opacity: !canEdit ? 0.9 : 1
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: isPanel ? '40px' : '0' }}>
        {isNewEvent ? (
          <button
            type="button"
            onClick={handleCreateEvent}
            disabled={isSubmitting}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px',
              backgroundColor: 'var(--accent-solid)',
              color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '16px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              boxShadow: '0 10px 20px -5px color-mix(in srgb, var(--accent-solid) 45%, transparent)'
            }}
          >
            {isSubmitting ? <span>Creating Event...</span> : <><Plus size={20} /> Create Event</>}
          </button>
        ) : (!canEdit || isReceived || !formData.isAdded ? (
          <button
            type="button"
            onClick={handleAddToggle}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px',
              backgroundColor: formData.isAdded ? 'var(--success-color)' : 'var(--accent-text)',
              color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '16px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              boxShadow: '0 10px 20px -5px color-mix(in srgb, var(--accent-solid) 45%, transparent)'
            }}
          >
            {formData.isAdded ? <><Check size={20} /> Added to Calendar</> : <><Calendar size={20} /> Add to Calendar</>}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onCancelEvent}
              style={{
                flex: 1, padding: '14px', borderRadius: '12px',
                backgroundColor: 'var(--danger-tint)', color: 'var(--danger-color)',
                border: '1px solid var(--danger-tint-border)', fontWeight: '600',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Trash2 size={18} /> Cancel Event
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  if (isPanel) return content;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10000, padding: '20px'
      }}
    >
      {content}
    </div>
  );
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: 'var(--text-secondary)',
  marginBottom: '6px',
  textTransform: 'uppercase'
};

const timeSelectStyle = {
  flex: 1,
  padding: '8px',
  borderRadius: '8px',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid var(--border-color)',
  color: '#f3f4f6',
  outline: 'none',
  fontSize: '13px'
};

const smallBtnStyle = {
  flex: 1,
  padding: '10px',
  borderRadius: '8px',
  border: 'none',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer'
};

export default EventModal;

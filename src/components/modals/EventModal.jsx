import React, { useState, useEffect } from 'react';
import {
  X, Calendar, Clock, Check, AlertTriangle, Trash2, ArrowRight,
  Video, MapPin, Users, Globe, Lock, Bell, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';
import { getChatName } from '../../service/ChatUtils';
import { API } from '../../service/UserAuth';

const EventModal = ({
  event,
  onClose,
  isReceived,
  hasChanges,
  setHasChanges,
  onCancelEvent,
  onDraftChange,
  updateEventApi,
  isPanel = false
}) => {
  const currentUserId = localStorage.getItem('userid');

  // Compute default end time (1 hr default duration)
  const computeDefaultEndTime = (startTime) => {
    if (!startTime) return '11:00';
    const [h, m] = startTime.split(':').map(Number);
    const endH = (h + 1) % 24;
    return `${String(endH).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`;
  };

  const initialStart = event?.startTime || '10:00';
  const initialEnd = event?.endTime || computeDefaultEndTime(initialStart);

  const [formData, setFormData] = useState({
    title: event?.title || event?.eventTitle || '',
    description: event?.description || event?.eventDetails || '',
    date: event?.date ? (new Date(event.date).toISOString().split('T')[0]) : new Date().toISOString().split('T')[0],
    startTime: initialStart,
    endTime: initialEnd,
    action: event?.action || 'scheduled',
    isAdded: event?.isAdded ?? false,
    id: event?.id || event?.eventId,
    msgref: event?.msgref || event?.msgId,
    chatid: event?.chatid || event?.chatId,
    color: event?.color || event?.eventColor || '#3b82f6',
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
        const startIso = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
        const endIso = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

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

  const handleAddToggle = async () => {
    const newIsAdded = !formData.isAdded;
    const startIso = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
    const endIso = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

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
        }
      } catch (err) {
        console.error('Failed to create group event:', err);
      }
    } else if (updateEventApi) {
      updateEventApi(payload);
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
        border: isPanel ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
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
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          margin: '-24px -24px 20px -24px'
        }}>
          <h3 style={{ margin: 0, color: '#f9fafb', fontSize: '18px', fontWeight: '700' }}>Event Details</h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)', border: 'none',
              borderRadius: '50%', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#9ca3af'
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
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)'
          }}>
            <Calendar size={18} color="#60a5fa" />
            <span style={{ fontWeight: '600', color: '#f3f4f6', fontSize: '13px', textTransform: 'capitalize' }}>
              {isGroupContext ? 'Group Event' : 'Personal Event'}
            </span>
          </div>
          {formData.chatid && (() => {
            const chatName = getChatName(formData.chatid);
            return chatName ? (
              <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: '500' }}>
                in {chatName}
              </span>
            ) : null;
          })()}
        </div>

        {!isPanel && (
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)', border: 'none',
              borderRadius: '50%', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#9ca3af'
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
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.4)',
              borderRadius: '14px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Video size={20} color="#60a5fa" />
                <div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '700' }}>
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
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '700',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
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
              <MapPin size={20} color="#34d399" />
              <div>
                <span style={{ display: 'block', fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '700' }}>
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
          color: '#fbbf24',
          fontSize: '13px',
          marginBottom: '20px'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{conflictWarning}</span>
        </div>
      )}

      {/* Title */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Event Title</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="What's happening?"
          style={{
            width: '100%', padding: '14px 16px', borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f3f4f6', fontSize: '18px', fontWeight: '600', outline: 'none'
          }}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: '20px' }}>
        <label style={labelStyle}>Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Add agenda or details..."
          style={{
            width: '100%', padding: '12px 16px', borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#d1d5db', fontSize: '14px', outline: 'none', minHeight: '70px', resize: 'none'
          }}
        />
      </div>

      {/* Date & Time Section (Default 1-hr duration, 15-min strict intervals) */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '16px', padding: '18px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
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
            onChange={(e) => handleChange('date', e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#f3f4f6', colorScheme: 'dark', cursor: 'pointer'
            }}
          />
        </div>

        {/* Time display & Change */}
        {!isEditingTime ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f3f4f6', fontSize: '15px', fontWeight: '600' }}>
              <Clock size={16} color="#60a5fa" />
              <span>{formatDisplayTime(formData.startTime)}</span>
              <ArrowRight size={14} color="#6b7280" />
              <span>{formatDisplayTime(formData.endTime)}</span>
              <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '400' }}>(1 hr default)</span>
            </div>
            <button
              onClick={startEditingTime}
              style={{
                padding: '6px 14px', borderRadius: '8px',
                backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '12px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              Change
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Start time 15-min strict */}
              <div>
                <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>START</span>
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
                <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>END</span>
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
              <button onClick={saveTimeChanges} style={{ ...smallBtnStyle, backgroundColor: '#3b82f6', color: '#fff' }}>
                Save Time
              </button>
              <button onClick={() => setIsEditingTime(false)} style={{ ...smallBtnStyle, backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#9ca3af' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reminder Setting (Default: 1 hr) */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '16px', padding: '16px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={16} color="#f59e0b" />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#e5e7eb' }}>Reminder</span>
        </div>
        <select
          value={formData.reminderOffset}
          onChange={(e) => handleChange('reminderOffset', Number(e.target.value))}
          style={{
            padding: '6px 12px', borderRadius: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)',
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
      {isGroupContext && (
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.08)',
          border: '1px solid rgba(59, 130, 246, 0.25)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#60a5fa' }}>
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
                backgroundColor: formData.isGroupVisible ? '#2563eb' : 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Users size={13} /> {formData.isGroupVisible ? '👥 Group Visible: ON' : '🔒 Personal Only'}
            </button>
          </div>

          <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af', lineHeight: '1.4' }}>
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
                  border: formData.scope === 'ALL' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: formData.scope === 'ALL' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                  color: formData.scope === 'ALL' ? '#ffffff' : '#9ca3af',
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
                  border: formData.scope === 'PERSONAL' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                  backgroundColor: formData.scope === 'PERSONAL' ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
                  color: formData.scope === 'PERSONAL' ? '#ffffff' : '#9ca3af',
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
      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', marginBottom: '24px' }}>
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
            padding: 0
          }}
        >
          {showAdditional ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          Additional Information (Optional: Online/Offline, Links, Venue)
        </button>

        {showAdditional && (
          <div style={{
            marginTop: '14px',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
                  onClick={() => handleChange('meetingType', 'online')}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px',
                    border: formData.meetingType === 'online' ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: formData.meetingType === 'online' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    color: formData.meetingType === 'online' ? '#60a5fa' : '#9ca3af',
                    fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  <Video size={14} /> Online
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('meetingType', 'offline')}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px',
                    border: formData.meetingType === 'offline' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: formData.meetingType === 'offline' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: formData.meetingType === 'offline' ? '#34d399' : '#9ca3af',
                    fontWeight: '600', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
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
                  onChange={(e) => handleChange('meetingLink', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f3f4f6', fontSize: '13px', outline: 'none'
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
                  onChange={(e) => handleChange('location', e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#f3f4f6', fontSize: '13px', outline: 'none'
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: isPanel ? '40px' : '0' }}>
        {isReceived || !formData.isAdded ? (
          <button
            onClick={handleAddToggle}
            style={{
              width: '100%', padding: '16px', borderRadius: '14px',
              backgroundColor: formData.isAdded ? '#059669' : '#3b82f6',
              color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '16px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              boxShadow: '0 10px 20px -5px rgba(59, 130, 246, 0.4)'
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
                backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: '600',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Trash2 size={18} /> Cancel Event
            </button>
          </div>
        )}
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
  color: '#9ca3af',
  marginBottom: '6px',
  textTransform: 'uppercase'
};

const timeSelectStyle = {
  flex: 1,
  padding: '8px',
  borderRadius: '8px',
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
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

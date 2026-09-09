import React, { useState } from 'react';
import { X, Calendar, Clock, Check, AlertTriangle, Trash2, ArrowRight } from 'lucide-react';
import { getChatName } from '../../service/ChatUtils';

const EventModal = ({ event, onClose, isReceived, hasChanges, setHasChanges, onCancelEvent, onDraftChange, updateEventApi, isPanel = false }) => {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    date: event?.date || '',
    startTime: event?.startTime || '',
    endTime: event?.endTime || '',
    action: event?.action || 'scheduled',
    isAdded: event?.isAdded || false,
    id: event?.id,
    msgref: event?.msgref,
    chatid: event?.chatid,
    color: event?.color,
    isSync: event?.isSync,
    isSimulation: event?.isSimulation,
  });

  const [showPostponeDate, setShowPostponeDate] = useState(false);
  const [postponeData, setPostponeData] = useState({
    date: '',
    startTime: event?.startTime || '',
    endTime: event?.endTime || ''
  });

  const [isEditingTime, setIsEditingTime] = useState(false);
  const [timeChanged, setTimeChanged] = useState(false);
  const [editTime, setEditTime] = useState({
    startHour: '',
    startMinute: '',
    startPeriod: 'AM',
    endHour: '',
    endMinute: '',
    endPeriod: 'AM'
  });

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (onDraftChange) onDraftChange(updated);
      return updated;
    });
    if (setHasChanges) setHasChanges(true);
  };

  const handleAddToggle = () => {
    const newIsAdded = !formData.isAdded;
    const updatedForm = { ...formData, isAdded: newIsAdded, isSync: newIsAdded };
    setFormData(updatedForm);
    
    console.log("[EventModal] handleAddToggle - newIsAdded:", newIsAdded, "updatedForm:", updatedForm);

    // Call the API update with the FULL latest form data
    if (updateEventApi) {
      updateEventApi(updatedForm);
    }

    if (onDraftChange) {
      onDraftChange(updatedForm);
    }
  };

  const handlePostponeConfirm = () => {
    console.log('Event postponed to:', postponeData);
    // Logic for postponing would go here, usually calling an API
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const parseTimeForEdit = (timeString) => {
    if (!timeString) return { hour: '', minute: '', period: 'AM' };
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return { hour: displayHour.toString(), minute: minutes, period };
  };

  const convertTo24Hour = (hour, minute, period) => {
    let h = parseInt(hour);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${minute}`;
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
    setTimeChanged(false);
  };

  const saveTimeChanges = () => {
    const newStartTime = convertTo24Hour(editTime.startHour, editTime.startMinute, editTime.startPeriod);
    const newEndTime = editTime.endHour ? convertTo24Hour(editTime.endHour, editTime.endMinute, editTime.endPeriod) : '';

    handleChange('startTime', newStartTime);
    handleChange('endTime', newEndTime);

    setIsEditingTime(false);
    setTimeChanged(true);
    setTimeout(() => setTimeChanged(false), 2000);
  };

  const getActionDisplay = () => {
    switch (formData.action) {
      case 'scheduled': return { icon: <Calendar size={20} />, label: 'Scheduled', color: '#3b82f6' };
      case 'reminder': return { icon: <Clock size={20} />, label: 'Reminder', color: '#f59e0b' };
      case 'task': return { icon: <Check size={20} />, label: 'Task', color: '#10b981' };
      default: return { icon: <Calendar size={20} />, label: 'Event', color: '#3b82f6' };
    }
  };

  const actionDisplay = getActionDisplay();

  const content = (
    <div className="event-panel-content" onClick={e => e.stopPropagation()} style={{
      backgroundColor: isPanel ? 'transparent' : 'rgba(17, 24, 39, 0.95)',
      borderRadius: isPanel ? '0' : '20px',
      padding: '24px',
      width: '100%',
      maxWidth: isPanel ? 'none' : '480px',
      maxHeight: isPanel ? 'none' : '90vh',
      overflowY: 'auto',
      position: 'relative',
      border: isPanel ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: isPanel ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      height: isPanel ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box',
      overflowX: 'hidden'
    }}>
      {/* Header Sticky area for panel */}
      {isPanel && (
        <div style={{
          position: 'sticky', top: -24, left: -24, right: -24,
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px', zIndex: 10,
          background: 'rgba(17, 24, 39, 0.8)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          margin: '-24px -24px 20px -24px'
        }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700' }}>Event Details</h3>
          <button onClick={onClose} style={{
            background: 'rgba(255, 255, 255, 0.05)', border: 'none',
            borderRadius: '50%', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#9ca3af', transition: 'all 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}>
            <span style={{ fontSize: '20px', fontWeight: '700' }}>X</span>
          </button>
        </div>
      )}

      {/* Header (Original Header for content when not panel, or just the badge for panel) */}
      <div style={{ display: 'flex', justifyContent: isPanel ? 'flex-start' : 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '8px 16px', borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${formData.color || actionDisplay.color}`,
            width: 'fit-content'
          }}>
            <span style={{ color: formData.color || actionDisplay.color }}>{actionDisplay.icon}</span>
            <span style={{ fontWeight: '600', color: '#f3f4f6', textTransform: 'capitalize' }}>
              {formData.action}
            </span>
          </div>
          {formData.chatid && (() => {
            const chatName = getChatName(formData.chatid);
            if (chatName) {
              return (
                <span style={{ fontSize: '14px', color: '#cbd5e1', fontWeight: '500', paddingLeft: '4px' }}>
                  in {chatName}
                </span>
              );
            }
            return null;
          })()}
        </div>
        {!isPanel && (
          <button onClick={onClose} style={{
            background: 'rgba(255, 255, 255, 0.05)', border: 'none',
            borderRadius: '50%', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#9ca3af', transition: 'all 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}>
            <span style={{ fontSize: '20px', fontWeight: '700' }}>X</span>
          </button>
        )}
      </div>

      {/* Title Input */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase' }}>
          Event Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="What's happening?"
          style={{
            width: '100%', padding: '14px 16px', borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f3f4f6', fontSize: '18px', fontWeight: '600', outline: 'none',
            transition: 'all 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = actionDisplay.color}
          onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
        />
      </div>

      {/* Description */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase' }}>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Add some details..."
          style={{
            width: '100%', padding: '14px 16px', borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#d1d5db', fontSize: '14px', lineHeight: '1.6', outline: 'none',
            minHeight: '80px', resize: 'none', transition: 'all 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = actionDisplay.color}
          onBlur={e => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
        />
      </div>

      {/* Date & Time Section */}
      <div style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.03)', 
        borderRadius: '16px', padding: '20px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        marginBottom: '28px'
      }}>
        {!formData.isAdded ? (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Calendar size={16} color="#9ca3af" />
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af' }}>DATE</span>
            </div>
            <input
              type="date"
              value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
              onChange={(e) => handleChange('date', e.target.value)}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                backgroundColor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f3f4f6', colorScheme: 'dark', cursor: 'pointer'
              }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Calendar size={16} color={actionDisplay.color} />
              <span style={{ fontSize: '13px', fontWeight: '700', color: actionDisplay.color }}>{formatDate(formData.date)}</span>
            </div>
          </div>
        )}

        {!isEditingTime ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Clock size={16} color="#9ca3af" />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px', color: '#f3f4f6', fontWeight: '500' }}>{formatTime(formData.startTime)}</span>
                {formData.endTime && (
                  <>
                    <ArrowRight size={14} color="#6b7280" />
                    <span style={{ fontSize: '16px', color: '#f3f4f6', fontWeight: '500' }}>{formatTime(formData.endTime)}</span>
                  </>
                )}
              </div>
            </div>
            <button 
              onClick={startEditingTime}
              style={{
                padding: '6px 14px', borderRadius: '8px', 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.2)',
                fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.2)'}
            >
              Change
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                 <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>START</span>
                 <div style={{ display: 'flex', gap: '4px' }}>
                   <input type="number" value={editTime.startHour} onChange={e => setEditTime({...editTime, startHour: e.target.value})} style={timeInputStyle} placeholder="12" />
                   <input type="number" value={editTime.startMinute} onChange={e => setEditTime({...editTime, startMinute: e.target.value})} style={timeInputStyle} placeholder="00" />
                   <select value={editTime.startPeriod} onChange={e => setEditTime({...editTime, startPeriod: e.target.value})} style={timeSelectStyle}>
                     <option>AM</option><option>PM</option>
                   </select>
                 </div>
              </div>
              <div style={{ flex: 1 }}>
                 <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>END</span>
                 <div style={{ display: 'flex', gap: '4px' }}>
                   <input type="number" value={editTime.endHour} onChange={e => setEditTime({...editTime, endHour: e.target.value})} style={timeInputStyle} placeholder="01" />
                   <input type="number" value={editTime.endMinute} onChange={e => setEditTime({...editTime, endMinute: e.target.value})} style={timeInputStyle} placeholder="00" />
                   <select value={editTime.endPeriod} onChange={e => setEditTime({...editTime, endPeriod: e.target.value})} style={timeSelectStyle}>
                     <option>AM</option><option>PM</option>
                   </select>
                 </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={saveTimeChanges} style={{...smallBtnStyle, backgroundColor: '#3b82f6', color: '#fff'}}>Save Time</button>
              <button onClick={() => setIsEditingTime(false)} style={{...smallBtnStyle, backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#9ca3af'}}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: isPanel ? '40px' : '0' }}>
        {isReceived || !formData.isAdded ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {!formData.isAdded && (
              <div style={{ 
                display: 'flex', gap: '12px', padding: '12px', 
                backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: '12px'
              }}>
                <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '12px', color: '#fbbf24', margin: 0, lineHeight: '1.4' }}>
                  Confirm date and time before adding to calendar.
                </p>
              </div>
            )}
            <button 
              onClick={handleAddToggle}
              style={{
                width: '100%', padding: '16px', borderRadius: '14px',
                backgroundColor: formData.isAdded ? '#059669' : '#3b82f6',
                color: '#fff', border: 'none', fontWeight: '700', fontSize: '16px',
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {formData.isAdded ? <><Check size={20} /> Added to Calendar</> : <><Calendar size={20} /> Add to Calendar</>}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={onCancelEvent}
              style={{
                flex: 1, padding: '14px', borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)',
                fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Trash2 size={18} /> Cancel
            </button>
            <button 
              onClick={() => setShowPostponeDate(true)}
              style={{
                flex: 1, padding: '14px', borderRadius: '12px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)',
                fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}
            >
              <Clock size={18} /> Reschedule
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (isPanel) return content;

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, 
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {content}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

const timeInputStyle = {
  width: '100%', padding: '8px', borderRadius: '6px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#f3f4f6', textAlign: 'center', outline: 'none'
};

const timeSelectStyle = {
  padding: '8px', borderRadius: '6px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
  color: '#f3f4f6', outline: 'none'
};

const smallBtnStyle = {
  flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
  fontSize: '13px', fontWeight: '600', cursor: 'pointer'
};

export default EventModal;

import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Calendar,
  Clock,
  MapPin,
  X,
  Info,
  CalendarDays,
  AlignLeft,
  Navigation,
  Trash2
} from 'lucide-react';
import { getchat } from './ChatNames';
import { getChatName } from '../service/ChatUtils';
import { useEventMediator } from '../service/EventStorage';
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, useMemo, useRef } from 'react';
const SmoothCalendar = () => {

  // Get events from mediator instead of local state
  const { events, addEvent: addEventToMediator, removeEvent: removeEventFromMediator } = useEventMediator();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({ title: '', startTime: '', endTime: '', description: '', color: 'var(--accent-color)' });
  const calendarRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const colors = ['var(--accent-color)', 'var(--danger-color)', '#10b981', '#f59e0b', '#8b5cf6', '#f97316', '#06b6d4'];

  //to chatbox
  const goToMessage = (msgId, chatid) => {
    getchat(chatid);
    navigate(`/chat/${chatid}`, {
      state: {
        scrollToMsgId: msgId, // pass only message ID
      },
    });
  };

  // Helper function to format time in 12-hour format
  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Helper function to calculate duration between two times
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '';

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startTotalMinutes = startHours * 60 + startMinutes;
    let endTotalMinutes = endHours * 60 + endMinutes;

    // Handle case where end time is next day (e.g., 23:00 to 02:00)
    if (endTotalMinutes < startTotalMinutes) {
      endTotalMinutes += 24 * 60; // Add 24 hours
    }

    const durationMinutes = endTotalMinutes - startTotalMinutes;
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  // Generate years for dropdown
  const generateYears = () => {
    const years = [];
    const currentYear = new Date().getFullYear();
    // Generate 5 years: 2 years past, current year, and 2 years future
    for (let year = currentYear - 1; year <= currentYear + 12; year++) {
      years.push(year);
    }
    return years;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const [availableYears] = useState(generateYears());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatDateKey = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPastDate = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Updated addEvent function - uses mediator
  const addEvent = () => {
    if (!selectedDate || !newEvent.title || isPastDate(selectedDate)) return;

    // Use mediator's addEvent instead of local setEvents
    addEventToMediator({
      title: newEvent.title,
      date: formatDateKey(selectedDate),
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      description: newEvent.description,
      color: newEvent.color
    });

    // Reset form and close modal
    setNewEvent({ title: '', startTime: '', endTime: '', description: '', color: 'var(--accent-color)' });
    setShowAddEvent(false);
    setSelectedDate(null);
  };

  // Updated removeEvent function - uses mediator
  const removeEvent = (dateKey, eventId) => {
    // Use mediator's removeEvent
    removeEventFromMediator(eventId, dateKey);

    // Update selectedDateEvents if viewing details
    if (showEventDetails) {
      setSelectedDateEvents(prev => prev.filter(event => event.id !== eventId));
    }
  };

  const handleDateClick = (date) => {
    const dateKey = formatDateKey(date);
    const dayEvents = events[dateKey] || [];
    const isPast = isPastDate(date);

    setSelectedDate(date);

    if (dayEvents.length > 0) {
      setSelectedDateEvents(dayEvents);
      setShowEventDetails(true);
    } else if (!isPast) {
      setShowAddEvent(true);
    }
  };

  const location = useLocation();
  useEffect(() => {
    if (location.state?.selectedEventDate && Object.keys(events).length > 0) {
      const date = new Date(location.state.selectedEventDate);
      const dateKey = formatDateKey(date);
      const dayEvents = events[dateKey] || [];
      
      setSelectedMonth(date.getMonth());
      setSelectedYear(date.getFullYear());
      setSelectedDate(date);
      setSelectedDateEvents(dayEvents);
      setShowEventDetails(true);
      
      // Clear state after reading to prevent re-opening on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, events]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{
      minHeight: '100vh',
      overflowY: 'auto',
      overflowX: 'hidden',
      background: 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #000000 100%)',
      padding: isMobile ? '8px 0' : '12px 16px',
      marginTop: '10px',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      WebkitOverflowScrolling: 'touch',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');

        :root {
          --radius-curvy: 32px;
          --radius-pill: 500px;
          --accent-glow: 0 0 20px rgba(59, 130, 246, 0.4);
          --glass-bg: rgba(15, 23, 42, 0.85);
          --glass-blur: blur(24px) saturate(160%);
        }

        .calendar-title {
          font-family: 'Outfit', sans-serif;
          background: linear-gradient(to right, #60a5fa, #a855f7);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
          font-size: clamp(2rem, 8vw, 3.5rem);
          line-height: 1.2;
        }

        .glass-panel {
          background: var(--glass-bg) !important;
          backdrop-filter: var(--glass-blur) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.4) !important;
          border-radius: var(--radius-curvy) !important;
        }

        .day-circle {
          border-radius: 16px !important;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }

        .day-circle:hover {
          transform: translateY(-4px) scale(1.1) !important;
          background-color: rgba(59, 130, 246, 0.3) !important;
          border-color: #60a5fa !important;
          border-radius: var(--radius-curvy) !important;
        }

        .calendar-nav-btn {
          border-radius: 14px !important;
          transition: all 0.2s ease !important;
        }

        .calendar-nav-btn:hover {
          background-color: rgba(255, 255, 255, 0.1) !important;
          color: #fff !important;
          transform: scale(1.05);
        }

        /* --- MODAL REFINEMENTS --- */
        .modal-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: rgba(2, 6, 23, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-start;
          padding-top: 100px;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease;
        }

        .modal-card {
          width: 50%;
          minWidth: 320px;
          maxWidth: 420px;
          maxHeight: 85vh;
          overflow-y: auto;
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-curvy);
          padding: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          animation: modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .form-input {
          width: 100%;
          padding: 14px 18px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 18px;
          backgroundColor: rgba(255, 255, 255, 0.04);
          color: #fff;
          outline: none;
          transition: all 0.2s ease;
          fontSize: 15px;
          box-sizing: border-box;
        }

        .form-input:focus {
          border-color: #3b82f6;
          background-color: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
        }

        .pill-button {
          padding: 14px 24px;
          border-radius: var(--radius-pill);
          font-weight: 700;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .pill-button-primary {
          background-color: #3b82f6;
          color: #fff;
          box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.3);
        }

        .pill-button-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
          background-color: #2563eb;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalScaleUp { 
          from { transform: scale(0.9) translateY(20px); opacity: 0; } 
          to { transform: scale(1) translateY(0); opacity: 1; } 
        }

        @media (max-width: 640px) {
          .modal-card {
            padding: 20px;
            width: 95%;
            maxHeight: 85%;
          }
          .calendar-title {
            font-size: 1.6rem;
          }
        }
      `}</style>
      <div style={{ width: '100%', maxWidth: isMobile ? 'none' : '1100px', margin: '0 auto' }}>
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="calendar-title mb-1">Schedule</h1>
          <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>Manage your tasks and events</p>
        </div>

        {/* Month and Year Selectors */}
        <div style={{
          display: 'flex',
          gap: isMobile ? '8px' : '16px',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'nowrap',
          padding: isMobile ? '16px 12px' : '24px 18px',
        }}>
          {/* Month Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'rgba(31, 41, 55, 0.5)',
            borderRadius: '12px',
            padding: '6px',
            border: '1px solid rgba(75, 85, 99, 0.4)',
            backdropFilter: 'blur(8px)'
          }}>
            <button
              className="calendar-nav-btn"
              onClick={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(selectedYear - 1);
                } else {
                  setSelectedMonth(selectedMonth - 1);
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: isMobile ? '6px' : '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                outline: 'none',
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <span style={{
              color: '#fff',
              fontFamily: "'Outfit', sans-serif",
              fontSize: isMobile ? '15px' : '18px',
              fontWeight: '600',
              minWidth: isMobile ? '85px' : '110px',
              textAlign: 'center'
            }}>
              {monthNames[selectedMonth]}
            </span>

            <button
              className="calendar-nav-btn"
              onClick={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(selectedYear + 1);
                } else {
                  setSelectedMonth(selectedMonth + 1);
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: isMobile ? '6px' : '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                outline: 'none',
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Year Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'rgba(31, 41, 55, 0.5)',
            borderRadius: '12px',
            padding: '6px',
            border: '1px solid rgba(75, 85, 99, 0.4)',
            backdropFilter: 'blur(8px)'
          }}>
            <button
              className="calendar-nav-btn"
              onClick={() => setSelectedYear(selectedYear - 1)}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: isMobile ? '6px' : '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                outline: 'none',
              }}
            >
              <Minus size={18} />
            </button>

            <span style={{
              color: '#fff',
              fontFamily: "'Outfit', sans-serif",
              fontSize: isMobile ? '15px' : '18px',
              fontWeight: '600',
              minWidth: isMobile ? '55px' : '70px',
              textAlign: 'center'
            }}>
              {selectedYear}
            </span>

            <button
              className="calendar-nav-btn"
              onClick={() => setSelectedYear(selectedYear + 1)}
              style={{
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                padding: isMobile ? '6px' : '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                outline: 'none',
              }}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Calendar Container */}
        <div ref={calendarRef}>
          {(() => {
            const displayDate = new Date(selectedYear, selectedMonth, 1);
            const days = getDaysInMonth(displayDate);

            return (
              <div style={{ padding: isMobile ? '0' : '0 16px', width: '100%' }}>
                  <div
                    className="glass-panel calendar-grid-container"
                    style={{
                      width: '100%',
                      maxWidth: isMobile ? 'none' : '800px',
                      position: 'relative',
                      overflow: 'hidden',
                      padding: isMobile ? '8px 4px' : '32px',
                      transition: 'all 0.3s ease',
                      boxSizing: 'border-box'
                    }}
                  >
                  <div style={{ transition: 'all 0.3s ease', width: '100%' }}>
                    {/* Week Days Header */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'repeat(7, minmax(0, 1fr))' : 'repeat(7, 1fr)',
                        marginBottom: isMobile ? '8px' : '20px',
                        gap: isMobile ? '2px' : '4px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        paddingBottom: '12px',
                        width: '100%'
                      }}
                    >
                      {weekDays.map(day => (
                        <div
                          key={day}
                          style={{
                            textAlign: 'center',
                            fontWeight: 700,
                            color: '#9ca3af',
                            fontSize: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontFamily: "'Outfit', sans-serif"
                          }}
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Days Grid */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: isMobile ? 'repeat(7, minmax(0, 1fr))' : 'repeat(7, 1fr)', 
                      gap: isMobile ? '2px' : 'clamp(4px, 1vw, 8px)',
                      width: '100%'
                    }}>
                      {days.map((day, dayIndex) => {
                        const dateKey = formatDateKey(day);
                        const dayEvents = events[dateKey] || [];
                        const isPast = isPastDate(day);

                        const baseStyle = {
                          width: isMobile ? '100%' : '44px',
                          height: isMobile ? 'auto' : '44px',
                          aspectRatio: '1 / 1',
                          borderRadius: isMobile ? '8px' : '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: isMobile ? '13px' : '15px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          position: 'relative',
                          border: isToday(day) ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                          backgroundColor: isToday(day) ? '#3b82f6' : 'rgba(55, 65, 81, 0.3)',
                          color: isToday(day) ? '#fff' : isPast ? '#4b5563' : '#e5e7eb',
                          boxShadow: isToday(day) ? '0 0 20px rgba(59, 130, 246, 0.5)' : 'none',
                          boxSizing: 'border-box'
                        };

                        return (
                          <div
                            key={dayIndex}
                            style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}
                          >
                            {day && (
                              <div
                                className="day-circle"
                                style={baseStyle}
                                onClick={() => handleDateClick(day)}
                              >
                                {day.getDate()}

                                {/* Event Indicator Dots */}
                                {dayEvents.length > 0 && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      bottom: '6px',
                                      left: '50%',
                                      transform: 'translateX(-50%)',
                                      display: 'flex',
                                      gap: '2px',
                                    }}
                                  >
                                    {dayEvents.slice(0, 3).map((event) => (
                                      <div
                                        key={event.id}
                                        style={{
                                          width: '4px',
                                          height: '4px',
                                          borderRadius: '50%',
                                          backgroundColor: event.color,
                                          boxShadow: `0 0 4px ${event.color}`
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}
        </div>

        {/* Redesigned Centered Add Event Modal */}
        {showAddEvent && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ padding: '10px', backgroundColor: 'rgba(59, 130, 246, 0.15)', borderRadius: '16px', color: '#60a5fa' }}>
                    <Calendar size={22} />
                  </div>
                  <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', margin: 0, fontFamily: "'Outfit', sans-serif" }}>New Event</h3>
                </div>
                <button
                  onClick={() => { setShowAddEvent(false); setSelectedDate(null); }}
                  style={{
                    background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none',
                    padding: '8px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    fontSize: '18px', fontWeight: '700'
                  }}
                >
                  X
                </button>
              </div>

              <div style={{ marginBottom: '24px', paddingLeft: '4px' }}>
                <p style={{ color: '#60a5fa', margin: '0 0 4px 0', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selected Date</p>
                <p style={{ color: '#fff', margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', paddingLeft: '4px' }}>Event Title</label>
                  <input
                    className="form-input"
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Meet with the team..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', paddingLeft: '4px' }}>Start Time</label>
                    <input
                      className="form-input"
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', paddingLeft: '4px' }}>End Time</label>
                    <input
                      className="form-input"
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '8px', paddingLeft: '4px' }}>Description</label>
                  <textarea
                    className="form-input"
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    style={{ resize: 'none' }}
                    placeholder="Key talking points..."
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#94a3b8', marginBottom: '12px', paddingLeft: '4px' }}>Event Category</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewEvent(prev => ({ ...prev, color }))}
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%', border: '2px solid transparent',
                          borderColor: newEvent.color === color ? '#fff' : 'transparent',
                          backgroundColor: color, cursor: 'pointer', transition: 'all 0.2s',
                          transform: newEvent.color === color ? 'scale(1.15)' : 'scale(1)',
                          boxShadow: newEvent.color === color ? `0 0 12px ${color}` : 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    className="pill-button"
                    style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                    onClick={() => { setShowAddEvent(false); setSelectedDate(null); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="pill-button pill-button-primary"
                    style={{ flex: 1.5 }}
                    onClick={addEvent}
                    disabled={!newEvent.title}
                  >
                    <Plus size={18} /> Create Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Redesigned Centered Event Details Modal */}
        {showEventDetails && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ padding: '10px', backgroundColor: 'rgba(168, 85, 247, 0.15)', borderRadius: '16px', color: '#a855f7' }}>
                    <Info size={22} />
                  </div>
                  <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#fff', margin: 0, fontFamily: "'Outfit', sans-serif" }}>Agenda</h3>
                </div>
                <button
                  onClick={() => { setShowEventDetails(false); setSelectedDate(null); setSelectedDateEvents([]); }}
                  style={{
                    background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'none',
                    padding: '8px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                    fontSize: '18px', fontWeight: '700'
                  }}
                >
                  X
                </button>
              </div>

              <div style={{ marginBottom: '24px', paddingLeft: '4px' }}>
                <p style={{ color: '#a855f7', margin: '0 0 4px 0', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</p>
                <p style={{ color: '#fff', margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => { if (event.chatid) goToMessage(event.msgref, event.chatid); }}
                    style={{
                      padding: '20px', borderRadius: '24px', backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.05)', position: 'relative', overflow: 'hidden',
                      cursor: event.chatid ? 'pointer' : 'default',
                      transition: 'background-color 0.2s ease, border-color 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (event.chatid) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = event.color;
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                    }}
                  >
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: event.color, boxShadow: `0 0 10px ${event.color}` }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ fontWeight: '700', color: '#fff', margin: 0, fontSize: '18px' }}>
                          {event.title}
                        </h4>
                        {event.chatid && (() => {
                          const chatName = getChatName(event.chatid);
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
                      <button
                        onClick={(e) => { e.stopPropagation(); removeEvent(formatDateKey(selectedDate), event.id); }}
                        style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', padding: '6px', borderRadius: '10px', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {(event.startTime || event.time) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#94a3b8', marginBottom: '12px' }}>
                        <Clock size={14} />
                        <span>{formatTime(event.startTime || event.time)}{event.endTime ? ` - ${formatTime(event.endTime)}` : ''}</span>
                      </div>
                    )}

                    {event.description && (
                      <div style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', padding: '12px', backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: '16px' }}>
                        {event.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                {!isPastDate(selectedDate) && (
                  <button
                    className="pill-button pill-button-primary"
                    style={{ flex: 1 }}
                    onClick={() => { setShowEventDetails(false); setShowAddEvent(true); }}
                  >
                    Add More
                  </button>
                )}
                <button
                  className="pill-button"
                  style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  onClick={() => { setShowEventDetails(false); setSelectedDate(null); setSelectedDateEvents([]); }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmoothCalendar;
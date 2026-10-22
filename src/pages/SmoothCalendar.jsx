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
  Trash2,
  ArrowLeft,
  Bell,
  Check,
  Video,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import { getchat } from './ChatNames';
import { getChatName } from '../service/ChatUtils';
import { useEventMediator } from '../service/EventStorage';
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { API } from '../service/UserAuth';
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

  // Bookings Notification & Negotiation states
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  const [bookingsList, setBookingsList] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all', 'pending', 'confirmed'
  const [activeBookingAction, setActiveBookingAction] = useState(null); // { booking, actionType: 'reschedule' | 'location' | 'cancel' }
  const [actionMessage, setActionMessage] = useState('');
  const [rescheduleData, setRescheduleData] = useState({ date: new Date().toISOString().split('T')[0], time: '10:00', duration: 60 });
  const [locationData, setLocationData] = useState({ type: 'online', link: '', address: '' });
  const [submittingAction, setSubmittingAction] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);

  const fetchUserBookings = async () => {
    const uid = localStorage.getItem('userid');
    if (!uid) return;
    setLoadingBookings(true);
    try {
      const res = await fetch(`${API}/user/event/bookings`, {
        headers: { 'User-Id': uid }
      });
      if (res.ok) {
        const data = await res.json();
        setBookingsList(data || []);
      }
    } catch (e) {
      console.error('Failed to load bookings:', e);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchUserBookings();

    const handleBookingEvents = () => {
      fetchUserBookings();
    };

    window.addEventListener('letschat_booking_request', handleBookingEvents);
    window.addEventListener('letschat_booking_update', handleBookingEvents);
    return () => {
      window.removeEventListener('letschat_booking_request', handleBookingEvents);
      window.removeEventListener('letschat_booking_update', handleBookingEvents);
    };
  }, []);

  const pendingBookingsCount = useMemo(() => {
    return bookingsList.filter(b => {
      if (b.externalStatus === 'cancelled') return false;
      if (b.isHost && (b.externalStatus === 'pending' || b.externalStatus === 'proposed_by_guest')) return true;
      if (!b.isHost && (b.externalStatus === 'proposed_by_host' || b.externalStatus === 'location_changed_by_host')) return true;
      return false;
    }).length;
  }, [bookingsList]);

  const filteredBookings = useMemo(() => {
    if (bookingFilter === 'pending') {
      return bookingsList.filter(b => {
        if (b.externalStatus === 'cancelled') return false;
        if (b.isHost && (b.externalStatus === 'pending' || b.externalStatus === 'proposed_by_guest')) return true;
        if (!b.isHost && (b.externalStatus === 'proposed_by_host' || b.externalStatus === 'location_changed_by_host')) return true;
        return false;
      });
    }
    if (bookingFilter === 'confirmed') {
      return bookingsList.filter(b => b.externalStatus === 'approved');
    }
    return bookingsList;
  }, [bookingsList, bookingFilter]);

  const handleBookingResponse = async (booking, action, extraPayload = {}) => {
    setSubmittingAction(true);
    const uid = localStorage.getItem('userid');
    try {
      const identifier = booking.bookingToken || booking.eventId;
      const res = await fetch(`${API}/booking/respond/${identifier}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': uid
        },
        body: JSON.stringify({
          action,
          message: actionMessage.trim() || undefined,
          ...extraPayload
        })
      });
      if (res.ok) {
        setActiveBookingAction(null);
        setActionMessage('');
        await fetchUserBookings();
      } else {
        const data = await res.json();
        alert(data.message || 'Action failed');
      }
    } catch (e) {
      console.error('Action error:', e);
      alert('Error updating booking');
    } finally {
      setSubmittingAction(false);
    }
  };

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
      background: 'var(--bg-primary)',
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
          --glass-bg: var(--bg-card);
          --glass-blur: blur(24px) saturate(160%);
        }

        .calendar-title {
          font-family: 'Outfit', sans-serif;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 700;
          font-size: clamp(2rem, 8vw, 3.5rem);
          line-height: 1.2;
        }

        .glass-panel {
          background: var(--bg-card) !important;
          backdrop-filter: var(--glass-blur) !important;
          border: 1px solid var(--border-color) !important;
          box-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.2) !important;
          border-radius: var(--radius-curvy) !important;
        }

        .day-circle {
          border-radius: 16px !important;
          transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        }

        .day-circle:hover {
          transform: translateY(-4px) scale(1.1) !important;
          background-color: var(--nav-active-bg) !important;
          border-color: var(--accent-color) !important;
          border-radius: var(--radius-curvy) !important;
        }

        .calendar-nav-btn {
          border-radius: 14px !important;
          transition: all 0.2s ease !important;
        }

        .calendar-nav-btn:hover {
          background-color: var(--nav-active-bg) !important;
          color: var(--text-primary) !important;
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
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '20px',
          padding: isMobile ? '0 12px' : '0'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            title="Go back"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--nav-active-bg)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
          >
            <ArrowLeft size={20} />
          </button>

          <div style={{ flex: 1, textAlign: isMobile ? 'left' : 'center' }}>
            <h1 className="calendar-title mb-1" style={{ margin: 0 }}>Schedule</h1>
            <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '500', margin: 0 }}>Manage your tasks and events</p>
          </div>

          <button
            onClick={() => setShowBookingsModal(true)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: pendingBookingsCount > 0 ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
              border: pendingBookingsCount > 0 ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-color)',
              color: pendingBookingsCount > 0 ? '#818cf8' : 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            title="Meeting Booking Notifications"
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--nav-active-bg)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = pendingBookingsCount > 0 ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)'}
          >
            <Bell size={20} />
            {pendingBookingsCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: '800',
                borderRadius: '10px',
                minWidth: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)'
              }}>
                {pendingBookingsCount}
              </span>
            )}
          </button>
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
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '6px',
            border: '1px solid var(--border-color)',
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
                color: 'var(--text-secondary)',
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
              color: 'var(--text-primary)',
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
                color: 'var(--text-secondary)',
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
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '6px',
            border: '1px solid var(--border-color)',
            backdropFilter: 'blur(8px)'
          }}>
            <button
              className="calendar-nav-btn"
              onClick={() => setSelectedYear(selectedYear - 1)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
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
              color: 'var(--text-primary)',
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
                color: 'var(--text-secondary)',
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
                        borderBottom: '1px solid var(--border-color)',
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
                            color: 'var(--text-secondary)',
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
                          border: isToday(day) ? 'none' : '1px solid var(--border-color)',
                          backgroundColor: isToday(day) ? 'var(--accent-color)' : 'var(--bg-card)',
                          color: isToday(day) ? '#fff' : isPast ? 'var(--text-muted)' : 'var(--text-primary)',
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

        {/* Meeting Bookings & Schedules Drawer/Modal */}
        {showBookingsModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '580px',
              maxHeight: '90vh',
              backgroundColor: '#131b2a',
              borderRadius: '24px',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              overflow: 'hidden'
            }}>
              {/* Drawer Header */}
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#162235'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818cf8'
                  }}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
                      Meeting Bookings
                    </h2>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Incoming requests and scheduled meetings
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={fetchUserBookings}
                    style={{
                      background: 'none',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      color: '#94a3b8',
                      padding: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Refresh bookings"
                  >
                    <RefreshCw size={16} className={loadingBookings ? "spin-animate" : ""} />
                  </button>
                  <button
                    onClick={() => { setShowBookingsModal(false); setActiveBookingAction(null); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{
                display: 'flex',
                gap: '8px',
                padding: '12px 24px',
                borderBottom: '1px solid #1e293b',
                backgroundColor: '#111827'
              }}>
                <button
                  onClick={() => setBookingFilter('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: bookingFilter === 'all' ? '#6366f1' : 'rgba(255,255,255,0.06)',
                    color: bookingFilter === 'all' ? '#ffffff' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  All ({bookingsList.length})
                </button>
                <button
                  onClick={() => setBookingFilter('pending')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: bookingFilter === 'pending' ? '#f59e0b' : 'rgba(255,255,255,0.06)',
                    color: bookingFilter === 'pending' ? '#ffffff' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Pending Actions ({pendingBookingsCount})
                </button>
                <button
                  onClick={() => setBookingFilter('confirmed')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: 'none',
                    backgroundColor: bookingFilter === 'confirmed' ? '#10b981' : 'rgba(255,255,255,0.06)',
                    color: bookingFilter === 'confirmed' ? '#ffffff' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Confirmed ({bookingsList.filter(b => b.externalStatus === 'approved').length})
                </button>
              </div>

              {/* Bookings List Body */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                {loadingBookings ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>Loading bookings...</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                    <Calendar size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <h4 style={{ margin: '0 0 6px 0', color: '#94a3b8', fontSize: '15px' }}>No bookings found</h4>
                    <p style={{ margin: 0, fontSize: '13px', maxWidth: '300px', marginInline: 'auto' }}>
                      {bookingFilter === 'pending' ? 'No pending requests requiring your response.' : 'Your meeting requests will appear here.'}
                    </p>
                  </div>
                ) : (
                  filteredBookings.map(b => {
                    const isPendingAction = (b.isHost && (b.externalStatus === 'pending' || b.externalStatus === 'proposed_by_guest')) || (!b.isHost && b.externalStatus === 'proposed_by_host');
                    const isApproved = b.externalStatus === 'approved';
                    const isCancelled = b.externalStatus === 'cancelled';

                    return (
                      <div
                        key={b.eventId || b.bookingToken}
                        style={{
                          backgroundColor: '#1a2333',
                          border: isPendingAction ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid #232e42',
                          borderRadius: '16px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        {/* Title and Status Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
                              {b.eventTitle || 'Meeting Request'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                              {b.isHost ? 'Guest: ' : 'Host: '}
                              <strong style={{ color: '#cbd5e1' }}>{b.otherPartyName || 'Participant'}</strong>
                              {b.otherPartyEmail && <span style={{ color: '#64748b' }}> ({b.otherPartyEmail})</span>}
                            </div>
                          </div>
                          <div>
                            {b.externalStatus === 'approved' && (
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                Confirmed
                              </span>
                            )}
                            {b.externalStatus === 'pending' && (
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                Pending
                              </span>
                            )}
                            {b.externalStatus === 'proposed_by_guest' && (
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#60a5fa', backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                Guest Proposed Time
                              </span>
                            )}
                            {b.externalStatus === 'proposed_by_host' && (
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', backgroundColor: 'rgba(139, 92, 246, 0.15)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                Host Proposed Time
                              </span>
                            )}
                            {b.externalStatus === 'cancelled' && (
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.15)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                Cancelled
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Note / Message */}
                        {b.changeMessage && (
                          <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: '#cbd5e1', borderLeft: '3px solid #6366f1' }}>
                            <strong style={{ color: '#818cf8' }}>Note ({b.lastModifiedBy || 'Update'}):</strong> {b.changeMessage}
                          </div>
                        )}

                        {/* Date, Time & Location Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={13} color="#818cf8" />
                            <span style={{ color: '#e2e8f0' }}>
                              {new Date(b.startTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {' - '}
                              {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {b.meetingType === 'online' ? <Video size={13} color="#34d399" /> : <MapPin size={13} color="#fbbf24" />}
                            <span>
                              {b.meetingType === 'online'
                                ? (b.meetingLink ? <a href={b.meetingLink.startsWith('http') ? b.meetingLink : `https://${b.meetingLink}`} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>{b.meetingLink}</a> : 'Virtual Meeting')
                                : (b.location || 'In-Person Location')}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {!isCancelled && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            {isPendingAction && (
                              <button
                                onClick={() => handleBookingResponse(b, 'ACCEPT')}
                                disabled={submittingAction}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: '#10b981',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontWeight: '700',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Check size={13} /> Accept
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setActiveBookingAction({ booking: b, actionType: 'reschedule' });
                                const d = new Date(b.startTime);
                                setRescheduleData({
                                  date: d.toISOString().split('T')[0],
                                  time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
                                  duration: 60
                                });
                              }}
                              disabled={submittingAction}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                backgroundColor: '#334155',
                                color: '#f8fafc',
                                border: '1px solid #475569',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Clock size={13} /> Propose Time
                            </button>

                            <button
                              onClick={() => {
                                setActiveBookingAction({ booking: b, actionType: 'location' });
                                setLocationData({
                                  type: b.meetingType || 'online',
                                  link: b.meetingLink || '',
                                  address: b.location || ''
                                });
                              }}
                              disabled={submittingAction}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                backgroundColor: '#334155',
                                color: '#f8fafc',
                                border: '1px solid #475569',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <MapPin size={13} /> Location
                            </button>

                            <button
                              onClick={() => {
                                setActiveBookingAction({ booking: b, actionType: 'cancel' });
                              }}
                              disabled={submittingAction}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                fontWeight: '600',
                                fontSize: '12px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <X size={13} /> {isPendingAction ? 'Decline' : 'Cancel'}
                            </button>

                            {b.bookingToken && (
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/booking/view/${b.bookingToken}`;
                                  navigator.clipboard.writeText(url);
                                  setCopiedToken(b.bookingToken);
                                  setTimeout(() => setCopiedToken(null), 2000);
                                }}
                                style={{
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  backgroundColor: 'rgba(255,255,255,0.06)',
                                  color: copiedToken === b.bookingToken ? '#10b981' : '#cbd5e1',
                                  border: '1px solid #334155',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                  marginLeft: 'auto'
                                }}
                                title="Copy public management link"
                              >
                                {copiedToken === b.bookingToken ? 'Copied Link!' : 'Share Link'}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Dialog: Reschedule / Propose Time */}
        {activeBookingAction?.actionType === 'reschedule' && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
            <div style={{ backgroundColor: '#161e2e', border: '1px solid #374151', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#f8fafc' }}>Propose Different Time</h3>
                <button onClick={() => setActiveBookingAction(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Date</label>
                <input
                  type="date"
                  value={rescheduleData.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setRescheduleData(prev => ({ ...prev, date: e.target.value }))}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Start Time</label>
                  <input
                    type="time"
                    value={rescheduleData.time}
                    onChange={e => setRescheduleData(prev => ({ ...prev, time: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Duration</label>
                  <select
                    value={rescheduleData.duration}
                    onChange={e => setRescheduleData(prev => ({ ...prev, duration: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
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
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Note / Reason (Optional)</label>
                <textarea
                  placeholder="e.g., Let's move our discussion to this slot."
                  rows={2}
                  value={actionMessage}
                  onChange={e => setActionMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setActiveBookingAction(null)} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#334155', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={() => {
                    const [h, m] = rescheduleData.time.split(':').map(Number);
                    const totalM = h * 60 + m + rescheduleData.duration;
                    const endH = Math.floor(totalM / 60) % 24;
                    const endM = totalM % 60;
                    const endT = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                    const startIso = new Date(`${rescheduleData.date}T${rescheduleData.time}:00`).toISOString();
                    const endIso = new Date(`${rescheduleData.date}T${endT}:00`).toISOString();

                    handleBookingResponse(activeBookingAction.booking, 'PROPOSE_TIME', {
                      startTime: startIso,
                      endTime: endIso
                    });
                  }}
                  disabled={submittingAction}
                  style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#6366f1', color: '#ffffff', border: 'none', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submittingAction ? 'Proposing...' : 'Submit Proposal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Dialog: Location */}
        {activeBookingAction?.actionType === 'location' && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
            <div style={{ backgroundColor: '#161e2e', border: '1px solid #374151', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '420px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#f8fafc' }}>Update Meeting Location</h3>
                <button onClick={() => setActiveBookingAction(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={18} /></button>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  onClick={() => setLocationData(prev => ({ ...prev, type: 'online' }))}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: locationData.type === 'online' ? '2px solid #6366f1' : '1px solid #334155', backgroundColor: locationData.type === 'online' ? 'rgba(99, 102, 241, 0.15)' : '#0f172a', color: '#f8fafc', fontSize: '13px', cursor: 'pointer' }}
                >
                  Online / Video
                </button>
                <button
                  onClick={() => setLocationData(prev => ({ ...prev, type: 'offline' }))}
                  style={{ flex: 1, padding: '8px', borderRadius: '8px', border: locationData.type === 'offline' ? '2px solid #6366f1' : '1px solid #334155', backgroundColor: locationData.type === 'offline' ? 'rgba(99, 102, 241, 0.15)' : '#0f172a', color: '#f8fafc', fontSize: '13px', cursor: 'pointer' }}
                >
                  In-Person / Physical
                </button>
              </div>
              {locationData.type === 'online' ? (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Meeting Link</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={locationData.link}
                    onChange={e => setLocationData(prev => ({ ...prev, link: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Address / Location Name</label>
                  <input
                    type="text"
                    placeholder="Office Room 2A / Address..."
                    value={locationData.address}
                    onChange={e => setLocationData(prev => ({ ...prev, address: e.target.value }))}
                    style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px' }}
                  />
                </div>
              )}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Note (Optional)</label>
                <textarea
                  placeholder="e.g., Updated link or venue."
                  rows={2}
                  value={actionMessage}
                  onChange={e => setActionMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setActiveBookingAction(null)} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#334155', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={() => {
                    handleBookingResponse(activeBookingAction.booking, 'CHANGE_LOCATION', {
                      meetingType: locationData.type,
                      meetingLink: locationData.type === 'online' ? locationData.link.trim() : null,
                      location: locationData.type === 'offline' ? locationData.address.trim() : null
                    });
                  }}
                  disabled={submittingAction}
                  style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#6366f1', color: '#ffffff', border: 'none', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submittingAction ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Dialog: Cancel */}
        {activeBookingAction?.actionType === 'cancel' && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '16px' }}>
            <div style={{ backgroundColor: '#161e2e', border: '1px solid #374151', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '700', color: '#ef4444' }}>Cancel Meeting?</h3>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: '0 0 14px 0', lineHeight: '1.5' }}>
                Are you sure you want to cancel or decline this meeting?
              </p>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>Reason (Optional)</label>
                <textarea
                  placeholder="Provide reason for cancellation..."
                  rows={2}
                  value={actionMessage}
                  onChange={e => setActionMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', backgroundColor: '#0f172a', border: '1px solid #334155', color: '#f8fafc', fontSize: '13px', resize: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setActiveBookingAction(null)} style={{ padding: '8px 14px', borderRadius: '8px', backgroundColor: '#334155', color: '#cbd5e1', border: 'none', cursor: 'pointer' }}>Keep</button>
                <button
                  onClick={() => {
                    handleBookingResponse(activeBookingAction.booking, 'CANCEL');
                  }}
                  disabled={submittingAction}
                  style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#ef4444', color: '#ffffff', border: 'none', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submittingAction ? 'Cancelling...' : 'Confirm'}
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
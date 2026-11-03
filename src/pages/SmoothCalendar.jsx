import useIsDesktop from '../hooks/useIsDesktop';
import { useToast } from '../components/common/ToastProvider';
import { useConfirm } from '../components/common/ConfirmProvider';
import useBackClose from '../hooks/useBackClose';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  MessageSquare,
  Link2,
  Copy,
  Pencil
} from 'lucide-react';
import { getchat } from './ChatNames';
import { getChatName } from '../service/ChatUtils';
import { useEventMediator } from '../service/EventStorage';
import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { API } from '../service/UserAuth';
import { badgeStore, useBadges } from '../service/BadgeStore';

const SmoothCalendar = () => {
  const { bellUnread } = useBadges();

  // Clear calendar unread badge on mount
  useEffect(() => {
    badgeStore.clearCalendarUnread();
  }, []);

  // Get events and mediator helpers
  const {
    events,
    addEvent: addEventToMediator,
    removeEvent: removeEventFromMediator,
    updateEvent: updateEventInMediator
  } = useEventMediator();

  const navigate = useNavigate();
  const location = useLocation();

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Desktop modal states
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showEventDetails, setShowEventDetails] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    startTime: '',
    endTime: '',
    description: '',
    color: 'var(--accent-color)'
  });

  const calendarRef = useRef(null);
  const isDesktop = useIsDesktop();
  const isMobile = !isDesktop;

  

  // Mobile Bottom Sheet states
  const [showMobileEventSheet, setShowMobileEventSheet] = useState(false);
  const [mobileSheetMode, setMobileSheetMode] = useState('add'); // 'add' | 'edit'
  const [editingEvent, setEditingEvent] = useState(null);
  const [mobileForm, setMobileForm] = useState({
    title: '',
    startTime: '',
    endTime: '',
    description: '',
    color: 'var(--accent-color)'
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [expandedEventId, setExpandedEventId] = useState(null);

  // Local Confirm Dialog state
  // confirmDialog replaced by shared useConfirm()

  // Shared toast and confirm hooks
  const toast = useToast();
  const confirm = useConfirm();

  const showToast = useCallback((message, type = 'success') => {
    if (type === 'error') toast.error(message);
    else if (type === 'info') toast.info(message);
    else toast.success(message);
  }, [toast]);

  // Bookings Notification & Negotiation states
  const [showBookingsModal, setShowBookingsModal] = useState(false);
  useBackClose(isMobile && showMonthPicker, () => setShowMonthPicker(false));
  useBackClose(isMobile && showMobileEventSheet, () => setShowMobileEventSheet(false));
  useBackClose(!isMobile && showAddEvent, () => setShowAddEvent(false));
  useBackClose(!isMobile && showEventDetails, () => setShowEventDetails(false));
  useBackClose(showBookingsModal, () => setShowBookingsModal(false));
  
  const [bookingsList, setBookingsList] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all', 'pending', 'confirmed'
  const [activeBookingAction, setActiveBookingAction] = useState(null); // { booking, actionType: 'reschedule' | 'location' | 'cancel' }
  const [actionMessage, setActionMessage] = useState('');
  const [rescheduleData, setRescheduleData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    duration: 60
  });
  const [locationData, setLocationData] = useState({ type: 'online', link: '', address: '' });
  const [submittingAction, setSubmittingAction] = useState(false);
  const [copiedToken, setCopiedToken] = useState(null);
  const [copiedMeetingLink, setCopiedMeetingLink] = useState(false);

  const colors = useMemo(() => [
    'var(--accent-color)',
    'var(--danger-color)',
    '#10b981',
    '#f59e0b',
    '#8b5cf6',
    '#f97316',
    '#06b6d4'
  ], []);

  const monthNames = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const weekDays = useMemo(() => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], []);

  const constructBookingUrl = (slug) => {
    const cleanSlug = (slug || '').trim().replace(/^@/, '');
    const envUrl = import.meta.env.VITE_FRONTEND_URL;
    if (envUrl) {
      const base = envUrl.replace(/\/$/, '');
      return base.includes('#') ? `${base}/book/${cleanSlug}` : `${base}/#/book/${cleanSlug}`;
    }
    const base = `${window.location.origin}${import.meta.env.BASE_URL || '/'}`.replace(/\/$/, '');
    return `${base}/#/book/${cleanSlug}`;
  };

  const handleCopyMeetingLink = (e) => {
    e?.stopPropagation();
    const permanentUsername = (localStorage.getItem('username') || localStorage.getItem('userid') || '').toLowerCase();
    const meetingUrl = constructBookingUrl(permanentUsername);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(meetingUrl);
      setCopiedMeetingLink(true);
      setTimeout(() => setCopiedMeetingLink(false), 2500);
    }
  };

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
        showToast('Booking updated successfully', 'success');
        await fetchUserBookings();
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || 'Action failed', 'error');
      }
    } catch (e) {
      console.error('Action error:', e);
      showToast('Error updating booking', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Navigate to chat message
  const goToMessage = (msgId, chatid, event = null) => {
    getchat(chatid);
    navigate(`/chat/${chatid}`, {
      state: {
        scrollToMsgId: msgId,
        openGroupCalendar: true,
        selectedEvent: event ? { ...event, chatid, isGroup: true } : undefined
      }
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

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  const formatDateKey = (date) => {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
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

  // Add event function for desktop modal
  const addEvent = () => {
    if (!selectedDate || !newEvent.title || isPastDate(selectedDate)) return;

    addEventToMediator({
      title: newEvent.title,
      date: formatDateKey(selectedDate),
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      description: newEvent.description,
      color: newEvent.color
    });

    setNewEvent({ title: '', startTime: '', endTime: '', description: '', color: 'var(--accent-color)' });
    setShowAddEvent(false);
    showToast('Event created', 'success');
  };

  // Remove event function
  const removeEvent = (dateKey, eventId) => {
    removeEventFromMediator(eventId, dateKey);
    if (showEventDetails) {
      setSelectedDateEvents(prev => prev.filter(event => event.id !== eventId));
    }
    showToast('Event removed', 'info');
  };

  // Desktop date click
  const handleDateClick = (date) => {
    if (!date) return;
    const dateKey = formatDateKey(date);
    const dayEvents = events[dateKey] || [];
    const isPast = isPastDate(date);

    setSelectedDate(date);

    if (isMobile) {
      // Mobile: only selects the date, does NOT open modals
      return;
    }

    if (dayEvents.length > 0) {
      setSelectedDateEvents(dayEvents);
      setShowEventDetails(true);
    } else if (!isPast) {
      setShowAddEvent(true);
    }
  };

  // Location state navigation (e.g. from chat or notification)
  useEffect(() => {
    if (location.state?.selectedEventDate && Object.keys(events).length > 0) {
      const date = new Date(location.state.selectedEventDate);
      const dateKey = formatDateKey(date);
      const dayEvents = events[dateKey] || [];

      setSelectedMonth(date.getMonth());
      setSelectedYear(date.getFullYear());
      setSelectedDate(date);

      if (isMobile) {
        if (location.state?.selectedEvent?.id) {
          setExpandedEventId(location.state.selectedEvent.id);
        }
      } else {
        setSelectedDateEvents(dayEvents);
        setShowEventDetails(true);
      }

      window.history.replaceState({}, document.title);
    }
  }, [location.state, events, isMobile]);

  // Deep-link auto-open for event info
  useEffect(() => {
    const rawSearch = location.search || (location.hash && location.hash.includes('?') ? '?' + location.hash.split('?')[1] : '');
    const searchParams = new URLSearchParams(rawSearch);
    const deepEventId = searchParams.get('eventId');
    const viewInfo = searchParams.get('viewInfo');

    if (deepEventId && viewInfo === 'true') {
      console.log("[SmoothCalendar] Deep linking to event:", deepEventId);

      const openFoundEvent = (found) => {
        if (!found) return;
        const eventDate = new Date(found.date || found.startTime);
        setSelectedMonth(eventDate.getMonth());
        setSelectedYear(eventDate.getFullYear());
        setSelectedDate(eventDate);

        if (isMobile) {
          setExpandedEventId(found.id);
          setTimeout(() => {
            const el = document.getElementById(`agenda-event-${found.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 350);
        } else {
          setSelectedDateEvents([found]);
          setShowEventDetails(true);
        }
        navigate('/calendar', { replace: true });
      };

      let foundEvent = null;
      for (const d in events) {
        const ev = (events[d] || []).find(e => String(e.id) === String(deepEventId));
        if (ev) {
          foundEvent = ev;
          break;
        }
      }

      if (foundEvent) {
        openFoundEvent(foundEvent);
      } else {
        const uid = localStorage.getItem('userid');
        if (uid) {
          fetch(`${API}/user/getevents/${uid}`)
            .then(res => res.json())
            .then(data => {
              const matching = (data || []).find(e => String(e.eventId) === String(deepEventId));
              if (matching) {
                const parseDateVal = (val) => {
                  if (!val) return null;
                  if (typeof val === 'number') return new Date(val < 1e11 ? val * 1000 : val);
                  if (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val.trim())) {
                    const num = parseFloat(val.trim());
                    return new Date(num < 1e11 ? num * 1000 : num);
                  }
                  const d = new Date(val);
                  return isNaN(d.getTime()) ? null : d;
                };
                const sDate = parseDateVal(matching.startTime);
                const eDate = parseDateVal(matching.endTime);
                const tim = sDate ? sDate.toISOString() : new Date().toISOString();
                const evet = {
                  id: matching.eventId,
                  title: matching.eventTitle,
                  date: tim,
                  startTime: sDate ? sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
                  endTime: eDate ? eDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '',
                  description: matching.eventDetails || '',
                  color: matching.eventColor || 'var(--accent-text)',
                  msgref: matching.msgId || '',
                  chatid: matching.chatId || '',
                  action: matching.action,
                  creatorId: matching.creatorId,
                  creatorName: matching.creatorName
                };
                openFoundEvent(evet);
              }
            })
            .catch(err => console.error("Error fetching event for deep-link:", err));
        }
      }
    }
  }, [location, events, navigate, isMobile]);

  // Mobile Sheet open helpers
  const openMobileAddSheet = () => {
    setMobileSheetMode('add');
    setEditingEvent(null);
    setMobileForm({
      title: '',
      startTime: '',
      endTime: '',
      description: '',
      color: 'var(--accent-color)'
    });
    setShowMobileEventSheet(true);
  };

  const openMobileEditSheet = (event) => {
    setMobileSheetMode('edit');
    setEditingEvent(event);
    setMobileForm({
      title: event.title || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      description: event.description || '',
      color: event.color || 'var(--accent-color)'
    });
    setShowMobileEventSheet(true);
  };

  // Mobile Save handler (add or edit)
  const handleMobileSaveEvent = async () => {
    if (!mobileForm.title.trim()) return;

    const targetDate = selectedDate || new Date();
    const dateKey = formatDateKey(targetDate);

    if (mobileSheetMode === 'add') {
      addEventToMediator({
        title: mobileForm.title.trim(),
        date: dateKey,
        startTime: mobileForm.startTime,
        endTime: mobileForm.endTime,
        description: mobileForm.description.trim(),
        color: mobileForm.color
      });
      setShowMobileEventSheet(false);
      showToast('Event created', 'success');
    } else if (mobileSheetMode === 'edit' && editingEvent) {
      try {
        const updatedEvent = {
          ...editingEvent,
          title: mobileForm.title.trim(),
          startTime: mobileForm.startTime,
          endTime: mobileForm.endTime,
          description: mobileForm.description.trim(),
          color: mobileForm.color,
          date: editingEvent.date || dateKey
        };
        await updateEventInMediator(dateKey, updatedEvent);
        setShowMobileEventSheet(false);
        showToast('Event updated', 'success');
      } catch (err) {
        console.error("Save edit error:", err);
        showToast(err.message || 'Failed to update event', 'error');
      }
    }
  };

  // Check if edit form has changed
  const isEditChanged = useMemo(() => {
    if (mobileSheetMode !== 'edit' || !editingEvent) return true;
    return (
      mobileForm.title.trim() !== (editingEvent.title || '').trim() ||
      mobileForm.startTime !== (editingEvent.startTime || '') ||
      mobileForm.endTime !== (editingEvent.endTime || '') ||
      mobileForm.description.trim() !== (editingEvent.description || '').trim() ||
      mobileForm.color !== (editingEvent.color || 'var(--accent-color)')
    );
  }, [mobileSheetMode, editingEvent, mobileForm]);

  // Handle Escape key to close mobile sheets
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowMobileEventSheet(false);
        setShowMonthPicker(false);
        setShowBookingsModal(false);
        setActiveBookingAction(null);
        setShowAddEvent(false);
        setShowEventDetails(false);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Events for currently selected date
  const selectedDateKey = formatDateKey(selectedDate || new Date());
  const currentDayEvents = useMemo(() => {
    const list = [...(events[selectedDateKey] || [])];
    return list.sort((a, b) => {
      const timeA = a.startTime || a.time || '00:00';
      const timeB = b.startTime || b.time || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [events, selectedDateKey]);

  const currentUserId = localStorage.getItem('userid');
  const currentUsername = localStorage.getItem('username');

  return (
    <div
      className="smooth-calendar-root"
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
      background: 'var(--bg-primary)',
      padding: isMobile ? '8px 0' : '12px 16px',
      paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom, 0px))' : '16px',
      marginTop: isMobile ? '0' : '10px',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      WebkitOverflowScrolling: 'touch',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Inter:wght@400;500;600&display=swap');

        .smooth-calendar-root {
          min-height: 100vh;
          min-height: 100dvh;
        }

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
          transition: all 0.2s ease !important;
        }

        @media (hover: hover) and (pointer: fine) {
          .day-circle:hover {
            transform: translateY(-4px) scale(1.1) !important;
            background-color: var(--nav-active-bg) !important;
            border-color: var(--accent-solid) !important;
            border-radius: var(--radius-curvy) !important;
          }

          .calendar-nav-btn:hover {
            background-color: var(--nav-active-bg) !important;
            color: var(--text-primary) !important;
            transform: scale(1.05);
          }

          .pill-button-primary:hover:not(:disabled) {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px color-mix(in srgb, var(--accent-solid) 45%, transparent);
            background-color: var(--accent-solid);
          }
        }

        .calendar-nav-btn {
          border-radius: 14px !important;
          transition: all 0.2s ease !important;
        }

        /* --- MODAL REFINEMENTS --- */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(2, 6, 23, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 24px 16px;
          overflow-y: auto;
          z-index: 10000;
          animation: fadeIn 0.25s ease;
          box-sizing: border-box;
        }

        @media (min-height: 600px) {
          .modal-overlay {
            align-items: center;
          }
        }

        .modal-card {
          width: 50%;
          min-width: 320px;
          max-width: 440px;
          max-height: 100vh;
          max-height: calc(100dvh - 48px);
          overflow-y: auto;
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-curvy);
          padding: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
          animation: modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-sizing: border-box;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid var(--border-color);
          border-radius: 14px;
          background-color: var(--bg-hover);
          color: var(--text-primary);
          outline: none;
          transition: all 0.2s ease;
          font-size: 15px;
          box-sizing: border-box;
        }

        @media (pointer: coarse) {
          .form-input {
            font-size: 16px !important;
          }
        }

        .form-input:focus {
          border-color: var(--accent-solid);
          background-color: var(--bg-hover);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-solid) 35%, transparent);
        }

        .pill-button {
          padding: 12px 20px;
          border-radius: var(--radius-pill);
          font-weight: 600;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
        }

        .pill-button-primary {
          background-color: var(--accent-solid);
          color: var(--text-on-accent);
          box-shadow: 0 4px 14px 0 color-mix(in srgb, var(--accent-solid) 45%, transparent);
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
            max-height: 85%;
          }
          .calendar-title {
            font-size: 1.6rem;
          }
        }

        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: isMobile ? 'none' : '1100px', margin: '0 auto' }}>

        {/* HEADER */}
        {isMobile ? (
          /* Mobile Header: One row, min-height 56px, 44x44 round buttons, solid title */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            minHeight: '56px',
            padding: '8px 12px',
            gap: '8px',
            boxSizing: 'border-box'
          }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div style={{ flex: 1, textAlign: 'left' }}>
              <h1 style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: '24px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                margin: 0,
                lineHeight: 1.2
              }}>
                Schedule
              </h1>
            </div>

            {/* Copy Meeting Link button (44x44 round) */}
            <button
              onClick={handleCopyMeetingLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: copiedMeetingLink ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                border: copiedMeetingLink ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
                color: copiedMeetingLink ? 'var(--success-color)' : 'var(--text-primary)',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title={copiedMeetingLink ? "Meeting link copied!" : "Copy Public Meeting Link"}
              aria-label="Copy meeting link"
            >
              {copiedMeetingLink ? <Check size={19} color="var(--success-color)" /> : <Link2 size={19} />}
            </button>

            {/* Bell button (44x44 round) */}
            <button
              onClick={() => {
                setShowBookingsModal(true);
                badgeStore.clearBellUnread();
              }}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: (pendingBookingsCount > 0 || bellUnread) ? 'var(--accent-tint)' : 'var(--bg-card)',
                border: (pendingBookingsCount > 0 || bellUnread) ? '1px solid var(--accent-tint-border)' : '1px solid var(--border-color)',
                color: (pendingBookingsCount > 0 || bellUnread) ? 'var(--accent-text)' : 'var(--text-primary)',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Meeting Bookings"
              aria-label="Meeting booking notifications"
            >
              <Bell size={20} />
              {pendingBookingsCount > 0 ? (
                <span style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  backgroundColor: 'var(--danger-color)',
                  color: 'var(--text-on-accent)',
                  fontSize: '11px',
                  fontWeight: '800',
                  borderRadius: '10px',
                  minWidth: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 2px 6px var(--danger-tint)'
                }}>
                  {pendingBookingsCount}
                </span>
              ) : bellUnread ? (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-solid)',
                  border: '2px solid var(--bg-card)',
                  zIndex: 5
                }} />
              ) : null}
            </button>
          </div>
        ) : (
          /* Desktop Header */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '20px',
            padding: '0'
          }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div style={{ flex: 1, textAlign: 'center' }}>
              <h1 className="calendar-title mb-1" style={{ margin: 0 }}>Schedule</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', margin: 0 }}>Manage your tasks and events</p>
            </div>

            <button
              onClick={handleCopyMeetingLink}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: copiedMeetingLink ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                border: copiedMeetingLink ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
                color: copiedMeetingLink ? 'var(--success-color)' : 'var(--text-primary)',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Copy Public Meeting Link"
              aria-label="Copy meeting link"
            >
              {copiedMeetingLink ? <Check size={19} color="var(--success-color)" /> : <Link2 size={19} />}
            </button>

            <button
              onClick={() => {
                setShowBookingsModal(true);
                badgeStore.clearBellUnread();
              }}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: (pendingBookingsCount > 0 || bellUnread) ? 'var(--accent-tint)' : 'var(--bg-card)',
                border: (pendingBookingsCount > 0 || bellUnread) ? '1px solid var(--accent-tint-border)' : '1px solid var(--border-color)',
                color: (pendingBookingsCount > 0 || bellUnread) ? 'var(--accent-text)' : 'var(--text-primary)',
                cursor: 'pointer',
                flexShrink: 0
              }}
              title="Meeting Booking Notifications"
              aria-label="Meeting booking notifications"
            >
              <Bell size={20} />
              {pendingBookingsCount > 0 ? (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: 'var(--danger-color)',
                  color: 'var(--text-on-accent)',
                  fontSize: '11px',
                  fontWeight: '800',
                  borderRadius: '10px',
                  minWidth: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 2px 6px var(--danger-tint)'
                }}>
                  {pendingBookingsCount}
                </span>
              ) : bellUnread ? (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '11px',
                  height: '11px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--accent-solid)',
                  border: '2px solid var(--bg-card)',
                  zIndex: 5
                }} />
              ) : null}
            </button>
          </div>
        )}

        {/* MONTH / YEAR NAVIGATION BAR */}
        {isMobile ? (
          /* Mobile Month Bar: single row, tappable <Month Year> on left, prev/today/next on right */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 8px 8px',
            gap: '4px',
            flexWrap: 'nowrap',
            boxSizing: 'border-box'
          }}>
            <button
              type="button"
              onClick={() => {
                setPickerYear(selectedYear);
                setShowMonthPicker(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'none',
                border: 'none',
                padding: '0 4px',
                minHeight: '44px',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(16px, 4.5vw, 20px)',
                fontWeight: '600',
                flexShrink: 1,
                minWidth: 0,
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
              aria-label="Select month and year"
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{monthNames[selectedMonth]} {selectedYear}</span>
              <ChevronDown size={18} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => {
                  const newMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
                  const newYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
                  setSelectedMonth(newMonth);
                  setSelectedYear(newYear);
                  const now = new Date();
                  if (now.getMonth() === newMonth && now.getFullYear() === newYear) {
                    setSelectedDate(now);
                  } else {
                    setSelectedDate(new Date(newYear, newMonth, 1));
                  }
                }}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                aria-label="Previous month"
              >
                <ChevronLeft size={20} />
              </button>

              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  setSelectedMonth(now.getMonth());
                  setSelectedYear(now.getFullYear());
                  setSelectedDate(now);
                }}
                style={{
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '999px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => {
                  const newMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
                  const newYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
                  setSelectedMonth(newMonth);
                  setSelectedYear(newYear);
                  const now = new Date();
                  if (now.getMonth() === newMonth && now.getFullYear() === newYear) {
                    setSelectedDate(now);
                  } else {
                    setSelectedDate(new Date(newYear, newMonth, 1));
                  }
                }}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                aria-label="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        ) : (
          /* Desktop Month & Year Selectors */
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '24px 18px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '6px',
              border: '1px solid var(--border-color)'
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
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  minWidth: '44px',
                  minHeight: '44px'
                }}
                aria-label="Previous month"
              >
                <ChevronLeft size={20} />
              </button>

              <span style={{
                color: 'var(--text-primary)',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '18px',
                fontWeight: '600',
                minWidth: '110px',
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
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  minWidth: '44px',
                  minHeight: '44px'
                }}
                aria-label="Next month"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '6px',
              border: '1px solid var(--border-color)'
            }}>
              <button
                className="calendar-nav-btn"
                onClick={() => setSelectedYear(selectedYear - 1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  minWidth: '44px',
                  minHeight: '44px'
                }}
                aria-label="Previous year"
              >
                <Minus size={18} />
              </button>

              <span style={{
                color: 'var(--text-primary)',
                fontFamily: "'Outfit', sans-serif",
                fontSize: '18px',
                fontWeight: '600',
                minWidth: '70px',
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
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  minWidth: '44px',
                  minHeight: '44px'
                }}
                aria-label="Next year"
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
        )}

        {/* CALENDAR GRID */}
        <div ref={calendarRef}>
          {(() => {
            const displayDate = new Date(selectedYear, selectedMonth, 1);
            const days = getDaysInMonth(displayDate);

            return (
              <div style={{ padding: isMobile ? '0 8px' : '0 16px', width: '100%', boxSizing: 'border-box' }}>
                <div
                  className={isMobile ? '' : 'glass-panel'}
                  style={{
                    width: '100%',
                    maxWidth: isMobile ? 'none' : '800px',
                    margin: '0 auto',
                    position: 'relative',
                    overflow: 'hidden',
                    padding: isMobile ? '0' : '32px',
                    boxSizing: 'border-box',
                    borderRadius: isMobile ? '0' : undefined,
                    border: isMobile ? 'none' : undefined,
                    boxShadow: isMobile ? 'none' : undefined,
                    backdropFilter: isMobile ? 'none' : undefined
                  }}
                >
                  {/* Weekday Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    marginBottom: isMobile ? '4px' : '20px',
                    gap: isMobile ? '2px' : '4px',
                    borderBottom: isMobile ? 'none' : '1px solid var(--border-color)',
                    paddingBottom: isMobile ? '4px' : '12px',
                    width: '100%'
                  }}>
                    {weekDays.map(day => (
                      <div
                        key={day}
                        style={{
                          textAlign: 'center',
                          fontWeight: isMobile ? 500 : 700,
                          color: isMobile ? 'var(--text-muted)' : 'var(--text-secondary)',
                          fontSize: '12px',
                          textTransform: isMobile ? 'none' : 'uppercase',
                          letterSpacing: isMobile ? 'normal' : '0.05em',
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
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    gap: isMobile ? '2px' : 'clamp(4px, 1vw, 8px)',
                    width: '100%'
                  }}>
                    {days.map((day, dayIndex) => {
                      if (!day) {
                        return (
                          <div
                            key={dayIndex}
                            style={{
                              height: isMobile ? '46px' : '44px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          />
                        );
                      }

                      const dateKey = formatDateKey(day);
                      const dayEvents = events[dateKey] || [];
                      const isPast = isPastDate(day);
                      const isDayToday = isToday(day);
                      const isSelected = selectedDate && formatDateKey(selectedDate) === dateKey;

                      if (isMobile) {
                        // Mobile Day Button: 46px high, 36px circle, up to 3 dots (5px)
                        let circleBg = 'transparent';
                        let circleColor = 'var(--text-primary)';
                        let circleBoxShadow = 'none';
                        let circleWeight = 400;

                        if (isDayToday) {
                          circleBg = 'var(--accent-solid)';
                          circleColor = 'var(--text-on-accent)';
                          circleWeight = 600;
                          if (isSelected) {
                            circleBoxShadow = '0 0 0 2px var(--bg-primary), 0 0 0 4px var(--accent-solid)';
                          }
                        } else if (isSelected) {
                          circleBoxShadow = '0 0 0 2px var(--accent-solid)';
                          circleWeight = 600;
                        } else if (isPast) {
                          circleColor = 'var(--text-muted)';
                        }

                        const ariaEvents = dayEvents.length > 0 ? `${dayEvents.length} events` : 'no events';

                        return (
                          <button
                            key={dayIndex}
                            type="button"
                            onClick={() => handleDateClick(day)}
                            style={{
                              height: '46px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              cursor: 'pointer',
                              position: 'relative',
                              outline: 'none'
                            }}
                            aria-label={`${day.getDate()} ${monthNames[day.getMonth()]}, ${ariaEvents}`}
                            aria-current={isDayToday ? 'date' : undefined}
                          >
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              backgroundColor: circleBg,
                              color: circleColor,
                              boxShadow: circleBoxShadow,
                              fontWeight: circleWeight,
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              lineHeight: 1
                            }}>
                              {day.getDate()}
                            </div>

                            {/* Up to 3 event dots, 5px diameter, 3px apart */}
                            {dayEvents.length > 0 && (
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                height: '5px',
                                marginTop: '2px'
                              }}>
                                {dayEvents.slice(0, 3).map((ev) => (
                                  <div
                                    key={ev.id}
                                    style={{
                                      width: '5px',
                                      height: '5px',
                                      borderRadius: '50%',
                                      backgroundColor: ev.color || 'var(--accent-solid)'
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      }

                      // Desktop Day Cell
                      const baseStyle = {
                        width: '44px',
                        height: '44px',
                        aspectRatio: '1 / 1',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        position: 'relative',
                        border: isDayToday ? 'none' : '1px solid var(--border-color)',
                        backgroundColor: isDayToday ? 'var(--accent-solid)' : 'var(--bg-card)',
                        color: isDayToday ? 'var(--text-on-accent)' : isPast ? 'var(--text-muted)' : 'var(--text-primary)',
                        boxShadow: isDayToday ? '0 0 20px color-mix(in srgb, var(--accent-solid) 45%, transparent)' : 'none',
                        boxSizing: 'border-box'
                      };

                      return (
                        <div
                          key={dayIndex}
                          style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}
                        >
                          <div
                            className="day-circle"
                            style={baseStyle}
                            onClick={() => handleDateClick(day)}
                          >
                            {day.getDate()}

                            {dayEvents.length > 0 && (
                              <div style={{
                                position: 'absolute',
                                bottom: '6px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                display: 'flex',
                                gap: '2px'
                              }}>
                                {dayEvents.slice(0, 3).map((event) => (
                                  <div
                                    key={event.id}
                                    style={{
                                      width: '6px',
                                      height: '6px',
                                      borderRadius: '50%',
                                      backgroundColor: event.color,
                                      boxShadow: `0 0 5px ${event.color}`
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* MOBILE AGENDA (rendered below grid on mobile) */}
        {isMobile && (
          <div style={{
            padding: '16px 16px 80px',
            boxSizing: 'border-box'
          }}>
            {/* Heading: "<Weekday>, <Mon> <day>" */}
            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '17px',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              {(selectedDate || new Date()).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })}
            </h2>

            {/* Empty state */}
            {currentDayEvents.length === 0 ? (
              <div style={{
                padding: '24px 16px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  No events
                </div>
                {!isPastDate(selectedDate || new Date()) && (
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Tap + Event to add one
                  </div>
                )}
              </div>
            ) : (
              /* Events List */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentDayEvents.map((event) => {
                  const isPersonal = !event.chatid;
                  const isExpanded = expandedEventId === event.id;
                  const canShowPencil = !isPastDate(selectedDate || new Date());
                  const chatName = event.chatid ? getChatName(event.chatid) : null;

                  // Group event permission check
                  const canEditGroup = Boolean(
                    !event.chatid ||
                    (event.creatorId && event.creatorId === currentUserId) ||
                    (event.creatorName && currentUsername && event.creatorName === currentUsername) ||
                    (!event.creatorId && !event.creatorName)
                  );

                  return (
                    <div
                      key={event.id}
                      id={`agenda-event-${event.id}`}
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        padding: '4px 4px 4px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        boxSizing: 'border-box'
                      }}
                    >
                      {/* Left: 4px color bar */}
                      <div style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '4px',
                        backgroundColor: event.color || 'var(--accent-solid)'
                      }} />

                      {/* Middle: toggle or navigate */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (isPersonal) {
                            setExpandedEventId(isExpanded ? null : event.id);
                          } else {
                            goToMessage(event.msgref, event.chatid, event);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            if (isPersonal) setExpandedEventId(isExpanded ? null : event.id);
                            else goToMessage(event.msgref, event.chatid, event);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '10px 8px 10px 4px',
                          cursor: 'pointer',
                          outline: 'none',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '16px',
                            fontWeight: '500',
                            color: 'var(--text-primary)'
                          }}>
                            {event.title}
                          </span>
                          {badgeStore.isEventChanged(event.id) && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: 'var(--accent-text)',
                              backgroundColor: 'var(--accent-tint)',
                              border: '1px solid var(--accent-tint-border)',
                              padding: '2px 6px',
                              borderRadius: '6px'
                            }}>
                              Updated
                            </span>
                          )}
                        </div>

                        {/* Second line: time range and chat name */}
                        <div style={{
                          fontSize: '14px',
                          color: 'var(--text-secondary)',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          flexWrap: 'wrap'
                        }}>
                          {(event.startTime || event.time) ? (
                            <span>
                              {formatTime(event.startTime || event.time)}
                              {event.endTime ? ` - ${formatTime(event.endTime)}` : ''}
                            </span>
                          ) : (
                            <span>All day</span>
                          )}
                          {chatName && (
                            <span> · {chatName}</span>
                          )}
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--bg-hover)' }}>
                            {event.description && (
                              <div style={{
                                fontSize: '14px',
                                color: 'var(--text-secondary)',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-wrap',
                                marginBottom: '6px'
                              }}>
                                {event.description}
                              </div>
                            )}

                            {/* Group event: Remove from my calendar */}
                            {!isPersonal && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  (async () => {
                                    const ok = await confirm({ title: 'Remove event?', message: 'Remove this event from your calendar?', danger: true, confirmText: 'Remove' });
                                    if (ok) removeEvent(selectedDateKey, event.id);
                                  })();
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--danger-color)',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  padding: '4px 0',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Trash2 size={13} /> Remove from my calendar
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Pencil edit button (44x44 round) */}
                      {canShowPencil && (isPersonal || canEditGroup) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isPersonal) {
                              openMobileEditSheet(event);
                            } else {
                              goToMessage(event.msgref, event.chatid, event);
                            }
                          }}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                          aria-label={`Edit ${event.title}`}
                          title={`Edit ${event.title}`}
                        >
                          <Pencil size={18} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FLOATING "+ Event" BUTTON (Mobile only, hidden on past dates) */}
        {isMobile && !isPastDate(selectedDate || new Date()) && (
          <button
            type="button"
            onClick={openMobileAddSheet}
            style={{
              position: 'fixed',
              right: '16px',
              bottom: 'calc(80px + 16px + env(safe-area-inset-bottom, 0px))',
              height: '48px',
              padding: '0 18px',
              borderRadius: '999px',
              background: 'var(--accent-gradient)',
              color: 'var(--text-on-accent)',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
              zIndex: 900
            }}
            aria-label="Add new event"
          >
            <Plus size={20} strokeWidth={2.5} />
            <span>Event</span>
          </button>
        )}

        {/* MOBILE ADD / EDIT BOTTOM SHEET */}
        {isMobile && showMobileEventSheet && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10001,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={() => setShowMobileEventSheet(false)}
            role="presentation"
          >
            <div
              style={{
                height: 'min(90dvh, 720px)',
                backgroundColor: 'var(--bg-card)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                border: '1px solid var(--border-color)',
                borderBottom: 'none',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={mobileSheetMode === 'edit' ? "Edit event" : "New event"}
            >
              {/* Grab handle */}
              <div style={{
                width: '36px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: 'var(--border-color)',
                margin: '10px auto 4px',
                flexShrink: 0
              }} />

              {/* Fixed Header */}
              <div style={{
                padding: '8px 16px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-color)',
                flexShrink: 0
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  {mobileSheetMode === 'edit' ? 'Edit Event' : 'New Event'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMobileEventSheet(false)}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                boxSizing: 'border-box'
              }}>
                {/* Selected Date as text */}
                <div style={{ fontSize: '15px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                  {(selectedDate || new Date()).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>

                {/* Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={mobileForm.title}
                    onChange={(e) => setMobileForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Event title..."
                    style={{
                      height: '44px',
                      padding: '0 12px',
                      fontSize: '16px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>

                {/* Starts and Ends (2 columns) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Starts
                    </label>
                    <input
                      type="time"
                      className="form-input"
                      value={mobileForm.startTime}
                      onChange={(e) => setMobileForm(prev => ({ ...prev, startTime: e.target.value }))}
                      style={{
                        height: '44px',
                        padding: '0 12px',
                        fontSize: '16px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Ends
                    </label>
                    <input
                      type="time"
                      className="form-input"
                      value={mobileForm.endTime}
                      onChange={(e) => setMobileForm(prev => ({ ...prev, endTime: e.target.value }))}
                      style={{
                        height: '44px',
                        padding: '0 12px',
                        fontSize: '16px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Description
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={mobileForm.description}
                    onChange={(e) => setMobileForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Event details or notes..."
                    style={{
                      padding: '10px 12px',
                      fontSize: '16px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      color: 'var(--text-primary)',
                      resize: 'none'
                    }}
                  />
                </div>

                {/* Color swatches */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Color
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {colors.map((c) => {
                      const isSelected = mobileForm.color === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setMobileForm(prev => ({ ...prev, color: c }))}
                          style={{
                            width: '44px',
                            height: '44px',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                          aria-label={`Select color ${c}`}
                        >
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: c,
                            boxShadow: isSelected ? '0 0 0 2px var(--bg-card), 0 0 0 4px var(--text-primary)' : 'none',
                            transition: 'transform 0.15s ease'
                          }} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* In edit mode: Delete event button */}
                {mobileSheetMode === 'edit' && editingEvent && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        (async () => {
                          const ok = await confirm({ title: 'Delete this event?', message: 'Are you sure you want to permanently delete this event?', danger: true, confirmText: 'Delete' });
                          if (ok) {
                            removeEvent(selectedDateKey, editingEvent.id);
                            setShowMobileEventSheet(false);
                            toast.info('Event deleted');
                          }
                        })();
                      }}
                      style={{
                        width: '100%',
                        height: '46px',
                        borderRadius: '12px',
                        border: '1px solid var(--danger-color)',
                        backgroundColor: 'transparent',
                        color: 'var(--danger-color)',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <Trash2 size={16} /> Delete event
                    </button>
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div style={{
                padding: '10px 16px 14px',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                gap: '12px',
                flexShrink: 0,
                boxSizing: 'border-box'
              }}>
                <button
                  type="button"
                  onClick={() => setShowMobileEventSheet(false)}
                  style={{
                    flex: 1,
                    height: '46px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleMobileSaveEvent}
                  disabled={!mobileForm.title.trim() || !isEditChanged}
                  style={{
                    flex: 1.5,
                    height: '46px',
                    borderRadius: '12px',
                    border: 'none',
                    background: (!mobileForm.title.trim() || !isEditChanged) ? 'var(--bg-hover)' : 'var(--accent-gradient)',
                    color: (!mobileForm.title.trim() || !isEditChanged) ? 'var(--text-muted)' : 'var(--text-on-accent)',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: (!mobileForm.title.trim() || !isEditChanged) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {mobileSheetMode === 'edit' ? 'Save changes' : 'Save event'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE MONTH PICKER BOTTOM SHEET */}
        {isMobile && showMonthPicker && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10001,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={() => setShowMonthPicker(false)}
            role="presentation"
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                border: '1px solid var(--border-color)',
                borderBottom: 'none',
                padding: '12px 16px 24px',
                maxHeight: '80dvh',
                overflowY: 'auto',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.4)',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Choose month and year"
            >
              {/* Grab handle */}
              <div style={{
                width: '36px',
                height: '4px',
                borderRadius: '2px',
                backgroundColor: 'var(--border-color)',
                margin: '0 auto 16px'
              }} />

              {/* Year stepper */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px',
                padding: '0 8px'
              }}>
                <button
                  type="button"
                  onClick={() => setPickerYear(y => y - 1)}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  aria-label="Previous year"
                >
                  <ChevronLeft size={20} />
                </button>

                <span style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '20px',
                  fontWeight: '700',
                  color: 'var(--text-primary)'
                }}>
                  {pickerYear}
                </span>

                <button
                  type="button"
                  onClick={() => setPickerYear(y => y + 1)}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  aria-label="Next year"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* 3-column grid of 12 month buttons */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px'
              }}>
                {monthNames.map((name, idx) => {
                  const isCurrent = pickerYear === selectedYear && idx === selectedMonth;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setSelectedMonth(idx);
                        setSelectedYear(pickerYear);
                        const now = new Date();
                        if (now.getMonth() === idx && now.getFullYear() === pickerYear) {
                          setSelectedDate(now);
                        } else {
                          setSelectedDate(new Date(pickerYear, idx, 1));
                        }
                        setShowMonthPicker(false);
                      }}
                      style={{
                        height: '48px',
                        borderRadius: '12px',
                        border: isCurrent ? 'none' : '1px solid var(--border-color)',
                        background: isCurrent ? 'var(--accent-gradient)' : 'var(--bg-secondary)',
                        color: isCurrent ? 'var(--text-on-accent)' : 'var(--text-primary)',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {name.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* DESKTOP ADD EVENT MODAL */}
        {!isMobile && showAddEvent && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ padding: '10px', backgroundColor: 'var(--accent-tint)', borderRadius: '16px', color: 'var(--accent-text)' }}>
                    <Calendar size={22} />
                  </div>
                  <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                    New Event
                  </h3>
                </div>
                <button
                  onClick={() => { setShowAddEvent(false); }}
                  style={{
                    background: 'var(--bg-hover)',
                    color: 'var(--text-secondary)',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '24px', paddingLeft: '4px' }}>
                <p style={{ color: 'var(--accent-text)', margin: '0 0 4px 0', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Selected Date
                </p>
                <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '4px' }}>
                    Event Title
                  </label>
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
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '4px' }}>
                      Start Time
                    </label>
                    <input
                      className="form-input"
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '4px' }}>
                      End Time
                    </label>
                    <input
                      className="form-input"
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', paddingLeft: '4px' }}>
                    Description
                  </label>
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px', paddingLeft: '4px' }}>
                    Event Category
                  </label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {colors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewEvent(prev => ({ ...prev, color }))}
                        style={{
                          width: '44px',
                          height: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0
                        }}
                        aria-label={`Color ${color}`}
                      >
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          boxShadow: newEvent.color === color ? '0 0 0 2px var(--bg-card), 0 0 0 4px var(--text-primary)' : 'none'
                        }} />
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    className="pill-button"
                    style={{ flex: 1, backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                    onClick={() => { setShowAddEvent(false); }}
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

        {/* DESKTOP AGENDA MODAL */}
        {!isMobile && showEventDetails && (
          <div className="modal-overlay">
            <div className="modal-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ padding: '10px', backgroundColor: 'var(--accent-tint)', borderRadius: '16px', color: 'var(--accent-text)' }}>
                    <Info size={22} />
                  </div>
                  <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0, fontFamily: "'Outfit', sans-serif" }}>
                    Agenda
                  </h3>
                </div>
                <button
                  onClick={() => { setShowEventDetails(false); setSelectedDateEvents([]); }}
                  style={{
                    background: 'var(--bg-hover)',
                    color: 'var(--text-secondary)',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    minWidth: '44px',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '24px', paddingLeft: '4px' }}>
                <p style={{ color: 'var(--accent-text)', margin: '0 0 4px 0', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Date
                </p>
                <p style={{ color: 'var(--text-primary)', margin: 0, fontSize: '16px', fontWeight: '600' }}>
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => { if (event.chatid) goToMessage(event.msgref, event.chatid, event); }}
                    style={{
                      padding: '20px',
                      borderRadius: '24px',
                      backgroundColor: 'var(--bg-hover)',
                      border: '1px solid var(--border-color)',
                      position: 'relative',
                      overflow: 'hidden',
                      cursor: event.chatid ? 'pointer' : 'default'
                    }}
                  >
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: event.color }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h4 style={{ fontWeight: '700', color: 'var(--text-primary)', margin: 0, fontSize: '18px' }}>
                            {event.title}
                          </h4>
                          {badgeStore.isEventChanged(event.id) && (
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '700',
                              color: 'var(--accent-text)',
                              backgroundColor: 'var(--accent-tint)',
                              padding: '2px 8px',
                              borderRadius: '8px',
                              border: '1px solid var(--accent-tint-border)'
                            }}>
                              Updated
                            </span>
                          )}
                        </div>
                        {event.chatid && (() => {
                          const chatName = getChatName(event.chatid);
                          if (chatName) {
                            return (
                              <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500', paddingLeft: '4px' }}>
                                in {chatName}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          (async () => {
                            const ok = await confirm({ title: 'Remove event?', message: 'Remove this event from your calendar?', danger: true, confirmText: 'Remove' });
                            if (ok) removeEvent(formatDateKey(selectedDate), event.id);
                          })();
                        }}
                        style={{
                          color: 'var(--danger-color)',
                          background: 'var(--danger-tint)',
                          border: 'none',
                          padding: '8px',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          minWidth: '40px',
                          minHeight: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        aria-label="Remove event"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {(event.startTime || event.time) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                        <Clock size={14} />
                        <span>{formatTime(event.startTime || event.time)}{event.endTime ? ` - ${formatTime(event.endTime)}` : ''}</span>
                      </div>
                    )}

                    {event.description && (
                      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '16px' }}>
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
                  style={{ flex: 1, backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                  onClick={() => { setShowEventDetails(false); setSelectedDateEvents([]); }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BOOKINGS DRAWER / SHEET */}
        {showBookingsModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: isMobile ? 'flex-end' : 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: isMobile ? 0 : '16px',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={() => { setShowBookingsModal(false); setActiveBookingAction(null); }}
            role="presentation"
          >
            <div
              style={{
                width: '100%',
                maxWidth: isMobile ? 'none' : '580px',
                height: isMobile ? 'min(90dvh, 720px)' : 'auto',
                maxHeight: isMobile ? '90dvh' : '90vh',
                backgroundColor: 'var(--bg-card)',
                borderRadius: isMobile ? '20px 20px 0 0' : '24px',
                border: '1px solid var(--border-color)',
                borderBottom: isMobile ? 'none' : undefined,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Bookings"
            >
              {isMobile && (
                <div style={{
                  width: '36px',
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--border-color)',
                  margin: '10px auto 4px',
                  flexShrink: 0
                }} />
              )}

              {/* Header */}
              <div style={{
                padding: isMobile ? '12px 16px' : '20px 24px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'var(--bg-card)',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--accent-tint)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-text)'
                  }}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                      Bookings
                    </h2>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Incoming requests and scheduled meetings
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={fetchUserBookings}
                    style={{
                      background: 'none',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-secondary)',
                      padding: '8px',
                      minWidth: '44px',
                      minHeight: '44px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Refresh bookings"
                    aria-label="Refresh bookings"
                  >
                    <RefreshCw size={16} className={loadingBookings ? "spin-animate" : ""} />
                  </button>
                  <button
                    onClick={() => { setShowBookingsModal(false); setActiveBookingAction(null); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      padding: '8px',
                      minWidth: '44px',
                      minHeight: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Filter Row: Horizontally scrollable chips */}
              <div
                className="hide-scrollbar"
                style={{
                  display: 'flex',
                  gap: '8px',
                  padding: isMobile ? '8px 16px' : '12px 24px',
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  overflowX: 'auto',
                  flexShrink: 0
                }}
              >
                <button
                  onClick={() => setBookingFilter('all')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: bookingFilter === 'all' ? 'var(--accent-gradient)' : 'var(--bg-hover)',
                    color: bookingFilter === 'all' ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    minHeight: '36px'
                  }}
                >
                  All ({bookingsList.length})
                </button>
                <button
                  onClick={() => setBookingFilter('pending')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: bookingFilter === 'pending' ? 'var(--accent-gradient)' : 'var(--bg-hover)',
                    color: bookingFilter === 'pending' ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    minHeight: '36px'
                  }}
                >
                  Needs action ({pendingBookingsCount})
                </button>
                <button
                  onClick={() => setBookingFilter('confirmed')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: bookingFilter === 'confirmed' ? 'var(--accent-gradient)' : 'var(--bg-hover)',
                    color: bookingFilter === 'confirmed' ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    minHeight: '36px'
                  }}
                >
                  Confirmed ({bookingsList.filter(b => b.externalStatus === 'approved').length})
                </button>
              </div>

              {/* Bookings List Body */}
              <div style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                padding: isMobile ? '16px' : '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px'
              }}>
                {loadingBookings ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>Loading bookings...</p>
                  </div>
                ) : filteredBookings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    <Calendar size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '15px' }}>No bookings found</h4>
                    <p style={{ margin: 0, fontSize: '13px', maxWidth: '300px', marginInline: 'auto' }}>
                      {bookingFilter === 'pending' ? 'No pending requests requiring your response.' : 'Your meeting requests will appear here.'}
                    </p>
                  </div>
                ) : (
                  filteredBookings.map(b => {
                    const isPendingAction = (b.isHost && (b.externalStatus === 'pending' || b.externalStatus === 'proposed_by_guest')) || (!b.isHost && b.externalStatus === 'proposed_by_host');
                    const isCancelled = b.externalStatus === 'cancelled';

                    return (
                      <div
                        key={b.eventId || b.bookingToken}
                        style={{
                          backgroundColor: 'var(--bg-primary)',
                          border: isPendingAction ? '1px solid var(--warning-color)' : '1px solid var(--border-color)',
                          borderRadius: '16px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        {/* Title and Status Pill */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                              {b.eventTitle || 'Meeting Request'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {b.isHost ? 'Guest: ' : 'Host: '}
                              <strong style={{ color: 'var(--text-secondary)' }}>{b.otherPartyName || 'Participant'}</strong>
                              {b.otherPartyEmail && <span style={{ color: 'var(--text-secondary)' }}> ({b.otherPartyEmail})</span>}
                            </div>
                          </div>
                          <div>
                            {b.externalStatus === 'approved' && (
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--success-color)', backgroundColor: 'rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                Confirmed
                              </span>
                            )}
                            {b.externalStatus === 'pending' && (
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--warning-color)', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                Pending
                              </span>
                            )}
                            {b.externalStatus === 'proposed_by_guest' && (
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-text)', backgroundColor: 'var(--accent-tint)', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--accent-tint-border)' }}>
                                Guest Proposed
                              </span>
                            )}
                            {b.externalStatus === 'proposed_by_host' && (
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-text)', backgroundColor: 'var(--accent-tint)', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--accent-tint-border)' }}>
                                Host Proposed
                              </span>
                            )}
                            {b.externalStatus === 'cancelled' && (
                              <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--danger-color)', backgroundColor: 'var(--danger-tint)', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--danger-tint-border)' }}>
                                Cancelled
                              </span>
                            )}
                          </div>
                        </div>

                        {b.changeMessage && (
                          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', borderLeft: '3px solid var(--accent-solid)' }}>
                            <strong style={{ color: 'var(--accent-text)' }}>Note:</strong> {b.changeMessage}
                          </div>
                        )}

                        {/* Date, Time & Location Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={13} color="var(--accent-text)" />
                            <span style={{ color: 'var(--text-primary)' }}>
                              {new Date(b.startTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              {' - '}
                              {new Date(b.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {b.meetingType === 'online' ? <Video size={13} color="var(--success-color)" /> : <MapPin size={13} color="var(--warning-color)" />}
                            <span>
                              {b.meetingType === 'online'
                                ? (b.meetingLink ? <a href={b.meetingLink.startsWith('http') ? b.meetingLink : `https://${b.meetingLink}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-text)', textDecoration: 'none' }}>{b.meetingLink}</a> : 'Virtual Meeting')
                                : (b.location || 'In-Person Location')}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: wrapping with 8px gaps and at least 40px height */}
                        {!isCancelled && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '4px', borderTop: '1px solid var(--border-color)' }}>
                            {isPendingAction && (
                              <button
                                onClick={() => handleBookingResponse(b, 'ACCEPT')}
                                disabled={submittingAction}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: '8px',
                                  backgroundColor: 'var(--success-color)',
                                  color: 'var(--text-on-accent)',
                                  border: 'none',
                                  fontWeight: '700',
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  minHeight: '40px'
                                }}
                              >
                                <Check size={14} /> Accept
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
                                padding: '8px 14px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                fontWeight: '600',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                minHeight: '40px'
                              }}
                            >
                              <Clock size={14} /> Propose Time
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
                                padding: '8px 14px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)',
                                fontWeight: '600',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                minHeight: '40px'
                              }}
                            >
                              <MapPin size={14} /> Location
                            </button>

                            <button
                              onClick={() => {
                                setActiveBookingAction({ booking: b, actionType: 'cancel' });
                              }}
                              disabled={submittingAction}
                              style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--danger-tint)',
                                color: 'var(--danger-color)',
                                border: '1px solid var(--danger-tint-border)',
                                fontWeight: '600',
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                minHeight: '40px'
                              }}
                            >
                              <X size={14} /> {isPendingAction ? 'Decline' : 'Cancel'}
                            </button>

                            {b.bookingToken && (
                              <button
                                onClick={() => {
                                  const url = `${window.location.origin}/#/booking/view/${b.bookingToken}`;
                                  navigator.clipboard.writeText(url);
                                  setCopiedToken(b.bookingToken);
                                  setTimeout(() => setCopiedToken(null), 2000);
                                }}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: 'var(--bg-hover)',
                                  color: copiedToken === b.bookingToken ? 'var(--success-color)' : 'var(--text-secondary)',
                                  border: '1px solid var(--border-color)',
                                  fontSize: '13px',
                                  cursor: 'pointer',
                                  marginLeft: 'auto',
                                  minHeight: '40px'
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

        {/* ACTION DIALOG: Reschedule / Propose Time */}
        {activeBookingAction?.actionType === 'reschedule' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: isMobile ? 'flex-end' : 'center',
              justifyContent: 'center',
              zIndex: 11000,
              padding: isMobile ? 0 : '16px',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={() => setActiveBookingAction(null)}
            role="presentation"
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: isMobile ? '20px 20px 0 0' : '20px',
                padding: '24px',
                width: '100%',
                maxWidth: isMobile ? 'none' : '420px',
                maxHeight: isMobile ? '85dvh' : 'auto',
                overflowY: 'auto',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Propose time"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Propose Different Time
                </h3>
                <button
                  onClick={() => setActiveBookingAction(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Date</label>
                <input
                  type="date"
                  value={rescheduleData.date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setRescheduleData(prev => ({ ...prev, date: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '16px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Start Time</label>
                  <input
                    type="time"
                    value={rescheduleData.time}
                    onChange={e => setRescheduleData(prev => ({ ...prev, time: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '16px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Duration</label>
                  <select
                    value={rescheduleData.duration}
                    onChange={e => setRescheduleData(prev => ({ ...prev, duration: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '16px', boxSizing: 'border-box', height: '44px' }}
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
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Note / Reason (Optional)</label>
                <textarea
                  placeholder="e.g., Let's move our discussion to this slot."
                  rows={2}
                  value={actionMessage}
                  onChange={e => setActionMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '16px', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setActiveBookingAction(null)}
                  style={{ minHeight: '44px', padding: '8px 16px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
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
                  style={{ minHeight: '44px', padding: '8px 18px', borderRadius: '10px', backgroundColor: 'var(--accent-solid)', color: 'var(--text-on-accent)', border: 'none', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submittingAction ? 'Proposing...' : 'Submit Proposal'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTION DIALOG: Location */}
        {activeBookingAction?.actionType === 'location' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: isMobile ? 'flex-end' : 'center',
              justifyContent: 'center',
              zIndex: 11000,
              padding: isMobile ? 0 : '16px',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={() => setActiveBookingAction(null)}
            role="presentation"
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: isMobile ? '20px 20px 0 0' : '20px',
                padding: '24px',
                width: '100%',
                maxWidth: isMobile ? 'none' : '420px',
                maxHeight: isMobile ? '85dvh' : 'auto',
                overflowY: 'auto',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Update location"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Update Meeting Location
                </h3>
                <button
                  onClick={() => setActiveBookingAction(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={() => setLocationData(prev => ({ ...prev, type: 'online' }))}
                  style={{
                    flex: 1,
                    minHeight: '40px',
                    padding: '8px',
                    borderRadius: '8px',
                    border: locationData.type === 'online' ? '2px solid var(--accent-solid)' : '1px solid var(--border-color)',
                    backgroundColor: locationData.type === 'online' ? 'var(--accent-tint)' : 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Online / Video
                </button>
                <button
                  type="button"
                  onClick={() => setLocationData(prev => ({ ...prev, type: 'offline' }))}
                  style={{
                    flex: 1,
                    minHeight: '40px',
                    padding: '8px',
                    borderRadius: '8px',
                    border: locationData.type === 'offline' ? '2px solid var(--accent-solid)' : '1px solid var(--border-color)',
                    backgroundColor: locationData.type === 'offline' ? 'var(--accent-tint)' : 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  In-Person
                </button>
              </div>

              {locationData.type === 'online' ? (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Meeting Link</label>
                  <input
                    type="url"
                    placeholder="https://meet.google.com/..."
                    value={locationData.link}
                    onChange={e => setLocationData(prev => ({ ...prev, link: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '16px', boxSizing: 'border-box' }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Address / Location Name</label>
                  <input
                    type="text"
                    placeholder="Office Room 2A / Address..."
                    value={locationData.address}
                    onChange={e => setLocationData(prev => ({ ...prev, address: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '16px', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Note (Optional)</label>
                <textarea
                  placeholder="e.g., Updated link or venue."
                  rows={2}
                  value={actionMessage}
                  onChange={e => setActionMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '16px', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setActiveBookingAction(null)}
                  style={{ minHeight: '44px', padding: '8px 16px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleBookingResponse(activeBookingAction.booking, 'CHANGE_LOCATION', {
                      meetingType: locationData.type,
                      meetingLink: locationData.type === 'online' ? locationData.link.trim() : null,
                      location: locationData.type === 'offline' ? locationData.address.trim() : null
                    });
                  }}
                  disabled={submittingAction}
                  style={{ minHeight: '44px', padding: '8px 18px', borderRadius: '10px', backgroundColor: 'var(--accent-solid)', color: 'var(--text-on-accent)', border: 'none', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submittingAction ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ACTION DIALOG: Cancel */}
        {activeBookingAction?.actionType === 'cancel' && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: isMobile ? 'flex-end' : 'center',
              justifyContent: 'center',
              zIndex: 11000,
              padding: isMobile ? 0 : '16px',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={() => setActiveBookingAction(null)}
            role="presentation"
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: isMobile ? '20px 20px 0 0' : '20px',
                padding: '24px',
                width: '100%',
                maxWidth: isMobile ? 'none' : '400px',
                maxHeight: isMobile ? '85dvh' : 'auto',
                overflowY: 'auto',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Cancel meeting"
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', fontWeight: '700', color: 'var(--danger-color)' }}>
                Cancel Meeting?
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 14px 0', lineHeight: '1.5' }}>
                Are you sure you want to cancel or decline this meeting?
              </p>
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Reason (Optional)</label>
                <textarea
                  placeholder="Provide reason for cancellation..."
                  rows={2}
                  value={actionMessage}
                  onChange={e => setActionMessage(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '16px', resize: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setActiveBookingAction(null)}
                  style={{ minHeight: '44px', padding: '8px 16px', borderRadius: '10px', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: '600' }}
                >
                  Keep
                </button>
                <button
                  onClick={() => {
                    handleBookingResponse(activeBookingAction.booking, 'CANCEL');
                  }}
                  disabled={submittingAction}
                  style={{ minHeight: '44px', padding: '8px 18px', borderRadius: '10px', backgroundColor: 'var(--danger-color)', color: 'var(--text-on-accent)', border: 'none', fontWeight: '700', cursor: 'pointer' }}
                >
                  {submittingAction ? 'Cancelling...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOCAL CONFIRMATION DIALOG */}
        {confirmDialog.isOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20000,
              padding: '16px',
              animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            role="presentation"
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '20px',
                padding: '24px',
                width: '100%',
                maxWidth: '380px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxSizing: 'border-box'
              }}
              onClick={(e) => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-label={confirmDialog.title}
            >
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {confirmDialog.title}
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {confirmDialog.message}
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    minHeight: '44px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = confirmDialog.onConfirm;
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    if (action) action();
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--danger-color)',
                    color: 'var(--text-on-accent)',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    minHeight: '44px'
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOCAL TOAST NOTIFICATION */}
        {toast && (
          <div style={{
            position: 'fixed',
            bottom: isMobile ? 'calc(80px + 16px + env(safe-area-inset-bottom, 0px))' : '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: toast.type === 'error' ? 'var(--danger-color)' : toast.type === 'info' ? 'var(--accent-solid)' : 'var(--success-color)',
            color: 'var(--text-on-accent)',
            padding: '10px 20px',
            borderRadius: '999px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out',
            maxWidth: '90vw',
            boxSizing: 'border-box'
          }}>
            {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} strokeWidth={2.5} />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Floating Copied Toast (Link) */}
        {copiedMeetingLink && !toast && (
          <div style={{
            position: 'fixed',
            bottom: isMobile ? 'calc(80px + 16px + env(safe-area-inset-bottom, 0px))' : '28px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--success-color)',
            color: 'var(--text-on-accent)',
            padding: '10px 20px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: '700',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <Check size={16} strokeWidth={3} />
            <span>Meeting link copied (@{(localStorage.getItem('username') || 'user').toLowerCase()})</span>
          </div>
        )}

      </div>
    </div>
  );
};

export default SmoothCalendar;

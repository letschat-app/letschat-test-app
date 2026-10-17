import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, Plus, Check, X, Bell, BellOff, Users, ExternalLink, ChevronRight } from 'lucide-react';
import { API } from '../../service/UserAuth';

const GroupCalendarPanel = ({ chatId, groupName, onClose, onOpenCreateEvent }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('upcoming'); // 'all', 'upcoming', 'today'
  const userId = localStorage.getItem('userid');

  const fetchGroupEvents = async () => {
    if (!chatId) return;
    try {
      setLoading(true);
      const res = await fetch(`${API}/user/event/group/${chatId}`, {
        headers: {
          'User-Id': userId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEvents(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch group events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroupEvents();

    const handleSync = (e) => {
      const msg = e.detail;
      if (msg && msg.chatId === chatId) {
        fetchGroupEvents();
      }
    };

    const handleRsvp = (e) => {
      const msg = e.detail;
      if (msg && msg.chatId === chatId) {
        setEvents((prev) =>
          prev.map((ev) => {
            if (ev.groupEventId === msg.groupEventId) {
              return { ...ev, rsvpCounts: msg.rsvpCounts };
            }
            return ev;
          })
        );
      }
    };

    window.addEventListener('letschat_event_sync', handleSync);
    window.addEventListener('letschat_rsvp_update', handleRsvp);
    window.addEventListener('letschat_refresh_events', fetchGroupEvents);

    return () => {
      window.removeEventListener('letschat_event_sync', handleSync);
      window.removeEventListener('letschat_rsvp_update', handleRsvp);
      window.removeEventListener('letschat_refresh_events', fetchGroupEvents);
    };
  }, [chatId]);

  const handleVote = async (groupEventId, rsvpStatus) => {
    try {
      const res = await fetch(`${API}/user/event/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId
        },
        body: JSON.stringify({
          groupEventId,
          rsvpStatus,
          chatId
        })
      });
      if (res.ok) {
        const counts = await res.json();
        setEvents((prev) =>
          prev.map((ev) => {
            if (ev.groupEventId === groupEventId) {
              return { ...ev, rsvpStatus, rsvpCounts: counts };
            }
            return ev;
          })
        );
      }
    } catch (err) {
      console.error('Failed to vote RSVP:', err);
    }
  };

  const handleToggleReminder = async (event) => {
    const newEnabled = !event.reminderEnabled;
    try {
      const res = await fetch(`${API}/user/event/reminder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId
        },
        body: JSON.stringify({
          eventId: event.eventId,
          reminderEnabled: newEnabled,
          reminderOffset: event.reminderOffset || 60,
          customReminderTime: event.customReminderTime
        })
      });
      if (res.ok) {
        setEvents((prev) =>
          prev.map((ev) => (ev.eventId === event.eventId ? { ...ev, reminderEnabled: newEnabled } : ev))
        );
      }
    } catch (err) {
      console.error('Failed to toggle reminder:', err);
    }
  };

  const handleAddForMe = async (event) => {
    try {
      const res = await fetch(`${API}/user/event/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Id': userId
        },
        body: JSON.stringify({
          groupEventId: event.groupEventId,
          eventTitle: event.eventTitle,
          startTime: event.startTime,
          endTime: event.endTime,
          eventDetails: event.eventDetails,
          eventColor: event.eventColor,
          chatId: chatId,
          scope: 'PERSONAL',
          isGroupVisible: true,
          meetingType: event.meetingType,
          meetingLink: event.meetingLink,
          location: event.location,
          reminderOffset: 60
        })
      });
      if (res.ok) {
        fetchGroupEvents();
        window.dispatchEvent(new CustomEvent('letschat_refresh_events'));
      }
    } catch (err) {
      console.error('Failed to add for me:', err);
    }
  };

  const formatEventDate = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatEventTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter events
  const now = new Date().getTime();
  const filteredEvents = events.filter((ev) => {
    if (selectedFilter === 'all') return true;
    const startMs = ev.startTime ? new Date(ev.startTime).getTime() : 0;
    if (selectedFilter === 'upcoming') {
      return startMs >= now - 15 * 60 * 1000;
    }
    if (selectedFilter === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      const evDateStr = ev.startTime ? new Date(ev.startTime).toISOString().split('T')[0] : '';
      return todayStr === evDateStr;
    }
    return true;
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#111827',
      color: '#f9fafb',
      borderLeft: '1px solid rgba(255, 255, 255, 0.08)'
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calendar size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Group Calendar</h3>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>{groupName || 'Group Events'}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onOpenCreateEvent && onOpenCreateEvent({ chatId, isGroup: true })}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            <Plus size={16} /> New Event
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9ca3af',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        padding: '10px 16px',
        gap: '8px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {['upcoming', 'today', 'all'].map((filter) => (
          <button
            key={filter}
            onClick={() => setSelectedFilter(filter)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'capitalize',
              cursor: 'pointer',
              backgroundColor: selectedFilter === filter ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              color: selectedFilter === filter ? '#60a5fa' : '#9ca3af',
              border: selectedFilter === filter ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent'
            }}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af', fontSize: '14px' }}>
            Loading group calendar events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '1px dashed rgba(255, 255, 255, 0.1)'
          }}>
            <Calendar size={36} color="#6b7280" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#e5e7eb' }}>No events in this group</h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
              Events created in this group will appear here for all members.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const hasJoined = ev.isAdded || ev.rsvpStatus === 'going';
            const isCancelled = ev.action === 'cancelled';

            return (
              <div
                key={ev.eventId || ev.groupEventId}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: '16px',
                  border: `1px solid ${isCancelled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                  opacity: isCancelled ? 0.7 : 1
                }}
              >
                {/* Event Top Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      backgroundColor: isCancelled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                      color: isCancelled ? '#ef4444' : '#60a5fa'
                    }}>
                      {isCancelled ? 'Cancelled' : ev.scope === 'ALL' ? 'Group Event (All)' : 'Group Event'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>
                      {formatEventDate(ev.startTime)}
                    </span>
                  </div>

                  {/* Reminder Toggle */}
                  <button
                    onClick={() => handleToggleReminder(ev)}
                    title={ev.reminderEnabled ? 'Turn Reminder OFF' : 'Turn Reminder ON (1 hr before)'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: ev.reminderEnabled ? '#f59e0b' : '#6b7280',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {ev.reminderEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                  </button>
                </div>

                {/* Title & Time */}
                <div>
                  <h4 style={{
                    margin: '0 0 6px 0',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#f9fafb',
                    textDecoration: isCancelled ? 'line-through' : 'none'
                  }}>
                    {ev.eventTitle}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60a5fa', fontSize: '13px', fontWeight: '500' }}>
                    <Clock size={14} />
                    <span>
                      {formatEventTime(ev.startTime)} {ev.endTime ? `- ${formatEventTime(ev.endTime)}` : ''}
                    </span>
                  </div>
                </div>

                {/* PROMINENT ONLINE / OFFLINE SECTION */}
                {ev.meetingType === 'online' && ev.meetingLink && (
                  <div style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#60a5fa', fontSize: '13px', fontWeight: '600' }}>
                      <Video size={16} />
                      <span>Video Call</span>
                    </div>
                    <a
                      href={ev.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        textDecoration: 'none',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}
                    >
                      Join Meeting <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {ev.meetingType === 'offline' && ev.location && (
                  <div style={{
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#34d399',
                    fontSize: '13px'
                  }}>
                    <MapPin size={16} style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: '500' }}>Venue: {ev.location}</span>
                  </div>
                )}

                {/* Event Description */}
                {ev.eventDetails && (
                  <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: '#d1d5db',
                    lineHeight: '1.5'
                  }}>
                    {ev.eventDetails}
                  </p>
                )}

                {/* RSVP Voting & Attendance Tally */}
                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingTop: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>
                      Will you attend?
                    </span>
                    {ev.rsvpCounts && (
                      <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#9ca3af' }}>
                        <span>✓ Going: {ev.rsvpCounts.going || 0}</span>
                        <span>✕ Can't: {ev.rsvpCounts.cant_join || 0}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleVote(ev.groupEventId, 'going')}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: ev.rsvpStatus === 'going' ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: ev.rsvpStatus === 'going' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        color: ev.rsvpStatus === 'going' ? '#34d399' : '#9ca3af',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Going
                    </button>
                    <button
                      onClick={() => handleVote(ev.groupEventId, 'maybe')}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: ev.rsvpStatus === 'maybe' ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: ev.rsvpStatus === 'maybe' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
                        color: ev.rsvpStatus === 'maybe' ? '#fbbf24' : '#9ca3af',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Maybe
                    </button>
                    <button
                      onClick={() => handleVote(ev.groupEventId, 'cant_join')}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: ev.rsvpStatus === 'cant_join' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)',
                        backgroundColor: ev.rsvpStatus === 'cant_join' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                        color: ev.rsvpStatus === 'cant_join' ? '#f87171' : '#9ca3af',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Can't Join
                    </button>
                  </div>
                </div>

                {/* Add for Me Button if not yet on user's calendar */}
                {!hasJoined && !isCancelled && (
                  <button
                    onClick={() => handleAddForMe(ev)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#60a5fa',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Plus size={14} /> Add to My Calendar
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GroupCalendarPanel;

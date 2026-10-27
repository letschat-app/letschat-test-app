import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, Plus, Check, X, Bell, BellOff, Users, ExternalLink, ChevronRight, Edit2 } from 'lucide-react';
import { API } from '../../service/UserAuth';

const GroupCalendarPanel = ({ chatId, groupName, onClose, onOpenCreateEvent, onOpenEvent }) => {
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
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(d);
  };

  const formatEventTime = (isoStr) => {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(d);
  };

  // Filter events
  const now = Date.now();
  let filteredEvents = events.filter((ev) => {
    if (selectedFilter === 'all') return true;
    const startMs = ev.startTime ? new Date(ev.startTime).getTime() : 0;
    if (selectedFilter === 'upcoming') {
      return startMs >= now - 15 * 60 * 1000;
    }
    if (selectedFilter === 'today') {
      const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      const evDateIST = ev.startTime ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(ev.startTime)) : '';
      return todayIST === evDateIST;
    }
    return true;
  });

  if (selectedFilter === 'upcoming') {
    filteredEvents = [...filteredEvents].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()).slice(0, 5);
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
      borderLeft: '1px solid var(--bg-hover)'
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px',
        borderBottom: '1px solid var(--bg-hover)',
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
            backgroundColor: 'var(--accent-tint)',
            color: 'var(--accent-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calendar size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>Group Calendar</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{groupName || 'Group Events'}</span>
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
              backgroundColor: 'var(--accent-solid)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 4px 12px color-mix(in srgb, var(--accent-solid) 45%, transparent)'
            }}
          >
            <Plus size={16} /> New Event
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'var(--bg-hover)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
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
        borderBottom: '1px solid var(--bg-hover)'
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
              backgroundColor: selectedFilter === filter ? 'color-mix(in srgb, var(--accent-solid) 45%, transparent)' : 'transparent',
              color: selectedFilter === filter ? 'var(--accent-text)' : 'var(--text-secondary)',
              border: selectedFilter === filter ? '1px solid color-mix(in srgb, var(--accent-solid) 45%, transparent)' : '1px solid transparent'
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
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', fontSize: '14px' }}>
            Loading group calendar events...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 20px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '16px',
            border: '1px dashed var(--border-color)'
          }}>
            <Calendar size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--text-primary)' }}>
              {selectedFilter === 'today' ? 'No events for today' : selectedFilter === 'upcoming' ? 'No upcoming events' : 'No events in this group'}
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Events created in this group will appear here for all members.
            </p>
          </div>
        ) : (
          filteredEvents.map((ev) => {
            const hasJoined = ev.isAdded || ev.rsvpStatus === 'going';
            const isCancelled = ev.action === 'cancelled';
            const currentUsername = localStorage.getItem('username');
            const isCreator = Boolean(
              (ev.creatorId && ev.creatorId === userId) ||
              (ev.creatorName && currentUsername && ev.creatorName === currentUsername)
            );

            return (
              <div
                key={ev.eventId || ev.groupEventId}
                onClick={() => onOpenEvent && onOpenEvent(ev)}
                style={{
                  backgroundColor: 'var(--bg-hover)',
                  borderRadius: '16px',
                  border: `1px solid ${isCancelled ? 'var(--danger-tint-border)' : 'var(--bg-hover)'}`,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  position: 'relative',
                  opacity: isCancelled ? 0.7 : 1,
                  cursor: onOpenEvent ? 'pointer' : 'default'
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
                      backgroundColor: isCancelled ? 'var(--danger-tint)' : 'var(--accent-tint)',
                      color: isCancelled ? 'var(--danger-color)' : 'var(--accent-text)'
                    }}>
                      {isCancelled ? 'Cancelled' : ev.scope === 'ALL' ? 'Group Event (All)' : 'Group Event'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
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
                      color: ev.reminderEnabled ? 'var(--warning-color)' : 'var(--text-muted)',
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
                    color: 'var(--text-primary)',
                    textDecoration: isCancelled ? 'line-through' : 'none'
                  }}>
                    {ev.eventTitle}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-text)', fontSize: '13px', fontWeight: '500' }}>
                    <Clock size={14} />
                    <span>
                      {formatEventTime(ev.startTime)} {ev.endTime ? `- ${formatEventTime(ev.endTime)}` : ''}
                    </span>
                  </div>
                </div>

                {/* PROMINENT ONLINE / OFFLINE SECTION */}
                {ev.meetingType === 'online' && ev.meetingLink && (
                  <div style={{
                    backgroundColor: 'var(--accent-tint)',
                    border: '1px solid var(--accent-tint-border)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-text)', fontSize: '13px', fontWeight: '600' }}>
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
                        backgroundColor: 'var(--accent-solid)',
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
                    color: 'var(--success-color)',
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

                {/* Creator Attribution */}
                {(ev.creatorName || ev.creatorId) && (
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Created by @{ev.creatorName || ev.creatorId}
                  </div>
                )}

                {/* Calendar Add / Added Status & Creator Edit */}
                <div style={{
                  borderTop: '1px solid var(--bg-hover)',
                  paddingTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    {hasJoined ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        color: 'var(--success-color)',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        <Check size={14} /> Added to Calendar
                      </div>
                    ) : !isCancelled ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddForMe(ev);
                        }}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: '8px',
                          backgroundColor: 'var(--accent-tint)',
                          border: '1px solid var(--accent-tint-border)',
                          color: 'var(--accent-text)',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <Plus size={14} /> + Add to Calendar
                      </button>
                    ) : null}
                  </div>

                  {/* Creator-only Edit button */}
                  {isCreator && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenEvent) onOpenEvent(ev);
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--accent-tint)',
                        border: '1px solid var(--accent-tint-border)',
                        color: 'var(--accent-text)',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Edit date, time, and details"
                    >
                      <Edit2 size={13} /> Edit
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GroupCalendarPanel;

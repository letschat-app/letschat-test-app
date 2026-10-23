import React, { useState, useEffect } from 'react';

/**
 * BadgeStore
 * Reactive in-memory + localStorage store for unread attention indicators (blue dots):
 * - calendarUnread: New meetings booked, events created, or event details changed
 * - pulsesUnread: Unseen pulses/stories available
 * - bellUnread: Unread booking requests / negotiation actions for the calendar bell
 * - changedEventIds: IDs of events that were modified while offline or away
 */
class BadgeStore {
  constructor() {
    this.listeners = new Set();
    this.state = {
      calendarUnread: localStorage.getItem('letschat_calendar_unread') === 'true',
      pulsesUnread: localStorage.getItem('letschat_pulses_unread') === 'true',
      bellUnread: localStorage.getItem('letschat_bell_unread') === 'true',
      changedEventIds: JSON.parse(localStorage.getItem('letschat_changed_event_ids') || '[]'),
    };
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[BadgeStore] Listener notification error:', err);
      }
    });
  }

  setCalendarUnread(unread, changedIds = []) {
    const existingSet = new Set(this.state.changedEventIds.map(String));
    changedIds.forEach(id => existingSet.add(String(id)));
    const updatedIds = Array.from(existingSet);

    this.state = {
      ...this.state,
      calendarUnread: !!unread,
      changedEventIds: updatedIds,
    };
    localStorage.setItem('letschat_calendar_unread', String(!!unread));
    localStorage.setItem('letschat_changed_event_ids', JSON.stringify(updatedIds));
    this.notify();
  }

  clearCalendarUnread() {
    this.state = {
      ...this.state,
      calendarUnread: false,
      changedEventIds: [],
    };
    localStorage.setItem('letschat_calendar_unread', 'false');
    localStorage.setItem('letschat_changed_event_ids', JSON.stringify([]));
    this.notify();
  }

  setPulsesUnread(unread) {
    this.state = {
      ...this.state,
      pulsesUnread: !!unread,
    };
    localStorage.setItem('letschat_pulses_unread', String(!!unread));
    this.notify();
  }

  clearPulsesUnread() {
    this.state = {
      ...this.state,
      pulsesUnread: false,
    };
    localStorage.setItem('letschat_pulses_unread', 'false');
    this.notify();
  }

  setBellUnread(unread) {
    this.state = {
      ...this.state,
      bellUnread: !!unread,
    };
    localStorage.setItem('letschat_bell_unread', String(!!unread));
    this.notify();
  }

  clearBellUnread() {
    this.state = {
      ...this.state,
      bellUnread: false,
    };
    localStorage.setItem('letschat_bell_unread', 'false');
    this.notify();
  }

  isEventChanged(id) {
    return this.state.changedEventIds.includes(String(id));
  }
}

export const badgeStore = new BadgeStore();

export function useBadges() {
  const [state, setState] = useState(badgeStore.getState());

  useEffect(() => {
    return badgeStore.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  return state;
}

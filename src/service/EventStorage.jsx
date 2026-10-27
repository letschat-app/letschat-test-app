import React, { createContext, useContext, useState, useEffect } from 'react';
import { API } from './UserAuth';
import messageStore from '../pages/MessageStore';
import { saveEventToDB, getEventsFromDB } from './db';
import { badgeStore } from './BadgeStore';
const EventMediatorContext = createContext();

export const EventStorage = ({ children }) => {
  const [events, setEvents] = useState({});
  const userId = localStorage.getItem("userid");
  const formatDateKey = (dat) => {
    const date=new Date(dat)
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  //to fetch event from server and diff against IDB snapshot
  useEffect(()=>{
    console.log("calling")
    if(!userId)return;

    const loadLocalEvents = async () => {
      try {
        const localEvents = await getEventsFromDB();
        if (localEvents && localEvents.length > 0) {
          const grouped = {};
          localEvents.forEach(evt => {
            const datekey = formatDateKey(evt.date);
            if (!grouped[datekey]) grouped[datekey] = [];
            grouped[datekey].push(evt);
          });
          setEvents(grouped);
        }
      } catch (err) {
        console.error("Local events error:", err);
      }
    };

    const fetchevent=async()=>{
      try {
        const localEvents = await getEventsFromDB();
        const localMap = new Map((localEvents || []).map(e => [String(e.id), e]));

        const res = await fetch(
          `${API}/user/getevents/${userId}`
        );
        const data = await res.json();
        const newGrouped = {};
        let hasEventChanges = false;
        const changedIds = [];

        for (const evt of data) {
          const tim=new Date(evt.startTime*1000).toISOString();
          const datekey=formatDateKey(tim.toLocaleString());
          const evet={
            id: evt.eventId,
            title: evt.eventTitle,
            date:tim,
            startTime: new Date((new Date(evt.startTime*1000).toISOString())).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit',hour12:false }),
            endTime: evt.endTime? new Date((new Date(evt.endTime*1000).toISOString())).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit',hour12:false }) : '',
            description: evt.eventDetails || '',
            color: evt.eventColor || '#3b82f6',
            msgref:evt.msgId || '',
            chatid:evt.chatId || '',
            action:evt.action,
            isAdded:evt.isAdded,
            isSync:evt.isSync,
            meetingType: evt.meetingType,
            meetingLink: evt.meetingLink,
            location: evt.location,
            groupEventId: evt.groupEventId,
            creatorId: evt.creatorId,
            creatorName: evt.creatorName,
            externalStatus: evt.externalStatus
          };

          // Client-side change detection: Compare against local IDB snapshot
          if (localEvents && localEvents.length > 0) {
            const existing = localMap.get(String(evet.id));
            if (!existing) {
              // New event created while offline or in background
              hasEventChanges = true;
              changedIds.push(String(evet.id));
            } else {
              const timeChanged = (existing.startTime !== evet.startTime) || (existing.endTime !== evet.endTime) || (existing.date !== evet.date);
              const actionChanged = existing.action !== evet.action;
              const statusChanged = existing.externalStatus !== evet.externalStatus;
              const locChanged = (existing.location !== evet.location) || (existing.meetingLink !== evet.meetingLink);
              const titleChanged = existing.title !== evet.title;

              if (timeChanged || actionChanged || statusChanged || locChanged || titleChanged) {
                hasEventChanges = true;
                changedIds.push(String(evet.id));
              }
            }
          }

          await saveEventToDB(evet);

          if (!newGrouped[datekey]) newGrouped[datekey] = [];
          newGrouped[datekey].push(evet);
        }

        if (hasEventChanges) {
          badgeStore.setCalendarUnread(true, changedIds);
        }

        // Diff User Bookings
        try {
          const bRes = await fetch(`${API}/user/event/bookings`, {
            headers: { 'User-Id': userId }
          });
          if (bRes.ok) {
            const freshBookings = await bRes.json();
            const cachedBookingsRaw = localStorage.getItem('letschat_cached_bookings');
            if (cachedBookingsRaw) {
              const cachedBookings = JSON.parse(cachedBookingsRaw);
              const cachedBMap = new Map((cachedBookings || []).map(b => [String(b.eventId || b.bookingToken), b]));

              let bookingChanges = false;
              for (const b of (freshBookings || [])) {
                const key = String(b.eventId || b.bookingToken);
                const prev = cachedBMap.get(key);
                if (!prev) {
                  bookingChanges = true;
                  break;
                }
                if (prev.externalStatus !== b.externalStatus || prev.startTime !== b.startTime || prev.location !== b.location) {
                  bookingChanges = true;
                  break;
                }
              }

              if (bookingChanges) {
                badgeStore.setCalendarUnread(true);
                badgeStore.setBellUnread(true);
              }
            }
            localStorage.setItem('letschat_cached_bookings', JSON.stringify(freshBookings || []));
          }
        } catch (bErr) {
          console.warn("[EventStorage] Bookings diff check error:", bErr);
        }

        setEvents(prev => {
          const merged = { ...prev };
          Object.keys(newGrouped).forEach(k => {
            // override or just assign since fetched from server should be source of truth
            merged[k] = newGrouped[k];
          });
          return merged;
        });
      } catch (error) {
        console.error("not able to fetch",error)
      }
    };

    loadLocalEvents().then(fetchevent);

    // Listen for WebSocket event sync frames (group events created/updated/cancelled by others)
    const handleEventSync = async (e) => {
      const msg = e.detail;
      if (!msg) return;

      console.log("[EventStorage] Received real-time event sync:", msg);
      badgeStore.setCalendarUnread(true, msg.eventId ? [String(msg.eventId)] : []);
      fetchevent();

      // If created/updated by someone else, check collision on recipient's calendar
      if (msg.updatedBy && msg.updatedBy !== userId && msg.startTime && msg.action !== 'cancelled') {
        const syncStart = new Date(msg.startTime).getTime();
        const syncEnd = msg.endTime ? new Date(msg.endTime).getTime() : (syncStart + 60 * 60 * 1000);

        try {
          const localEvents = await getEventsFromDB();
          if (localEvents && localEvents.length > 0) {
            const colliding = localEvents.find((existing) => {
              if (existing.groupEventId === msg.groupEventId || existing.id === msg.eventId || existing.action === 'cancelled') return false;
              const exStart = existing.date ? new Date(existing.date).getTime() : 0;
              const exEnd = exStart + 60 * 60 * 1000;
              return syncStart < exEnd && syncEnd > exStart;
            });

            if (colliding) {
              const timeRange = `${new Date(msg.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${msg.endTime ? new Date(msg.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`;
              window.dispatchEvent(new CustomEvent('letschat_collision_alert', {
                detail: {
                  title: msg.eventTitle || 'Incoming Event',
                  collidingTitle: colliding.title || 'Existing Event',
                  timeRange
                }
              }));
            }
          }
        } catch (err) {
          console.error("Collision check error:", err);
        }
      }
    };

    const handleBookingSync = (e) => {
      console.log("[EventStorage] Received real-time booking alert:", e.detail);
      badgeStore.setCalendarUnread(true);
      badgeStore.setBellUnread(true);
      fetchevent();
    };

    window.addEventListener('letschat_event_sync', handleEventSync);
    window.addEventListener('letschat_booking_request', handleBookingSync);
    window.addEventListener('letschat_booking_update', handleBookingSync);
    window.addEventListener('letschat_refresh_events', fetchevent);

    // Listen for simulation events (walkthrough)
    const handleSimEvent = (e) => {
      const { title, startTime, description, msgref, chatid } = e.detail;
      addEvent({
        title,
        date: new Date().toISOString(),
        startTime,
        description,
        msgref,
        chatid,
        isSimulation: true
      });
    };
    window.addEventListener('simulation_event_needed', handleSimEvent);
    return () => {
      window.removeEventListener('simulation_event_needed', handleSimEvent);
      window.removeEventListener('letschat_event_sync', handleEventSync);
      window.removeEventListener('letschat_booking_request', handleBookingSync);
      window.removeEventListener('letschat_booking_update', handleBookingSync);
      window.removeEventListener('letschat_refresh_events', fetchevent);
    };
  },[userId])

  const eventapi=async(events,date)=>{
    const { title, startTime, endTime, description, color, msgref, chatid, action } = events;
    console.log(events)
    console.log("SNAPSHOT msgref:", JSON.parse(JSON.stringify(events)).msgref);
    const ref=events.msgref;
    const body={
      eventTitle:title,
      startTime:startTime?add(date,startTime):add(date,'10:00'),
      endTime:endTime?add(date,endTime) :'',
      eventDetails:description || '',
      eventColor:color || '',
      msgId:msgref ?? '',
      chatId:chatid || '',
      action:action ,
      isAdded:false,
      isSync:false,
    }
    console.log(body)
    try {
      const response = await fetch(`${API}/user/setevent/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("Failed to save event");
      }

      const eventId = await response.text(); // backend returns Long ID
      console.log(eventId)
      return Number(eventId);
    } catch (error) {
      console.error("Error saving event:", error);
      throw error;
    }
  }
  const add=(date,time)=>{
    const [hours, minutes] = time.split(':').map(Number);
    const utc=new Date(date).setHours(hours,minutes);
    return new Date(utc).toISOString();
  }

  const addEvent = async(eventData) => {
    const { title, date, startTime, endTime, description,msgref,chatid, color, action, tempid, isSimulation } = eventData;
    
    if (!title || !date) return null;
    
    const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    const initialMsgRef = msgref || tempid || '';
    const eventToAdd = {
      id: Date.now().toString() + Math.random().toString(36),
      title,
      startTime: startTime || '',
      endTime: endTime || '',
      description: description || '',
      msgref: initialMsgRef,
      chatid: chatid || '',
      color: color || '#3b82f6',
      action: action,
      date: date,
      isAdded: false,
      isSync: false
    };

    if (isSimulation) {
      console.log("[EventStorage] Simulation event added locally only.");
      setEvents(prev => ({
        ...prev,
        [dateKey]: [...(prev[dateKey] || []), eventToAdd]
      }));
      await saveEventToDB(eventToAdd);
      return eventToAdd;
    }

    // Immediately persist and show locally with temporary ID
    setEvents(prev => ({
      ...prev,
      [dateKey]: [...(prev[dateKey] || []), eventToAdd]
    }));
    await saveEventToDB(eventToAdd);

    // Start background sync process
    (async () => {
      try {
        const finalMsgRef = msgref || await waitForMsgRef(tempid, chatid);
        const eventWithRealId = { ...eventToAdd, msgref: finalMsgRef };
        
        // Push to server
        const serverId = await eventapi(eventWithRealId, date);
        const finalEvent = { ...eventWithRealId, id: serverId, isSync: true };

        // Update local state and DB
        setEvents(prev => ({
          ...prev,
          [dateKey]: (prev[dateKey] || []).map(ev => ev.id === eventToAdd.id ? finalEvent : ev)
        }));
        await saveEventToDB(finalEvent);
        console.log("[EventStorage] Event synced to server:", finalEvent);
      } catch (err) {
        console.error("[EventStorage] Sync failed (will retry on next load):", err);
        // Save as un-synced for now
        await saveEventToDB(eventToAdd);
      }
    })();

    return eventToAdd;
  };
  const waitForMsgRef = (tempid, chatid) => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const id = messageStore.getid(tempid, chatid);
      if (id) {
        clearInterval(interval);
        resolve(id);
      }
    }, 500); // 500ms safety polling
  });
};
  const removeEvent = (eventId, date) => {
    const dateKey = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    setEvents(prev => ({
      ...prev,
      [dateKey]: prev[dateKey]?.filter(event => event.id !== eventId) || []
    }));
  };
  
  const getAllEvents = () => events;
  
  const updateEvent = (dateKey, event) => {
    console.log("updating event state locally:", event.title, "added:", event.isAdded);
    setEvents(prev => ({
      ...prev,
      [dateKey]: [
        ...(prev[dateKey] || []).filter(
          ev => String(ev.msgref) !== String(event.msgref)
        ),
        event
      ]
    }));
  };
  const getEventById = (id) => {
    for (const date in events) {
      const found = events[date].find(e => String(e.id) === String(id));
      if (found) return found;
    }
    return null;
  };

  return (
    <EventMediatorContext.Provider value={{ 
      events, 
      addEvent, 
      removeEvent, 
      getAllEvents,
      updateEvent,
      getEventById
    }}>
      {children}
    </EventMediatorContext.Provider>
  );
};

export const useEventMediator = () => {
  const context = useContext(EventMediatorContext);
  if (!context) {
    throw new Error('useEventMediator must be used within EventMediator');
  }
  return context;
};
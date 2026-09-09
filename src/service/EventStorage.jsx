import React, { createContext, useContext, useState, useEffect } from 'react';
import { API } from './UserAuth';
import messageStore from '../pages/MessageStore';
import { saveEventToDB, getEventsFromDB } from './db';
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

  //to fetch event from server
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
        const res = await fetch(
          `${API}/user/getevents/${userId}`
        );
        const data = await res.json();
        const newGrouped = {};
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
          };
          await saveEventToDB(evet);

          if (!newGrouped[datekey]) newGrouped[datekey] = [];
          newGrouped[datekey].push(evet);
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
    return () => window.removeEventListener('simulation_event_needed', handleSimEvent);
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
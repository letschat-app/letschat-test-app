import React, { useState, createContext, useContext, useEffect, useCallback } from "react";
import * as chrono from "chrono-node";
import { useEventMediator } from "./EventStorage";
import messageStore from "../pages/MessageStore";
import { API } from './UserAuth';

const EventContext = createContext();

// Event configuration
const EVENT_KEYWORDS = ["meeting", "call", "appointment", "lunch", "dinner", "discussion", "presentation","session","class",];
const RESCHEDULE_KEYWORDS = [
  "postpone",
  "postponed",
  "post pone",      
  "post poned",   
  "postphone",   
  "postphoned",     
  "pospone",         
  
  "reschedule",
  "rescheduled",
  "re schedule",    
  "resch",       
  "re sch",         
  "r/s",            
  
  "delay",
  "delayed",

  "push",
  "push back",
  "pushed back",
  "push the meeting",
  "push it",
  "push it later",

  "move",
  "moved",
  "move it",
  "move meeting",
  "move the meeting",

  "shift",
  "shifted",
  "shift the meeting",

  "defer",
  "deferred",

  "change the time",
  "change time",
  "change date",

  "new time",
  "new date",
  
  "do it later",
  "take it later"
];
const CANCEL_KEYWORDS = [
  "cancel",
  "canceled",
  "cancelled",
  "cancelling",
  "canceling",

  "call off",
  "called off",
  "no meeting"
];
const EVENT_COLORS = {
  scheduled: '#3b82f6',
  rescheduled: '#10b981',
  cancelled: '#ef4444',
  postponed: '#f59e0b',
  default: '#fff'
};

export default function EventPanel({ children }) {
  const [event, setEvents] = useState([]);
  const { events,addEvent: addEventToMediator } = useEventMediator();

  const formatDateKey = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getEventColor = (purpose) => {
    return EVENT_COLORS[purpose] || EVENT_COLORS.default;
  };

  const sendToCalendar = useCallback((eventData) => {
    if (eventData.purpose  && eventData.dateTime) {
      const calendarEvent = {
        title: eventData.purpose.charAt(0).toUpperCase() + eventData.purpose.slice(1),
        date: eventData.date,
        startTime: eventData.dateTime.toTimeString().split(" ")[0].slice(0, 5),
        endTime: '',
        description: `Detected from: "${eventData.message}"`,
        msgref:eventData.msgref,
        chatid:eventData.chatid,
        color: getEventColor(eventData.action.trim().split(' ')[0]),
        action:eventData.action,
        tempid:eventData.tempid,
      };

      addEventToMediator(calendarEvent);
      console.log('Event sent to calendar:', calendarEvent);
    }
  }, [addEventToMediator]);
function toDateOnly(dateInput) {
  const d = new Date(dateInput);
  //return d.toISOString().split("T")[0]; // YYYY-MM-DD
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
 const handleParse = useCallback((msg) => {
  console.log("=== handleParse start ===");
  console.log("Incoming message object:", msg);

  const text = msg.content?.trim();
  if (!text) {
    console.log("Empty message, skipping parse");
    return;
  }
  if(msg.msgid){
    const existsAnywhere = Object.values(events)
  .some(eventArray => eventArray.some(evt => evt.msgref === msg.msgid));
  console.log(existsAnywhere); 
  if(existsAnywhere){
    return;
  }
  }
  
  console.log("Parsing text:", text);
  const lower = text.toLowerCase();
  const today = new Date();
  

  const isReschedule = RESCHEDULE_KEYWORDS.some(k => lower.includes(k));
  const isCancel = CANCEL_KEYWORDS.some(k => lower.includes(k));
  // -------------------------
  // 1. Try Chrono first
  // -------------------------
  let results = chrono.parse(text,new Date(),{forwardDate:true});
  console.log("Chrono parse results:", JSON.stringify(results, null, 2));
  if (results.length > 0) {
    console.log(results[0].start.date());
  }
  // =====================================================
  // CUSTOM FALLBACKS (ONLY REAL-LIFE SIMPLE PHRASES)
  // =====================================================

  const createMockParsedComponent = (d) => ({
    date: () => d,
    get: (unit) => {
      switch(unit) {
        case "year": return d.getFullYear();
        case "month": return d.getMonth() + 1;
        case "day": return d.getDate();
        case "hour": return d.getHours();
        case "minute": return d.getMinutes();
        case "second": return d.getSeconds();
        default: return null;
      }
    },
    assign: (unit, value) => {
      switch(unit) {
        case "year": d.setFullYear(value); break;
        case "month": d.setMonth(value - 1); break;
        case "day": d.setDate(value); break;
        case "hour": d.setHours(value); break;
        case "minute": d.setMinutes(value); break;
        case "second": d.setSeconds(value); break;
      }
    },
    isCertain: (unit) => ["year", "month", "day"].includes(unit)
  });

  // -------------------------------
  // A. "day after tomorrow" (WITH spelling mistakes)
  // -------------------------------
  const dayAfterTomorrowRegex = /(day\s*after\s*t+o*m*r*o*w*)|(day\s*after\s*tmr)|(day\s*after\s*tmw)/i;
  if (dayAfterTomorrowRegex.test(lower)) {
    console.log("No Chrono results, checking day-after-tomorrow...");
    if (dayAfterTomorrowRegex.test(lower)) {
      console.log("Matched day-after-tomorrow pattern:", lower.match(dayAfterTomorrowRegex));

      const d = new Date();
      d.setDate(d.getDate() + 2);
      console.log("Computed day-after-tomorrow date:", d.toString());

      results = [{ start: createMockParsedComponent(d) }];
      console.log("Inserted fallback result for day-after-tomorrow:", results[0].start.date()?.toString());
    } else {
      console.log("Did NOT match day-after-tomorrow pattern.");
    }
  } else {
    console.log("Chrono already returned results, skipping day-after-tomorrow fallback.");
  }

  // -------------------------------
  // B. TOMORROW (misspellings + tmr shortcut)
  // -------------------------------
  const tomorrowRegex = /\b(tom?o?r*r?o?w+|tmr|tmrw|tmro|tmw|tmmrw|tomr)\b/i;
  if (results.length === 0 && tomorrowRegex.test(lower)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    results = [{ start: createMockParsedComponent(d) }];
  }

  // -------------------------------
  // C. "after X days"
  // -------------------------------
  const afterXDaysRegex = /after\s+(\d+)\s+days?/i;
  if (results.length === 0 && afterXDaysRegex.test(lower)) {
    const n = parseInt(lower.match(afterXDaysRegex)[1], 10);
    const d = new Date();
    d.setDate(d.getDate() + n);
    results = [{ start: createMockParsedComponent(d) }];
  }

  // -------------------------
  // 2. Convert Chrono results to date/time
  // -------------------------
  let dateTime = null;
  let date = null;

  if (results.length > 0) {
    const parsedDate = results[0].start;
console.log(parsedDate);
console.log(results[0].start.date())
console.log(results[0].start.get("hour"));
const temp=results[0].start.date()
console.log(temp)
    // Extract user-intended hour
    // const matchHour = text.match(/(\d{1,2})(?:\s*(am|pm))?/i);
    // let userHour = null;

    // if (matchHour) {
    //   userHour = parseInt(matchHour[1], 10);
    //   if (matchHour[2]) {
    //     const ap = matchHour[2].toLowerCase();
    //     if (ap === "pm" && userHour < 12) userHour += 12;
    //     if (ap === "am" && userHour === 12) userHour = 0;
    //   }
    // }

    // const chronoHour = parsedDate.get("hour");
    // if (userHour !== null && userHour !== chronoHour) {
    //   parsedDate.assign("hour", userHour);
    // }

    // if (!/:\d{2}/.test(text)) {
    //   parsedDate.assign("minute", 0);
    //   parsedDate.assign("second", 0);
    // }
    let datePart = null;
let timePart = null;

for (const r of results) {
  if (!datePart && (r.start.isCertain("day") || r.start.isCertain("weekday"))) {
    datePart = r.start;
  }
  if (!timePart && r.start.isCertain("hour")) {
    timePart = r.start;
  }
}
const year  = datePart.get("year");
const month = datePart.get("month") - 1;
const day   = datePart.get("day");

const hour   = timePart?.get("hour") ?? 10;
const minute = timePart?.get("minute") ?? 0;

 dateTime = new Date(year, month, day, hour, minute, 0, 0);
console.log(dateTime)


    //dateTime = results[0].start.date();
    date = formatDateKey(dateTime);
    console.log(dateTime)
  }
  const dates = results.filter(p => p.start).map(p => p.start);
  console.log(dates)
  // -------------------------
  // 3. Detect purpose
  // -------------------------
  let purpose = "unknown";
  for (let k of EVENT_KEYWORDS) {
    if (lower.includes(k)) {
      purpose = k;
      break;
    }
  }
  
  let flatEvents=[];
  if (events && typeof events === 'object') {
        // 2. Iterate over the object's values (which are the arrays of events)
        for (const dateKey in events) {
            // Check if the value is an array before concatenating
            if (Array.isArray(events[dateKey])) {
                flatEvents = flatEvents.concat(events[dateKey]);
            }
        }
    }
    console.log(flatEvents)
    const now= new Date();
//   const latestEvent = flatEvents
//  .filter(e => e.chatid === msg.chatid && e.title.toLowerCase() === purpose.toLowerCase() )
//   .sort((a,b) => b.date - a.date)[0];
const latestEvent = flatEvents
  .filter(e =>
    e.chatid === msg.chatid &&
    e.title.toLowerCase() === purpose.toLowerCase() &&
    new Date(e.date) > now          
  )
  .sort((a, b) => new Date(a.date) - new Date(b.date)) 
  [0];
  console.log(latestEvent)
  // -------------------------
  // 4. Detect reschedule
  // -------------------------
  if (isReschedule) {
    console.log("inside reschedule")
    // --- Two dates --- (Logic remains robust and unchanged)
    if (dates.length >= 2) {
      const d1 = dates[0].date();
      const d2 = dates[1].date();
      let oldEvent = null;
      let oldDate = null;
      let newDate = null;
  console.log("inside two dates ",d1,"-",d2.toDateString());
      // Search events in the same chat for matching dates
      for (const ev of flatEvents.filter(e => e.chatid === msg.chatid && e.title.toLowerCase()===purpose.toLowerCase() && new Date(e.date)>now)) {
  console.log(ev)
        const evDateStr = ev.date;
console.log(toDateOnly(evDateStr)+' '+toDateOnly(d1))
        if (toDateOnly(evDateStr) === toDateOnly(d1)) {
          oldEvent = ev;
          oldDate = d1;
          newDate = d2;
console.log(oldEvent)
          break;
        }
        if (toDateOnly(evDateStr) === toDateOnly(d2)) {
          oldEvent = ev;
          oldDate = d2;
          newDate = d1;
          console.log(oldEvent)
          break;
        }
      }

      if (!oldEvent && latestEvent) {
        // Fallback: if no match found, pick latestEvent and use d1 as the new date
        oldEvent = latestEvent;
        oldDate = latestEvent.dateTime;
        newDate = d1;
console.log(oldEvent)
      }
      if (newDate < new Date()) {
          newDate.setDate(newDate.getDate() + 7);
        }
      console.log("old event found ",oldEvent);
      if (oldEvent) {
        
        oldEvent.action = "postponed to "+formatDateKey(newDate);
        oldEvent.color = getEventColor('postponed')
        update(oldEvent)
        // Preserve time if newDate has no time
        if (newDate.getHours() === 0 && newDate.getMinutes() === 0) {
          newDate.setHours(oldEvent.dateTime.getHours());
          newDate.setMinutes(oldEvent.dateTime.getMinutes());
          newDate.setSeconds(oldEvent.dateTime.getSeconds());
        }

        const newEvent = {
          id: Date.now(),
          chatid: msg.chatid,
          msgref: msg.msgid,
          message: `${msg.sendername?msg.sendername:'You'}: ${text}`,
          purpose: oldEvent.title,
          dateTime: newDate,
 date: formatDateKey(newDate),
  tempid:msg.tempmsgid,
 action: "rescheduled from "+formatDateKey(new Date(oldEvent.date)),
 showFull: false,
 isSimulation: msg.isSimulation
 };
 console.log(newEvent)
 sendToCalendar(newEvent);
 console.log("Rescheduled: old", oldDate.toDateString(), "→ new", newEvent.date);
      }
      return;
    }

    // --- One date --- Correctly handles targeted postpone vs. reschedule to date
    if (dates.length === 1 && latestEvent) {
  console.log('inside one date');
      const parsedDate = dates[0].date();
console.log(parsedDate);
      
      // 1. Attempt to find an event matching the parsed date (Targeted Postpone)
      let targetEvent = flatEvents.find(ev =>
        ev.chatid === msg.chatid &&
        ev.title.toLowerCase() === purpose.toLowerCase() &&
        ev.status !== "cancelled" &&
        new Date(ev.date)> now &&
        toDateOnly(ev.date) === toDateOnly(parsedDate)
      );

      let oldEvent = null;
      let newDate = null;
  console.log(targetEvent)
      if (targetEvent) {
        // Case 1: "Saturday meeting postponed." (The parsed date IS the old date)
        oldEvent = targetEvent;
        // Crucial: Since no new date was given, we modify the old event and STOP.
        oldEvent.action = "postponed";
        oldEvent.color=getEventColor('postponed');
        update(oldEvent);
        console.log("Targeted Postpone (No new date):", oldEvent.date);
        return;
      } else {
        // Case 2: "Meeting is postponed to Saturday." (The parsed date IS the new date)
        oldEvent = latestEvent;
        let newDate = parsedDate;
        if (newDate < new Date()) {
          newDate.setDate(newDate.getDate() + 7);
        }
        
        oldEvent.action = "postponed to "+formatDateKey(newDate);
        oldEvent.color=getEventColor('postponed')
update(oldEvent);
        // Preserve time if new date has no time
        if (newDate.getHours() === 0 && newDate.getMinutes() === 0) {
          newDate.setHours(oldEvent.dateTime.getHours());
          newDate.setMinutes(oldEvent.dateTime.getMinutes());
          newDate.setSeconds(oldEvent.dateTime.getSeconds());
        }
        
        const newEvent = {
          id: Date.now(),
          chatid: msg.chatid,
          msgref: msg.msgid,
          message: `${msg.sendername?msg.sendername:'You'}: ${text}`,
          purpose: oldEvent.title,
          dateTime: newDate,
          date: formatDateKey(newDate),
tempid:msg.tempmsgid,
          action: "rescheduled from "+formatDateKey(new Date(oldEvent.date)),
          showFull: false,
          isSimulation: msg.isSimulation
        };
  console.log(newEvent)
        sendToCalendar(newEvent);
        console.log("Rescheduled latest event to new date:", newEvent.date);
        return;
      }
    }

 // --- No date --- (Logic remains robust and unchanged)
 if (!dates.length && latestEvent) {
 
 latestEvent.action = "postponed";
 latestEvent.color=getEventColor('postponed')
 update(latestEvent);
 //console.log("Postponed latest event with no new date:", latestEvent.dateTime.toDateString());
 return;
 }
 }
if (isCancel) {
  console.log("inside cancel")
  let targetEvent;
  if(!dates.length && latestEvent){
    targetEvent=latestEvent;
  }
  else{
    const parsedDate = dates[0].date();
console.log(parsedDate);
let newDate = parsedDate;
        if (newDate < new Date()) {
          newDate.setDate(newDate.getDate() + 7);
        }
      // 1. Attempt to find an event matching the parsed date (Targeted Postpone)
         targetEvent = flatEvents.find(ev =>
        ev.chatid === msg.chatid &&
        ev.title.toLowerCase() === purpose.toLowerCase() &&
        ev.status !== "cancelled" &&
        new Date(ev.date)> now &&
        toDateOnly(ev.date) === toDateOnly(newDate)
      );
  }
    if (!targetEvent) {
      targetEvent=latestEvent;
    }


    if (targetEvent) {

      targetEvent.action = "cancelled";
      targetEvent.color = getEventColor('cancelled')
      update(targetEvent);
      //console.log("Cancelled event:", targetEvent.dateTime.t);
    } else {
      console.log("No matching event to cancel");
    }
    return;
  }
  // -------------------------
  // 5. Final event object
  // -------------------------
  const newEvent = {
    id: Date.now(),
    date,
    dateTime,
    purpose,
    action:'scheduled',
    message: `${msg.sendername?msg.sendername:'You'}: ${text}`,
    msgref: msg.msgid,
    chatid: msg.chatid,
    tempid:msg.tempmsgid,
    showFull: false,
    isSimulation: msg.isSimulation,
  };

  console.log("Final newEvent object:", JSON.stringify(newEvent, null, 2));

  // -------------------------
  // 6. Save + send to calendar
  // -------------------------
  setEvents(prev => [...prev, newEvent]);
  sendToCalendar(newEvent);

  console.log("=== handleParse end ===");
}, [sendToCalendar]);

  const update=async(event)=>{
    console.log(event);
    if (event.isSimulation) {
      console.log("[EventPanel] Simulation event updated locally, skipping API request.");
      return;
    }
    const { id, title, startTime, endTime, description, color, msgref, chatid, action, date } = event;
    const body={
      eventId:id,
      userId:localStorage.getItem('userid'),
      eventTitle:title,
      startTime:startTime?add(date,startTime):add(date,'10:00'),
      endTime:endTime?add(date,endTime) :'',
      eventDetails:description || '',
      eventColor:color || '',
      msgId:msgref || '',
      chatId:chatid || '',
      action:action ,
    }
    try {
      const response=await fetch(`${API}/user/update`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            });
          if(response.ok){
            console.log(await response.text());
          }
    } catch (error) {
      console.log(error+"updating");
    }
  }
const add=(date,time)=>{
    const [hours, minutes] = time.split(':').map(Number);
    const utc=new Date(date).setHours(hours,minutes);
    return new Date(utc).toISOString();
  }

  // Set the parse callback when component mounts
  useEffect(() => {
    console.log("Registering handleParse with messageStore");
    messageStore.setParseCallback(handleParse);

    return () => {
      // Cleanup on unmount
      messageStore.setParseCallback(null);
    };
  }, [handleParse]);

  return (
    <EventContext.Provider value={{ handleParse, event }}>
      {children}
    </EventContext.Provider>
  );
}

export const useEvent = () => {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within EventPanel');
  }
  return context;
};
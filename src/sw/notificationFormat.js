/**
 * Pure formatting module for v2 Web Push Notifications.
 * No service-worker globals, no I/O, completely testable.
 */

// Format time as "12:30 PM", "9:30 AM", etc. (Asia/Kolkata / IST if UTC string)
function formatTime(isoStr, ctx) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  // Use Intl.DateTimeFormat with Asia/Kolkata timezone
  const tz = (ctx && ctx.timeZone) || 'Asia/Kolkata';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: tz,
  }).format(d);
}

// Format short date as "Thu, Oct 29"
function formatDateShort(isoStr, ctx) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const tz = (ctx && ctx.timeZone) || 'Asia/Kolkata';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: tz,
  }).format(d);
}

// Relative day formatting: "Today", "Tomorrow", "Yesterday", or "Thu, Oct 29"
function formatRelativeDay(isoStr, ctx) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const tz = (ctx && ctx.timeZone) || 'Asia/Kolkata';
  const now = (ctx && ctx.now) ? new Date(ctx.now) : new Date();

  const getDateStr = (date) =>
    new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz }).format(date);

  const targetDateStr = getDateStr(d);
  const nowDateStr = getDateStr(now);

  const nowPlus1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowDateStr = getDateStr(nowPlus1);

  if (targetDateStr === nowDateStr) return 'Today';
  if (targetDateStr === tomorrowDateStr) return 'Tomorrow';
  return formatDateShort(isoStr, ctx);
}

// Relative due calculation for assignments: "due in X hours", "due tomorrow", "due today"
function formatRelativeDue(isoStr, ctx) {
  if (!isoStr) return 'soon';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return 'soon';
  const now = (ctx && ctx.now) ? new Date(ctx.now) : new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  const tz = (ctx && ctx.timeZone) || 'Asia/Kolkata';
  const getDateStr = (date) =>
    new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: tz }).format(date);

  if (diffHours > 0 && diffHours < 24 && getDateStr(d) === getDateStr(now)) {
    return diffHours === 1 ? 'in 1 hour' : `in ${diffHours} hours`;
  }
  const nowPlus1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (getDateStr(d) === getDateStr(nowPlus1)) {
    return 'tomorrow';
  }
  if (getDateStr(d) === getDateStr(now)) {
    return 'today';
  }
  return `on ${formatDateShort(isoStr, ctx)}`;
}

// Truncates text with ellipsis if exceeding maxLen
function truncate(str, maxLen) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

// Map message types to standard display label/preview
function formatMsgContent(t, x) {
  const type = (t || 'text').toLowerCase();
  const text = x || '';
  switch (type) {
    case 'text':
      return text;
    case 'assignment':
      return text ? `📚 Assignment: ${text}` : '📚 Assignment';
    case 'poll':
      return '📊 Poll';
    case 'image':
      return '📷 Photo';
    case 'video':
      return '🎥 Video';
    case 'audio':
    case 'voice':
      return '🎤 Voice message';
    case 'file':
      return '📁 File';
    default:
      return text || 'New message';
  }
}

/**
 * Formats a push notification payload into display parameters:
 * title, body, icon, tag, data, renotify, silent, vibrate.
 */
export function formatPushNotification(data, ctx) {
  if (!data) {
    return {
      title: 'LetsChat',
      body: 'New notification',
      icon: '/icon-192.png',
      tag: 'letschat-default',
      data: {},
      renotify: true,
      silent: false,
      vibrate: [200, 100, 200],
    };
  }

  const type = data.type || 'CHAT';
  const isSilent = data.silent === 'true';

  let title = 'LetsChat';
  let body = '';
  let tag = 'letschat-default';

  if (type === 'CHAT') {
    const chatId = data.chatId || '';
    const chatName = truncate(data.chatName || data.senderName || 'Chat', 40);
    const chatKind = data.chatKind || 'group';
    const alertKind = data.alertKind || 'message';
    const senderName = data.senderName || 'Someone';
    const msgType = data.msgType || 'text';
    const preview = data.preview || '';
    const newCount = parseInt(data.newCount || '1', 10);
    const msgId = data.msgId || '';

    // Tag assignment
    if (alertKind === 'mention') {
      tag = `mention-${chatId}-${msgId || Date.now()}`;
    } else if (alertKind === 'reply') {
      tag = `reply-${chatId}-${msgId || Date.now()}`;
    } else {
      tag = `chat-${chatId}`;
    }

    if (alertKind === 'mention') {
      title = chatKind === 'dm' ? senderName : `${senderName} mentioned you in ${chatName}`;
      body = formatMsgContent(msgType, preview);
    } else if (alertKind === 'reply') {
      title = chatKind === 'dm' ? senderName : `${senderName} replied to you in ${chatName}`;
      body = formatMsgContent(msgType, preview);
    } else if (newCount > 1 || (data.items && (() => { try { return JSON.parse(data.items).length > 1; } catch (e) { return false; } })())) {
      // Merged batch
      title = `${chatName} · ${newCount} new messages`;

      let items = [];
      if (data.items) {
        try {
          items = JSON.parse(data.items);
        } catch (e) {
          items = [];
        }
      }

      if (items.length === 0) {
        body = formatMsgContent(msgType, preview);
      } else {
        // Show up to the last 3 messages
        const recentItems = items.slice(-3);
        const lines = recentItems.map((item) => {
          const content = formatMsgContent(item.t, item.x);
          const line = (chatKind !== 'dm' && item.s) ? `${item.s}: ${content}` : content;
          return truncate(line, 90);
        });

        if (newCount > 3) {
          lines.push(`+${newCount - 3} more`);
        }
        body = lines.join('\n');
      }
    } else {
      // Single normal message
      if (chatKind === 'dm') {
        title = chatName;
        body = formatMsgContent(msgType, preview);
      } else {
        title = chatName;
        body = `${senderName}: ${formatMsgContent(msgType, preview)}`;
      }
    }
  } else if (type === 'EVENT') {
    const eventId = data.eventId || '';
    tag = `event-reminder-${eventId}`;
    const eventTitle = data.eventTitle || 'Event';
    const minutesBefore = data.minutesBefore || '15';
    title = `${eventTitle} starts in ${minutesBefore} min`;

    const parts = [];
    const timeStr = formatTime(data.startTime, ctx);
    if (timeStr) parts.push(timeStr);
    if (data.location) parts.push(data.location);
    if (data.chatName) parts.push(data.chatName);
    body = parts.join(' · ');
  } else if (type === 'EVENT_CHANGED') {
    const eventId = data.eventId || '';
    tag = `event-changed-${eventId}`;
    const action = (data.action || 'updated').toLowerCase();
    const eventTitle = data.eventTitle || 'Event';
    const chatName = data.chatName || '';
    const location = data.location || '';
    const startTime = data.startTime || '';

    if (action === 'created' || action === 'scheduled') {
      title = `New event: ${eventTitle}`;
      const dayStr = formatRelativeDay(startTime, ctx);
      const timeStr = formatTime(startTime, ctx);
      const parts = [`${dayStr}, ${timeStr}`];
      if (location) parts.push(location);
      if (chatName) parts.push(chatName);
      body = parts.join(' · ');
    } else if (action === 'rescheduled' || action === 'postponed') {
      title = `${eventTitle} was rescheduled`;
      let timeDiffStr = '';
      if (data.changes) {
        try {
          const diffs = JSON.parse(data.changes);
          const timeDiff = diffs.find((d) => d.field === 'time');
          if (timeDiff && timeDiff.from && timeDiff.to) {
            timeDiffStr = `Time: ${formatTime(timeDiff.from, ctx)} → ${formatTime(timeDiff.to, ctx)}`;
          }
        } catch (ignored) {}
      }
      if (!timeDiffStr && startTime) {
        timeDiffStr = `Time: ${formatTime(startTime, ctx)}`;
      }
      body = chatName ? `${timeDiffStr}\n${chatName}` : timeDiffStr;
    } else if (action === 'cancelled') {
      title = `${eventTitle} was cancelled`;
      const dayStr = formatRelativeDay(startTime, ctx).toLowerCase();
      const timeStr = formatTime(startTime, ctx);
      body = chatName
        ? `Was ${dayStr} at ${timeStr} · ${chatName}`
        : `Was ${dayStr} at ${timeStr}`;
    } else if (action === 'booking_request') {
      const personName = data.personName || 'A user';
      title = `Meeting request from ${personName}`;
      body = `${formatDateShort(startTime, ctx)} · ${formatTime(startTime, ctx)}`;
    } else if (action === 'booking_approved') {
      const personName = data.personName || 'Host';
      title = `Meeting confirmed with ${personName}`;
      body = `${formatDateShort(startTime, ctx)} · ${formatTime(startTime, ctx)}`;
    } else if (action === 'booking_declined') {
      const personName = data.personName || 'Host';
      title = `Meeting declined by ${personName}`;
      body = `${formatDateShort(startTime, ctx)} · ${formatTime(startTime, ctx)}`;
    } else {
      title = `${eventTitle} updated`;
      body = chatName || 'Event details updated.';
    }
  } else if (type === 'DAILY') {
    const total = parseInt(data.total || '0', 10);
    tag = `daily-summary-${data.date || 'today'}`;
    title = `Today: ${total} ${total === 1 ? 'event' : 'events'}`;

    let events = [];
    if (data.eventsV2) {
      try {
        events = JSON.parse(data.eventsV2);
      } catch (e) {
        events = [];
      }
    }
    const lines = events.map((ev) => `${formatTime(ev.startTime, ctx)} ${ev.title}`);
    body = lines.join('\n');
  } else if (type === 'ASSIGNMENT_MISSING') {
    const total = parseInt(data.total || '0', 10);
    tag = 'assignment-missing';
    title = `${total} ${total === 1 ? 'assignment' : 'assignments'} due soon`;

    let assignments = [];
    if (data.assignmentsV2) {
      try {
        assignments = JSON.parse(data.assignmentsV2);
      } catch (e) {
        assignments = [];
      }
    }
    const lines = assignments.map(
      (a) => `${a.title} · due ${formatRelativeDue(a.deadline, ctx)}`
    );
    body = lines.join('\n');
  }

  return {
    title,
    body,
    icon: '/icon-192.png',
    tag,
    data: {
      ...data,
      path: resolveNotificationPath(data),
      alertTs: Date.now(),
    },
    renotify: !isSilent,
    silent: isSilent,
    vibrate: isSilent ? [] : [200, 100, 200],
  };
}

/**
 * Pure route resolver: computes target path from payload fields.
 */
export function resolveNotificationPath(data) {
  if (!data) return '/';
  const type = data.type;
  if (type === 'EVENT' || type === 'EVENT_CHANGED') {
    if (data.action === 'cancelled') return '/calendar';
    if (data.eventId) return `/calendar?eventId=${data.eventId}&viewInfo=true`;
    return '/calendar';
  }
  if (type === 'DAILY') return '/calendar';
  if (type === 'ASSIGNMENT_MISSING') return '/communities';
  if (data.chatId) {
    const base = `/chat/${data.chatId}`;
    const params = [];
    if (data.spaceId && data.spaceId !== '0') params.push(`spaceId=${data.spaceId}`);
    if (data.msgId) params.push(`msgId=${data.msgId}`);
    return params.length > 0 ? `${base}?${params.join('&')}` : base;
  }
  return '/';
}

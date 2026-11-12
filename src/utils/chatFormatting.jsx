import React from 'react';

export const MARBLE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="48"><filter id="m" x="0" y="0" width="100%" height="100%"><feTurbulence type="turbulence" baseFrequency="0.018 0.06" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -1.6 0 0 0 0.42"/></filter><rect width="96" height="48" filter="url(#m)"/></svg>';

export const MARBLE_URL = `url("data:image/svg+xml,${encodeURIComponent(MARBLE_SVG)}")`;

export const R2_PUBLIC_URL = "https://pub-91d12b8ece574bde8ccd1c26b5367b6d.r2.dev/";

export const resolveChatMediaUrl = (val) => {
  if (!val) return null;
  const s = String(val).trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:') || s.startsWith('data:')) return s;
  return `${R2_PUBLIC_URL}${s.replace(/^\/+/, '')}`;
};

export const URL_REGEX = /(https?:\/\/[^\s]+)/g;
export const MENTION_REGEX = /(?:<|&lt;)@[^:]+:(?:.*?)(?:>|&gt;)/g;
export const COMBINED_REGEX = /(https?:\/\/[^\s]+|(?:<|&lt;)@[^:]+:(?:.*?)(?:>|&gt;))/g;

export function getCurrentLocalDateTimeString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

const EMOJI_REACTION_REGEX = /^(?:[\p{Extended_Pictographic}\p{Emoji_Presentation}\u{1F1E6}-\u{1F1FF}](?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}\u{1F1E6}-\u{1F1FF}](?:\uFE0F|\p{Emoji_Modifier})?)*|[0-9#*]\uFE0F?\u20E3)+$/u;

export const isEmojiReaction = (str) => {
  if (!str || typeof str !== 'string') return false;
  const trimmed = str.trim();
  if (!trimmed) return false;
  return EMOJI_REACTION_REGEX.test(trimmed);
};

export const stripMentionEncoding = (text) => {
  if (!text) return text;
  return text.replace(/(?:<|&lt;)@[^:]+:(.*?)(?:>|&gt;)/g, '@$1');
};

const LANGUAGE_NAME_MAP = {
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  jsx: 'JSX',
  tsx: 'TSX',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  py: 'Python',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  'c++': 'C++',
  c: 'C',
  cs: 'C#',
  csharp: 'C#',
  rb: 'Ruby',
  ruby: 'Ruby',
  go: 'Go',
  rs: 'Rust',
  rust: 'Rust',
  php: 'PHP',
  sql: 'SQL',
  sh: 'Bash',
  bash: 'Bash',
  xml: 'XML',
  yaml: 'YAML',
  yml: 'YAML',
  md: 'Markdown',
};

export const formatLanguageName = (raw) => {
  if (!raw) return 'Code';
  const low = raw.trim().toLowerCase();
  if (LANGUAGE_NAME_MAP[low]) return LANGUAGE_NAME_MAP[low];
  return low.charAt(0).toUpperCase() + low.slice(1);
};

export const renderInlineStyles = (rawText, keyPrefix = '') => {
  if (!rawText) return null;
  const tokens = rawText.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return tokens.map((token, idx) => {
    if (!token) return null;
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return <code key={`${keyPrefix}-code-${idx}`} className="msg-inline-code">{token.slice(1, -1)}</code>;
    }
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return <strong key={`${keyPrefix}-b-${idx}`}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return <em key={`${keyPrefix}-i-${idx}`}>{token.slice(1, -1)}</em>;
    }
    return token;
  });
};

export const renderLinkifiedText = (text, options = {}) => {
  if (!text) return null;
  const { onLinkClick } = options;
  const parts = text.split(COMBINED_REGEX);
  const myUserId = localStorage.getItem('userid');
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.match(URL_REGEX)) {
      const displayUrl = part.replace(/^https?:\/\//i, '');
      return (
        <span
          key={i}
          className="msg-link"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onLinkClick?.({
              url: part,
              x: e.clientX,
              y: e.clientY,
            });
          }}
        >
          {displayUrl}
        </span>
      );
    } else if (part.match(MENTION_REGEX)) {
      const match = part.match(/(?:<|&lt;)@([^:]+):(.*?)(?:>|&gt;)/);
      if (match) {
        const uid = match[1];
        const name = match[2];
        const isMe = uid === myUserId;
        return (
          <span
            key={i}
            style={{
              color: isMe ? 'var(--warning-color)' : 'var(--accent-text)',
              fontWeight: isMe ? 'bold' : '600',
              backgroundColor: isMe ? 'rgba(245, 158, 11, 0.15)' : 'var(--accent-tint)',
              padding: '2px 6px',
              borderRadius: '6px',
              margin: '0 2px',
            }}
          >
            @{name}
          </span>
        );
      }
    }
    return renderInlineStyles(part, `txt-${i}`);
  });
};

export const renderFormattedText = (text, options = {}) => {
  if (!text) return null;

  if (text.includes('```')) {
    const codeBlockParts = text.split('```');
    return codeBlockParts.map((part, index) => {
      if (index % 2 === 1) {
        const lines = part.split('\n');
        let lang = 'Code';
        let codeContent = part;
        if (lines.length > 1 && lines[0].trim().length > 0 && !lines[0].includes(' ')) {
          lang = formatLanguageName(lines[0].trim());
          codeContent = lines.slice(1).join('\n');
        }
        return (
          <div key={index} className="msg-code-block">
            <div className="msg-code-header">
              <span>{lang}</span>
              <button
                type="button"
                className="msg-code-copy-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(codeContent.trim());
                  const btn = e.currentTarget;
                  btn.innerText = 'Copied';
                  setTimeout(() => { if (btn) btn.innerText = 'Copy'; }, 1500);
                }}
                aria-label={`Copy ${lang} code`}
              >
                Copy
              </button>
            </div>
            <pre className="msg-code-pre">
              {codeContent.trim()}
            </pre>
          </div>
        );
      }
      return renderLinkifiedText(part, options);
    });
  }

  return renderLinkifiedText(text, options);
};

export const formatTime12Hour = (timestamp, showSeconds = false) => {
  if (!timestamp) return '';
  if (typeof timestamp === 'string' && /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i.test(timestamp.trim())) {
    return timestamp.trim().toUpperCase();
  }
  try {
    let d;
    if (typeof timestamp === 'number') {
      d = new Date(timestamp < 1e11 ? timestamp * 1000 : timestamp);
    } else if (typeof timestamp === 'string') {
      const trimmed = timestamp.trim();
      if (/^\d+(\.\d+)?$/.test(trimmed)) {
        const num = parseFloat(trimmed);
        d = new Date(num < 1e11 ? num * 1000 : num);
      } else if (trimmed.includes('T') || trimmed.includes('-')) {
        let str = trimmed;
        if (!str.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(str)) {
          str = str.replace(' ', 'T') + '+05:30';
        }
        d = new Date(str);
      } else if (trimmed.includes(',') && /^\[?\d{4},/.test(trimmed)) {
        const parts = trimmed.replace(/^\[|\]$/g, '').split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n));
        if (parts.length >= 3) {
          const utcMs = Date.UTC(parts[0], (parts[1] || 1) - 1, parts[2] || 1, parts[3] || 0, parts[4] || 0, parts[5] || 0);
          d = new Date(utcMs - 19800000);
        }
      } else {
        d = new Date(timestamp);
      }
    } else if (Array.isArray(timestamp) && timestamp.length >= 3) {
      const utcMs = Date.UTC(timestamp[0], (timestamp[1] || 1) - 1, timestamp[2] || 1, timestamp[3] || 0, timestamp[4] || 0, timestamp[5] || 0);
      d = new Date(utcMs - 19800000);
    } else {
      d = new Date(timestamp);
    }

    if (isNaN(d.getTime())) return String(timestamp);
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      second: showSeconds ? '2-digit' : undefined,
      hour12: true,
    }).format(d);
  } catch {
    return String(timestamp);
  }
};

export const formatDateWithLabel = (timestamp) => {
  const messageDate = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  if (isSameDay(messageDate, today)) {
    return `Today, ${messageDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  } else if (isSameDay(messageDate, yesterday)) {
    return `Yesterday, ${messageDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  }
  return messageDate.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const getDateOnly = (timestamp) => {
  return new Date(timestamp).toISOString().split('T')[0];
};

export const isWithin24Hours = (timestamp) => {
  if (!timestamp) return false;
  const msgTime = new Date(timestamp).getTime();
  if (isNaN(msgTime)) return false;
  const elapsed = Date.now() - msgTime;
  return elapsed >= 0 && elapsed < 24 * 60 * 60 * 1000;
};

export const formatTimeRemaining = (timestamp) => {
  if (!timestamp) return '';
  const msgTime = new Date(timestamp).getTime();
  if (isNaN(msgTime)) return '';
  const remainingMs = (24 * 60 * 60 * 1000) - (Date.now() - msgTime);
  if (remainingMs <= 0) return 'Expired';
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}h left`;
  return `${minutes}m left`;
};

export const formatBannerText = (msg) => {
  if (!msg) return '';
  const myId = localStorage.getItem('userid');
  const isMe = String(msg.userid || msg.senderid) === String(myId);

  if (typeof msg.content === 'string' && msg.content.includes('/')) {
    const parts = msg.content.split('/');
    const othersText = parts[0]?.trim();
    const myText = parts[1]?.trim();
    return isMe ? (myText || othersText) : othersText;
  }

  if (isMe && msg.sendername && typeof msg.content === 'string') {
    return msg.content.replace(new RegExp(`^${msg.sendername}`, 'i'), 'You');
  }

  return msg.content || '';
};

const parseEventDateMs = (val) => {
  if (!val) return null;
  if (typeof val === 'number') return val < 1e11 ? val * 1000 : val;
  if (typeof val === 'string' && /^\d+(\.\d+)?$/.test(val.trim())) {
    const num = parseFloat(val.trim());
    return num < 1e11 ? num * 1000 : num;
  }
  const parsed = new Date(val).getTime();
  return isNaN(parsed) ? null : parsed;
};

export const isEventPassed = (m, { groupEventsList = [], events = null, currentTime = Date.now() } = {}) => {
  if (!m) return false;
  const eventId = m.repliedto || m.repliedTo || m.eventid || m.groupEventId || (typeof m.content === 'string' ? m.content.split('/')[2] : null);

  let eventObj = null;
  if (eventId && groupEventsList.length > 0) {
    eventObj = groupEventsList.find((e) =>
      e.groupEventId === eventId ||
      String(e.eventId) === String(eventId) ||
      String(e.id) === String(eventId)
    );
  }

  if (!eventObj && m.content && groupEventsList.length > 0) {
    const cleaned = (m.content.split('/')[0] || m.content).toLowerCase();
    eventObj = groupEventsList.find((e) => e.eventTitle && cleaned.includes(e.eventTitle.toLowerCase()));
  }

  if (!eventObj && events) {
    const allMediatorEvents = Object.values(events).flat();
    if (eventId) {
      eventObj = allMediatorEvents.find((e) =>
        e.groupEventId === eventId ||
        String(e.id) === String(eventId) ||
        String(e.eventId) === String(eventId)
      );
    }
    if (!eventObj && m.content) {
      const cleaned = (m.content.split('/')[0] || m.content).toLowerCase();
      eventObj = allMediatorEvents.find((e) => e.title && cleaned.includes(e.title.toLowerCase()));
    }
  }

  if (eventObj) {
    if (eventObj.action === 'cancelled') {
      return true;
    }
    const rawStart = eventObj.startTime || eventObj.start || eventObj.date;
    const rawEnd = eventObj.endTime || eventObj.end;
    const startMs = parseEventDateMs(rawStart);
    const endMs = parseEventDateMs(rawEnd) || (startMs ? startMs + 60 * 60 * 1000 : null);
    if (endMs && endMs <= currentTime) {
      return true;
    }
  }
  return false;
};

export const isEventBannerPin = (m) => {
  if (!m) return false;
  if (m.type === 'event-banner-pin') return true;
  if (m.type === 'banner-pin' || m.type === 'banner') {
    if (m.eventid || m.groupEventId) return true;
    if (typeof m.content === 'string') {
      const lower = m.content.toLowerCase();
      if (lower.includes('scheduled') || lower.includes('postponed') || lower.includes('cancelled')) {
        return true;
      }
    }
  }
  return false;
};

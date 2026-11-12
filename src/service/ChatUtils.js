import {
  Users, User, Briefcase, Coffee, Heart, BookOpen,
  FileText, FileSpreadsheet, FileArchive, FileCode, FileAudio, FileVideo, FileImage, File
} from 'lucide-react';

/**
 * ChatUtils.js
 * Shared UI logic for chat entities.
 */

/**
 * Generates user avatar initials:
 * - If 2+ words (first and last name), takes first letter of first word and last word (e.g. "Load King" -> "LK").
 * - If 1 word, takes first letter (e.g. "Yokesh" -> "Y").
 * - Fallback '?' if empty.
 */
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

export const getChatIcon = (chat) => {
  if (!chat) return User;
  
  // Custom icon override (e.g. for spaces)
  if (chat.icon) return chat.icon;
  
  const type = chat.type?.toLowerCase();
  const rawName = (chat.chatName || chat.userName || chat.name || '').trim();
  const name = rawName.toLowerCase();
  
  if (type === 'classroom') return BookOpen;
  if (type === 'group') return Users;
  
  // Private chat icon logic based on name or keywords
  if (name.includes('team') || name.includes('work')) return Briefcase;
  if (name.includes('coffee') || name.includes('food')) return Coffee;
  if (name.includes('love') || name.includes('family')) return Heart;
  
  if (rawName) {
    return getInitials(rawName);
  }
  
  return User;
};

export const getChatColor = (chatId) => {
  const colors = [
    { from: '#a855f7', to: '#7c3aed', glow: 'rgba(168, 85, 247, 0.4)' },
    { from: '#3b82f6', to: '#1d4ed8', glow: 'rgba(59, 130, 246, 0.4)' },
    { from: '#f97316', to: '#ea580c', glow: 'rgba(249, 115, 22, 0.4)' },
    { from: '#10b981', to: '#059669', glow: 'rgba(16, 185, 129, 0.4)' },
    { from: '#ec4899', to: '#db2777', glow: 'rgba(236, 72, 153, 0.4)' },
    { from: '#06b6d4', to: '#0891b2', glow: 'rgba(6, 182, 212, 0.4)' },
  ];

  let hash = 0;
  const str = String(chatId || '0');
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

/**
 * Retrieves a chat's name from the locally cached chatsMap.
 */
export const getChatName = (chatid) => {
  if (!chatid) return null;
  try {
    const chatsMap = JSON.parse(localStorage.getItem("chatsMap") || "{}");
    return chatsMap[chatid]?.chatName || null;
  } catch (e) {
    console.error("Error reading chatsMap from localStorage", e);
    return null;
  }
};

/**
 * Normalizes user input identifiers:
 * - If input contains '@' (email), preserves casing.
 * - Otherwise (UserId, e.g. aaa002), converts letters to uppercase (AAA002).
 */
export const normalizeIdentifier = (input) => {
  if (!input) return "";
  const trimmed = String(input).trim();
  if (trimmed.includes("@")) {
    return trimmed;
  }
  return trimmed.toUpperCase();
};

/**
 * Formats a timestamp into 12-hour format (e.g., "10:48 AM").
 */
export const parseServerTimestamp = (timestamp) => {
  if (!timestamp) return null;
  const istArrayToDate = (parts) => {
    if (!Array.isArray(parts) || parts.length < 3) return null;
    const utcMs = Date.UTC(parts[0], (parts[1] || 1) - 1, parts[2] || 1, parts[3] || 0, parts[4] || 0, parts[5] || 0);
    return new Date(utcMs - 19800000);
  };
  if (Array.isArray(timestamp)) return istArrayToDate(timestamp);
  if (typeof timestamp === 'number') {
    return new Date(timestamp < 1e11 ? timestamp * 1000 : timestamp);
  }
  if (typeof timestamp === 'string') {
    const trimmed = timestamp.trim();
    if (trimmed.includes(',') && /^\[?\d{4},/.test(trimmed)) {
      const parts = trimmed.replace(/^\[|\]$/g, '').split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
      return istArrayToDate(parts);
    }
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const num = parseFloat(trimmed);
      return new Date(num < 1e11 ? num * 1000 : num);
    }
    if (trimmed.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      let str = trimmed;
      if (!str.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(str)) {
        str = str.replace(' ', 'T') + '+05:30';
      }
      return new Date(str);
    }
  }
  return new Date(timestamp);
};

export const formatTime12Hour = (timestamp) => {
  if (!timestamp) return '';
  if (typeof timestamp === 'string' && /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i.test(timestamp.trim())) {
    return timestamp.trim().toUpperCase();
  }
  try {
    const d = parseServerTimestamp(timestamp);
    if (!d || isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(d);
  } catch {
    return '';
  }
};

/**
 * Resolves icon component, color class, and short label for a file extension.
 */
export const getDocIconInfo = (ext = '') => {
  const e = (ext || '').toUpperCase();

  // 1. PDF
  if (e === 'PDF') {
    return { icon: FileText, className: 'is-pdf', label: 'PDF' };
  }

  // 2. Word / Docs
  if (['DOC', 'DOCX', 'DOT', 'DOTX', 'ODT', 'RTF'].includes(e)) {
    return { icon: FileText, className: 'is-word', label: e || 'DOC' };
  }

  // 3. Excel / Spreadsheets
  if (['XLS', 'XLSX', 'CSV', 'ODS', 'TSV', 'XLSM'].includes(e)) {
    return { icon: FileSpreadsheet, className: 'is-excel', label: e || 'XLS' };
  }

  // 4. PowerPoint / Slides
  if (['PPT', 'PPTX', 'ODP', 'KEY', 'PPS', 'PPSX'].includes(e)) {
    return { icon: FileText, className: 'is-ppt', label: e || 'PPT' };
  }

  // 5. Archives / Compressed
  if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ', 'BZ2', 'XZ', 'ISO'].includes(e)) {
    return { icon: FileArchive, className: 'is-archive', label: e || 'ZIP' };
  }

  // 6. Code / Developer
  if (['JS', 'JSX', 'TS', 'TSX', 'HTML', 'CSS', 'PY', 'JSON', 'JAVA', 'C', 'CPP', 'CS', 'PHP', 'SQL', 'SH', 'YML', 'YAML', 'XML'].includes(e)) {
    return { icon: FileCode, className: 'is-code', label: e || 'CODE' };
  }

  // 7. Audio (sent as file)
  if (['MP3', 'WAV', 'OGG', 'M4A', 'FLAC', 'AAC', 'OPUS'].includes(e)) {
    return { icon: FileAudio, className: 'is-audio', label: e || 'AUDIO' };
  }

  // 8. Video (sent as file)
  if (['MP4', 'MKV', 'AVI', 'MOV', 'WEBM', '3GP', 'WMV'].includes(e)) {
    return { icon: FileVideo, className: 'is-video', label: e || 'VIDEO' };
  }

  // 9. Images (sent as raw file)
  if (['PNG', 'JPG', 'JPEG', 'WEBP', 'SVG', 'GIF', 'PSD', 'AI', 'HEIC'].includes(e)) {
    return { icon: FileImage, className: 'is-image', label: e || 'IMG' };
  }

  // 10. Plain text
  if (['TXT', 'LOG', 'MD'].includes(e)) {
    return { icon: FileText, className: 'is-text', label: e || 'TXT' };
  }

  // Default / Other
  return { icon: File, className: 'is-other', label: e || 'FILE' };
};



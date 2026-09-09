import { Users, User, Briefcase, Coffee, Heart, BookOpen } from 'lucide-react';

/**
 * ChatUtils.js
 * Shared UI logic for chat entities.
 */

export const getChatIcon = (chat) => {
  if (!chat) return User;
  
  // Custom icon override (e.g. for spaces)
  if (chat.icon) return chat.icon;
  
  const type = chat.type?.toLowerCase();
  const name = (chat.chatName || '').toLowerCase();
  
  if (type === 'classroom') return BookOpen;
  if (type === 'group') return Users;
  
  // Private chat icon logic based on name or keywords
  if (name.includes('team') || name.includes('work')) return Briefcase;
  if (name.includes('coffee') || name.includes('food')) return Coffee;
  if (name.includes('love') || name.includes('family')) return Heart;
  
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

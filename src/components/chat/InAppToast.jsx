import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import messageStore from '../../pages/MessageStore';
import { useEventMediator } from '../../service/EventStorage';
import { Calendar, MessageSquare, Clock, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import { getAssignmentFromDB, saveAssignmentToDB, isChatMuted } from '../../service/db';
import { API } from '../../service/UserAuth';

const InAppToast = () => {
  const [notification, setNotification] = useState(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [now, setNow] = useState(new Date());
  const navigate = useNavigate();
  const userId = localStorage.getItem('userid');
  const { getEventById } = useEventMediator();

  // Update "now" every minute for accurate relative times
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let hideTimer = null;

    const handleNewMessage = async (payload) => {
      // payload can be a direct message object or an FCM data payload
      if (!payload) return;

      const type = payload.type || 'CHAT';
      
      // 1. Handle standard CHAT messages
      if (type === 'CHAT') {
        if (payload.bulkLoad || payload.type === 'indicator') return;

        let content = payload.content || payload.message;
        let senderName = payload.sendername || payload.senderName || payload.title || 'New Message';
        let msgType = payload.msgType || payload.type;

        // Unpack FCM foreground message payload if content is in msgs array
        if (!content && payload.msgs) {
          try {
            const list = typeof payload.msgs === 'string' ? JSON.parse(payload.msgs) : payload.msgs;
            if (Array.isArray(list) && list.length > 0) {
              const last = list[list.length - 1];
              if (typeof last === 'string') {
                const parts = last.split('/%20/');
                if (parts.length >= 4) {
                  msgType = parts[1];
                  senderName = parts[2] || senderName;
                  content = parts[3];
                } else {
                  content = last;
                }
              }
            }
          } catch (e) {
            console.error("Failed to parse FCM msgs in InAppToast:", e);
          }
        }

        if (!content) return;

        const targetChatId = payload.chatid || payload.chatId;
        const senderId = payload.userid || payload.senderId || payload.senderid;

        if (senderId && senderId === userId) return;
        if (messageStore.getActivechatbox() && String(targetChatId) === String(messageStore.getActivechatbox())) return;

        let preview = '';
        const isPoll = msgType === 'poll' || Boolean(payload.poll) || (typeof content === 'string' && content.trim().startsWith('{"poll_id"'));
        if (isPoll) {
          preview = '📊 Poll';
        } else {
          switch (msgType) {
            case 'image': preview = '📷 Photo'; break;
            case 'video': preview = '🎥 Video'; break;
            case 'audio': preview = '🎤 Audio'; break;
            case 'voice': preview = '🎤 Voice Message'; break;
            case 'file': preview = '📄 Document'; break;
            case 'assignment': preview = '📚 Assignment'; break;
            case 'poll': preview = '📊 Poll'; break;
            default: preview = content;
          }
        }

        const repliedTo = payload.repliedto || payload.repliedTo;
        let toastTitle = senderName;
        let toastContent = preview;
        let isReplyToUser = false;

        if (repliedTo) {
          let repliedSenderId = null;
          let repliedSenderName = null;

          // 1. Check local IndexedDB cache
          try {
            const db = await new Promise((resolve, reject) => {
              const req = indexedDB.open('LetsChatDB', 16);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => reject(req.error);
            });
            if (db && db.objectStoreNames.contains('messages')) {
              const tx = db.transaction('messages', 'readonly');
              const cached = await new Promise(res => {
                const req = tx.objectStore('messages').get(repliedTo);
                req.onsuccess = () => res(req.result);
                req.onerror = () => res(null);
              });
              if (cached) {
                repliedSenderId = cached.userid || cached.senderid || cached.SenderId;
                repliedSenderName = cached.sendername || cached.UserName || cached.senderName;
              }
            }
          } catch (e) {}

          // 2. Cache miss fallback: Call backend strictly returning chat-specific nickname
          if (!repliedSenderName) {
            try {
              const res = await fetch(`${API}/user/message/sender-info?msgId=${encodeURIComponent(repliedTo)}`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
              });
              if (res.ok) {
                const info = await res.json();
                repliedSenderId = info.senderId;
                repliedSenderName = info.senderName || 'Member';
              }
            } catch (e) {}
          }

          if (userId && repliedSenderId === userId) {
            isReplyToUser = true;
            toastTitle = payload.chatType === 'room' ? `You got a reply in ${payload.chatName || 'Room'}` : 'You got a reply';
            toastContent = `${senderName} replied to You: ${preview}`;
          } else if (repliedSenderName) {
            toastContent = `${senderName} replied to ${repliedSenderName}: ${preview}`;
          }
        }

        // Mute check: suppress toast if conversation is muted, UNLESS direct reply (Reply Override)
        if (targetChatId) {
          try {
            const muted = await isChatMuted(targetChatId);
            if (muted && !isReplyToUser) return;
          } catch (e) {}
        }

        setNotification({
          type: 'CHAT',
          chatid: targetChatId,
          title: toastTitle,
          content: toastContent
        });
      } 
      // 2. Handle EVENT reminders
      else if (type === 'EVENT') {
        setNotification({
          type: 'EVENT',
          eventId: payload.eventId,
          title: payload.title || 'Upcoming Event',
          subtitle: payload.chatName || '',
          chatid: payload.chatId
        });
      }
      // 3. Handle DAILY summary
      else if (type === 'DAILY') {
        let eventIds = [];
        try {
          eventIds = typeof payload.events === 'string' ? JSON.parse(payload.events) : (payload.events || []);
        } catch (e) {
          console.error("Failed to parse DAILY events:", e);
        }

        setNotification({
          type: 'DAILY',
          title: 'Today Events',
          eventIds: eventIds
        });
      }
      // 4. Handle ASSIGNMENT_MISSING
      else if (type === 'ASSIGNMENT_MISSING') {
        let assignmentIds = [];
        try {
          if (typeof payload.assignments === 'string') {
            if (payload.assignments.startsWith('[')) {
              assignmentIds = JSON.parse(payload.assignments);
            } else {
              assignmentIds = payload.assignments.split(',').map(s => s.trim());
            }
          } else {
            assignmentIds = payload.assignments || [];
          }
        } catch (e) {
          console.error("Failed to parse ASSIGNMENT_MISSING ids:", e);
        }

        let details = [];
        try {
          details = await Promise.all(assignmentIds.map(id => getAssignmentFromDB(id)));
        } catch (e) {
          details = [];
        }

        let valid = details.filter(d => !!d);

        // Network fallback: fetch missing assignments from backend if not yet in IndexedDB
        const missingIds = assignmentIds.filter((id, idx) => !details[idx]);
        if (missingIds.length > 0) {
          try {
            const fetched = await Promise.all(
              missingIds.map(async (id) => {
                try {
                  const res = await fetch(`${API}/classroom/assignment/get/${id}`, {
                    headers: {
                      'Content-Type': 'application/json',
                      'User-Id': localStorage.getItem('userid'),
                      'ngrok-skip-browser-warning': 'true'
                    }
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.deadline && typeof data.deadline === 'number') {
                      data.deadline = new Date(data.deadline * 1000).toISOString();
                    }
                    await saveAssignmentToDB({ ...data, id: String(id) });
                    return data;
                  }
                } catch (err) {}
                return null;
              })
            );
            fetched.filter(Boolean).forEach(f => valid.push(f));
          } catch (err) {}
        }

        if (valid.length > 0) {
          setNotification({
            type: 'ASSIGNMENT_MISSING',
            title: 'Pending Assignments',
            assignments: valid
          });
        } else if (assignmentIds.length > 0) {
          setNotification({
            type: 'ASSIGNMENT_MISSING',
            title: 'Pending Assignments',
            assignments: [],
            fallbackCount: assignmentIds.length
          });
        }
      }

      setIsMaximized(false);
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => setNotification(null), 8000);
    };

    messageStore.addListener(handleNewMessage);
    return () => {
      messageStore.removeListener(handleNewMessage);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [userId]);

  const getRelativeTimeText = (event, isAssignment = false) => {
    if (!event) return '';
    const dateToUse = isAssignment ? event.deadline : event.date;
    if (!dateToUse) return '';
    
    const targetDate = new Date(dateToUse);
    if (!isAssignment && event.startTime) {
      const [hours, minutes] = event.startTime.split(':');
      targetDate.setHours(parseInt(hours), parseInt(minutes), 0);
    }
    
    const diffMs = targetDate - now;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins <= 0) return isAssignment ? 'overdue' : 'starting now';
    if (diffMins < 60) return `${isAssignment ? 'due ' : ''}in ${diffMins} mins`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      const remainingMins = diffMins % 60;
      return `${isAssignment ? 'due ' : ''}in ${diffHours} hr ${remainingMins} mins`;
    }
    
    return `${isAssignment ? 'due ' : 'on'} ${targetDate.toLocaleDateString()}`;
  };

  if (!notification) return null;

  const isEvent = notification.type === 'EVENT';
  const isDaily = notification.type === 'DAILY';
  const isAssignment = notification.type === 'ASSIGNMENT_MISSING';

  return (
    <div
      onClick={() => {
        if (notification.chatid) {
          navigate(`/chat/${notification.chatid}`);
          setNotification(null);
        } else if (isDaily || isAssignment) {
          if (isAssignment && (!notification.assignments || notification.assignments.length === 0)) {
            navigate('/communities');
            setNotification(null);
          } else {
            setIsMaximized(!isMaximized);
          }
        }
      }}
      style={{
        position: 'fixed',
        top: '85px',
        left: '16px',
        right: '16px',
        backgroundColor: 'var(--bg-card)',
        border: `1.5px solid ${isEvent || isDaily || isAssignment ? '#fbbf24' : 'var(--accent-color)'}`,
        borderRadius: '16px',
        padding: '14px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        zIndex: 9999,
        cursor: 'pointer',
        animation: 'slideDown 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        backdropFilter: 'blur(12px)',
        maxWidth: '500px',
        margin: '0 auto'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', width: '100%' }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '12px',
          backgroundColor: isEvent || isDaily ? '#fbbf2420' : 'var(--accent-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {isDaily ? <Calendar size={24} color="#fbbf24" /> : 
           isAssignment ? <ClipboardList size={24} color="#fbbf24" /> :
           isEvent ? <Clock size={24} color="#fbbf24" /> : 
           <MessageSquare size={24} color="white" />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: '800',
            fontSize: '15px',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            {notification.title}
            {/letschat/i.test(notification.title || '') && (
              <span title="Official Verified Channel" style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                flexShrink: 0
              }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </span>
            )}
            {isEvent && (
              <span style={{ 
                fontSize: '11px', 
                backgroundColor: '#fbbf2420', 
                color: '#fbbf24', 
                padding: '2px 8px', 
                borderRadius: '10px',
                fontWeight: '600'
              }}>
                {getRelativeTimeText(getEventById(notification.eventId))}
              </span>
            )}
          </div>
          
          {!isDaily && !isAssignment && (
            <div style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginTop: '2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {isEvent ? notification.subtitle : notification.content}
            </div>
          )}

          {isAssignment && !isMaximized && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '4px', overflow: 'hidden' }}>
              {notification.assignments?.length > 0 ? (
                notification.assignments.map((ass, i) => (
                  <span key={ass.id} style={{ whiteSpace: 'nowrap' }}>
                    {ass.title}{i < notification.assignments.length - 1 ? ' • ' : ''}
                  </span>
                ))
              ) : (
                <span>You have {notification.fallbackCount} pending assignment(s) due.</span>
              )}
            </div>
          )}

          {isDaily && !isMaximized && (
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '4px', overflow: 'hidden' }}>
              {notification.eventIds.map((id, i) => (
                <span key={id} style={{ whiteSpace: 'nowrap' }}>
                  {getEventById(id)?.title}{i < notification.eventIds.length - 1 ? ' • ' : ''}
                </span>
              ))}
            </div>
          )}
        </div>

        {(isDaily || isAssignment) && (
          <div style={{ color: '#fbbf24' }}>
            {isMaximized ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); setNotification(null); }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '24px',
            padding: '4px',
            cursor: 'pointer',
            marginLeft: '4px',
            lineHeight: 1
          }}
        >
          ×
        </button>
      </div>

      {(isDaily || isAssignment) && isMaximized && (
        <div style={{ 
          marginTop: '4px', 
          borderTop: '1px solid #ffffff10', 
          paddingTop: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {isDaily ? notification.eventIds.map(id => {
            const ev = getEventById(id);
            if (!ev) return null;
            return (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>{ev.title}</span>
                <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '600' }}>{ev.startTime}</span>
              </div>
            );
          }) : (notification.assignments?.length > 0 ? (
            notification.assignments.map(ass => (
              <div key={ass.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>{ass.title}</span>
                  <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '600' }}>{getRelativeTimeText(ass, true)}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{ass.chatName}</span>
              </div>
            ))
          ) : (
            <div 
              onClick={(e) => { e.stopPropagation(); navigate('/communities'); setNotification(null); }}
              style={{ fontSize: '13px', color: 'var(--accent-color)', cursor: 'pointer', textAlign: 'center', padding: '6px' }}
            >
              You have {notification.fallbackCount} pending assignment(s) due. Tap here to open Classroom.
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InAppToast;

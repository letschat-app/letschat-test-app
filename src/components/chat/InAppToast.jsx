import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import messageStore from '../../pages/MessageStore';
import { useEventMediator } from '../../service/EventStorage';
import { Calendar, MessageSquare, Clock, ChevronDown, ChevronUp, ClipboardList } from 'lucide-react';
import { getAssignmentFromDB } from '../../service/db';

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
    const handleNewMessage = (payload) => {
      // payload can be a direct message object or an FCM data payload
      if (!payload) return;

      const type = payload.type || 'CHAT';
      
      // 1. Handle standard CHAT messages
      if (type === 'CHAT') {
        if (payload.bulkLoad || payload.type === 'indicator') return;
        
        // Content check (might be in payload.content or payload.message)
        const content = payload.content || payload.message;
        if (!content) return;

        const targetChatId = payload.chatid || payload.chatId;
        const senderId = payload.userid || payload.senderId || payload.senderid;

        if (senderId === userId) return;
        if (messageStore.getActivechatbox() && String(targetChatId) === String(messageStore.getActivechatbox())) return;

        let preview = '';
        switch (payload.msgType || payload.type) {
          case 'image': preview = '📷 Photo'; break;
          case 'video': preview = '🎥 Video'; break;
          case 'audio': preview = '🎤 Audio'; break;
          case 'file': preview = '📄 Document'; break;
          default: preview = content;
        }

        setNotification({
          type: 'CHAT',
          chatid: targetChatId,
          title: payload.sendername || 'New Message',
          content: preview
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

        Promise.all(assignmentIds.map(id => getAssignmentFromDB(id))).then(details => {
          const valid = details.filter(d => !!d);
          if (valid.length > 0) {
            setNotification({
              type: 'ASSIGNMENT_MISSING',
              title: 'Pending Assignments',
              assignments: valid
            });
          }
        });
      }

      setIsMaximized(false);
      // Auto-hide after 8 seconds (longer for events)
      const timer = setTimeout(() => setNotification(null), 8000);
      return () => clearTimeout(timer);
    };

    messageStore.addListener(handleNewMessage);
    return () => messageStore.removeListener(handleNewMessage);
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
          setIsMaximized(!isMaximized);
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
              {notification.assignments.map((ass, i) => (
                <span key={ass.id} style={{ whiteSpace: 'nowrap' }}>
                  {ass.title}{i < notification.assignments.length - 1 ? ' • ' : ''}
                </span>
              ))}
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
          }) : notification.assignments.map(ass => (
            <div key={ass.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>{ass.title}</span>
                <span style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '600' }}>{getRelativeTimeText(ass, true)}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{ass.chatName}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InAppToast;

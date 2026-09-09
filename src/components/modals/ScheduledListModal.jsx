import React from 'react';
import { X, Clock, Edit2, Trash2 } from 'lucide-react';

const ScheduledListModal = ({ isOpen, onClose, scheduledMessages, onEdit, onDelete }) => {
  if (!isOpen) return null;

  const handleWrapperClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      onClick={handleWrapperClick}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'transparent',
        pointerEvents: 'auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999
      }}
    >
      <div style={{
        background: '#1e1e1e', borderRadius: '16px', width: '90%', maxWidth: '400px', maxHeight: '80vh',
        border: '1px solid #333', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f3f4f6', fontSize: '16px' }}>
            <Clock size={18} color="#3b82f6" />
            Upcoming Scheduled Messages
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px', fontWeight: '700' }}>
            X
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {scheduledMessages && scheduledMessages.length > 0 ? (
            scheduledMessages.map((msg, index) => {
              let parseTime = '';
              if (Array.isArray(msg.time)) {
                 const [y, m, d, h=0, min=0, s=0] = msg.time;
                 parseTime = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
              } else if (typeof msg.time === 'string') {
                 parseTime = msg.time;
                 if (!parseTime.includes('T')) parseTime = parseTime.replace(' ', 'T');
                 if (parseTime.endsWith('Z')) parseTime = parseTime.substring(0, parseTime.length - 1);
              }
              
              const dateObj = new Date(parseTime);
              const displayTime = isNaN(dateObj.getTime()) 
                ? 'Unknown Time' 
                : dateObj.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                
              return (
                <div key={msg.msgId || index} style={{
                  background: '#2c2c2c', border: '1px solid #444', borderRadius: '10px', padding: '12px',
                  display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#9ca3af', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {displayTime}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => onEdit(msg)}
                        style={{ background: 'transparent', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                        title="Edit Message"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDelete(msg.msgId)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                        title="Delete Message"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '14px', color: '#e5e7eb', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.message}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '14px', padding: '24px 0' }}>
              No upcoming scheduled messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduledListModal;

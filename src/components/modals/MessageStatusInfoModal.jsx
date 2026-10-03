import React, { useState, useEffect } from 'react';
import { X, CheckCheck, Eye, Clock, Check, Info } from 'lucide-react';
import Avatar from '../chat/Avatar';
import { getUserFromDB } from '../../service/db';

/**
 * MessageStatusInfoModal Component
 * Context-aware Message Info Modal:
 * - Private 1-on-1 Chat: Displays a single recipient status card showing all event timestamps
 *   (Read/Opened/Played at XX:XX, Delivered at YY:YY, Sent at ZZ:ZZ).
 * - Group Chat: Categorizes recipients in strict hierarchy order:
 *   Opened/Played (if media) -> Read -> Delivered -> Pending.
 *   Recipients in Read/Opened show both read/opened time AND delivery time.
 */
const MessageStatusInfoModal = ({ isOpen, onClose, message, chat, members = [] }) => {
  const [userMap, setUserMap] = useState({});
  const [loading, setLoading] = useState(true);

  const currentUserId = localStorage.getItem('userid');

  useEffect(() => {
    if (!isOpen || !message) return;

    const resolveUsers = async () => {
      setLoading(true);
      const map = {};

      // 1. Seed from passed group members array
      if (Array.isArray(members) && members.length > 0) {
        members.forEach(m => {
          if (m.userId) {
            map[m.userId] = {
              userName: m.userName || m.name || m.userId,
              profile: m.profile || m.profilePic || null
            };
          }
        });
      }

      // 2. Identify all user IDs from ACK arrays
      const pendingIds = message.pending_users || [];
      const deliveredIds = message.delivered_users || [];
      const readIds = message.read_users || [];
      const allIds = Array.from(new Set([...pendingIds, ...deliveredIds, ...readIds]));

      // 3. Fetch missing users from IndexedDB usersCache
      for (const uid of allIds) {
        if (!map[uid] && uid !== currentUserId) {
          try {
            const dbUser = await getUserFromDB(uid);
            if (dbUser) {
              map[uid] = {
                userName: dbUser.userName || dbUser.name || uid,
                profile: dbUser.profile || dbUser.profilePic || null
              };
            } else {
              map[uid] = { userName: uid, profile: null };
            }
          } catch (e) {
            map[uid] = { userName: uid, profile: null };
          }
        }
      }

      // If private chat, ensure recipient is in userMap
      if (chat && (chat.type === 'private' || chat.type === 'direct')) {
        const partnerId = String(chat.chatId || chat.id || chat.userId);
        if (!map[partnerId]) {
          map[partnerId] = {
            userName: chat.chatName || chat.userName || partnerId,
            profile: chat.profile || chat.profilePic || null
          };
        }
      }

      setUserMap(map);
      setLoading(false);
    };

    resolveUsers();
  }, [isOpen, message, chat, members]);

  if (!isOpen || !message) return null;

  // Format time utility
  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      const date = new Date(ts);
      if (isNaN(date.getTime())) return String(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return String(ts);
    }
  };

  const msgType = (message.type || message.msgtype || message.filetype || '').toLowerCase();
  const isAudio = ['audio', 'voice'].includes(msgType);
  const isMedia = isAudio || ['document', 'file', 'pdf', 'image', 'video'].includes(msgType);

  const isPrivate = !chat || chat.type === 'private' || chat.type === 'direct';

  // Extract key timestamps from message object
  const sentTime = message.timestamp;
  const deliverTime = message.delivertime;
  const readTime = message.readtime;
  const mediaOpenedTime = message.mediaopenedtime;

  // ── PRIVATE (1-on-1) CHAT SINGLE STATUS VIEW ──
  if (isPrivate) {
    const partnerId = String(chat?.chatId || chat?.id || message.chatid || '');
    const partnerName = chat?.chatName || chat?.userName || userMap[partnerId]?.userName || 'Recipient';
    const partnerProfile = chat?.profile || userMap[partnerId]?.profile || null;

    const status = message.status;
    let primaryStatusText = 'Sent';
    let primaryColor = 'var(--text-secondary, #94a3b8)';

    if (status === 'media-opened') {
      primaryStatusText = isAudio ? 'Played' : 'Opened';
      primaryColor = '#a855f7';
    } else if (status === 'read') {
      primaryStatusText = isAudio ? 'Played' : (isMedia ? 'Opened' : 'Read');
      primaryColor = '#3b82f6';
    } else if (status === 'delivered') {
      primaryStatusText = 'Delivered';
      primaryColor = 'var(--text-secondary, #94a3b8)';
    } else if (status === 'pending') {
      primaryStatusText = 'Pending';
      primaryColor = '#f59e0b';
    }

    const actionTime = mediaOpenedTime || readTime;

    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalContainerStyle} onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={20} color="var(--accent-color, #3b82f6)" />
              <h3 style={titleStyle}>Message Info</h3>
            </div>
            <button onClick={onClose} style={closeButtonStyle}><X size={18} /></button>
          </div>

          {/* Message Content Preview */}
          <div style={previewBoxStyle}>
            <div style={previewLabelStyle}>Message Content</div>
            <div style={previewTextStyle}>
              {message.content || message.caption || (message.type ? `[${message.type}]` : 'Message')}
            </div>
          </div>

          {/* Single Recipient Card */}
          <div style={{ padding: '20px' }}>
            <div style={partnerCardStyle}>
              <Avatar chat={{ profile: partnerProfile, userName: partnerName }} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary, #ffffff)' }}>
                  {partnerName}
                </div>
                <div style={{ fontSize: '12px', color: primaryColor, fontWeight: '700', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {status === 'media-opened' && <Eye size={13} color="#a855f7" />}
                  {(status === 'read' || status === 'delivered') && <CheckCheck size={14} color={primaryColor} />}
                  {status === 'pending' && <Clock size={13} color="#f59e0b" />}
                  {primaryStatusText}
                </div>
              </div>
            </div>

            {/* Timestamps Breakdown (Read/Opened + Delivered + Sent) */}
            <div style={timestampBoxStyle}>
              {(status === 'read' || status === 'media-opened') && actionTime && (
                <div style={timestampRowStyle}>
                  <span style={{ color: status === 'media-opened' ? '#a855f7' : '#3b82f6', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {status === 'media-opened' ? <Eye size={14} /> : <CheckCheck size={14} />}
                    {isMedia ? (isAudio ? 'Played at' : 'Opened at') : 'Read at'}
                  </span>
                  <span style={{ color: 'var(--text-primary, #ffffff)', fontWeight: '700' }}>
                    {formatTime(actionTime)}
                  </span>
                </div>
              )}

              {(deliverTime || status === 'delivered' || status === 'read' || status === 'media-opened') && (
                <div style={timestampRowStyle}>
                  <span style={{ color: 'var(--text-secondary, #94a3b8)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCheck size={14} /> Delivered at
                  </span>
                  <span style={{ color: 'var(--text-primary, #ffffff)', fontWeight: '600' }}>
                    {formatTime(deliverTime || sentTime)}
                  </span>
                </div>
              )}

              {sentTime && (
                <div style={timestampRowStyle}>
                  <span style={{ color: 'var(--text-secondary, #94a3b8)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} /> Sent at
                  </span>
                  <span style={{ color: 'var(--text-secondary, #94a3b8)', fontWeight: '500' }}>
                    {formatTime(sentTime)}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ── GROUP CHAT MULTI-SECTION CATEGORIZATION (Opened/Played -> Read -> Delivered -> Pending) ──
  const rawPending = message.pending_users || [];
  const rawDelivered = message.delivered_users || [];
  const rawRead = message.read_users || [];

  const readSet = new Set(rawRead);
  const deliveredSet = new Set(rawDelivered);
  const pendingSet = new Set(rawPending);

  let openedList = [];
  let readList = [];
  let deliveredList = [];
  let pendingList = [];

  if (isMedia) {
    // For media messages, recipients in readSet are listed under Opened / Played
    readSet.forEach(uid => {
      if (uid === currentUserId) return;
      openedList.push({
        userId: uid,
        userName: userMap[uid]?.userName || uid,
        profile: userMap[uid]?.profile || null,
        mainTime: mediaOpenedTime || readTime || deliverTime || sentTime,
        deliverTime: deliverTime
      });
    });
  } else {
    // For text messages, recipients in readSet are listed under Read
    readSet.forEach(uid => {
      if (uid === currentUserId) return;
      readList.push({
        userId: uid,
        userName: userMap[uid]?.userName || uid,
        profile: userMap[uid]?.profile || null,
        mainTime: readTime || deliverTime || sentTime,
        deliverTime: deliverTime
      });
    });
  }

  deliveredSet.forEach(uid => {
    if (uid === currentUserId || readSet.has(uid)) return;
    deliveredList.push({
      userId: uid,
      userName: userMap[uid]?.userName || uid,
      profile: userMap[uid]?.profile || null,
      deliverTime: deliverTime || sentTime
    });
  });

  pendingSet.forEach(uid => {
    if (uid === currentUserId || readSet.has(uid) || deliveredSet.has(uid)) return;
    pendingList.push({
      userId: uid,
      userName: userMap[uid]?.userName || uid,
      profile: userMap[uid]?.profile || null,
      sentTime: sentTime
    });
  });

  const openedHeaderLabel = isAudio ? 'Played by' : 'Opened by';

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalContainerStyle} onClick={e => e.stopPropagation()}>

        {/* Modal Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={20} color="var(--accent-color, #3b82f6)" />
            <h3 style={titleStyle}>Message Info</h3>
          </div>
          <button onClick={onClose} style={closeButtonStyle}><X size={18} /></button>
        </div>

        {/* Message Content Preview Box */}
        <div style={previewBoxStyle}>
          <div style={previewLabelStyle}>Message Content</div>
          <div style={previewTextStyle}>
            {message.content || message.caption || (message.type ? `[${message.type}]` : 'Message')}
          </div>
          {message.timestamp && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '2px' }}>
              Sent at {formatTime(message.timestamp)}
            </div>
          )}
        </div>

        {/* Modal Body Lists */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }} className="hide-scrollbar">
          
          {/* SECTION 1: OPENED / PLAYED (Shown ONLY if media message) */}
          {isMedia && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <Eye size={16} color="#a855f7" />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {openedHeaderLabel} ({openedList.length})
                </span>
              </div>

              {openedList.length === 0 ? (
                <div style={emptySectionStyle}>No recipients have {isAudio ? 'played' : 'opened'} this message yet</div>
              ) : (
                openedList.map(item => (
                  <div key={item.userId} style={userRowStyle}>
                    <Avatar chat={{ profile: item.profile, userName: item.userName }} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary, #ffffff)', truncate: 'true' }}>
                        {item.userName}
                      </div>
                      {item.deliverTime && item.deliverTime !== item.mainTime && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '1px' }}>
                          Delivered at {formatTime(item.deliverTime)}
                        </div>
                      )}
                    </div>
                    {item.mainTime && (
                      <div style={{ fontSize: '12px', color: '#a855f7', fontWeight: '700', textAlign: 'right' }}>
                        {isAudio ? 'Played' : 'Opened'} at {formatTime(item.mainTime)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* SECTION 2: READ (For Text Messages) */}
          {!isMedia && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <CheckCheck size={16} color="#3b82f6" />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Read by ({readList.length})
                </span>
              </div>

              {readList.length === 0 ? (
                <div style={emptySectionStyle}>No recipients have read this message yet</div>
              ) : (
                readList.map(item => (
                  <div key={item.userId} style={userRowStyle}>
                    <Avatar chat={{ profile: item.profile, userName: item.userName }} size={38} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary, #ffffff)', truncate: 'true' }}>
                        {item.userName}
                      </div>
                      {item.deliverTime && item.deliverTime !== item.mainTime && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary, #94a3b8)', marginTop: '1px' }}>
                          Delivered at {formatTime(item.deliverTime)}
                        </div>
                      )}
                    </div>
                    {item.mainTime && (
                      <div style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '700', textAlign: 'right' }}>
                        Read at {formatTime(item.mainTime)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* SECTION 3: DELIVERED */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <CheckCheck size={16} color="var(--text-secondary, #94a3b8)" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Delivered to ({deliveredList.length})
              </span>
            </div>

            {deliveredList.length === 0 ? (
              <div style={emptySectionStyle}>No additional delivered recipients</div>
            ) : (
              deliveredList.map(item => (
                <div key={item.userId} style={userRowStyle}>
                  <Avatar chat={{ profile: item.profile, userName: item.userName }} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary, #ffffff)', truncate: 'true' }}>
                      {item.userName}
                    </div>
                  </div>
                  {item.deliverTime && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #94a3b8)', fontWeight: '600' }}>
                      Delivered at {formatTime(item.deliverTime)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* SECTION 4: PENDING */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
              <Clock size={16} color="#f59e0b" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pending ({pendingList.length})
              </span>
            </div>

            {pendingList.length === 0 ? (
              <div style={emptySectionStyle}>No pending recipients</div>
            ) : (
              pendingList.map(item => (
                <div key={item.userId} style={userRowStyle}>
                  <Avatar chat={{ profile: item.profile, userName: item.userName }} size={38} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary, #ffffff)', truncate: 'true' }}>
                      {item.userName}
                    </div>
                  </div>
                  {item.sentTime && (
                    <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: '600' }}>
                      Sent at {formatTime(item.sentTime)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

// ── STYLES ──
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  zIndex: 99999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px'
};

const modalContainerStyle = {
  width: '100%',
  maxWidth: '440px',
  maxHeight: '85vh',
  backgroundColor: 'var(--bg-secondary, #111b21)',
  border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
  borderRadius: '20px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  animation: 'fadeIn 0.2s ease-out'
};

const headerStyle = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: 'var(--bg-card, #1e293b)'
};

const titleStyle = {
  fontSize: '17px',
  fontWeight: '800',
  color: 'var(--text-primary, #ffffff)',
  margin: 0
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary, #94a3b8)',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const previewBoxStyle = {
  padding: '14px 20px',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderBottom: '1px solid var(--border-color, rgba(255,255,255,0.1))',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
};

const previewLabelStyle = {
  fontSize: '11px',
  color: 'var(--text-secondary, #94a3b8)',
  fontWeight: '700',
  textTransform: 'uppercase'
};

const previewTextStyle = {
  fontSize: '14px',
  color: 'var(--text-primary, #ffffff)',
  fontWeight: '600',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};

const partnerCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  padding: '14px',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  borderRadius: '16px',
  border: '1px solid rgba(255, 255, 255, 0.06)'
};

const timestampBoxStyle = {
  marginTop: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '14px',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  borderRadius: '14px',
  border: '1px solid rgba(255, 255, 255, 0.04)'
};

const timestampRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '13px'
};

const userRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '8px 10px',
  borderRadius: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.03)',
  marginBottom: '6px'
};

const emptySectionStyle = {
  fontSize: '12px',
  color: 'var(--text-secondary, #94a3b8)',
  padding: '10px',
  borderRadius: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  border: '1px dashed rgba(255, 255, 255, 0.08)',
  textAlign: 'center'
};

export default MessageStatusInfoModal;

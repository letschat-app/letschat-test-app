import React, { useState, useEffect } from 'react';
import { X, CheckCheck, Eye, Clock, Check, Info } from 'lucide-react';
import Avatar from '../chat/Avatar';
import { getUserFromDB, updateMessageStatusInDB } from '../../service/db';
import { API } from '../../service/UserAuth';

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
  const [liveTrack, setLiveTrack] = useState(null);

  const currentUserId = localStorage.getItem('userid');

  useEffect(() => {
    if (!isOpen || !message) {
      setLiveTrack(null);
      return;
    }

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

      // 1.5. Always fetch live, authoritative track info from backend for the message
      let trackData = null;
      if (message.msgid) {
        try {
          const res = await fetch(`${API}/user/chatbox/message/${encodeURIComponent(message.msgid)}/track-info`, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
          });
          if (res.ok) {
            trackData = await res.json();
            if (trackData) {
              setLiveTrack(trackData);
              if (Array.isArray(trackData.recipients)) {
                trackData.recipients.forEach(r => {
                  if (r.userId) {
                    map[r.userId] = {
                      userName: r.userName || map[r.userId]?.userName || r.userId,
                      profile: r.profile || map[r.userId]?.profile || null,
                      deliverTime: r.delivertime,
                      readTime: r.readtime,
                      mediaOpenedTime: r.mediaopenedtime
                    };
                  }
                });
              }
              // Update IndexedDB silently so subsequent opens have fresh data
              updateMessageStatusInDB({
                msgid: message.msgid,
                status: trackData.status,
                delivertime: trackData.delivertime,
                readtime: trackData.readtime,
                mediaopenedtime: trackData.mediaopenedtime,
                read_users: trackData.read_users,
                delivered_users: trackData.delivered_users,
                pending_users: trackData.pending_users
              }).catch(() => {});
            }
          }
        } catch (e) {
          console.warn("[MessageStatusInfoModal] Live track info fetch failed:", e);
        }
      }

      // 2. Identify all user IDs from ACK arrays (combining local message and backend trackData)
      const pendingIds = trackData?.pending_users || message.pending_users || [];
      const deliveredIds = trackData?.delivered_users || message.delivered_users || [];
      const readIds = trackData?.read_users || message.read_users || [];
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

  // Format time utility - strictly 12-hour Indian Standard Time (IST)
  const formatTime = (ts) => {
    if (!ts) return '';
    if (typeof ts === 'string' && /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i.test(ts.trim())) {
      return ts.trim().toUpperCase();
    }
    try {
      let d;
      if (typeof ts === 'number') {
        d = new Date(ts < 1e11 ? ts * 1000 : ts);
      } else if (typeof ts === 'string') {
        const trimmed = ts.trim();
        if (/^\d+(\.\d+)?$/.test(trimmed)) {
          const num = parseFloat(trimmed);
          d = new Date(num < 1e11 ? num * 1000 : num);
        } else if (trimmed.includes('T') || trimmed.includes('-')) {
          let str = trimmed;
          if (!str.endsWith('Z') && !/[+-]\d{2}(:?\d{2})?$/.test(str)) {
            str = str.replace(' ', 'T') + '+05:30';
          }
          d = new Date(str);
        } else {
          d = new Date(ts);
        }
      } else {
        d = new Date(ts);
      }

      if (isNaN(d.getTime())) return String(ts);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(d);
    } catch (e) {
      return String(ts);
    }
  };

  const msgType = (message.type || message.msgtype || message.filetype || '').toLowerCase();
  const isAudio = ['audio', 'voice'].includes(msgType);
  const isMedia = isAudio || ['document', 'file', 'pdf', 'image', 'video'].includes(msgType);

  const isPrivate = !chat || chat.type === 'private' || chat.type === 'direct';

  // Merge authoritative live track details if fetched
  const effectiveMessage = liveTrack ? { ...message, ...liveTrack } : message;

  // Extract key timestamps from effective message object
  const sentTime = effectiveMessage.timestamp;
  const deliverTime = effectiveMessage.delivertime;
  const readTime = effectiveMessage.readtime;
  const mediaOpenedTime = effectiveMessage.mediaopenedtime;

  // ── PRIVATE (1-on-1) CHAT SINGLE STATUS VIEW ──
  if (isPrivate) {
    const partnerId = String(chat?.chatId || chat?.id || message.chatid || '');
    const partnerName = chat?.chatName || chat?.userName || userMap[partnerId]?.userName || 'Recipient';
    const partnerProfile = chat?.profile || userMap[partnerId]?.profile || null;

    const status = message.status;
    let primaryStatusText = 'Sent';
    let primaryColor = 'var(--text-secondary)';

    if (status === 'media-opened') {
      primaryStatusText = isAudio ? 'Played' : 'Opened';
      primaryColor = '#a855f7';
    } else if (status === 'read') {
      primaryStatusText = isAudio ? 'Played' : (isMedia ? 'Opened' : 'Read');
      primaryColor = 'var(--accent-text)';
    } else if (status === 'delivered') {
      primaryStatusText = 'Delivered';
      primaryColor = 'var(--text-secondary)';
    } else if (status === 'pending') {
      primaryStatusText = 'Pending';
      primaryColor = 'var(--warning-color)';
    }

    const actionTime = mediaOpenedTime || readTime;

    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={modalContainerStyle} onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={20} color="var(--accent-color)" />
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
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {partnerName}
                </div>
                <div style={{ fontSize: '12px', color: primaryColor, fontWeight: '700', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {status === 'media-opened' && <Eye size={13} color="#a855f7" />}
                  {(status === 'read' || status === 'delivered') && <CheckCheck size={14} color={primaryColor} />}
                  {status === 'pending' && <Clock size={13} color="var(--warning-color)" />}
                  {primaryStatusText}
                </div>
              </div>
            </div>

            {/* Timestamps Breakdown (Read/Opened + Delivered + Sent) */}
            <div style={timestampBoxStyle}>
              {(status === 'read' || status === 'media-opened') && actionTime && (
                <div style={timestampRowStyle}>
                  <span style={{ color: status === 'media-opened' ? '#a855f7' : 'var(--accent-text)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {status === 'media-opened' ? <Eye size={14} /> : <CheckCheck size={14} />}
                    {isMedia ? (isAudio ? 'Played at' : 'Opened at') : 'Read at'}
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
                    {formatTime(actionTime)}
                  </span>
                </div>
              )}

              {(deliverTime || status === 'delivered' || status === 'read' || status === 'media-opened') && (
                <div style={timestampRowStyle}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCheck size={14} /> Delivered at
                  </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    {formatTime(deliverTime || sentTime)}
                  </span>
                </div>
              )}

              {sentTime && (
                <div style={timestampRowStyle}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={13} /> Sent at
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>
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
  const rawPending = liveTrack?.pending_users || message.pending_users || [];
  const rawDelivered = liveTrack?.delivered_users || message.delivered_users || [];
  const rawRead = liveTrack?.read_users || message.read_users || [];

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
      const uReadTime = userMap[uid]?.readTime || userMap[uid]?.mediaOpenedTime;
      const uDeliverTime = userMap[uid]?.deliverTime;
      openedList.push({
        userId: uid,
        userName: userMap[uid]?.userName || uid,
        profile: userMap[uid]?.profile || null,
        mainTime: uReadTime || mediaOpenedTime || readTime || uDeliverTime || deliverTime || sentTime,
        deliverTime: uDeliverTime || deliverTime
      });
    });
  } else {
    // For text messages, recipients in readSet are listed under Read
    readSet.forEach(uid => {
      if (uid === currentUserId) return;
      const uReadTime = userMap[uid]?.readTime;
      const uDeliverTime = userMap[uid]?.deliverTime;
      readList.push({
        userId: uid,
        userName: userMap[uid]?.userName || uid,
        profile: userMap[uid]?.profile || null,
        mainTime: uReadTime || readTime || uDeliverTime || deliverTime || sentTime,
        deliverTime: uDeliverTime || deliverTime
      });
    });
  }

  deliveredSet.forEach(uid => {
    if (uid === currentUserId || readSet.has(uid)) return;
    const uDeliverTime = userMap[uid]?.deliverTime;
    deliveredList.push({
      userId: uid,
      userName: userMap[uid]?.userName || uid,
      profile: userMap[uid]?.profile || null,
      deliverTime: uDeliverTime || deliverTime || sentTime
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
            <Info size={20} color="var(--accent-color)" />
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
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
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
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', truncate: 'true' }}>
                        {item.userName}
                      </div>
                      {item.deliverTime && item.deliverTime !== item.mainTime && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
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
                <CheckCheck size={16} color="var(--accent-text)" />
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', truncate: 'true' }}>
                        {item.userName}
                      </div>
                      {item.deliverTime && item.deliverTime !== item.mainTime && (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                          Delivered at {formatTime(item.deliverTime)}
                        </div>
                      )}
                    </div>
                    {item.mainTime && (
                      <div style={{ fontSize: '12px', color: 'var(--accent-text)', fontWeight: '700', textAlign: 'right' }}>
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
              <CheckCheck size={16} color="var(--text-secondary)" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', truncate: 'true' }}>
                      {item.userName}
                    </div>
                  </div>
                  {item.deliverTime && (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
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
              <Clock size={16} color="var(--warning-color)" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--warning-color)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', truncate: 'true' }}>
                      {item.userName}
                    </div>
                  </div>
                  {item.sentTime && (
                    <div style={{ fontSize: '12px', color: 'var(--warning-color)', fontWeight: '600' }}>
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
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-color))',
  borderRadius: '20px',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  animation: 'fadeIn 0.2s ease-out'
};

const headerStyle = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--border-color))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  backgroundColor: 'var(--bg-card)'
};

const titleStyle = {
  fontSize: '17px',
  fontWeight: '800',
  color: 'var(--text-primary)',
  margin: 0
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const previewBoxStyle = {
  padding: '14px 20px',
  backgroundColor: 'var(--bg-hover)',
  borderBottom: '1px solid var(--border-color))',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
};

const previewLabelStyle = {
  fontSize: '11px',
  color: 'var(--text-secondary)',
  fontWeight: '700',
  textTransform: 'uppercase'
};

const previewTextStyle = {
  fontSize: '14px',
  color: 'var(--text-primary)',
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
  backgroundColor: 'var(--bg-hover)',
  borderRadius: '16px',
  border: '1px solid var(--bg-hover)'
};

const timestampBoxStyle = {
  marginTop: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  padding: '14px',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  borderRadius: '14px',
  border: '1px solid var(--bg-hover)'
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
  backgroundColor: 'var(--bg-hover)',
  marginBottom: '6px'
};

const emptySectionStyle = {
  fontSize: '12px',
  color: 'var(--text-secondary)',
  padding: '10px',
  borderRadius: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.02)',
  border: '1px dashed var(--bg-hover)',
  textAlign: 'center'
};

export default MessageStatusInfoModal;

import React from 'react';
import { Trash2, Filter } from 'lucide-react';
import Avatar from './Avatar';

/** Collection of inline click-only confirmation, picker, and error dialogs for ChatBox. */
export default function ChatActionModals({
  showClearModal,
  setShowClearModal,
  handleClearChat,
  spaceName,
  showforward,
  setshowforward,
  cancelforward,
  chatlist,
  handleForward,
  showInviteModal,
  setShowInviteModal,
  chat,
  handleInvite,
  showFilterModal,
  setShowFilterModal,
  filterCandidates,
  filterMember,
  setFilterMember,
  networkError,
  setNetworkError,
  showdelet,
  setshowdelet,
  setdeleted,
  dforme,
  showEveryone,
  dforeone,
  deleted,
  revpanel,
  setrevpanel,
  revev,
  setrevev,
  revivforme,
  revivforeone,
  showCancelDialog,
  setShowCancelDialog,
  handleConfirmCancelEvent,
}) {
  const currentUserId = localStorage.getItem('userid');
  const canShowRevivePanel =
    revpanel &&
    revev &&
    (revev.isdeletedeone === currentUserId || (revev.isdeleted == true && !revev.isdeletedeone));

  return (
    <>
      {showClearModal && (
        <div
          onClick={() => setShowClearModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              padding: '28px',
              borderRadius: '20px',
              maxWidth: '340px',
              width: '90%',
              textAlign: 'center',
              border: '1px solid var(--border-color)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger-tint)',
                color: 'var(--danger-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
              }}
            >
              <Trash2 size={28} />
            </div>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700', margin: 0 }}>Clear Chat?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5', margin: 0 }}>
              Messages will be cleared from this device only. They remain visible on other devices.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={() => handleClearChat(false)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--accent-color)',
                  color: 'white',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Clear {spaceName}
              </button>
              <button
                onClick={() => handleClearChat(true)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--danger-color)',
                  background: 'transparent',
                  color: 'var(--danger-color)',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Clear All Spaces
              </button>
              <button
                onClick={() => setShowClearModal(false)}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showforward && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: '0',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: '40',
            }}
            onClick={() => setshowforward(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              zIndex: '50',
              width: '80%',
              maxHeight: '384px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Forward to Chat</h2>
              <button
                onClick={() => cancelforward()}
                style={{
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: '1', overflowY: 'auto', padding: '8px' }}>
              {chatlist.map((c) => (
                <button
                  key={c.chatId}
                  onClick={() => { handleForward(c.chatId); cancelforward(); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                    {c.chatName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {showInviteModal && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: '0',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: '40',
            }}
            onClick={() => setShowInviteModal(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              zIndex: '50',
              width: '80%',
              maxHeight: '384px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Invite to {chat.chatName}</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: '1', overflowY: 'auto', padding: '8px' }}>
              {chatlist.map((c) => (
                <button
                  key={c.chatId}
                  onClick={() => { handleInvite(c.chatId); setShowInviteModal(false); }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                    {c.chatName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {showFilterModal && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: '0',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: '50',
            }}
            onClick={() => setShowFilterModal(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              zIndex: '60',
              width: '85%',
              maxWidth: '380px',
              maxHeight: '420px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={18} color="var(--accent-color)" />
                <h2 style={{ fontSize: '17px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>Filter Messages by Person</h2>
              </div>
              <button
                onClick={() => setShowFilterModal(false)}
                style={{
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ flex: '1', overflowY: 'auto', padding: '8px' }}>
              {filterCandidates.map((m) => (
                <button
                  key={m.userId || m.userName}
                  onClick={() => {
                    setFilterMember(m);
                    setShowFilterModal(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: filterMember?.userId === m.userId || filterMember?.userName === m.userName ? 'var(--nav-active-bg)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      filterMember?.userId === m.userId || filterMember?.userName === m.userName ? 'var(--nav-active-bg)' : 'transparent';
                  }}
                >
                  <Avatar chat={{ profile: m.profile, userName: m.userName }} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: '600', fontSize: '14px' }}>
                      {m.userId === currentUserId ? 'You' : (m.userName || 'User')}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {m.role ? m.role.toUpperCase() : 'Participant'}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {networkError && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: '0',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: '60',
            }}
            onClick={() => setNetworkError(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              zIndex: '70',
              width: '80%',
              maxWidth: '350px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-primary)' }}>
              <div style={{ marginBottom: '12px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                  <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                  <line x1="12" y1="20" x2="12.01" y2="20" />
                  <path d="M4.93 10.93a10 10 0 0 1 14.14 0" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>No Connection</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                You seem to be offline or have a slow connection. Please check your internet and try again.
              </p>
            </div>
            <button
              onClick={() => setNetworkError(false)}
              style={{
                padding: '14px',
                backgroundColor: 'var(--bg-hover)',
                color: 'var(--text-primary)',
                border: 'none',
                borderTop: '1px solid var(--border-color)',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Okay
            </button>
          </div>
        </>
      )}

      {showdelet && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: '0',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: '40',
            }}
            onClick={() => { setshowdelet(false); setdeleted([]); }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              zIndex: '50',
              width: '80%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Delete Message</h2>
              <button
                onClick={() => { setshowdelet(false); setdeleted([]); }}
                style={{
                  color: 'var(--danger-color)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chat.type !== 'classroom' && (
                <button
                  onClick={() => { setshowdelet(false); dforme(); }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'var(--bg-hover)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Delete for Me
                </button>
              )}

              {showEveryone && (
                <button
                  onClick={() => { setshowdelet(false); dforeone(); }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'var(--danger-color)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                  }}
                >
                  Delete for Everyone
                </button>
              )}

              {chat.type === 'classroom' && deleted?.userid === currentUserId && (
                <button
                  onClick={() => { setshowdelet(false); }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'var(--danger-color)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {canShowRevivePanel && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: '0',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: '40',
            }}
            onClick={() => { setrevpanel(false); setrevev(null); }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              zIndex: '50',
              width: '80%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>Revive Message</h2>
              <button
                onClick={() => { setrevpanel(false); setrevev(null); }}
                style={{
                  color: 'var(--danger-color)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => { revivforme(); }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: 'var(--bg-hover)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                }}
              >
                Revive for Me
              </button>

              {(revev.status !== null && revev.isdeletedeone === currentUserId) && (
                <button
                  onClick={() => { revivforeone(); }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'var(--success-color)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                  }}
                >
                  Revive for Everyone
                </button>
              )}

              {chat.type === 'classroom' && (revev?.userid === currentUserId || chat.role === 'faculty') && (
                <button
                  onClick={() => { revivforeone(); }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'var(--success-color)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'background-color 0.2s',
                  }}
                >
                  Revive
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {showCancelDialog && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '400px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', fontSize: '18px' }}>Cancel Event?</h3>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Are you sure you want to cancel this event? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleConfirmCancelEvent} style={{ flex: 1, padding: '12px', backgroundColor: 'var(--danger-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Yes, Cancel Event</button>
              <button onClick={() => setShowCancelDialog(false)} style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Go Back</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

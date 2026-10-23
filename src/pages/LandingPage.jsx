import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePWA } from '../context/PWAContext';
import { useTheme } from '../context/ThemeContext';

/* ── Scroll-reveal hook ── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px 100px 0px' }
    );

    const timer = setTimeout(() => {
      els.forEach(el => io.observe(el));
    }, 100);

    // Fallback: If after 2 seconds something isn't revealed, just show it
    const fallbackTimer = setTimeout(() => {
      els.forEach(el => el.classList.add('revealed'));
    }, 2000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
      io.disconnect();
    };
  }, []);
}

/* ── Before / After components ── */
const COLORS = { Arun: '#e74c3c', Priya: '#8e44ad', Rahul: '#2980b9', Karthik: '#27ae60', Anu: '#f39c12' };

const MessyChat = ({ isDark }) => {
  const msgs = [
    { name: 'Arun', text: 'Guys urgent doubt', time: '9:01' },
    { name: 'Priya', text: 'Wait', time: '9:01' },
    { name: 'Rahul', text: 'Anyone coming canteen?', time: '9:02' },
    { name: 'Karthik', text: 'Notes??', time: '9:02' },
    { name: 'Anu', text: 'Send pdf', time: '9:03' },
    { name: 'Rahul', text: 'Match going on', time: '9:03' },
    { name: 'Priya', text: 'Assignment tomorrow', time: '9:04' },
    { name: 'Arun', text: 'WHAT SUBJECT??', time: '9:04' },
    { name: 'Karthik', text: 'DBMS maybe', time: '9:05' },
    { name: 'Anu', text: 'Maybe??', time: '9:05' },
    { name: 'Rahul', text: '😂😂😂', time: '9:05' },
    { name: 'Priya', text: 'Not funny', time: '9:06' },
    { name: 'Arun', text: "I can't follow anything here", time: '9:06' },
    { name: 'Karthik', text: 'Same', time: '9:07' },
    { name: 'Anu', text: 'Messages lost', time: '9:07' },
    { name: 'Rahul', text: 'Who asked what??', time: '9:07' },
    { name: 'Priya', text: 'Exactly problem', time: '9:08' },
  ];
  return (
    <div style={{
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.15)',
      border: isDark ? '1px solid rgba(255,255,255,0.08)' : 'none',
      fontFamily: 'Inter,sans-serif'
    }}>
      {/* Header */}
      <div style={{ background: isDark ? '#1f2c34' : '#075e54', padding: '10px 14px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: isDark ? '#00a884' : '#128c7e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>CS</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>CS Batch 2025 💬</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>Arun, Priya, Rahul, Karthik, Anu +12</div>
        </div>
      </div>
      {/* Body */}
      <div style={{ background: isDark ? '#0b141a' : '#e5ddd5', padding: '10px 10px 6px', maxHeight: 320, overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)', borderRadius: 10, padding: '2px 10px', fontSize: 11, color: isDark ? '#8696a0' : '#555' }}>TODAY</span>
        </div>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: COLORS[m.name], flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 800, marginTop: 2 }}>{m.name[0]}</div>
            <div style={{
              background: isDark ? '#202c33' : '#fff',
              borderRadius: '2px 10px 10px 10px',
              padding: '4px 8px',
              maxWidth: '82%',
              boxShadow: isDark ? '0 1px 2px rgba(0,0,0,0.3)' : '0 1px 1px rgba(0,0,0,0.1)'
            }}>
              <div style={{ color: COLORS[m.name], fontWeight: 700, fontSize: 10.5 }}>{m.name}</div>
              <div style={{ color: isDark ? '#e9edef' : '#111', fontSize: 12.5, lineHeight: 1.35 }}>{m.text}</div>
              <div style={{ color: isDark ? '#8696a0' : '#999', fontSize: 9.5, textAlign: 'right', marginTop: 1 }}>{m.time}</div>
            </div>
          </div>
        ))}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700 }}>↓ 17 more messages below</span>
        </div>
      </div>
      {/* Input */}
      <div style={{ background: isDark ? '#1f2c34' : '#f0f0f0', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, background: isDark ? '#2a3942' : '#fff', borderRadius: 20, padding: '7px 14px', color: isDark ? '#8696a0' : '#aaa', fontSize: 13 }}>Message</div>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#25d366', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>🎤</div>
      </div>
    </div>
  );
};

const SpaceCard = ({ icon, title, color, msgs }) => (
  <div style={{ background: '#1f2c34', borderRadius: 12, marginBottom: 10, overflow: 'hidden', border: `1px solid ${color}30` }}>
    <div style={{ padding: '8px 12px', background: color + '18', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${color}25` }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontWeight: 700, fontSize: 12, color: color }}>{title}</span>
    </div>
    <div style={{ padding: '8px 12px' }}>
      {msgs.map((m, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: i < msgs.length - 1 ? 5 : 0, alignItems: 'flex-start' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', background: COLORS[m.name] || '#6366f1', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 8, fontWeight: 800, marginTop: 1 }}>{m.name[0]}</div>
          <div>
            <span style={{ color: COLORS[m.name] || '#818cf8', fontWeight: 700, fontSize: 10.5 }}>{m.name}: </span>
            <span style={{ color: '#e9edef', fontSize: 12 }}>{m.text}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CleanChat = ({ isDark }) => (
  <div style={{
    background: '#0b141a',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: isDark ? '0 12px 40px rgba(0,0,0,0.6)' : '0 8px 32px rgba(99,102,241,0.15)',
    border: isDark ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid #e0e7ff',
    fontFamily: 'Inter,sans-serif'
  }}>
    {/* Header */}
    <div style={{ background: '#1f2c34', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0 }}>CS</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#e9edef' }}>CS Batch 2025</div>
        <div style={{ fontSize: 11, color: '#8696a0' }}>4 spaces · 17 members</div>
      </div>
      <div style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: '3px 10px', fontSize: 11, color: '#818cf8', fontWeight: 600 }}>Spaces ✦</div>
    </div>
    {/* Space tabs */}
    <div style={{ display: 'flex', gap: 6, padding: '7px 12px', background: '#111b21', borderBottom: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
      {['📚 DBMS', '❓ Doubts', '💬 General', '🎭 Off-topic'].map((s, i) => (
        <div key={i} style={{ padding: '4px 12px', borderRadius: 20, background: i === 0 ? '#6366f1' : 'rgba(255,255,255,0.06)', color: i === 0 ? '#fff' : '#8696a0', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{s}</div>
      ))}
    </div>
    {/* Spaces */}
    <div style={{ padding: '10px 12px', background: '#0b141a' }}>
      <SpaceCard icon="📚" title="DBMS Assignment" color="#6366f1" msgs={[
        { name: 'Priya', text: 'Assignment tomorrow (DBMS)' },
        { name: 'Karthik', text: 'Topic: Normalization' },
        { name: 'Anu', text: 'Uploading PDF notes here' },
        { name: 'Arun', text: 'Got it 👍' },
      ]} />
      <SpaceCard icon="❓" title="Doubts" color="#f59e0b" msgs={[
        { name: 'Arun', text: 'Urgent doubt — what subject was the assignment?' },
        { name: 'Priya', text: 'DBMS' },
        { name: 'Karthik', text: 'Confirmed ✓' },
      ]} />
      <SpaceCard icon="💬" title="General" color="#10b981" msgs={[
        { name: 'Rahul', text: 'Anyone coming to canteen?' },
      ]} />
      {/* Events */}
      <div style={{ background: '#1f2c34', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.35)', marginTop: 4 }}>
        <div style={{ padding: '10px 12px', background: 'rgba(99,102,241,0.2)', borderBottom: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>✨</span>
          <span style={{ fontWeight: 900, fontSize: 14, color: '#fff', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Auto-detected Events</span>
        </div>
        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { title: 'DBMS Assignment', when: 'Tomorrow', color: '#ef4444' },
            { title: 'Internal Test', when: 'Coming soon', color: '#f59e0b' },
          ].map((ev, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ev.color, flexShrink: 0 }} />
              <div style={{ flex: 1, color: '#e9edef', fontSize: 12, fontWeight: 600 }}>{ev.title}</div>
              <div style={{ background: ev.color + '20', color: ev.color, borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>{ev.when}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
    {/* Input */}
    <div style={{ background: '#1f2c34', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1, background: '#2a3942', borderRadius: 20, padding: '8px 16px', color: '#8696a0', fontSize: 13 }}>Type a message</div>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>➤</div>
    </div>
  </div>
);

const ClassroomUI = ({ isDark }) => (
  <div style={{
    background: isDark ? '#111827' : '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.4)' : '0 8px 32px rgba(99,102,241,0.12)',
    fontFamily: 'Inter,sans-serif',
    border: isDark ? '1px solid rgba(99,102,241,0.25)' : '1px solid #e0e7ff'
  }}>
    {/* Header */}
    <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', padding: '14px 16px', color: '#fff' }}>
      <div style={{ fontWeight: 800, fontSize: 15 }}>📚 DBMS Classroom</div>
      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Organized learning + live discussion</div>
    </div>

    {/* Tabs */}
    <div style={{ display: 'flex', background: isDark ? '#0f172a' : '#f8fafc', borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0' }}>
      {['Announcements', 'Materials', 'Discussion'].map((tab, i) => (
        <div key={i} style={{
          flex: 1, textAlign: 'center', padding: '9px 4px',
          fontSize: 12, fontWeight: 600,
          color: i === 2 ? (isDark ? '#818cf8' : '#4f46e5') : (isDark ? '#64748b' : '#94a3b8'),
          borderBottom: i === 2 ? `2px solid ${isDark ? '#818cf8' : '#4f46e5'}` : '2px solid transparent',
          cursor: 'pointer',
          transition: 'color .15s',
        }}>{tab}</div>
      ))}
    </div>

    {/* Content */}
    <div style={{ padding: '12px 14px', background: isDark ? '#0b0f19' : '#f8fafc' }}>
      {/* Announcement card */}
      <div style={{
        background: isDark ? 'rgba(99,102,241,0.12)' : '#f5f3ff',
        border: isDark ? '1.5px solid rgba(139,92,246,0.35)' : '2px solid #ddd6fe',
        borderRadius: 14,
        padding: '12px',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 4px 12px rgba(99,102,241,0.06)'
      }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: isDark ? 'rgba(139,92,246,0.25)' : '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📢</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14, color: isDark ? '#c7d2fe' : '#4338ca', marginBottom: 4 }}>New Assignment: Normalization</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 900 }}>DUE TOMORROW</span>
            <span style={{ color: isDark ? '#a78bfa' : '#6d28d9', fontSize: 12, fontWeight: 700 }}>Posted by Teacher</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, height: 1, background: isDark ? '#1e293b' : '#e2e8f0' }} />
        <span style={{ fontSize: 10, color: isDark ? '#64748b' : '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>💬 Live Discussion</span>
        <div style={{ flex: 1, height: 1, background: isDark ? '#1e293b' : '#e2e8f0' }} />
      </div>

      {/* Chat bubbles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Student message */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>A</div>
          <div>
            <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginBottom: 2 }}>Anu</div>
            <div style={{
              background: isDark ? '#1e293b' : '#fff',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: '2px 12px 12px 12px',
              padding: '7px 11px',
              fontSize: 12.5,
              color: isDark ? '#f1f5f9' : '#1e293b',
              boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              Ma&apos;am is this for tomorrow?
            </div>
            <div style={{ fontSize: 10, color: isDark ? '#64748b' : '#94a3b8', marginTop: 2 }}>9:14 AM</div>
          </div>
        </div>

        {/* Teacher reply */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ maxWidth: '78%', textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: isDark ? '#818cf8' : '#4f46e5', fontWeight: 700, marginBottom: 2 }}>Teacher</div>
            <div style={{ background: '#4f46e5', borderRadius: '12px 2px 12px 12px', padding: '7px 11px', fontSize: 12.5, color: '#fff', display: 'inline-block', textAlign: 'left' }}>
              Yes, submit before 5 PM ✅
            </div>
            <div style={{ fontSize: 10, color: isDark ? '#64748b' : '#94a3b8', marginTop: 2 }}>9:15 AM ✓✓</div>
          </div>
        </div>

        {/* Another student */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>K</div>
          <div>
            <div style={{ fontSize: 10, color: '#27ae60', fontWeight: 700, marginBottom: 2 }}>Karthik</div>
            <div style={{
              background: isDark ? '#1e293b' : '#fff',
              border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
              borderRadius: '2px 12px 12px 12px',
              padding: '7px 11px',
              fontSize: 12.5,
              color: isDark ? '#f1f5f9' : '#1e293b',
              boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.06)'
            }}>
              Got it, uploading now 👍
            </div>
            <div style={{ fontSize: 10, color: isDark ? '#64748b' : '#94a3b8', marginTop: 2 }}>9:16 AM</div>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom banner */}
    <div style={{
      background: isDark ? 'rgba(79,70,229,0.15)' : 'linear-gradient(135deg,rgba(79,70,229,0.08),rgba(124,58,237,0.08))',
      borderTop: isDark ? '1px solid rgba(99,102,241,0.25)' : '1px solid #e0e7ff',
      padding: '9px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }}>
      <span style={{ fontSize: 14 }}>⚡</span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: isDark ? '#c7d2fe' : '#4338ca' }}>Structured like a classroom + instant discussion</span>
    </div>
  </div>
);

const PublicRoomsUI = ({ isDark }) => (
  <div style={{
    background: isDark ? '#111827' : '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.08)',
    fontFamily: 'Inter,sans-serif',
    border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0'
  }}>
    <div style={{ display: 'flex', flexDirection: window.innerWidth < 480 ? 'column' : 'row', minHeight: 300 }}>
      {/* Left Side: Discovery */}
      <div style={{ flex: 1, background: isDark ? '#0f172a' : '#f8fafc', borderRight: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0', padding: '16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.5px' }}>Public Rooms</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '💻', name: 'Web Dev', members: '1.2k', tag: 'Trending', tagCol: '#ef4444', active: true },
            { icon: '🎬', name: 'Movies', members: '860', tag: '', tagCol: '' },
            { icon: '📈', name: 'Startups', members: '540', tag: 'Active', tagCol: '#10b981' },
          ].map((room, i) => (
            <div key={i} style={{
              background: room.active ? (isDark ? '#1e293b' : '#fff') : 'transparent',
              padding: '10px 12px',
              borderRadius: 12,
              border: room.active ? (isDark ? '1px solid #334155' : '1px solid #e2e8f0') : '1px solid transparent',
              boxShadow: room.active ? (isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 8px rgba(0,0,0,0.04)') : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <span style={{ fontSize: 18 }}>{room.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? '#f1f5f9' : '#1e293b' }}>{room.name}</div>
                <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>{room.members} members</div>
              </div>
              {room.tag && (
                <span style={{ fontSize: 10, fontWeight: 800, color: room.tagCol, background: room.tagCol + (isDark ? '25' : '15'), padding: '2px 6px', borderRadius: 6 }}>
                  {room.tag === 'Trending' ? '🔥' : '🟢'} {room.tag}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Side: Chat Preview */}
      <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', background: isDark ? '#0b0f19' : '#fff' }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9', background: isDark ? '#111827' : '#fff', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: isDark ? '#f8fafc' : '#0f172a' }}>💻 Web Dev Room</div>
            <div style={{
              background: isDark ? 'rgba(16,185,129,0.15)' : '#f0fdf4',
              border: isDark ? '1.5px solid rgba(16,185,129,0.35)' : '1.5px solid #bbf7d0',
              borderRadius: 20,
              padding: '3px 12px',
              fontSize: 10.5,
              color: isDark ? '#34d399' : '#166534',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              Nickname Active
            </div>
          </div>
          <div style={{
            background: isDark ? 'rgba(59,130,246,0.12)' : 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            border: isDark ? '1.5px solid rgba(59,130,246,0.4)' : '1.5px solid #3b82f6',
            borderRadius: 10,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: isDark ? '0 2px 10px rgba(0,0,0,0.2)' : '0 2px 10px rgba(59,130,246,0.1)'
          }}>
            <span style={{ fontSize: 14 }}>📌</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: isDark ? '#60a5fa' : '#1d4ed8', letterSpacing: '0.2px' }}>Topic: Learning React</span>
          </div>
        </div>

        {/* Chat body */}
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { nick: 'ShadowCoder', text: 'Best way to learn React?', col: '#6366f1' },
            { nick: 'CodeNinja', text: 'Start with small projects', col: '#ec4899' },
            { nick: 'DevGhost', text: 'Build and practice daily', col: '#10b981' },
          ].map((msg, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: msg.col, marginBottom: 2, marginLeft: 4 }}>{msg.nick}</span>
              <div style={{
                background: isDark ? '#1e293b' : '#f1f5f9',
                border: isDark ? '1px solid #334155' : 'none',
                padding: '8px 12px',
                borderRadius: '2px 12px 12px 12px',
                fontSize: 12.5,
                color: isDark ? '#e2e8f0' : '#334155',
                maxWidth: '90%'
              }}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div style={{ padding: '10px 16px', background: isDark ? '#0f172a' : '#f8fafc', borderTop: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9', fontSize: 10, color: isDark ? '#64748b' : '#94a3b8', textAlign: 'center' }}>
          Your personal profile stays private
        </div>
      </div>
    </div>
  </div>
);

const CalendarUI = ({ isDark }) => (
  <div style={{
    background: isDark ? '#111827' : '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.08)',
    fontFamily: 'Inter,sans-serif',
    border: isDark ? '1px solid #1e293b' : 'none'
  }}>
    <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', padding: '14px 16px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontWeight: 800, fontSize: 15 }}>📅 Events & Calendar</div>
        <div style={{ fontSize: 11, opacity: 0.8 }}>May 2025</div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>3 upcoming</div>
    </div>
    <div style={{ padding: 12 }}>
      {[
        { day: 'Mon 5', title: 'Science Test', time: '10:00 AM', color: '#ef4444', tag: 'Exam' },
        { day: 'Wed 7', title: 'Art Submission', time: '2:00 PM', color: '#f59e0b', tag: 'Deadline' },
        { day: 'Fri 9', title: 'Math Revision', time: '4:00 PM', color: '#6366f1', tag: 'Session' },
      ].map((ev, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 2 ? (isDark ? '1px solid #1e293b' : '1px solid #f1f5f9') : 'none' }}>
          <div style={{ background: ev.color + (isDark ? '25' : '15'), color: ev.color, borderRadius: 10, padding: '6px 8px', textAlign: 'center', minWidth: 44, fontSize: 11, fontWeight: 700 }}>{ev.day}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: isDark ? '#f1f5f9' : '#1e293b' }}>{ev.title}</div>
            <div style={{ fontSize: 11, color: isDark ? '#94a3b8' : '#64748b' }}>{ev.time}</div>
          </div>
          <div style={{ background: ev.color + (isDark ? '25' : '15'), color: ev.color, borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>{ev.tag}</div>
        </div>
      ))}
    </div>
  </div>
);

/* ── Section wrapper ── */
const Section = ({ label, heading, sub, arrow, children, flip, isDark }) => (
  <div className={`reveal section-layout ${flip ? 'flip' : ''}`}>
    <div style={{ flex: 1, width: '100%' }}>
      {label && (
        <div style={{
          display: 'inline-block',
          background: isDark ? 'rgba(124, 58, 237, 0.2)' : '#ede9fe',
          color: isDark ? '#c084fc' : '#7c3aed',
          border: isDark ? '1px solid rgba(124, 58, 237, 0.35)' : 'none',
          borderRadius: 20,
          padding: '4px 14px',
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 12,
          letterSpacing: '0.4px'
        }}>
          {label}
        </div>
      )}
      <h2 style={{
        fontSize: 'clamp(26px,5vw,36px)',
        fontWeight: 800,
        color: isDark ? '#f8fafc' : '#0f172a',
        margin: '0 0 16px',
        lineHeight: 1.15
      }}>
        {heading}
        {arrow && (
          <div style={{
            fontSize: 'clamp(22px,4vw,28px)',
            color: isDark ? '#818cf8' : '#6366f1',
            marginTop: 8,
            fontWeight: 700
          }}>
            {arrow}
          </div>
        )}
      </h2>
      <p style={{
        fontSize: 16,
        color: isDark ? '#94a3b8' : '#64748b',
        lineHeight: 1.65,
        margin: 0
      }}>
        {sub}
      </p>
    </div>
    <div style={{ flex: 1.15, width: '100%' }}>{children}</div>
  </div>
);

export default function LandingPage() {
  useReveal();
  const navigate = useNavigate();
  const { deferredPrompt, installApp, isInstalled } = usePWA();
  const { theme, setTheme } = useTheme();

  // Device theme detection first, default is dark
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const hasManualChoice = localStorage.getItem('theme-manual-override');
    if (!hasManualChoice) {
      const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      setTheme(prefersLight ? 'light' : 'dark');
    }
  }, [setTheme]);

  // Dynamic system listener if user hasn't manually overridden
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handleSchemeChange = (e) => {
      const hasManualChoice = localStorage.getItem('theme-manual-override');
      if (!hasManualChoice) {
        setTheme(e.matches ? 'light' : 'dark');
      }
    };
    mq.addEventListener('change', handleSchemeChange);
    return () => mq.removeEventListener('change', handleSchemeChange);
  }, [setTheme]);

  const isDark = theme !== 'light';

  const toggleTheme = () => {
    localStorage.setItem('theme-manual-override', 'true');
    setTheme(isDark ? 'light' : 'dark');
  };

  const goSignup = () => navigate('/signin');
  const handleInstall = async () => { if (deferredPrompt && !isInstalled) await installApp(); navigate('/signin'); };

  return (
    <div style={{
      height: '100dvh',
      overflowY: 'auto',
      background: isDark ? '#090d16' : '#f8fafc',
      fontFamily: "'Inter','Segoe UI',sans-serif",
      color: isDark ? '#f8fafc' : '#0f172a',
      transition: 'background-color 0.25s ease, color 0.25s ease'
    }}>

      {/* CSS */}
      <style>{`
        .reveal { opacity:0; transform:translateY(32px); transition: opacity 0.65s ease, transform 0.65s ease; }
        .revealed { opacity:1 !important; transform:translateY(0) !important; }
        .btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; border-radius:14px; padding:14px 28px; font-size:15px; font-weight:700; cursor:pointer; box-shadow:0 4px 18px rgba(99,102,241,0.4); transition:transform .15s,box-shadow .15s; }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(99,102,241,0.45); }
        .btn-secondary { background:${isDark ? 'rgba(255,255,255,0.08)' : '#fff'}; color:${isDark ? '#f1f5f9' : '#374151'}; border:1.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}; border-radius:14px; padding:14px 28px; font-size:15px; font-weight:600; cursor:pointer; transition:background .15s; }
        .btn-secondary:hover { background:${isDark ? 'rgba(255,255,255,0.15)' : '#f1f5f9'}; }
        .lp-divider { display:flex; align-items:center; gap:16px; color:${isDark ? '#64748b' : '#94a3b8'}; font-size:13px; font-weight:600; }
        .lp-divider::before,.lp-divider::after { content:''; flex:1; height:1px; background:${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}; }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
          60% { transform: translateY(-3px); }
        }
        .section-layout {
          display: flex;
          flex-direction: column;
          gap: 40px;
          max-width: 500px;
          margin: 0 auto;
          width: 100%;
        }
        @media (min-width: 900px) {
          .section-layout {
            flex-direction: row;
            max-width: 1080px;
            align-items: center;
            gap: 80px;
            text-align: left;
          }
          .section-layout.flip {
            flex-direction: row-reverse;
          }
        }
        .landing-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: ${isDark ? 'rgba(9, 13, 22, 0.85)' : 'rgba(248, 250, 252, 0.85)'};
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'};
          padding: 14px 24px;
          min-height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          box-sizing: border-box;
          width: 100%;
          transition: background-color 0.25s ease, border-color 0.25s ease;
        }
        .landing-nav-logo {
          font-size: 20px;
          font-weight: 800;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
          flex-shrink: 0;
          user-select: none;
        }
        .hero-gradient-text {
          background: linear-gradient(135deg, #6366f1, #a78bfa);
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
          display: inline;
        }
        .hero-gradient-text.dark {
          background: linear-gradient(135deg, #818cf8, #c084fc);
          -webkit-background-clip: text !important;
          background-clip: text !important;
          -webkit-text-fill-color: transparent !important;
          color: transparent !important;
        }
        .landing-nav-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          flex-wrap: nowrap;
        }
        .landing-nav-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 12px;
          padding: 8px 16px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          flex-shrink: 0;
          transition: all 0.15s ease;
          text-decoration: none;
        }
        .landing-nav-theme {
          background: ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff'};
          color: ${isDark ? '#e2e8f0' : '#374151'};
          border: 1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0'};
          padding: 8px 12px;
        }
        .landing-nav-theme:hover {
          background: ${isDark ? 'rgba(255, 255, 255, 0.16)' : '#f1f5f9'};
          transform: translateY(-1px);
        }
        .landing-nav-download {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #ffffff;
          border: none;
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.25);
        }
        .landing-nav-download:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
        }
        .landing-nav-login {
          background: ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff'};
          color: ${isDark ? '#e2e8f0' : '#374151'};
          border: 1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.14)' : '#e2e8f0'};
        }
        .landing-nav-login:hover {
          background: ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#f1f5f9'};
        }
        @media (max-width: 640px) {
          .landing-nav {
            padding: 14px 18px;
            min-height: 64px;
            gap: 10px;
          }
          .landing-nav-logo {
            font-size: 20px;
          }
          .landing-nav-actions {
            gap: 8px;
          }
          .theme-btn-label,
          .download-btn-label {
            display: none !important;
          }
          .landing-nav-theme,
          .landing-nav-download {
            padding: 0;
            width: 38px;
            height: 38px;
            min-width: 38px;
            border-radius: 12px;
            box-sizing: border-box;
          }
          .landing-nav-login {
            height: 38px;
            padding: 0 16px;
            font-size: 13.5px;
            border-radius: 12px;
            box-sizing: border-box;
          }
        }
        @media (max-width: 380px) {
          .landing-nav {
            padding: 12px 14px;
            min-height: 58px;
            gap: 8px;
          }
          .landing-nav-logo {
            font-size: 18px;
          }
          .landing-nav-actions {
            gap: 6px;
          }
          .landing-nav-theme,
          .landing-nav-download {
            width: 35px;
            height: 35px;
            min-width: 35px;
            border-radius: 10px;
          }
          .landing-nav-login {
            height: 35px;
            padding: 0 13px;
            font-size: 12.5px;
            border-radius: 10px;
          }
        }
        @media (max-width: 330px) {
          .landing-nav {
            padding: 10px 10px;
            min-height: 54px;
            gap: 6px;
          }
          .landing-nav-logo {
            font-size: 17px;
          }
          .landing-nav-actions {
            gap: 5px;
          }
          .landing-nav-theme,
          .landing-nav-download {
            width: 32px;
            height: 32px;
            min-width: 32px;
            border-radius: 8px;
          }
          .landing-nav-login {
            height: 32px;
            padding: 0 10px;
            font-size: 11.5px;
            border-radius: 8px;
          }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="landing-nav">
        <span className="landing-nav-logo">LetsChat</span>
        <div className="landing-nav-actions">
          {/* Theme Toggle: Dark / White */}
          <button
            onClick={toggleTheme}
            className="landing-nav-btn landing-nav-theme"
            title={isDark ? "Switch to white/light theme" : "Switch to dark theme"}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
          >
            {isDark ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                <span className="theme-btn-label">Light</span>
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                <span className="theme-btn-label">Dark</span>
              </>
            )}
          </button>

          <button
            onClick={handleInstall}
            className="landing-nav-btn landing-nav-download"
            title="Download LetsChat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="download-btn-label">Download</span>
          </button>

          <button
            onClick={() => navigate('/login')}
            className="landing-nav-btn landing-nav-login"
            title="Log in to LetsChat"
          >
            Log in
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: '72px 24px 24px', textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <div style={{
          display: 'inline-block',
          background: isDark ? 'rgba(99, 102, 241, 0.15)' : 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
          border: isDark ? '1px solid rgba(99, 102, 241, 0.35)' : 'none',
          color: isDark ? '#a78bfa' : '#6d28d9',
          borderRadius: 100,
          padding: '6px 18px',
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 24,
          letterSpacing: '0.5px'
        }}>
          ✦ CLOSED BETA
        </div>
        <h1 style={{
          fontSize: 'clamp(32px,8vw,56px)',
          fontWeight: 800,
          lineHeight: 1.1,
          marginBottom: 18,
          color: isDark ? '#f8fafc' : '#0f172a'
        }}>
          Chat without<br />
          <span className={`hero-gradient-text ${isDark ? 'dark' : ''}`}>
            the chaos.
          </span>
        </h1>
        <p style={{
          fontSize: 16,
          color: isDark ? '#94a3b8' : '#64748b',
          lineHeight: 1.65,
          marginBottom: 12,
          maxWidth: 440,
          margin: '0 auto'
        }}>
          Give every conversation its own place.<br />
          Organized spaces, focused rooms, and a built-in calendar — designed for communities that do more than just chat.
        </p>

        {/* Scroll Hint */}
        <div style={{
          marginTop: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          color: isDark ? '#64748b' : '#94a3b8',
          animation: 'bounce 2s infinite'
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Scroll to explore</span>
          <span style={{ fontSize: 18 }}>↓</span>
        </div>
      </section>

      {/* ── Sections ── */}
      <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', gap: 64 }}>

        {/* Divider 1 */}
        <div className="lp-divider reveal">BEFORE</div>

        {/* Section 1 – Before */}
        <Section
          label="The Problem"
          heading="From messy group chats"
          sub="Homework, birthday wishes, memes, and announcements — all in one thread. Important messages disappear in days."
          isDark={isDark}
        >
          <MessyChat isDark={isDark} />
        </Section>

        {/* Arrow transition */}
        <div className="reveal" style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 20, background: isDark ? 'linear-gradient(#1e293b,#6366f1)' : 'linear-gradient(#e2e8f0,#6366f1)' }} />
            <div style={{ background: '#6366f1', color: '#fff', borderRadius: 50, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>↓</div>
            <div style={{ fontWeight: 700, color: isDark ? '#818cf8' : '#6366f1', fontSize: 13 }}>LetsChat</div>
          </div>
        </div>

        <div className="lp-divider reveal">AFTER</div>

        {/* Section 2 – After */}
        <Section
          label="The Solution"
          heading="To organized spaces"
          sub="Split conversations by subject. Homework goes in Homework. Doubts stay in Doubts. Nothing gets buried."
          flip
          isDark={isDark}
        >
          <CleanChat isDark={isDark} />
        </Section>

        <div className="lp-divider reveal">CLASSROOMS</div>

        {/* Section 3 – Rooms */}
        <Section
          label="Classroom"
          heading="A real classroom, not just a group"
          sub="Assignments, materials, and announcements — organized like a classroom, with real-time discussion built in."
          isDark={isDark}
        >
          <ClassroomUI isDark={isDark} />
        </Section>

        <div className="lp-divider reveal">PUBLIC ROOMS</div>

        {/* Section 4 – Public Rooms */}
        <Section
          label="Privacy First"
          heading="Public discussions, without the chaos"
          sub="Join topic-based rooms, explore ideas, and participate using a separate nickname—keeping your personal identity private."
          arrow="Explore freely. Discuss clearly."
          flip
          isDark={isDark}
        >
          <PublicRoomsUI isDark={isDark} />
        </Section>

        <div className="lp-divider reveal">EVENTS &amp; CALENDAR</div>

        {/* Section 5 – Events */}
        <Section
          label="Never miss anything"
          heading="From missed updates"
          sub="Track exams, deadlines, and sessions in a built-in calendar shared across your groups."
          arrow="→ to tracked events"
          isDark={isDark}
        >
          <CalendarUI isDark={isDark} />
        </Section>

        {/* ── CTA ── */}
        <div className="reveal" style={{
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          borderRadius: 24,
          padding: '48px 28px',
          textAlign: 'center',
          marginBottom: 0,
          boxShadow: isDark ? '0 16px 48px rgba(99,102,241,0.3)' : '0 12px 36px rgba(99,102,241,0.2)'
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px', marginBottom: 12 }}>✦ CLOSED BETA</div>
          <h2 style={{ fontSize: 'clamp(22px,5vw,34px)', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Ready to get organized?</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, marginBottom: 28 }}>Join now and experience structured communication.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={goSignup} style={{ background: '#fff', color: '#6366f1', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              Get Started →
            </button>
            <button onClick={() => { if (deferredPrompt && !isInstalled) installApp(); navigate('/signin'); }} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 14, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              Download LetsChat
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '24px 0 40px', color: isDark ? '#64748b' : '#94a3b8', fontSize: 13 }}>
          © {new Date().getFullYear()} LetsChat &nbsp;·&nbsp;
          <span onClick={() => navigate('/login')} style={{ cursor: 'pointer', color: isDark ? '#818cf8' : '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Already have an account?</span>
        </footer>
      </div>
    </div>
  );
}

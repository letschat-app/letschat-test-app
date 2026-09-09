import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePWA } from '../context/PWAContext';

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

const MessyChat = () => {
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
    <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.15)', fontFamily: 'Inter,sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#075e54', padding: '10px 14px', color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#128c7e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, flexShrink: 0 }}>CS</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>CS Batch 2025 💬</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>Arun, Priya, Rahul, Karthik, Anu +12</div>
        </div>
      </div>
      {/* Body */}
      <div style={{ background: '#e5ddd5', padding: '10px 10px 6px', maxHeight: 320, overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <span style={{ background: 'rgba(0,0,0,0.12)', borderRadius: 10, padding: '2px 10px', fontSize: 11, color: '#555' }}>TODAY</span>
        </div>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 3, alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: COLORS[m.name], flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 9, fontWeight: 800, marginTop: 2 }}>{m.name[0]}</div>
            <div style={{ background: '#fff', borderRadius: '2px 10px 10px 10px', padding: '4px 8px', maxWidth: '82%', boxShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
              <div style={{ color: COLORS[m.name], fontWeight: 700, fontSize: 10.5 }}>{m.name}</div>
              <div style={{ color: '#111', fontSize: 12.5, lineHeight: 1.35 }}>{m.text}</div>
              <div style={{ color: '#999', fontSize: 9.5, textAlign: 'right', marginTop: 1 }}>{m.time}</div>
            </div>
          </div>
        ))}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 11, fontWeight: 700 }}>↓ 17 more messages below</span>
        </div>
      </div>
      {/* Input */}
      <div style={{ background: '#f0f0f0', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 20, padding: '7px 14px', color: '#aaa', fontSize: 13 }}>Message</div>
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

const CleanChat = () => (
  <div style={{ background: '#0b141a', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', fontFamily: 'Inter,sans-serif' }}>
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


const ClassroomUI = () => (
  <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(99,102,241,0.12)', fontFamily: 'Inter,sans-serif', border: '1px solid #e0e7ff' }}>
    {/* Header */}
    <div style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', padding: '14px 16px', color: '#fff' }}>
      <div style={{ fontWeight: 800, fontSize: 15 }}>📚 DBMS Classroom</div>
      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>Organized learning + live discussion</div>
    </div>

    {/* Tabs */}
    <div style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
      {['Announcements', 'Materials', 'Discussion'].map((tab, i) => (
        <div key={i} style={{
          flex: 1, textAlign: 'center', padding: '9px 4px',
          fontSize: 12, fontWeight: 600,
          color: i === 2 ? '#4f46e5' : '#94a3b8',
          borderBottom: i === 2 ? '2px solid #4f46e5' : '2px solid transparent',
          cursor: 'pointer',
          transition: 'color .15s',
        }}>{tab}</div>
      ))}
    </div>

    {/* Content */}
    <div style={{ padding: '12px 14px', background: '#f8fafc' }}>

      {/* Announcement card */}
      <div style={{ background: '#f5f3ff', border: '2px solid #ddd6fe', borderRadius: 14, padding: '12px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 12, boxShadow: '0 4px 12px rgba(99,102,241,0.06)' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>📢</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14, color: '#4338ca', marginBottom: 4 }}>New Assignment: Normalization</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ background: '#ef4444', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 900 }}>DUE TOMORROW</span>
            <span style={{ color: '#6d28d9', fontSize: 12, fontWeight: 700 }}>Posted by Teacher</span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>💬 Live Discussion</span>
        <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
      </div>

      {/* Chat bubbles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Student message */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>A</div>
          <div>
            <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginBottom: 2 }}>Anu</div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '2px 12px 12px 12px', padding: '7px 11px', fontSize: 12.5, color: '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              Ma&apos;am is this for tomorrow?
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>9:14 AM</div>
          </div>
        </div>

        {/* Teacher reply */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ maxWidth: '78%', textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#4f46e5', fontWeight: 700, marginBottom: 2 }}>Teacher</div>
            <div style={{ background: '#4f46e5', borderRadius: '12px 2px 12px 12px', padding: '7px 11px', fontSize: 12.5, color: '#fff', display: 'inline-block', textAlign: 'left' }}>
              Yes, submit before 5 PM ✅
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>9:15 AM  ✓✓</div>
          </div>
        </div>

        {/* Another student */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#27ae60', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>K</div>
          <div>
            <div style={{ fontSize: 10, color: '#27ae60', fontWeight: 700, marginBottom: 2 }}>Karthik</div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '2px 12px 12px 12px', padding: '7px 11px', fontSize: 12.5, color: '#1e293b', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              Got it, uploading now 👍
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>9:16 AM</div>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom banner */}
    <div style={{ background: 'linear-gradient(135deg,rgba(79,70,229,0.08),rgba(124,58,237,0.08))', borderTop: '1px solid #e0e7ff', padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14 }}>⚡</span>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: '#4338ca' }}>Structured like a classroom + instant discussion</span>
    </div>
  </div>
);

const PublicRoomsUI = () => (
  <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', fontFamily: 'Inter,sans-serif', border: '1px solid #e2e8f0' }}>
    <div style={{ display: 'flex', flexDirection: window.innerWidth < 480 ? 'column' : 'row', minHeight: 300 }}>
      {/* Left Side: Discovery */}
      <div style={{ flex: 1, background: '#f8fafc', borderRight: '1px solid #e2e8f0', padding: '16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.5px' }}>Public Rooms</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '💻', name: 'Web Dev', members: '1.2k', tag: 'Trending', tagCol: '#ef4444', active: true },
            { icon: '🎬', name: 'Movies', members: '860', tag: '', tagCol: '' },
            { icon: '📈', name: 'Startups', members: '540', tag: 'Active', tagCol: '#10b981' },
          ].map((room, i) => (
            <div key={i} style={{
              background: room.active ? '#fff' : 'transparent',
              padding: '10px 12px',
              borderRadius: 12,
              border: room.active ? '1px solid #e2e8f0' : '1px solid transparent',
              boxShadow: room.active ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 10
            }}>
              <span style={{ fontSize: 18 }}>{room.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{room.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>{room.members} members</div>
              </div>
              {room.tag && (
                <span style={{ fontSize: 10, fontWeight: 800, color: room.tagCol, background: room.tagCol + '15', padding: '2px 6px', borderRadius: 6 }}>
                  {room.tag === 'Trending' ? '🔥' : '🟢'} {room.tag}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right Side: Chat Preview */}
      <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9', background: '#fff', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>💻 Web Dev Room</div>
            <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: 20, padding: '3px 12px', fontSize: 10.5, color: '#166534', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
              Nickname Active
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1.5px solid #3b82f6', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 10px rgba(59,130,246,0.1)' }}>
            <span style={{ fontSize: 14 }}>📌</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#1d4ed8', letterSpacing: '0.2px' }}>Topic: Learning React</span>
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
              <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '2px 12px 12px 12px', fontSize: 12.5, color: '#334155', maxWidth: '90%' }}>
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div style={{ padding: '10px 16px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>
          Your personal profile stays private
        </div>
      </div>
    </div>
  </div>
);

const CalendarUI = () => (
  <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontFamily: 'Inter,sans-serif' }}>
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
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
          <div style={{ background: ev.color + '15', color: ev.color, borderRadius: 10, padding: '6px 8px', textAlign: 'center', minWidth: 44, fontSize: 11, fontWeight: 700 }}>{ev.day}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{ev.title}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{ev.time}</div>
          </div>
          <div style={{ background: ev.color + '15', color: ev.color, borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700 }}>{ev.tag}</div>
        </div>
      ))}
    </div>
  </div>
);

/* ── Section wrapper ── */
const Section = ({ label, heading, sub, arrow, children, flip }) => (
  <div className={`reveal section-layout ${flip ? 'flip' : ''}`}>
    <div style={{ flex: 1, width: '100%' }}>
      {label && <div style={{ display: 'inline-block', background: '#ede9fe', color: '#7c3aed', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, marginBottom: 12, letterSpacing: '0.4px' }}>{label}</div>}
      <h2 style={{ fontSize: 'clamp(26px,5vw,36px)', fontWeight: 800, color: '#0f172a', margin: '0 0 16px', lineHeight: 1.15 }}>
        {heading}
        {arrow && <div style={{ fontSize: 'clamp(22px,4vw,28px)', color: '#6366f1', marginTop: 8, fontWeight: 700 }}>{arrow}</div>}
      </h2>
      <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.65, margin: 0 }}>{sub}</p>
    </div>
    <div style={{ flex: 1.15, width: '100%' }}>{children}</div>
  </div>
);

export default function LandingPage() {
  useReveal();
  const navigate = useNavigate();
  const { deferredPrompt, installApp, isInstalled } = usePWA();

  const goSignup = () => navigate('/signin');
  const handleInstall = async () => { if (deferredPrompt && !isInstalled) await installApp(); navigate('/signin'); };

  return (
    <div style={{ height: '100dvh', overflowY: 'auto', background: '#f8fafc', fontFamily: "'Inter','Segoe UI',sans-serif", color: '#0f172a' }}>

      {/* CSS */}
      <style>{`
        .reveal { opacity:0; transform:translateY(32px); transition: opacity 0.65s ease, transform 0.65s ease; }
        .revealed { opacity:1 !important; transform:translateY(0) !important; }
        .btn-primary { background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; border:none; border-radius:14px; padding:14px 28px; font-size:15px; font-weight:700; cursor:pointer; box-shadow:0 4px 18px rgba(99,102,241,0.4); transition:transform .15s,box-shadow .15s; }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(99,102,241,0.45); }
        .btn-secondary { background:#fff; color:#374151; border:1.5px solid #e2e8f0; border-radius:14px; padding:14px 28px; font-size:15px; font-weight:600; cursor:pointer; transition:background .15s; }
        .btn-secondary:hover { background:#f1f5f9; }
        .lp-divider { display:flex; align-items:center; gap:16px; color:#94a3b8; font-size:13px; font-weight:600; }
        .lp-divider::before,.lp-divider::after { content:''; flex:1; height:1px; background:#e2e8f0; }
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
      `}</style>

      {/* ── Nav ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(248,250,252,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LetsChat</span>
        <button onClick={() => navigate('/login')} style={{ background: 'none', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>Log in</button>
      </nav>

      {/* ── Hero ── */}
      <section style={{ padding: '72px 24px 24px', textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ display: 'inline-block', background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', color: '#6d28d9', borderRadius: 100, padding: '6px 18px', fontSize: 12, fontWeight: 700, marginBottom: 24, letterSpacing: '0.5px' }}>
          ✦ CLOSED BETA
        </div>
        <h1 style={{ fontSize: 'clamp(32px,8vw,56px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 18 }}>
          Chat without<br />
          <span style={{ background: 'linear-gradient(135deg,#6366f1,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>the chaos.</span>
        </h1>
        <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.65, marginBottom: 12, maxWidth: 440, margin: '0 auto' }}>
          Give every conversation its own place.<br />
          Organized spaces, focused rooms, and a built-in calendar — designed for communities that do more than just chat.
        </p>

        {/* Scroll Hint */}
        <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: '#94a3b8', animation: 'bounce 2s infinite' }}>
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
        >
          <MessyChat />
        </Section>

        {/* Arrow transition */}
        <div className="reveal" style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 20, background: 'linear-gradient(#e2e8f0,#6366f1)' }} />
            <div style={{ background: '#6366f1', color: '#fff', borderRadius: 50, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>↓</div>
            <div style={{ fontWeight: 700, color: '#6366f1', fontSize: 13 }}>LetsChat</div>
          </div>
        </div>

        <div className="lp-divider reveal">AFTER</div>

        {/* Section 2 – After */}
        <Section
          label="The Solution"
          heading="To organized spaces"
          sub="Split conversations by subject. Homework goes in Homework. Doubts stay in Doubts. Nothing gets buried."
          flip
        >
          <CleanChat />
        </Section>

        <div className="lp-divider reveal">CLASSROOMS</div>

        {/* Section 3 – Rooms */}
        <Section
          label="Classroom"
          heading="A real classroom, not just a group"
          sub="Assignments, materials, and announcements — organized like a classroom, with real-time discussion built in."
        >
          <ClassroomUI />
        </Section>

        <div className="lp-divider reveal">PUBLIC ROOMS</div>

        {/* Section 4 – Public Rooms */}
        <Section
          label="Privacy First"
          heading="Public discussions, without the chaos"
          sub="Join topic-based rooms, explore ideas, and participate using a separate nickname—keeping your personal identity private."
          arrow="Explore freely. Discuss clearly."
          flip
        >
          <PublicRoomsUI />
        </Section>

        <div className="lp-divider reveal">EVENTS &amp; CALENDAR</div>

        {/* Section 4 – Events */}
        <Section
          label="Never miss anything"
          heading="From missed updates"
          sub="Track exams, deadlines, and sessions in a built-in calendar shared across your groups."
          arrow="→ to tracked events"
        >
          <CalendarUI />
        </Section>

        {/* ── CTA ── */}
        <div className="reveal" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 24, padding: '48px 28px', textAlign: 'center', marginBottom: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.5px', marginBottom: 12 }}>✦ CLOSED BETA</div>
          <h2 style={{ fontSize: 'clamp(22px,5vw,34px)', fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Ready to get organized?</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginBottom: 28 }}>Join now and experience structured communication.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={goSignup} style={{ background: '#fff', color: '#6366f1', border: 'none', borderRadius: 14, padding: '14px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
              Get Started →
            </button>
            <button onClick={() => { if (deferredPrompt && !isInstalled) installApp(); navigate('/signin'); }} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', borderRadius: 14, padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
              ⬇ Install App
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '24px 0 40px', color: '#94a3b8', fontSize: 13 }}>
          © {new Date().getFullYear()} LetsChat &nbsp;·&nbsp;
          <span onClick={() => navigate('/login')} style={{ cursor: 'pointer', color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Already have an account?</span>
        </footer>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Eye, Clock, Trash2, Flame, Loader2, Users } from 'lucide-react';
import { getMyPulses, getMinePulsesOffline } from '../../service/PulseService';
import Avatar from '../chat/Avatar';
import StreakBadge from './StreakBadge';

const MyPulsesView = ({ onBack, onOpenCreate }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ pulseStreak: 0, activePulses: [], expiredPulses: [] });
  const [selectedPulseViewers, setSelectedPulseViewers] = useState(null);

  const fetchMine = async () => {
    // 1. Instant rendering from IndexedDB
    try {
      const cached = await getMinePulsesOffline();
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    } catch (e) {}

    // 2. Fetch fresh network data and update IndexedDB
    try {
      const res = await getMyPulses();
      if (res) {
        setData(res);
      }
    } catch (err) {
      console.error('[MyPulsesView] Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMine();
  }, []);

  const activeList = data.activePulses || [];
  const expiredList = data.expiredPulses || [];

  return (
    <div style={{
      width: '100%', height: '100%',
      backgroundColor: 'var(--bg-primary)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto', boxSizing: 'border-box'
    }}>
      {/* Top Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>My Pulses</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <StreakBadge streak={data.pulseStreak} size="lg" />

          <button
            onClick={onOpenCreate}
            style={{
              padding: '8px 16px', borderRadius: '12px',
              backgroundColor: 'var(--accent-color)', color: '#fff',
              border: 'none', fontWeight: '700', fontSize: '13px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            <Plus size={16} /> New Pulse
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', padding: '24px 16px', boxSizing: 'border-box' }}>
        
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <Loader2 className="animate-spin" size={32} />
            <p style={{ marginTop: '12px', fontSize: '14px', fontWeight: '600' }}>Loading your statuses...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Active Pulses Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  Active Pulses ({activeList.length})
                </h2>
              </div>

              {activeList.length === 0 ? (
                <div style={emptyCardStyle}>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>You don't have any active status updates right now.</p>
                  <button onClick={onOpenCreate} style={{ marginTop: '12px', background: 'none', border: 'none', color: 'var(--accent-color)', fontWeight: '700', cursor: 'pointer' }}>
                    + Post a 24-hour status
                  </button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                  {activeList.map((pulse) => (
                    <div key={pulse.pulseId || pulse.id} style={pulseCardStyle}>
                      {/* Active Media / Text Preview */}
                      <div style={{
                        height: '160px',
                        backgroundColor: pulse.bgColor || '#1e293b',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        position: 'relative',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '12px'
                      }}>
                        {pulse.type === 'text' && (
                          <div style={{
                            color: '#fff', fontWeight: '700', fontSize: '16px', textAlign: 'center',
                            fontFamily: pulse.fontStyle || 'sans-serif'
                          }}>
                            {pulse.content}
                          </div>
                        )}
                        {(pulse.type === 'image' || pulse.type === 'image_audio') && (
                          <img src={pulse.imageUrl || pulse.mediaUrl} alt="Pulse" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        {pulse.type === 'video' && (
                          <video src={pulse.videoUrl || pulse.mediaUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        )}
                        {pulse.type === 'audio' && (
                          <div style={{ color: '#fff', textAlign: 'center' }}>
                            <div style={{ fontSize: '32px', marginBottom: '4px' }}>🎵</div>
                            <audio src={pulse.audioUrl || pulse.mediaUrl} controls style={{ width: '90%', height: '32px' }} />
                          </div>
                        )}

                        <span style={{
                          position: 'absolute', top: '8px', right: '8px',
                          backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff',
                          fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '10px',
                          textTransform: 'uppercase'
                        }}>
                          {pulse.type}
                        </span>
                      </div>

                      {/* Views Footer & Drawer Trigger */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={13} /> Active
                        </div>

                        <button
                          onClick={() => setSelectedPulseViewers(pulse)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '10px',
                            backgroundColor: 'var(--nav-active-bg)', color: 'var(--accent-color)',
                            border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={14} /> {pulse.totalViews || pulse.viewers?.length || 0} Views
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expired Pulses Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6b7280' }} />
                  Expired Pulses (Past 24 Hours Viewer Log) ({expiredList.length})
                </h2>
              </div>

              {expiredList.length === 0 ? (
                <div style={emptyCardStyle}>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>No expired pulse records in the last 24 hours.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
                  {expiredList.map((pulse) => (
                    <div key={pulse.pulseId || pulse.id} style={{ ...pulseCardStyle, opacity: 0.85 }}>
                      {/* Expired Placeholder Card */}
                      <div style={{
                        height: '140px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px dashed var(--border-color)',
                        borderRadius: '12px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '16px', textAlign: 'center'
                      }}>
                        <Clock size={28} color="var(--text-secondary)" style={{ opacity: 0.5, marginBottom: '8px' }} />
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          This pulse has expired.
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          Media is deleted. Viewer log remains for 24h.
                        </div>
                      </div>

                      {/* Views Drawer Trigger */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Expired
                        </div>

                        <button
                          onClick={() => setSelectedPulseViewers(pulse)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '10px',
                            backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)', fontSize: '12px', fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={14} /> {pulse.totalViews || pulse.viewers?.length || 0} Views
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Viewers Bottom Drawer Modal */}
      {selectedPulseViewers && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'flex-end'
        }} onClick={() => setSelectedPulseViewers(null)}>
          <div style={{
            width: '100%', maxWidth: '500px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '24px 24px 0 0',
            border: '1px solid var(--border-color)',
            maxHeight: '70vh', display: 'flex', flexDirection: 'column',
            overflow: 'hidden', animation: 'slideUp 0.3s ease-out'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} color="var(--accent-color)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                  Pulse Viewers ({(selectedPulseViewers.viewers || []).length})
                </h3>
              </div>
              <button onClick={() => setSelectedPulseViewers(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: '700' }}>
                ✕
              </button>
            </div>

            <div style={{ padding: '12px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(!selectedPulseViewers.viewers || selectedPulseViewers.viewers.length === 0) ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  No viewers yet.
                </div>
              ) : (
                selectedPulseViewers.viewers.map((v, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '12px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Avatar chat={{ profile: v.viewerProfile, userName: v.viewerName }} size={38} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {v.viewerName || v.viewerId}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {v.viewedAt ? new Date(v.viewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const pulseCardStyle = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: '16px',
  border: '1px solid var(--border-color)',
  padding: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

const emptyCardStyle = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: '16px',
  border: '1px dashed var(--border-color)',
  padding: '24px 16px',
  textAlign: 'center'
};

export default MyPulsesView;

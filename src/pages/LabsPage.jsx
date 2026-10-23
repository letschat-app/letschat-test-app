import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FlaskConical, 
  ThumbsUp, 
  Code2, 
  Rocket, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  ArrowLeft,
  Zap,
  Info,
  Check
} from 'lucide-react';
import { API } from '../service/UserAuth';

export default function LabsPage() {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userid');
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);
  const [optInId, setOptInId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchExperiments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/labs/experiments`, {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Id': userId || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setExperiments(Array.isArray(data) ? data : []);
      } else {
        setExperiments([]);
      }
    } catch (err) {
      console.error('[LabsPage] Failed to fetch experiments:', err);
      setExperiments([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchExperiments();
  }, [fetchExperiments]);

  const handleVote = async (experimentId, intent) => {
    if (!userId) {
      navigate('/login');
      return;
    }
    setVotingId(experimentId);
    try {
      const res = await fetch(`${API}/labs/experiments/${experimentId}/vote?intent=${intent}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Id': userId
        }
      });
      if (res.ok) {
        // Optimistically update
        setExperiments(prev => prev.map(exp => {
          if (exp.id === experimentId) {
            const prevIntent = exp.userVotedIntent;
            let useCount = exp.useCount || 0;
            let buildCount = exp.buildCount || 0;
            let bothCount = exp.bothCount || 0;

            if (prevIntent === 'use') useCount = Math.max(0, useCount - 1);
            if (prevIntent === 'build') buildCount = Math.max(0, buildCount - 1);
            if (prevIntent === 'both') bothCount = Math.max(0, bothCount - 1);

            if (intent === 'use') useCount += 1;
            if (intent === 'build') buildCount += 1;
            if (intent === 'both') bothCount += 1;

            return {
              ...exp,
              userVotedIntent: intent,
              useCount,
              buildCount,
              bothCount
            };
          }
          return exp;
        }));
      }
    } catch (err) {
      console.error('[LabsPage] Vote failed:', err);
    } finally {
      setVotingId(null);
    }
  };

  const handleOptIn = async (experimentId) => {
    if (!userId) {
      navigate('/login');
      return;
    }
    setOptInId(experimentId);
    try {
      const res = await fetch(`${API}/labs/experiments/${experimentId}/opt-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Id': userId
        }
      });
      if (res.ok) {
        setExperiments(prev => prev.map(exp => {
          if (exp.id === experimentId) {
            return { ...exp, isOptedInEarlyAccess: true };
          }
          return exp;
        }));
      }
    } catch (err) {
      console.error('[LabsPage] Opt-in failed:', err);
    } finally {
      setOptInId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return { label: 'Active Concept', color: 'var(--success-color)', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
      case 'in_development':
        return { label: 'In Development', color: 'var(--warning-color)', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
      case 'released':
        return { label: 'Released', color: 'var(--accent-text)', bg: 'var(--accent-tint)', border: 'var(--accent-tint-border)' };
      case 'concept':
      default:
        return { label: 'Concept Idea', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' };
    }
  };

  const filteredExperiments = experiments.filter(exp => {
    if (activeTab === 'opted_in') return exp.isOptedInEarlyAccess;
    if (activeTab === 'in_dev') return exp.status === 'in_development';
    return true;
  });

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      {/* Top Header */}
      <div style={{
        padding: isMobile ? '16px' : '24px 32px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {isMobile && (
            <button
              onClick={() => navigate(-1)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              <ArrowLeft size={22} />
            </button>
          )}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.35)',
            flexShrink: 0
          }}>
            <FlaskConical size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: '800', margin: 0 }}>
                LetsChat Labs
              </h1>
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#8b5cf6',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                Experimental
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Test upcoming features, vote on concept demand, and get early access
            </p>
          </div>
        </div>

        <button
          onClick={fetchExperiments}
          disabled={loading}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '8px 14px',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: '600'
          }}
          title="Refresh experiments"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          {!isMobile && <span>Refresh</span>}
        </button>
      </div>

      {/* Main Container */}
      <div style={{
        maxWidth: '960px',
        width: '100%',
        margin: '0 auto',
        padding: isMobile ? '16px' : '28px 32px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Banner Info Card */}
        <div style={{
          backgroundColor: 'rgba(139, 92, 246, 0.08)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: '16px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px'
        }}>
          <Sparkles size={20} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Shape the future of LetsChat:</strong> Concepts with the highest votes advance directly into active engineering. Vote with <strong>Would Use</strong> if you need it, or <strong>Would Build</strong> if you want to contribute or build on its APIs.
          </div>
        </div>

        {/* Tab Filter */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '12px'
        }}>
          {[
            { id: 'all', label: `All Concepts (${experiments.length})` },
            { id: 'in_dev', label: 'In Development' },
            { id: 'opted_in', label: 'My Early Access' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? 'var(--accent-color)' : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Experiments List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
            <p>Loading experiments from LetsChat Labs...</p>
          </div>
        ) : filteredExperiments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '20px',
            border: '1px solid var(--border-color)'
          }}>
            <FlaskConical size={48} color="#8b5cf6" style={{ margin: '0 auto 16px auto', opacity: 0.6 }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 8px 0' }}>
              {activeTab === 'opted_in' ? 'No Early Access Opt-Ins Yet' : 'No Active Experiments'}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto' }}>
              {activeTab === 'opted_in' 
                ? 'Browse active concepts and click "Request Early Access" to be among the first to test prototype features.'
                : 'There are currently no open experiments in this view. Check back soon for new feature prototypes and early access testing!'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredExperiments.map(exp => {
              const badge = getStatusBadge(exp.status);
              const userVoted = exp.userVotedIntent;
              const isOptedIn = exp.isOptedInEarlyAccess;

              return (
                <div
                  key={exp.id}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)',
                    padding: isMobile ? '20px 16px' : '24px 28px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.06)'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 10px',
                          borderRadius: '8px',
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`
                        }}>
                          {badge.label}
                        </span>
                        {isOptedIn && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            padding: '3px 10px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(236, 72, 153, 0.15)',
                            color: '#ec4899',
                            border: '1px solid rgba(236, 72, 153, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <Zap size={11} /> Opted-In Early Access
                          </span>
                        )}
                      </div>
                      <h2 style={{ fontSize: isMobile ? '17px' : '19px', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                        {exp.title}
                      </h2>
                    </div>
                  </div>

                  {/* Card Description */}
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                    margin: 0,
                    whiteSpace: 'pre-line'
                  }}>
                    {exp.description}
                  </p>

                  {/* Voting & Action Footer */}
                  <div style={{
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: isMobile ? 'stretch' : 'center',
                    gap: '16px'
                  }}>
                    {/* Intent Voting Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginRight: '4px' }}>
                        Vote Demand:
                      </span>
                      
                      {/* Use */}
                      <button
                        onClick={() => handleVote(exp.id, 'use')}
                        disabled={votingId === exp.id}
                        style={{
                          backgroundColor: userVoted === 'use' ? 'var(--accent-tint-border)' : 'var(--bg-secondary)',
                          border: userVoted === 'use' ? '1.5px solid var(--accent-solid)' : '1px solid var(--border-color)',
                          color: userVoted === 'use' ? 'var(--accent-text)' : 'var(--text-primary)',
                          borderRadius: '10px',
                          padding: '7px 12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          transition: 'all 0.15s'
                        }}
                        title="I would use this feature as a user"
                      >
                        <ThumbsUp size={14} />
                        <span>Use</span>
                        <span style={{ opacity: 0.8, fontSize: '11px', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px' }}>
                          {exp.useCount || 0}
                        </span>
                        {userVoted === 'use' && <Check size={12} />}
                      </button>

                      {/* Build */}
                      <button
                        onClick={() => handleVote(exp.id, 'build')}
                        disabled={votingId === exp.id}
                        style={{
                          backgroundColor: userVoted === 'build' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-secondary)',
                          border: userVoted === 'build' ? '1.5px solid var(--success-color)' : '1px solid var(--border-color)',
                          color: userVoted === 'build' ? 'var(--success-color)' : 'var(--text-primary)',
                          borderRadius: '10px',
                          padding: '7px 12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          transition: 'all 0.15s'
                        }}
                        title="I would build or contribute extensions to this"
                      >
                        <Code2 size={14} />
                        <span>Build</span>
                        <span style={{ opacity: 0.8, fontSize: '11px', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px' }}>
                          {exp.buildCount || 0}
                        </span>
                        {userVoted === 'build' && <Check size={12} />}
                      </button>

                      {/* Both */}
                      <button
                        onClick={() => handleVote(exp.id, 'both')}
                        disabled={votingId === exp.id}
                        style={{
                          backgroundColor: userVoted === 'both' ? 'rgba(236, 72, 153, 0.2)' : 'var(--bg-secondary)',
                          border: userVoted === 'both' ? '1.5px solid #ec4899' : '1px solid var(--border-color)',
                          color: userVoted === 'both' ? '#f472b6' : 'var(--text-primary)',
                          borderRadius: '10px',
                          padding: '7px 12px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          transition: 'all 0.15s'
                        }}
                        title="I would both use and build with this"
                      >
                        <Rocket size={14} />
                        <span>Both</span>
                        <span style={{ opacity: 0.8, fontSize: '11px', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: '4px' }}>
                          {exp.bothCount || 0}
                        </span>
                        {userVoted === 'both' && <Check size={12} />}
                      </button>
                    </div>

                    {/* Early Access Button */}
                    <button
                      onClick={() => handleOptIn(exp.id)}
                      disabled={isOptedIn || optInId === exp.id}
                      style={{
                        backgroundColor: isOptedIn ? 'rgba(16, 185, 129, 0.15)' : 'var(--accent-color)',
                        color: isOptedIn ? 'var(--success-color)' : '#ffffff',
                        border: isOptedIn ? '1px solid rgba(16, 185, 129, 0.3)' : 'none',
                        padding: '8px 16px',
                        borderRadius: '12px',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: isOptedIn ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'all 0.2s',
                        boxShadow: isOptedIn ? 'none' : '0 4px 12px color-mix(in srgb, var(--accent-solid) 45%, transparent)'
                      }}
                    >
                      {isOptedIn ? (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Early Access Active</span>
                        </>
                      ) : (
                        <>
                          <Zap size={16} />
                          <span>Request Early Access</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

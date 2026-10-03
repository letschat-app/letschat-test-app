import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Flame, RotateCcw, Check, AlertTriangle, X } from 'lucide-react';
import SquircleFireAvatar, { SQUIRCLE_TIERS, getTierIndexFromStreak } from './SquircleFireAvatar';

/**
 * StreakUpgradeModal Component
 * Hover/popup modal shown when a user's streak crosses defined threshold boundaries (3, 7, 14, 30, 50 days),
 * either INCREASING (Upgrade Congratulation) or DECREASING (Degraded Decay Warning).
 * Never shown for intermediate streak changes within the same tier (e.g. 4 -> 5 -> 6).
 */

const StreakUpgradeModal = ({
  isOpen,
  onClose,
  oldStreak = 0,
  newStreak = 7,
  userProfile = null,
  userName = 'You',
  onActionClick = null
}) => {
  const [stage, setStage] = useState('old'); // 'old' | 'morphing' | 'unlocked'
  const [activeOldStreak, setActiveOldStreak] = useState(oldStreak);
  const [activeNewStreak, setActiveNewStreak] = useState(newStreak);

  const avatarRef = useRef(null);
  const timerRef1 = useRef(null);
  const timerRef2 = useRef(null);

  // Compute tier indices (0 to 5)
  const safeOldTierIdx = getTierIndexFromStreak(activeOldStreak);
  const safeNewTierIdx = getTierIndexFromStreak(activeNewStreak);

  const oldTierConfig = SQUIRCLE_TIERS[safeOldTierIdx] || SQUIRCLE_TIERS[0];
  const newTierConfig = SQUIRCLE_TIERS[safeNewTierIdx] || SQUIRCLE_TIERS[1];

  const isDegraded = safeNewTierIdx < safeOldTierIdx;
  const isIgnition = safeOldTierIdx === 0 && safeNewTierIdx > 0;
  const isExtinguish = safeOldTierIdx > 0 && safeNewTierIdx === 0;

  const [cardGlowColor, setCardGlowColor] = useState(oldTierConfig.mainGlow);

  const clearTimers = () => {
    if (timerRef1.current) clearTimeout(timerRef1.current);
    if (timerRef2.current) clearTimeout(timerRef2.current);
  };

  const startSequence = (oldS, newS) => {
    clearTimers();

    const oldIdx = getTierIndexFromStreak(oldS);
    const newIdx = getTierIndexFromStreak(newS);

    const oldCfg = SQUIRCLE_TIERS[oldIdx] || SQUIRCLE_TIERS[0];
    const newCfg = SQUIRCLE_TIERS[newIdx] || SQUIRCLE_TIERS[1];

    setActiveOldStreak(oldS);
    setActiveNewStreak(newS);
    setStage('old');
    setCardGlowColor(oldCfg.mainGlow);

    // Set initial avatar tier instantly (duration: 0)
    if (avatarRef.current) {
      avatarRef.current.setTier(oldIdx, { duration: 0 });
    }

    // Phase 1 (at ~700ms): Call setTier(newIdx, { duration: 1400 }) to morph flame
    timerRef1.current = setTimeout(() => {
      setStage('morphing');
      setCardGlowColor(newCfg.mainGlow);
      if (avatarRef.current) {
        avatarRef.current.setTier(newIdx, { duration: 1400 });
      }
    }, 700);

    // Phase 2 (at ~2100ms): Transition complete, show final state UI
    timerRef2.current = setTimeout(() => {
      setStage('unlocked');
    }, 2100);
  };

  useEffect(() => {
    if (!isOpen) {
      clearTimers();
      setStage('old');
      return;
    }

    startSequence(oldStreak, newStreak);

    return () => clearTimers();
  }, [isOpen, oldStreak, newStreak]);

  const handleReplay = () => {
    startSequence(activeOldStreak, activeNewStreak);
  };

  const handleTestPair = (oldS, newS) => {
    startSequence(oldS, newS);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        backgroundColor: '#111b21',
        borderRadius: '24px',
        border: `2px solid ${cardGlowColor}`,
        boxShadow: `0 0 50px ${cardGlowColor}55`,
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 1.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Background Radial Glow */}
        <div style={{
          position: 'absolute',
          top: '-100px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${cardGlowColor} 0%, transparent 70%)`,
          opacity: 0.28,
          pointerEvents: 'none',
          transition: 'all 1.2s ease'
        }} />

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#94a3b8',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10
          }}
        >
          <X size={18} />
        </button>

        {/* Sub-Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          {isDegraded ? (
            <AlertTriangle size={22} color="#f59e0b" />
          ) : (
            <Sparkles size={22} color={cardGlowColor} />
          )}
          <span style={{
            fontSize: '13px',
            fontWeight: '800',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            color: isDegraded ? '#f59e0b' : cardGlowColor,
            transition: 'color 1.2s ease'
          }}>
            {stage === 'unlocked'
              ? (isDegraded ? (isExtinguish ? 'FLAME EXTINGUISHED ⚠️' : 'STREAK DEGRADED ⚠️') : 'MILESTONE UNLOCKED! 🎉')
              : (isIgnition ? 'FLAME IGNITION!' : isExtinguish ? 'FLAME EXTINGUISHING...' : isDegraded ? 'STREAK DECAYING...' : 'FLAME MORPHING...')}
          </span>
        </div>

        {/* Header Title */}
        <h2 style={{
          fontSize: '24px',
          fontWeight: '900',
          color: '#ffffff',
          margin: '0 0 16px 0',
          lineHeight: '1.2'
        }}>
          {stage === 'unlocked'
            ? (isDegraded ? (isExtinguish ? 'Profile Flame Extinguished' : 'Streak Tier Shifted Down') : (isIgnition ? 'Profile Flame Ignited!' : 'New Flame Frame Unlocked!'))
            : stage === 'morphing'
            ? (isIgnition ? 'Igniting Profile Flame...' : isExtinguish ? 'Extinguishing Flame...' : isDegraded ? 'Transitioning Lower Tier...' : 'Upgrading Flame Color...')
            : 'Preparing Flame Transition'}
        </h2>

        {/* ── SINGLE SQUIRCLE FIRE AVATAR CANVAS ── */}
        <div style={{
          position: 'relative',
          width: '220px',
          height: '240px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '4px 0 12px 0'
        }}>
          <SquircleFireAvatar
            ref={avatarRef}
            tier={safeOldTierIdx}
            src={userProfile}
            fallbackText={userName}
            size={145}
            shape="squircle"
          />
        </div>

        {/* ── TIER STATUS BADGE ── */}
        <div style={{
          margin: '8px 0 12px 0',
          padding: '10px 18px',
          borderRadius: '16px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Flame size={22} color={newTierConfig.mainGlow} style={{ transition: 'color 1.2s ease' }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>
              {isDegraded ? 'Streak Degraded' : 'Active Tier'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#ffffff' }}>
              {activeOldStreak} Days → <span style={{ color: newTierConfig.mainGlow }}>{activeNewStreak} Days 🔥</span>
            </div>
          </div>
        </div>

        <p style={{
          fontSize: '14px',
          color: '#cbd5e1',
          lineHeight: '1.5',
          margin: '0 0 16px 0',
          maxWidth: '360px'
        }}>
          {stage === 'unlocked' ? (
            isDegraded ? (
              isExtinguish ? (
                <>Your streak decayed to <strong>{activeNewStreak} days</strong> and your profile flame went out. Post a pulse today to reignite your streak!</>
              ) : (
                <>Your streak decayed to <strong>{activeNewStreak} days</strong>. Post a pulse today to increase your streak and restore your <strong>{oldTierConfig.name}</strong> flame!</>
              )
            ) : (
              <>Congratulations! Your streak reached <strong style={{ color: newTierConfig.mainGlow }}>{activeNewStreak} days</strong>. Your account is now framed with the <strong>{newTierConfig.name}</strong> squircle flame!</>
            )
          ) : (
            <>Watch your profile flame dynamically shift as your pulse streak changes across tier thresholds!</>
          )}
        </p>

        {/* QUICK TEST THRESHOLD SELECTOR */}
        <div style={{
          width: '100%',
          padding: '8px',
          marginBottom: '16px',
          borderRadius: '12px',
          backgroundColor: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', width: '100%', marginBottom: '2px' }}>
            Test Transitions (Up & Down):
          </span>
          <button onClick={() => handleTestPair(0, 3)} style={testBtnStyle}>0 → 3d (Ignite)</button>
          <button onClick={() => handleTestPair(3, 7)} style={testBtnStyle}>3d → 7d</button>
          <button onClick={() => handleTestPair(7, 14)} style={testBtnStyle}>7d → 14d</button>
          <button onClick={() => handleTestPair(14, 30)} style={testBtnStyle}>14d → 30d</button>
          <button onClick={() => handleTestPair(30, 50)} style={testBtnStyle}>30d → 50d</button>
          <button onClick={() => handleTestPair(7, 6)} style={testDegradedBtnStyle}>7d → 6d (Degrade)</button>
          <button onClick={() => handleTestPair(3, 2)} style={testDegradedBtnStyle}>3d → 2d (Extinguish)</button>
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button
            onClick={handleReplay}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={16} /> Replay
          </button>

          <button
            onClick={() => {
              if (onActionClick) onActionClick(isDegraded);
              onClose();
            }}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '14px',
              background: isDegraded
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : `linear-gradient(135deg, ${newTierConfig.ring[0]}, ${newTierConfig.ring[1]})`,
              border: 'none',
              color: '#000000',
              fontSize: '14px',
              fontWeight: '900',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: `0 4px 15px ${isDegraded ? '#f59e0b55' : newTierConfig.mainGlow + '55'}`
            }}
          >
            {isDegraded ? (
              <>Post Pulse to Restore 🔥</>
            ) : (
              <><Check size={18} strokeWidth={3} /> Awesome!</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

const testBtnStyle = {
  padding: '4px 8px',
  borderRadius: '6px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  color: '#cbd5e1',
  fontSize: '11px',
  fontWeight: '700',
  cursor: 'pointer'
};

const testDegradedBtnStyle = {
  padding: '4px 8px',
  borderRadius: '6px',
  backgroundColor: 'rgba(245, 158, 11, 0.15)',
  border: '1px solid rgba(245, 158, 11, 0.3)',
  color: '#fcd34d',
  fontSize: '11px',
  fontWeight: '700',
  cursor: 'pointer'
};

export default StreakUpgradeModal;

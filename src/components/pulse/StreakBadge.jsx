import React from 'react';

/**
 * StreakBadge Component
 * Renders pulse streak counter badge according to 5-Tier Burning Fire Rules:
 * - Tier 1 (3-6): Bronze / Glowing Crimson (Red)
 * - Tier 2 (7-13): Silver / Glowing Amber (Orange)
 * - Tier 3 (14-29): Gold / Glowing Sun-Yellow
 * - Tier 4 (30-49): Platinum / Glowing Diamond White
 * - Tier 5 (50+): Mythic / Glowing Hyper-Blue
 */

export const getStreakTierData = (streak) => {
  if (!streak || streak <= 0) return null;

  if (streak >= 50) {
    return {
      tier: 5,
      name: 'Mythic / Ultimate',
      colorName: 'Glowing Hyper-Blue',
      icon: '🌌🔥',
      style: {
        backgroundColor: 'rgba(6, 182, 212, 0.22)',
        color: '#38bdf8',
        border: '1px solid rgba(56, 189, 248, 0.6)',
        boxShadow: '0 2px 10px rgba(56, 189, 248, 0.45)',
      },
      className: 'blue-fire-badge'
    };
  }

  if (streak >= 30) {
    return {
      tier: 4,
      name: 'Platinum / Elite',
      colorName: 'Glowing Diamond White',
      icon: '💎🔥',
      style: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        color: '#ffffff',
        border: '1px solid rgba(255, 255, 255, 0.65)',
        boxShadow: '0 2px 10px rgba(255, 255, 255, 0.4)',
      },
      className: 'white-fire-badge'
    };
  }

  if (streak >= 14) {
    return {
      tier: 3,
      name: 'Gold / Advanced',
      colorName: 'Glowing Sun-Yellow',
      icon: '☀️🔥',
      style: {
        backgroundColor: 'rgba(234, 179, 8, 0.2)',
        color: '#fde047',
        border: '1px solid rgba(234, 179, 8, 0.55)',
        boxShadow: '0 2px 8px rgba(234, 179, 8, 0.35)',
      },
      className: 'yellow-fire-badge'
    };
  }

  if (streak >= 7) {
    return {
      tier: 2,
      name: 'Silver / Intermediate',
      colorName: 'Glowing Amber (Orange)',
      icon: '🔥',
      style: {
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        color: '#fb923c',
        border: '1px solid rgba(249, 115, 22, 0.5)',
        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.3)',
      },
      className: 'amber-fire-badge'
    };
  }

  return {
    tier: 1,
    name: 'Bronze / Starter',
    colorName: 'Glowing Crimson (Red)',
    icon: '🔴🔥',
    style: {
      backgroundColor: 'rgba(239, 68, 68, 0.2)',
      color: '#fca5a5',
      border: '1px solid rgba(239, 68, 68, 0.5)',
      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
    },
    className: 'crimson-fire-badge'
  };
};

const StreakBadge = ({ streak = 0, style = {}, size = 'md' }) => {
  const tierData = getStreakTierData(streak);
  if (!tierData) return null;

  const fontSizes = {
    sm: '10px',
    md: '12px',
    lg: '14px',
  };

  const paddings = {
    sm: '2px 6px',
    md: '3px 8px',
    lg: '4px 10px',
  };

  return (
    <span
      className={`pulse-streak-badge ${tierData.className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        borderRadius: '12px',
        fontSize: fontSizes[size] || fontSizes.md,
        fontWeight: '800',
        padding: paddings[size] || paddings.md,
        whiteSpace: 'nowrap',
        lineHeight: 1,
        ...tierData.style,
        ...style
      }}
      title={`Tier ${tierData.tier} (${tierData.name}) - ${streak} Day Streak!`}
    >
      <span style={{ fontSize: '1.1em' }}>{tierData.icon}</span>
      <span>{streak}</span>
    </span>
  );
};

export default StreakBadge;

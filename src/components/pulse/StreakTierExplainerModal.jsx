import React, { useState } from 'react';
import { X, Sparkles, Flame } from 'lucide-react';
import SquircleFireAvatar from './SquircleFireAvatar';

/**
 * StreakTierExplainerModal Component
 * Sleek, minimal modal showcasing how the user's profile frame appears to others
 * across all 5 streak thresholds (>=3, >=7, >=14, >=30, >=50) with their profile photo.
 */
const StreakTierExplainerModal = ({ isOpen, onClose, onPreviewUpgrade }) => {
  const [selectedIdx, setSelectedIdx] = useState(0); // Default to >=3 tier

  if (!isOpen) return null;

  const userId = localStorage.getItem('userid');
  const userName = localStorage.getItem('username') || userId;
  const userProfile = localStorage.getItem('profile');

  const thresholds = [
    { streak: 3, label: '≥3' },
    { streak: 7, label: '≥7' },
    { streak: 14, label: '≥14' },
    { streak: 30, label: '≥30' },
    { streak: 50, label: '≥50' }
  ];

  const currentThreshold = thresholds[selectedIdx];

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flame size={20} color="#f97316" />
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Streak Fire Frames
            </h3>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={bodyStyle}>
          
          <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', textAlign: 'center', margin: '0 0 16px 0' }}>
            This is how your account is visible to others
          </p>

          {/* User Profile Frame Live Preview */}
          <div style={previewBoxStyle}>
            <SquircleFireAvatar
              pulseStreak={currentThreshold.streak}
              src={userProfile}
              size={120}
              shape="squircle"
              fallbackText={userName}
            />
            
            <div style={{ marginTop: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>
                {userName}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-color)', marginTop: '4px' }}>
                Streak {currentThreshold.label} Days
              </div>
            </div>
          </div>

          {/* Threshold Selector Buttons: >=3, >=7, >=14, >=30, >=50 */}
          <div style={{ marginTop: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {thresholds.map((item, idx) => {
                const isSelected = idx === selectedIdx;
                return (
                  <button
                    key={item.streak}
                    onClick={() => setSelectedIdx(idx)}
                    style={{
                      padding: '10px 0',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-card)',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: '800',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

// Styles
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  backdropFilter: 'blur(6px)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
};

const modalStyle = {
  width: '100%',
  maxWidth: '380px',
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '20px',
  overflow: 'hidden',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  borderBottom: '1px solid var(--border-color)',
  backgroundColor: 'var(--bg-card)',
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
  justifyContent: 'center',
};

const bodyStyle = {
  padding: '20px 18px',
};

const previewBoxStyle = {
  backgroundColor: 'var(--bg-card)',
  borderRadius: '16px',
  border: '1px solid var(--border-color)',
  padding: '24px 16px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

export default StreakTierExplainerModal;

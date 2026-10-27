import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * Slim sticky top row with 44x44 back button touch target and "Profile" title.
 * Gracefully falls back to /chats when window history has no previous entry.
 */
const ProfileBackRow = ({ title = 'Profile' }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/chats');
    }
  };

  return (
    <div style={styles.backRow}>
      <button
        type="button"
        onClick={handleBack}
        style={styles.backBtn}
        aria-label="Back"
        className="profile-interactive-btn"
      >
        <ArrowLeft size={20} color="var(--text-primary)" />
      </button>
      <h1 style={styles.title}>{title}</h1>
    </div>
  );
};

const styles = {
  backRow: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    backgroundColor: 'var(--bg-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    height: '48px',
    padding: '0 4px',
    borderBottom: '1px solid var(--border-color)',
    boxSizing: 'border-box'
  },
  backBtn: {
    width: '44px',
    height: '44px',
    minWidth: '44px',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    padding: 0,
    outline: 'none'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    letterSpacing: '-0.2px'
  }
};

export default ProfileBackRow;

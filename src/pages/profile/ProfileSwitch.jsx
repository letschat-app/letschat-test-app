import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Accessible 38x22 switch component.
 * Track: var(--border-color) when off, var(--accent-color) when on.
 * Knob: 18px white circle.
 * When loading=true, displays a centered spinner in place of the switch button
 * with identical dimensions (38x22) to prevent any layout shift.
 */
const ProfileSwitch = ({
  checked = false,
  onChange,
  disabled = false,
  loading = false,
  ariaLabelledBy,
  ariaLabel
}) => {
  if (loading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Updating setting"
        style={styles.loadingContainer}
      >
        <Loader2
          size={16}
          className="animate-spin"
          color="var(--accent-color)"
          style={{ color: 'var(--accent-color)' }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={ariaLabelledBy}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => {
        if (!disabled && onChange) onChange(!checked);
      }}
      className="profile-switch-btn"
      style={{
        ...styles.track,
        backgroundColor: checked ? 'var(--accent-color)' : 'var(--border-color)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      <span
        style={{
          ...styles.knob,
          transform: checked ? 'translateX(16px)' : 'translateX(0)'
        }}
      />
    </button>
  );
};

const styles = {
  loadingContainer: {
    width: '38px',
    height: '22px',
    minWidth: '38px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box'
  },
  track: {
    position: 'relative',
    width: '38px',
    height: '22px',
    minWidth: '38px',
    borderRadius: '12px',
    border: 'none',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    transition: 'background-color 0.2s ease, opacity 0.2s ease',
    boxSizing: 'border-box',
    outline: 'none'
  },
  knob: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.25)',
    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'block'
  }
};

export default ProfileSwitch;

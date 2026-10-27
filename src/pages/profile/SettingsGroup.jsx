import React from 'react';

/**
 * Settings Group with an uppercase category label and a rounded 14px card container.
 */
const SettingsGroup = ({ label, children, style }) => {
  return (
    <div style={{ ...styles.container, ...style }}>
      {label && <div style={styles.groupLabel}>{label}</div>}
      <div style={styles.card}>{children}</div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    marginBottom: '16px'
  },
  groupLabel: {
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
    color: 'var(--text-secondary)',
    marginBottom: '6px',
    paddingLeft: '4px'
  },
  card: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '14px',
    overflow: 'hidden',
    boxSizing: 'border-box'
  }
};

export default SettingsGroup;

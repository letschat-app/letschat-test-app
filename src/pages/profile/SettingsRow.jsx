import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Single settings row inside a SettingsGroup.
 * If onClick is provided, renders an accessible <button> with keyboard support.
 * Otherwise, renders an informative <div> row.
 */
const SettingsRow = ({
  icon: Icon,
  label,
  subtitle,
  value,
  action, // switch, copy button, etc.
  chevron = false,
  onClick,
  disabled = false,
  id,
  isLast = false
}) => {
  const rowContent = (
    <>
      <div style={styles.left}>
        {Icon && (
          <div style={styles.iconContainer}>
            <Icon size={18} color="var(--accent-color)" />
          </div>
        )}
        <div style={styles.textContainer}>
          <span id={id} style={styles.label}>{label}</span>
          {subtitle && (
            <span style={styles.subtitle} title={subtitle}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      <div style={styles.right}>
        {value && <span style={styles.value}>{value}</span>}
        {action}
        {chevron && !action && (
          <ChevronRight size={18} color="var(--text-secondary)" style={styles.chevron} />
        )}
      </div>
    </>
  );

  const borderBottom = isLast ? 'none' : '1px solid var(--border-color)';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="profile-row-btn"
        style={{
          ...styles.rowBase,
          borderBottom,
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.6 : 1
        }}
      >
        {rowContent}
      </button>
    );
  }

  return (
    <div
      style={{
        ...styles.rowBase,
        borderBottom
      }}
    >
      {rowContent}
    </div>
  );
};

const styles = {
  rowBase: {
    minHeight: '48px',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    backgroundColor: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
    boxSizing: 'border-box',
    textDecoration: 'none',
    outline: 'none',
    transition: 'background-color 0.15s ease'
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: 0,
    flex: 1
  },
  iconContainer: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    gap: '1px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--text-primary)',
    lineHeight: '1.3'
  },
  subtitle: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    lineHeight: '1.3',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '240px'
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0
  },
  value: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    maxWidth: '140px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  chevron: {
    opacity: 0.6,
    flexShrink: 0
  }
};

export default SettingsRow;

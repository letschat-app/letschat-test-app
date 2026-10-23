import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Top header badge indicator (matching the design in the user screenshot)
 * Displays:
 * - Checking: [spinner] Checking availability...
 * - Allowed: ✓ Available
 * - Warn: ⚠️ Available (similar to existing)
 * - Blocked: ✕ Username is taken / Too similar
 */
export const UsernameStatusBadge = ({ checkResult }) => {
  if (!checkResult) return null;
  const { status, isChecking } = checkResult;

  if (isChecking) {
    return (
      <span style={{ fontSize: '12px', color: 'var(--accent-text)', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
        <Loader2 size={13} className="animate-spin" />
        Checking availability...
      </span>
    );
  }

  if (status === 'allow') {
    return (
      <span style={{ fontSize: '12px', color: 'var(--success-color)', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        ✓ Available
      </span>
    );
  }

  if (status === 'warn') {
    return (
      <span style={{ fontSize: '12px', color: 'var(--warning-color)', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        ⚠️ Available (similar)
      </span>
    );
  }

  if (status === 'block') {
    return (
      <span style={{ fontSize: '12px', color: 'var(--danger-color)', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        ✕ Username is taken
      </span>
    );
  }

  return null;
};

/**
 * Renders the availability/similarity feedback below or inside an input field.
 *
 * @param {Object} props
 * @param {Object} props.checkResult - Result from useUsernameCheck hook
 * @param {boolean} [props.showInlineIcon=false] - Whether to render only the inline trailing icon
 * @param {string} [props.variant] - 'badge' | 'inline' | 'message'
 * @param {Object} [props.containerStyle]
 */
export const UsernameStatusIndicator = ({
  checkResult,
  showInlineIcon = false,
  variant,
  containerStyle = {}
}) => {
  if (!checkResult) return null;

  if (variant === 'badge') {
    return <UsernameStatusBadge checkResult={checkResult} />;
  }

  const { status, message, isChecking } = checkResult;

  if (showInlineIcon) {
    if (isChecking) {
      return (
        <Loader2
          size={16}
          className="animate-spin"
          style={{ color: 'var(--accent-text)', flexShrink: 0 }}
        />
      );
    }
    if (status === 'allow') {
      return <CheckCircle2 size={16} color="var(--success-color)" style={{ flexShrink: 0 }} />;
    }
    if (status === 'warn') {
      return <AlertTriangle size={16} color="var(--warning-color)" style={{ flexShrink: 0 }} />;
    }
    if (status === 'block') {
      return <AlertCircle size={16} color="var(--danger-color)" style={{ flexShrink: 0 }} />;
    }
    return null;
  }

  // Text message display below the input
  if (status === 'idle' && !isChecking) return null;

  let color = 'var(--text-muted)';
  let IconComponent = null;

  if (isChecking) {
    color = 'var(--accent-text)';
    IconComponent = Loader2;
  } else if (status === 'allow') {
    color = 'var(--success-color)';
    IconComponent = CheckCircle2;
  } else if (status === 'warn') {
    color = 'var(--warning-color)';
    IconComponent = AlertTriangle;
  } else if (status === 'block') {
    color = 'var(--danger-color)';
    IconComponent = AlertCircle;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        fontWeight: '500',
        color,
        marginTop: '6px',
        lineHeight: 1.4,
        ...containerStyle
      }}
    >
      {IconComponent && (
        <IconComponent
          size={14}
          className={isChecking ? 'animate-spin' : undefined}
          style={{ flexShrink: 0 }}
        />
      )}
      <span>{isChecking ? 'Checking availability...' : message}</span>
    </div>
  );
};

export default UsernameStatusIndicator;

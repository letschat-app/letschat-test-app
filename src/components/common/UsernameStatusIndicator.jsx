import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Renders the availability/similarity feedback below or inside an input field.
 *
 * @param {Object} props
 * @param {Object} props.checkResult - Result from useUsernameCheck hook
 * @param {boolean} [props.showInlineSpinner=false] - Whether to render only the inline trailing icon
 * @param {Object} [props.containerStyle]
 */
export const UsernameStatusIndicator = ({
  checkResult,
  showInlineIcon = false,
  containerStyle = {}
}) => {
  if (!checkResult) return null;

  const { status, message, isChecking } = checkResult;

  if (showInlineIcon) {
    if (isChecking) {
      return (
        <Loader2
          size={16}
          className="animate-spin"
          style={{ color: 'var(--accent-color, #3b82f6)', flexShrink: 0 }}
        />
      );
    }
    if (status === 'allow') {
      return <CheckCircle2 size={16} color="#10b981" style={{ flexShrink: 0 }} />;
    }
    if (status === 'warn') {
      return <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />;
    }
    if (status === 'block') {
      return <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0 }} />;
    }
    return null;
  }

  // Text message display with matching color and icon
  if (status === 'idle' && !isChecking) return null;

  let color = '#9ca3af';
  let IconComponent = null;

  if (isChecking) {
    color = 'var(--accent-color, #3b82f6)';
    IconComponent = Loader2;
  } else if (status === 'allow') {
    color = '#10b981';
    IconComponent = CheckCircle2;
  } else if (status === 'warn') {
    color = '#f59e0b';
    IconComponent = AlertTriangle;
  } else if (status === 'block') {
    color = '#ef4444';
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

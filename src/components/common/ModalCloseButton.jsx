import React from 'react';
import { ArrowLeft, X } from 'lucide-react';
import useIsDesktop from '../../hooks/useIsDesktop';

/**
 * Responsive modal dismiss button.
 * Renders a left-aligned Back arrow button on mobile (< 1024px) floating modals
 * and preserves the desktop / docked-panel right-aligned close button elsewhere.
 *
 * @param {Object} props
 * @param {Function} props.onClose - Callback invoked when clicked.
 * @param {boolean} [props.isPanel=false] - Whether the modal is docked as a desktop right panel.
 * @param {'auto'|'left'|'right'} [props.slot='auto'] - Header slot filter ('left' for mobile back, 'right' for desktop close).
 * @param {React.ReactNode} [props.desktopIcon] - Optional custom desktop close icon/element.
 * @param {string} [props.backLabel='Back'] - Accessible label for the mobile back button.
 * @param {string} [props.closeLabel='Close modal'] - Accessible label for the desktop close button.
 * @param {string} [props.className=''] - Optional extra class name.
 * @param {Object} [props.style={}] - Style overrides for desktop close button.
 * @param {Object} [props.backStyle={}] - Style overrides for mobile back button.
 * @param {number} [props.size=20] - Icon size for default desktop <X /> icon.
 * @param {number} [props.backSize=22] - Icon size for mobile <ArrowLeft /> icon.
 */
const ModalCloseButton = ({
  onClose,
  isPanel = false,
  slot = 'auto',
  desktopIcon = null,
  backLabel = 'Back',
  closeLabel = 'Close modal',
  className = '',
  style = {},
  backStyle = {},
  size = 20,
  backSize = 22,
}) => {
  const isDesktop = useIsDesktop();
  const isMobileModal = !isPanel && !isDesktop;

  if (slot === 'left' && !isMobileModal) return null;
  if (slot === 'right' && isMobileModal) return null;

  const isBack = isMobileModal;
  const defaultBg = isBack ? 'transparent' : 'var(--bg-hover)';

  return (
    <button
      type="button"
      onClick={onClose}
      className={className}
      aria-label={isBack ? backLabel : closeLabel}
      style={
        isBack
          ? {
              background: defaultBg,
              border: 'none',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              marginLeft: '-10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-primary)',
              flexShrink: 0,
              transition: 'background-color 0.2s',
              ...backStyle,
            }
          : {
              background: defaultBg,
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              flexShrink: 0,
              transition: 'all 0.2s',
              ...style,
            }
      }
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = isBack
          ? 'rgba(255, 255, 255, 0.08)'
          : 'var(--border-color)';
      }}
      onMouseLeave={(e) => {
        const restBg = isBack ? backStyle.backgroundColor || backStyle.background : style.backgroundColor || style.background;
        e.currentTarget.style.backgroundColor = restBg || defaultBg;
      }}
    >
      {isBack ? <ArrowLeft size={backSize} /> : (desktopIcon || <X size={size} />)}
    </button>
  );
};

export default ModalCloseButton;

import React from 'react';
import { Share2 } from 'lucide-react';

/**
 * InviteRow Component
 * Slim, non-intrusive invite banner with Web Share API integration
 * and fallback for WhatsApp & Clipboard copying.
 */
const InviteRow = ({ showToast }) => {
  const handleInvite = async () => {
    const inviteUrl = window.location.origin + "/LetsChat/";
    const shareText = `Join me on LetsChat! ${inviteUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LetsChat',
          text: shareText,
          url: inviteUrl,
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Share failed:', err);
        }
      }
    } else {
      // Synchronous window.open first so Safari does not block popup
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
      
      try {
        await navigator.clipboard.writeText(shareText);
        if (showToast) showToast('Invite message copied');
      } catch {
        if (showToast) showToast('Invite link opened');
      }
    }
  };

  return (
    <div className="search-invite-slim-row">
      <span className="search-invite-text">Know someone who is not here yet?</span>
      <button
        type="button"
        onClick={handleInvite}
        className="search-invite-btn"
      >
        <Share2 size={14} aria-hidden="true" />
        Invite friends
      </button>
    </div>
  );
};

export default InviteRow;

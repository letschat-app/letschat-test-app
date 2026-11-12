import React, { useEffect } from 'react';
import { Share2 } from 'lucide-react';
import { preloadInviteLogo, shareAppInvite } from '../../utils/inviteShare';

/**
 * InviteRow Component
 * Slim, non-intrusive invite banner with Web Share API integration
 * and fallback for WhatsApp & Clipboard copying.
 */
const InviteRow = ({ showToast }) => {
  useEffect(() => {
    preloadInviteLogo();
  }, []);

  const handleInvite = () => shareAppInvite({ showToast });

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

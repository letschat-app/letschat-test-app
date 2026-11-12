const INVITE_APP_NAME = 'LetsChat';
const INVITE_APP_LINK = 'https://letschat-app.github.io/letschat-test-app';

let cachedLogoFile = null;
let logoLoadPromise = null;

const getLogoAssetUrl = () => {
  const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  return `${base}icon.png`.replace(/\/+/g, '/');
};

/**
 * Returns the current logged-in user's searchable ID for invite messages.
 */
export const getInviteUserId = () => {
  if (typeof localStorage === 'undefined') return '';
  return (localStorage.getItem('userid') || localStorage.getItem('username') || '').trim();
};

/**
 * Builds the friend-invite text / image caption for LetsChat.
 */
export const buildInviteText = (userId = getInviteUserId()) => {
  const cleanId = String(userId || '').trim();
  const intro = `Hey! I downloaded this chat app called ${INVITE_APP_NAME} and figured you might like it too. Check it out whenever you're free: ${INVITE_APP_LINK}`;
  if (!cleanId) return intro;
  return `${intro}\nJust search my ID (${cleanId}) once you're in so we can connect!`;
};

/**
 * Preloads the LetsChat logo image so Web Share can invoke synchronously on click.
 */
export const preloadInviteLogo = async () => {
  if (cachedLogoFile) return cachedLogoFile;
  if (typeof window === 'undefined' || typeof fetch !== 'function' || typeof File !== 'function') {
    return null;
  }

  if (!logoLoadPromise) {
    logoLoadPromise = fetch(getLogoAssetUrl())
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load logo (${res.status})`);
        return res.blob();
      })
      .then((blob) => {
        const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/png';
        cachedLogoFile = new File([blob], 'letschat-logo.png', { type: mime });
        return cachedLogoFile;
      })
      .catch((err) => {
        console.warn('[inviteShare] Could not preload logo image:', err);
        logoLoadPromise = null;
        return null;
      });
  }

  return logoLoadPromise;
};

const fallbackToWhatsAppAndClipboard = async (shareText, showToast) => {
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank', 'noopener,noreferrer');

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareText);
      showToast?.('Invite message copied');
      return;
    }
  } catch {
    // Ignore clipboard permission errors and notify user that link was opened
  }
  showToast?.('Invite link opened');
};

/**
 * Shares the LetsChat invite with the app logo image and caption via Web Share API,
 * falling back cleanly to text-only Web Share or WhatsApp + clipboard copy.
 */
export const shareAppInvite = async ({ showToast } = {}) => {
  const shareText = buildInviteText();

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    let logoFile = cachedLogoFile;
    if (!logoFile && typeof navigator.canShare === 'function') {
      logoFile = await Promise.race([
        preloadInviteLogo(),
        new Promise((resolve) => setTimeout(() => resolve(null), 600)),
      ]);
    }

    if (logoFile && typeof navigator.canShare === 'function') {
      const fileSharePayload = {
        title: INVITE_APP_NAME,
        text: shareText,
        files: [logoFile],
      };

      let canShareWithFile = false;
      try {
        canShareWithFile = navigator.canShare(fileSharePayload);
      } catch {
        canShareWithFile = false;
      }

      if (canShareWithFile) {
        try {
          await navigator.share(fileSharePayload);
          return;
        } catch (err) {
          if (err?.name === 'AbortError') return;
          console.warn('[inviteShare] Logo image share failed, falling back to text share:', err);
        }
      }
    }

    try {
      await navigator.share({
        title: INVITE_APP_NAME,
        text: shareText,
      });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.warn('[inviteShare] Web Share failed, falling back to WhatsApp/clipboard:', err);
    }
  }

  await fallbackToWhatsAppAndClipboard(shareText, showToast);
};

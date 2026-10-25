/**
 * pollUtils.js
 * Centralized data contract helper and normalizer for Polls.
 *
 * Data contract:
 * - poll.other_votes = [{ userId, username, text }], at most one entry per user.
 *   Empty or absent for anonymous polls.
 * - Sending a write-in: the existing `vote-poll` frame plus `other_text: "<trimmed text, max 25 chars>"`.
 *   Sending an empty string or omitting it removes the write-in. `option_ids` stays as it is.
 * - total_voters counts a user who voted for an option, wrote an Other answer, or both.
 */

export function normalizePoll(poll, currentUserId) {
  if (!poll) return null;

  const poll_id = poll.poll_id || poll.id;
  const question = poll.question || 'Poll';
  const allow_multiple = Boolean(poll.allow_multiple);
  const allow_user_options = Boolean(poll.allow_user_options);
  const anonymous = Boolean(poll.anonymous);
  const is_hidden_voting = Boolean(poll.is_hidden_voting || poll.isHiddenVoting);
  const is_expired = Boolean(poll.is_expired);
  const expires_at = poll.expires_at || null;

  const isPastDeadline = expires_at ? new Date() >= new Date(expires_at) : false;
  const isClosed = is_expired || isPastDeadline;

  const options = Array.isArray(poll.options) ? poll.options : [];
  const user_votes = Array.isArray(poll.user_votes) ? poll.user_votes : [];
  const other_votes = !anonymous && Array.isArray(poll.other_votes) ? poll.other_votes : [];

  // Find current user's write-in
  const myOtherVote = other_votes.find(
    (v) => String(v.userId || v.id) === String(currentUserId)
  );
  const myOtherText = myOtherVote ? (myOtherVote.text || '') : '';
  const hasMyOther = Boolean(myOtherText);

  const total_voters = typeof poll.total_voters === 'number' ? poll.total_voters : 0;
  let total_members = typeof poll.total_members === 'number' ? poll.total_members : 0;
  if (total_members <= 1) {
    total_members = 2; // Default to 2 participants for direct 1-on-1 chats
  }

  return {
    poll_id,
    question,
    allow_multiple,
    allow_user_options,
    anonymous,
    is_hidden_voting,
    is_expired,
    expires_at,
    isClosed,
    options,
    user_votes,
    other_votes,
    myOtherVote,
    myOtherText,
    hasMyOther,
    total_voters,
    total_members
  };
}

/**
 * Formats remaining time until poll expires (e.g. "2h", "45m", "1d 3h").
 * Returns null if no deadline or deadline has already passed.
 */
export function formatClosingTime(expiresAt) {
  if (!expiresAt) return null;
  const deadline = new Date(expiresAt).getTime();
  if (isNaN(deadline)) return null;

  const diffMs = deadline - Date.now();
  if (diffMs <= 0) return null;

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remHours = diffHours % 24;
    return remHours > 0 ? `${diffDays}d ${remHours}h` : `${diffDays}d`;
  }
  if (diffHours > 0) {
    const remMin = diffMin % 60;
    return remMin > 0 ? `${diffHours}h ${remMin}m` : `${diffHours}h`;
  }
  if (diffMin > 0) {
    return `${diffMin}m`;
  }
  return '<1m';
}

/**
 * Checks if a candidate text matches any existing poll option text (case-insensitive).
 */
export function isOptionDuplicate(text, options = []) {
  const trimmed = (text || '').trim().toLowerCase();
  if (!trimmed) return false;
  return options.some((opt) => {
    const optText = (opt.option_text || opt.text || '').trim().toLowerCase();
    return optText === trimmed;
  });
}

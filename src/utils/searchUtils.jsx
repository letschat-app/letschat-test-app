import React from 'react';

/**
 * Mask email address for privacy:
 * Example: john.doe@gmail.com -> j***@gmail.com
 * Never display full emails anywhere in the UI.
 */
export const maskEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return '';

  const local = trimmed.substring(0, atIndex);
  const domain = trimmed.substring(atIndex);

  const firstChar = local.charAt(0);
  return `${firstChar}***${domain}`;
};

/**
 * Highlight matching query substring in text
 */
export const highlightMatch = (text, query) => {
  if (!text) return '';
  if (!query || !query.trim()) return text;

  const strText = String(text);
  const q = query.trim().toLowerCase();
  const index = strText.toLowerCase().indexOf(q);

  if (index === -1) return strText;

  const before = strText.substring(0, index);
  const matched = strText.substring(index, index + q.length);
  const after = strText.substring(index + q.length);

  return React.createElement(
    React.Fragment,
    null,
    before,
    React.createElement('mark', { className: 'search-highlight-mark' }, matched),
    after
  );
};

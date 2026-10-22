/**
 * Name Similarity and Validation Utilities
 * Mirrors backend UsernameSimilarityEvaluator.java
 */

export const FLOOR = 0.50;

/**
 * STEP 1: Normalize
 * 1. Convert to lowercase and trim.
 * 2. Replace lookalikes: 0->o, 1->i, 3->e, 4->a, 5->s, 7->t, @->a, $->s
 * 3. Remove non a-z and 0-9 characters.
 */
export function normalize(name) {
  if (!name) return '';
  const s = String(name).toLowerCase().trim();
  let result = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    switch (c) {
      case '0': result += 'o'; break;
      case '1': result += 'i'; break;
      case '3': result += 'e'; break;
      case '4': result += 'a'; break;
      case '5': result += 's'; break;
      case '7': result += 't'; break;
      case '@': result += 'a'; break;
      case '$': result += 's'; break;
      default:
        if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')) {
          result += c;
        }
        break;
    }
  }
  return result;
}

export function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    const cA = a[i - 1];
    for (let j = 1; j <= n; j++) {
      const cB = b[j - 1];
      const cost = cA === cB ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }
  return prev[n];
}

function getBigramCounts(s) {
  const counts = {};
  for (let i = 0; i < s.length - 1; i++) {
    const bg = s.substring(i, i + 2);
    counts[bg] = (counts[bg] || 0) + 1;
  }
  return counts;
}

export function diceBigramSimilarity(a, b) {
  if (a.length < 2 || b.length < 2) return 0.0;
  const bigramsA = getBigramCounts(a);
  const bigramsB = getBigramCounts(b);
  const totalA = a.length - 1;
  const totalB = b.length - 1;

  let shared = 0;
  for (const [bg, countA] of Object.entries(bigramsA)) {
    const countB = bigramsB[bg] || 0;
    shared += Math.min(countA, countB);
  }
  return (2.0 * shared) / (totalA + totalB);
}

export function longestCommonSubstring(a, b) {
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);
  let maxLen = 0;

  for (let i = 1; i <= m; i++) {
    const cA = a[i - 1];
    for (let j = 1; j <= n; j++) {
      const cB = b[j - 1];
      if (cA === cB) {
        curr[j] = prev[j - 1] + 1;
        if (curr[j] > maxLen) {
          maxLen = curr[j];
        }
      } else {
        curr[j] = 0;
      }
    }
    const temp = prev;
    prev = curr;
    curr = temp;
  }
  return maxLen;
}

export function computeScore(normA, normB) {
  if (!normA || !normB) return 0.0;
  if (normA === normB) return 10.0;

  const lenA = normA.length;
  const lenB = normB.length;
  const L = Math.max(lenA, lenB);
  if (L === 0) return 0.0;

  const levDist = levenshteinDistance(normA, normB);
  let editSim = 1.0 - levDist / L;
  editSim = Math.max(0.0, Math.min(1.0, editSim));

  const bigramSim = diceBigramSimilarity(normA, normB);

  const lcsLen = longestCommonSubstring(normA, normB);
  let runSim = lcsLen / L;
  runSim = Math.max(0.0, Math.min(1.0, runSim));

  const raw = (editSim + bigramSim + runSim) / 3.0;
  if (raw <= FLOOR) return 0.0;

  let score = ((raw - FLOOR) / (1.0 - FLOOR)) * 10.0;
  score = Math.min(score, 9.9);
  return Math.round(score * 10) / 10;
}

/**
 * Computes similarity between a user's permanent username and a proposed display name / chat nickname.
 * Must be >= 3.0 out of 10 to pass.
 */
export function computeSelfSimilarity(permanentUsername, proposedName) {
  if (!permanentUsername || !proposedName) return 0.0;
  const cleanUser = String(permanentUsername).trim().toLowerCase();
  const cleanTarget = String(proposedName).trim().toLowerCase();
  if (!cleanUser || !cleanTarget) return 0.0;

  const normUser = normalize(cleanUser);
  const normTarget = normalize(cleanTarget);

  if (normUser === normTarget) return 10.0;

  let tokenScore = 0.0;
  const tokens = cleanTarget.split(/[^a-z0-9]+/);
  for (const t of tokens) {
    if (!t) continue;
    const normT = normalize(t);
    if (normT === normUser) {
      const ratio = normUser.length / Math.max(normUser.length, normTarget.length);
      const score = 7.0 + 3.0 * ratio;
      if (score > tokenScore) tokenScore = score;
    } else if (normT.startsWith(normUser)) {
      const ratio = normUser.length / normT.length;
      const score = 6.0 + 4.0 * ratio;
      if (score > tokenScore) tokenScore = score;
    } else if (normUser.startsWith(normT) && normT.length >= 2) {
      const ratio = normT.length / normUser.length;
      const score = 4.0 + 3.0 * ratio;
      if (score > tokenScore) tokenScore = score;
    }
  }

  const stringScore = computeScore(normUser, normTarget);
  let finalScore = Math.max(tokenScore, stringScore);
  finalScore = Math.min(10.0, Math.max(0.0, finalScore));
  return Math.round(finalScore * 10) / 10;
}

/**
 * Computes peer similarity between two participants in the same chat.
 * Must be strictly < 8.0 out of 10 to avoid confusingly similar names.
 */
export function computePeerSimilarity(candidateName, peerName) {
  if (!candidateName || !peerName) return 0.0;
  const normA = normalize(candidateName);
  const normB = normalize(peerName);
  return computeScore(normA, normB);
}

/**
 * Validates a proposed per-chat nickname against permanent username and peers in the chat.
 * @param {string} permanentUsername - user's own static public username
 * @param {string} proposedName - the candidate nickname
 * @param {Array<{ userName: string, userId: string }>} peers - other participants in the chat
 * @returns {{ isValid: boolean, selfScore: number, peerScore: number, conflictingPeer?: string, message: string }}
 */
export function validateChatNickname(permanentUsername, proposedName, peers = []) {
  const clean = (proposedName || '').trim();
  if (!clean) {
    return { isValid: false, selfScore: 0, peerScore: 0, message: 'Name cannot be empty' };
  }

  // 1. Self-similarity check (>= 3.0 / 10)
  const selfScore = computeSelfSimilarity(permanentUsername, clean);
  if (selfScore < 3.0) {
    return {
      isValid: false,
      selfScore,
      peerScore: 0,
      message: `Must have at least 3/10 similarity with your permanent username (@${permanentUsername}). Current: ${selfScore}/10`
    };
  }

  // 2. Peer uniqueness and similarity check (< 8.0 / 10)
  const normCandidate = normalize(clean);
  let highestPeerScore = 0.0;
  let conflictingPeerName = null;

  for (const peer of peers) {
    const peerName = (peer.userName || peer.username || '').trim();
    if (!peerName) continue;
    const normPeer = normalize(peerName);

    if (normCandidate === normPeer) {
      return {
        isValid: false,
        selfScore,
        peerScore: 10.0,
        conflictingPeer: peerName,
        message: `Name "${clean}" is already taken in this chat by ${peerName}.`
      };
    }

    const pScore = computePeerSimilarity(clean, peerName);
    if (pScore > highestPeerScore) {
      highestPeerScore = pScore;
      conflictingPeerName = peerName;
    }

    if (pScore >= 8.0) {
      return {
        isValid: false,
        selfScore,
        peerScore: pScore,
        conflictingPeer: peerName,
        message: `Name is too similar to "${peerName}" in this chat (${pScore}/10). Must be below 8/10.`
      };
    }
  }

  return {
    isValid: true,
    selfScore,
    peerScore: highestPeerScore,
    conflictingPeer: conflictingPeerName,
    message: 'Name is valid and passes all similarity checks'
  };
}

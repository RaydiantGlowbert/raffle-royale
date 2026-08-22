/**
 * Raffle Royale "hype" callouts.
 *
 * These are purely playful, randomized UI flavor text - NOT real analytics or
 * user activity data. Nothing here should ever be presented as if a real
 * person viewed, bid on, or interacted with a prize.
 *
 * This module centralizes all hype message content plus the (session-stable)
 * random selection logic, so message copy can be edited in one place without
 * touching the rendering code in app.js.
 */

// Generic hype messages usable on any prize card.
const HYPE_GENERIC_MESSAGES = [
  "🔥 Hot Pick!",
  "👑 A Royal Favorite!",
  "👀 Getting some royal attention...",
  "🎰 Feeling lucky?",
  "✨ Don't sleep on this one...",
  "💎 Hidden gem?",
  "🎲 Wild-card energy!",
  "🃏 Could THIS be your pick?",
  "👀 Worth another look...",
  "👑 Main character potential",
  "🎰 The odds are calling...",
  "✨ This one has sparkle",
  "🏆 Prize-worthy!",
  "🎲 Go with your gut",
  "👀 Plot twist: maybe this one?"
];

// Optional custom messages per prize ID (keyed to the current prize IDs in
// scripts/data.js). Falls back to the generic pool for any prize not listed
// here, or is randomly mixed with the generic pool for prizes that are.
const HYPE_PRIZE_MESSAGES = {
  "royal-flush-retreat": [
    "🧘 Royal reset incoming...",
    "✨ Permission to unplug?",
    "👑 Treat yourself like royalty"
  ],
  "vegas-main-character": [
    "👑 Main character behavior...",
    "🎬 Your Vegas era?",
    "✨ This has your name all over it"
  ],
  "brew-crew-casey": [
    "☕ This one is brewing...",
    "👀 Spill the tea? Or coffee?",
    "☕ Coffee + conversation = jackpot"
  ],
  "royal-ride-along": [
    "🎟️ Backstage access is calling...",
    "👑 A peek behind the royal curtain?",
    "🎬 Ready for your behind-the-scenes moment?"
  ],
  "high-roller-time-bank": [
    "⏰ Time might be the REAL jackpot",
    "👑 Spend it wisely...",
    "🎰 High roller energy"
  ],
  "mentor-mvp-pack": [
    "🏆 MVP behavior",
    "⭐ All-star energy",
    "👑 Mentor royalty?"
  ],
  "double-down-development": [
    "🎲 Double down?",
    "📈 Bet on yourself",
    "✨ Growth looks good on you"
  ],
  "good-fortune-giveaway": [
    "🍀 Feeling fortunate?",
    "✨ Good vibes only",
    "🎰 Fortune favors the bold..."
  ],
  "wise-mentor-collection": [
    "🦉 Wise choice?",
    "✨ Old soul energy",
    "👑 Wisdom looks good on you"
  ],
  "casino-royale-collection": [
    "🎰 Casino night energy",
    "♠️ Feeling lucky?",
    "🃏 Play your cards right..."
  ],
  "purr-fect-companion-pack": [
    "🐾 The cat has entered the chat",
    "😸 Feline lucky?",
    "👑 Your tiny ruler approves"
  ],
  "top-dog-pack": [
    "🐾 Tail-wagging potential",
    "🐶 Somebody's about to be spoiled",
    "🦴 Good dog energy"
  ]
};

// Brief playful "reaction" messages shown after a participant opens/flips a
// prize card. Purely a UI flourish - never implies real activity by others.
const HYPE_REACTION_MESSAGES = [
  "👀 Ooooh, good choice...",
  "🎰 Taking a closer look?",
  "👑 We see you.",
  "✨ Interesting choice..."
];

// Only show hype badges on a minority of cards at a time.
const HYPE_MIN_SHARE = 0.3;
const HYPE_MAX_SHARE = 0.45;

function shuffle(list) {
  const copy = list.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

function pickMessageForPrize(prizeId, usedMessages) {
  const customPool = HYPE_PRIZE_MESSAGES[prizeId] || [];
  const pool = customPool.length && Math.random() < 0.5 ? customPool : HYPE_GENERIC_MESSAGES;

  const unused = pool.filter((message) => !usedMessages.has(message));
  const candidates = unused.length ? unused : pool;
  const message = candidates[Math.floor(Math.random() * candidates.length)];
  usedMessages.add(message);
  return message;
}

let cachedAssignments = null;

/**
 * Returns a Map of prizeId -> { message, rotation, pulseDelay } for a random
 * subset of the given prize IDs. Cached for the lifetime of the page session
 * so the same cards, messages, and sticker rotation stay stable while a
 * participant browses; a fresh page load produces a new random selection.
 * @param {string[]} prizeIds
 * @returns {Map<string, {message: string, rotation: number, pulseDelay: number}>}
 */
function getHypeAssignments(prizeIds) {
  if (cachedAssignments) {
    return cachedAssignments;
  }

  const ids = Array.isArray(prizeIds) ? prizeIds : [];
  const total = ids.length;
  const min = total ? Math.max(1, Math.round(total * HYPE_MIN_SHARE)) : 0;
  const max = total ? Math.max(min, Math.round(total * HYPE_MAX_SHARE)) : 0;
  const count = total ? Math.min(total, min + Math.floor(Math.random() * (max - min + 1))) : 0;

  const selected = shuffle(ids).slice(0, count);
  const usedMessages = new Set();
  const assignments = new Map();

  selected.forEach((prizeId) => {
    assignments.set(prizeId, {
      message: pickMessageForPrize(prizeId, usedMessages),
      rotation: Number((Math.random() * 6 - 3).toFixed(2)), // -3deg to +3deg, stable per session
      pulseDelay: Number((Math.random() * 5).toFixed(2)) // staggers the periodic glow across badges
    });
  });

  cachedAssignments = assignments;
  return assignments;
}

/**
 * Splits a hype message into a big "primary" phrase and an optional smaller
 * "secondary" phrase for emphasis, using ": " as the natural break point
 * when present (e.g. "Plot twist: maybe this one?"). Messages without that
 * pattern are returned as a single primary phrase with no secondary line.
 * @param {string} message
 * @returns {{primary: string, secondary: string}}
 */
function splitHypeMessage(message) {
  const text = String(message || "");
  const separatorIndex = text.indexOf(": ");

  if (separatorIndex === -1) {
    return { primary: text, secondary: "" };
  }

  return {
    primary: text.slice(0, separatorIndex).trim(),
    secondary: text.slice(separatorIndex + 1).trim()
  };
}

/**
 * Returns a random playful "reaction" message for the flip/open moment.
 * @returns {string}
 */
function getRandomReactionMessage() {
  return HYPE_REACTION_MESSAGES[Math.floor(Math.random() * HYPE_REACTION_MESSAGES.length)];
}

window.RaffleRoyaleHype = {
  getHypeAssignments,
  splitHypeMessage,
  getRandomReactionMessage
};

window.RaffleRoyaleHypeTestHooks = {
  HYPE_GENERIC_MESSAGES,
  HYPE_PRIZE_MESSAGES,
  HYPE_REACTION_MESSAGES,
  pickMessageForPrize,
  splitHypeMessage,
  getHypeAssignments,
  getRandomReactionMessage
};

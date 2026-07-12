const STORAGE_KEY = "raffleRoyaleSubmissions";
const API_HEALTH_LOG_KEY = "raffleRoyaleApiHealthLog";
const PARTICIPANT_ID_KEY = "raffleRoyaleParticipantId";
const PARTICIPANT_COMPLETION_KEY = "raffleRoyaleParticipantCompletion";

/**
 * Save one submission object to localStorage.
 * @param {{name: string, allocations: Record<string, number>, submittedAt: string}} submission
 */
function saveSubmission(submission) {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  existing.push(submission);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

/**
 * Read all saved submissions from localStorage.
 * @returns {Array<{name: string, allocations: Record<string, number>, submittedAt: string}>}
 */
function getSavedSubmissions() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

/**
 * Remove all saved submissions from localStorage.
 */
function clearSavedSubmissions() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Read persisted API health check history from localStorage.
 * @returns {Array<{ok: boolean, status?: number, checkedAt: string}>}
 */
function getSavedApiHealthHistory() {
  const raw = JSON.parse(localStorage.getItem(API_HEALTH_LOG_KEY) || "[]");
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item) => item && typeof item.checkedAt === "string")
    .slice(0, 5)
    .map((item) => ({
      ok: Boolean(item.ok),
      status: item.status,
      checkedAt: item.checkedAt
    }));
}

/**
 * Persist API health check history to localStorage.
 * @param {Array<{ok: boolean, status?: number, checkedAt: string}>} history
 */
function saveApiHealthHistory(history) {
  const safeHistory = Array.isArray(history) ? history.slice(0, 5) : [];
  localStorage.setItem(API_HEALTH_LOG_KEY, JSON.stringify(safeHistory));
}

/**
 * Remove persisted API health check history.
 */
function clearSavedApiHealthHistory() {
  localStorage.removeItem(API_HEALTH_LOG_KEY);
}

function createLocalUniqueId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

/**
 * Returns a stable participant ID for this browser until reset.
 * @returns {string}
 */
function getOrCreateParticipantId() {
  const existing = localStorage.getItem(PARTICIPANT_ID_KEY);
  if (existing) {
    return existing;
  }

  const created = createLocalUniqueId("participant");
  localStorage.setItem(PARTICIPANT_ID_KEY, created);
  return created;
}

/**
 * Clears participant ID and creates a new one.
 * @returns {string}
 */
function resetParticipantId() {
  localStorage.removeItem(PARTICIPANT_ID_KEY);
  return getOrCreateParticipantId();
}

/**
 * Reads participant completion lock information.
 * @returns {{participantId: string, participantName: string, submissionId: string, submittedAt: string} | null}
 */
function getParticipantCompletionStatus() {
  const raw = JSON.parse(localStorage.getItem(PARTICIPANT_COMPLETION_KEY) || "null");
  if (!raw || typeof raw !== "object") {
    return null;
  }

  if (!raw.participantId || !raw.submissionId || !raw.submittedAt) {
    return null;
  }

  return {
    participantId: String(raw.participantId),
    participantName: String(raw.participantName || ""),
    submissionId: String(raw.submissionId),
    submittedAt: String(raw.submittedAt)
  };
}

/**
 * Saves participant completion lock information.
 * @param {{participantId: string, participantName: string, submissionId: string, submittedAt: string}} completion
 */
function saveParticipantCompletionStatus(completion) {
  localStorage.setItem(PARTICIPANT_COMPLETION_KEY, JSON.stringify(completion));
}

/**
 * Clears participant completion lock information.
 */
function clearParticipantCompletionStatus() {
  localStorage.removeItem(PARTICIPANT_COMPLETION_KEY);
}

window.RaffleRoyaleStorageTestHooks = {
  getSavedSubmissions,
  saveSubmission,
  clearSavedSubmissions,
  getOrCreateParticipantId,
  resetParticipantId,
  getParticipantCompletionStatus,
  saveParticipantCompletionStatus,
  clearParticipantCompletionStatus,
  getSavedApiHealthHistory,
  saveApiHealthHistory,
  clearSavedApiHealthHistory
};

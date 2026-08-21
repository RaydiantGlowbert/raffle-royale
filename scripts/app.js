const NAME_FORMAT = /^[A-Za-z]+(?:[\-'][A-Za-z]+)?\s+[A-Za-z]\.?$/;
const RESET_BROWSER_CONFIRMATION_ONE = "Pilot testing only: this will clear this browser's submission-completed status and assign a new participant ID. Continue?";
const RESET_BROWSER_CONFIRMATION_TWO = "Confirm browser reset for pilot testing. Admin submissions will remain intact.";
const CLEAR_ALL_CONFIRMATION_ONE = PILOT_MODE
  ? "WARNING: This will permanently delete all locally stored pilot submissions and pilot logs for this browser. Continue?"
  : "WARNING: This will permanently delete all locally stored submissions and logs for this browser. Continue?";
const CLEAR_ALL_CONFIRMATION_TWO = PILOT_MODE
  ? "Final confirmation: Clear All Pilot Data now?"
  : "Final confirmation: Clear All Local Data now?";

const state = {
  step: "name", // name | raffle | review | confirmation | adminExport
  participantId: getOrCreateParticipantId(),
  participantCompletion: getParticipantCompletionStatus(),
  name: "",
  nameDraft: "",
  flippedPrizeId: "",
  allocations: Object.fromEntries(PRIZES.map((prize) => [prize.id, 0])),
  isSubmitting: false,
  lastSubmission: null,
  submissionFailureCount: 0,
  lastSubmissionFailureAt: "",
  lastApiHealthCheck: null,
  apiHealthHistory: getSavedApiHealthHistory(),
  isCheckingApiHealth: false,
  adminAuthChecking: false,
  adminSigningIn: false,
  adminSigningOut: false,
  adminLoadingShared: false,
  adminAuthenticated: false,
  adminSessionExpiresAt: "",
  adminSharedSubmissions: [],
  adminLoadErrorCode: "",
  adminLoadError: "",
  adminUseLocalPilotData: false,
  openEventInfoPanelId: "",
  isImportantRulesOpen: false,
  suppressEventInfoFocusOpenForId: "",
  notice: ""
};

const appRoot = document.getElementById("app");

function resetEntryState() {
  state.name = "";
  state.nameDraft = "";
  state.flippedPrizeId = "";
  state.allocations = Object.fromEntries(PRIZES.map((prize) => [prize.id, 0]));
  state.isSubmitting = false;
  state.lastSubmission = null;
  state.submissionFailureCount = 0;
  state.lastSubmissionFailureAt = "";
  state.openEventInfoPanelId = "";
  state.isImportantRulesOpen = false;
  state.suppressEventInfoFocusOpenForId = "";
}

function togglePrizeCardFlip(prizeId) {
  if (!prizeId) {
    return;
  }

  state.flippedPrizeId = state.flippedPrizeId === prizeId ? "" : prizeId;
}

const EVENT_TIMELINE_ITEMS = [
  {
    id: "timeline-kickoff",
    icon: "🎲",
    title: "Raffle Kickoff",
    shortDate: "September 9",
    date: "Wednesday, September 9",
    details: "The Raffle Royale experience officially begins. Explore the prizes, learn how the raffle works, and start planning your strategy."
  },
  {
    id: "timeline-bidding-window",
    icon: "🎟️",
    title: "Bidding Window",
    shortDate: "September 16-23",
    date: "Wednesday, September 16–Wednesday, September 23",
    details: "You will receive 20 raffle chips to distribute across the prizes you want most. Go all in on one prize or spread your chips across several."
  },
  {
    id: "timeline-winners-announced",
    icon: "🏆",
    title: "Winners Announced",
    shortDate: "October 6",
    date: "Tuesday, October 6",
    details: "Winners will be revealed during the SuperTeam meeting."
  }
];

const HOW_IT_WORKS_ITEMS = [
  {
    stepLabel: "①",
    title: "Browse the Prizes",
    details: "Review each prize and select View Details to see exactly what is included."
  },
  {
    stepLabel: "②",
    title: "Bet Your Chips",
    details: "Distribute all 20 chips across the prizes you want most."
  },
  {
    stepLabel: "③",
    title: "Review and Submit",
    details: "Confirm your selections and submit one final entry during the bidding window."
  }
];

const IMPORTANT_RULES_ITEMS = [
  "Chips represent raffle entries, not money.",
  "More chips placed on a prize means more entries in that prize's drawing.",
  "All 20 chips must be allocated before submission.",
  "Once you win a prize, you will be removed from all remaining prize drawings, giving more participants a chance to win."
];

function buildTimelineCardMarkup(item) {
  const panelId = `event-info-panel-${item.id}`;
  const isOpen = state.openEventInfoPanelId === item.id;

  return `
    <article class="event-info-card-wrap timeline-card-wrap" data-event-panel-item="${escapeHtml(item.id)}">
      <button
        class="event-info-card timeline-info-card"
        type="button"
        data-event-panel-trigger="${escapeHtml(item.id)}"
        aria-expanded="${isOpen ? "true" : "false"}"
        aria-controls="${escapeHtml(panelId)}"
      >
        <span class="timeline-marker" aria-hidden="true">
          <span class="event-card-icon">${escapeHtml(item.icon)}</span>
        </span>
        <span class="event-card-title">${escapeHtml(item.title)}</span>
        <span class="event-card-subtitle timeline-date-emphasis">${escapeHtml(item.date || item.shortDate || "")}</span>
        <span class="event-card-cue">Learn More →</span>
      </button>
      <div
        class="event-detail-panel timeline-detail-panel"
        id="${escapeHtml(panelId)}"
        data-event-panel="${escapeHtml(item.id)}"
        aria-hidden="${isOpen ? "false" : "true"}"
        ${isOpen ? "" : "inert"}
      >
        <div class="event-detail-header">
          <span class="event-detail-icon" aria-hidden="true">${escapeHtml(item.icon)}</span>
          <div class="event-detail-headline">
            <h3 class="event-detail-title">${escapeHtml(item.title)}</h3>
            <p class="event-detail-meta">${escapeHtml(item.date)}</p>
          </div>
        </div>
        <p class="event-detail-body">${escapeHtml(item.details)}</p>
        <button class="event-panel-close" type="button" data-event-panel-close="${escapeHtml(item.id)}">Close</button>
      </div>
    </article>
  `;
}

function buildHowStepCardMarkup(item) {
  return `
    <article class="event-info-card-wrap" role="listitem">
      <div class="event-info-card how-step-card">
        <p class="how-step-title"><span class="how-step-number">${escapeHtml(item.stepLabel)}</span> ${escapeHtml(item.title)}</p>
        <p class="how-step-copy">${escapeHtml(item.details)}</p>
      </div>
    </article>
  `;
}

function buildImportantRulesAccordionMarkup() {
  const panelId = "event-rules-panel";
  const isOpen = state.isImportantRulesOpen;

  return `
    <section class="rules-callout" aria-label="Important raffle rules">
      <button
        class="rules-callout-trigger"
        type="button"
        data-important-rules-trigger="true"
        aria-expanded="${isOpen ? "true" : "false"}"
        aria-controls="${escapeHtml(panelId)}"
      >
        <span class="rules-callout-icon" aria-hidden="true">📜</span>
        <span class="rules-callout-copy">
          <span class="rules-callout-title">Important Raffle Rules</span>
          <span class="rules-callout-subtitle">Review the key rules before submitting your entry.</span>
        </span>
        <span class="rules-callout-meta">
          <span class="rules-callout-cue">Review the Rules</span>
          <span class="rules-callout-chevron" aria-hidden="true">⌄</span>
        </span>
      </button>
      <div
        class="rules-accordion-panel"
        id="${escapeHtml(panelId)}"
        data-important-rules-panel="true"
        aria-hidden="${isOpen ? "false" : "true"}"
        ${isOpen ? "" : "inert"}
      >
        <ul class="event-panel-rules-list">${IMPORTANT_RULES_ITEMS.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}</ul>
        <button class="event-panel-close" type="button" data-important-rules-close="true">Close</button>
      </div>
    </section>
  `;
}

function setOpenEventInfoPanel(panelId, options = {}) {
  const { returnFocus = false, focusTriggerId = "" } = options;
  const eventInfoRoot = appRoot.querySelector(".event-info");
  const allPanelIds = new Set([
    ...EVENT_TIMELINE_ITEMS.map((item) => item.id),
    ...EVENT_TIMELINE_ITEMS.map((item) => item.id)
  ]);

  state.openEventInfoPanelId = allPanelIds.has(panelId) ? panelId : "";

  if (!eventInfoRoot) {
    return;
  }

  const triggers = eventInfoRoot.querySelectorAll("[data-event-panel-trigger]");
  const panels = eventInfoRoot.querySelectorAll("[data-event-panel]");

  triggers.forEach((trigger) => {
    const triggerPanelId = trigger.getAttribute("data-event-panel-trigger");
    trigger.setAttribute("aria-expanded", String(triggerPanelId === state.openEventInfoPanelId));
  });

  panels.forEach((panel) => {
    const thisPanelId = panel.getAttribute("data-event-panel");
    const isOpen = thisPanelId === state.openEventInfoPanelId;
    panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    if (isOpen) {
      panel.removeAttribute("inert");
    } else {
      panel.setAttribute("inert", "");
    }
  });

  if (returnFocus) {
    const targetId = focusTriggerId || panelId;
    const focusTarget = eventInfoRoot.querySelector(`[data-event-panel-trigger="${targetId}"]`);
    if (focusTarget instanceof HTMLElement) {
      state.suppressEventInfoFocusOpenForId = targetId;
      focusTarget.focus();
      window.requestAnimationFrame(() => {
        if (state.suppressEventInfoFocusOpenForId === targetId) {
          state.suppressEventInfoFocusOpenForId = "";
        }
      });
    }
  }
}

function setImportantRulesOpen(isOpen, options = {}) {
  const { returnFocus = false } = options;
  const eventInfoRoot = appRoot.querySelector(".event-info");
  state.isImportantRulesOpen = Boolean(isOpen);

  if (!eventInfoRoot) {
    return;
  }

  const trigger = eventInfoRoot.querySelector("[data-important-rules-trigger]");
  const panel = eventInfoRoot.querySelector("[data-important-rules-panel]");

  if (trigger instanceof HTMLElement) {
    trigger.setAttribute("aria-expanded", String(state.isImportantRulesOpen));
  }

  if (panel instanceof HTMLElement) {
    panel.setAttribute("aria-hidden", state.isImportantRulesOpen ? "false" : "true");
    panel.classList.toggle("is-open", state.isImportantRulesOpen);
    if (state.isImportantRulesOpen) {
      panel.removeAttribute("inert");
    } else {
      panel.setAttribute("inert", "");
    }
  }

  if (returnFocus) {
    const focusTarget = eventInfoRoot.querySelector("[data-important-rules-trigger]");
    if (focusTarget instanceof HTMLElement) {
      focusTarget.focus();
    }
  }
}

function handleEventInfoEscapeKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  const eventInfoRoot = appRoot.querySelector(".event-info");
  if (!eventInfoRoot) {
    return;
  }

  if (state.openEventInfoPanelId) {
    event.preventDefault();
    const previousTimelineId = state.openEventInfoPanelId;
    setOpenEventInfoPanel("", { returnFocus: true, focusTriggerId: previousTimelineId });
    return;
  }

  if (state.isImportantRulesOpen) {
    event.preventDefault();
    setImportantRulesOpen(false, { returnFocus: true });
  }
}

function hasParticipantCompletionLock() {
  return Boolean(state.participantCompletion && state.participantCompletion.submissionId);
}

function setParticipantCompletionLock(completion) {
  state.participantCompletion = completion;
  saveParticipantCompletionStatus(completion);
}

function clearParticipantCompletionLock() {
  state.participantCompletion = null;
  clearParticipantCompletionStatus();
}

function getModeLabel() {
  return APP_MODE === "pilot" ? "Pilot Test" : "Live";
}

function confirmResetBrowserForTesting(confirmFn = window.confirm) {
  if (!confirmFn(RESET_BROWSER_CONFIRMATION_ONE)) {
    return false;
  }

  return confirmFn(RESET_BROWSER_CONFIRMATION_TWO);
}

function confirmClearAllPilotData(confirmFn = window.confirm) {
  if (!confirmFn(CLEAR_ALL_CONFIRMATION_ONE)) {
    return false;
  }

  return confirmFn(CLEAR_ALL_CONFIRMATION_TWO);
}

function getPilotBannerMarkup() {
  if (!PILOT_MODE) {
    return "";
  }

  return `
    <section class="pilot-banner" aria-label="Pilot mode notice">
      <p class="pilot-badge">Pilot Test</p>
      <p class="pilot-message">This raffle is in testing mode. Entries are not live event entries.</p>
    </section>
  `;
}

function getEventPhaseLockedMessage(eventPhase = getEventPhase()) {
  if (eventPhase === "preview") {
    return "Token allocation unlocks September 16. Scope out the prizes and plan your strategy!";
  }

  if (eventPhase === "closed") {
    return "Bidding is closed. The bets are in-winners will be announced at SuperTeam on October 6!";
  }

  return "";
}

function getEventPhaseBannerMarkup() {
  const eventPhase = getEventPhase();

  if (eventPhase === "preview") {
    return `
      <section class="phase-banner phase-banner--preview" aria-label="Preview mode notice">
        <p class="phase-badge">🎲 Preview Mode</p>
        <p class="phase-message">Explore the prizes and plan your strategy. Your 20 chips unlock September 16!</p>
      </section>
    `;
  }

  if (eventPhase === "closed") {
    return `
      <section class="phase-banner phase-banner--closed" aria-label="Bidding closed notice">
        <p class="phase-badge">🏆 Bidding Closed</p>
        <p class="phase-message">The bets are in! Winners will be announced at the SuperTeam meeting on October 6.</p>
      </section>
    `;
  }

  return "";
}

function getTotalAllocated() {
  return Object.values(state.allocations).reduce((sum, count) => sum + count, 0);
}

function getRemainingTickets() {
  return TOTAL_TICKETS - getTotalAllocated();
}

function setNotice(message) {
  state.notice = message;
}

function getParticipantName(entry) {
  return entry.participantName || entry.name || "";
}

function parseParticipantName(nameValue) {
  const trimmed = String(nameValue || "").trim().replace(/\s+/g, " ");
  const [firstName = "", lastInitialRaw = ""] = trimmed.split(" ");
  const lastInitial = String(lastInitialRaw || "").replace(/\./g, "").charAt(0).toUpperCase();
  return {
    participantName: `${firstName} ${lastInitial}`.trim(),
    firstName,
    lastInitial
  };
}

function getParticipantFirstName(entry) {
  if (entry.firstName) {
    return entry.firstName;
  }

  return parseParticipantName(getParticipantName(entry)).firstName;
}

function getParticipantLastInitial(entry) {
  if (entry.lastInitial) {
    return String(entry.lastInitial).replace(/\./g, "").charAt(0).toUpperCase();
  }

  return parseParticipantName(getParticipantName(entry)).lastInitial;
}

function getAllocationCount(entry, prizeId) {
  if (entry.allocations && typeof entry.allocations === "object") {
    return Number(entry.allocations[prizeId] || 0);
  }

  if (Array.isArray(entry.ticketAllocations)) {
    const match = entry.ticketAllocations.find((bucket) => bucket.prizeId === prizeId);
    return Number(match?.ticketsAllocated || 0);
  }

  return 0;
}

function getSelectedPrizeAllocations(allocations) {
  return PRIZES
    .map((prize) => ({
      prize,
      count: Number(allocations[prize.id] || 0)
    }))
    .filter((item) => item.count > 0);
}

function formatTicketCountLabel(count) {
  return `${count} ${count === 1 ? "Chip" : "Chips"}`;
}

function applyTicketAction(allocations, action, prizeId) {
  const next = { ...allocations };

  if (!Object.prototype.hasOwnProperty.call(next, prizeId)) {
    return next;
  }

  const totalAllocated = Object.values(next).reduce((sum, count) => sum + Number(count || 0), 0);
  const currentCount = Number(next[prizeId] || 0);

  if (action === "increment" && totalAllocated < TOTAL_TICKETS) {
    next[prizeId] = currentCount + 1;
  }

  if (action === "decrement" && currentCount > 0) {
    next[prizeId] = currentCount - 1;
  }

  return next;
}

function beginSubmissionAttempt() {
  if (state.isSubmitting) {
    return false;
  }

  state.isSubmitting = true;
  return true;
}

function finishSubmissionAttempt() {
  state.isSubmitting = false;
}

function escapeCsvField(value) {
  const safeValue = String(value).replace(/"/g, '""');
  return `"${safeValue}"`;
}

function buildAdminExportRows(submissions) {
  return submissions.flatMap((entry) => {
    const selectedPrizeRows = PRIZES
      .map((prize) => ({
        prize,
        count: getAllocationCount(entry, prize.id)
      }))
      .filter((item) => item.count > 0);

    return selectedPrizeRows.map((item) => ({
      mode: entry.mode || APP_MODE,
      participantId: entry.participantId || "",
      submissionId: entry.submissionId || entry.id || "",
      submittedAt: entry.submittedAt || "",
      participantName: getParticipantName(entry),
      firstName: getParticipantFirstName(entry),
      lastInitial: getParticipantLastInitial(entry),
      prizeName: item.prize.name,
      prizeId: item.prize.id,
      ticketsAllocated: item.count
    }));
  });
}

function buildAdminExportCsv(submissions) {
  const header = [
    "mode",
    "participantId",
    "submissionId",
    "submittedAt",
    "participantName",
    "firstName",
    "lastInitial",
    "prizeName",
    "prizeId",
    "ticketsAllocated"
  ];
  const rows = buildAdminExportRows(submissions).map((row) => (
    [
      row.mode,
      row.participantId,
      row.submissionId,
      row.submittedAt,
      row.participantName,
      row.firstName,
      row.lastInitial,
      row.prizeName,
      row.prizeId,
      row.ticketsAllocated
    ]
      .map(escapeCsvField)
      .join(",")
  ));

  return [header.map(escapeCsvField).join(","), ...rows].join("\r\n");
}

function buildTicketPoolRows(submissions) {
  const standardRows = buildAdminExportRows(submissions);
  const rows = [];

  PRIZES.forEach((prize) => {
    const prizeRows = standardRows
      .filter((row) => row.prizeId === prize.id)
      .sort((a, b) => {
        const nameSort = a.participantName.localeCompare(b.participantName);
        if (nameSort !== 0) {
          return nameSort;
        }

        return a.submissionId.localeCompare(b.submissionId);
      });

    let ticketNumber = 1;
    prizeRows.forEach((row) => {
      for (let i = 0; i < row.ticketsAllocated; i += 1) {
        rows.push({
          ticketNumber,
          prizeId: row.prizeId,
          prizeName: row.prizeName,
          participantId: row.participantId,
          participantName: row.participantName,
          submissionId: row.submissionId,
          submittedAt: row.submittedAt
        });
        ticketNumber += 1;
      }
    });
  });

  return rows;
}

function buildTicketPoolCsv(submissions) {
  const header = [
    "ticketNumber",
    "prizeId",
    "prizeName",
    "participantId",
    "participantName",
    "submissionId",
    "submittedAt"
  ];

  const rows = buildTicketPoolRows(submissions).map((row) => (
    [
      row.ticketNumber,
      row.prizeId,
      row.prizeName,
      row.participantId,
      row.participantName,
      row.submissionId,
      row.submittedAt
    ].map(escapeCsvField).join(",")
  ));

  return [header.map(escapeCsvField).join(","), ...rows].join("\r\n");
}

function buildPrizeTicketSummary(submissions) {
  const totals = Object.fromEntries(PRIZES.map((prize) => [prize.id, 0]));

  submissions.forEach((entry) => {
    PRIZES.forEach((prize) => {
      totals[prize.id] += getAllocationCount(entry, prize.id);
    });
  });

  const participantCounts = Object.fromEntries(PRIZES.map((prize) => [prize.id, 0]));
  submissions.forEach((entry) => {
    PRIZES.forEach((prize) => {
      if (getAllocationCount(entry, prize.id) > 0) {
        participantCounts[prize.id] += 1;
      }
    });
  });

  return PRIZES.map((prize) => ({
    prizeId: prize.id,
    prizeName: prize.name,
    totalTickets: totals[prize.id],
    participantCount: participantCounts[prize.id]
  }));
}

function buildAdminDashboardSummary(submissions) {
  const totalSubmissions = submissions.length;
  const totalTickets = submissions.reduce((sum, entry) => {
    return sum + PRIZES.reduce((innerSum, prize) => innerSum + getAllocationCount(entry, prize.id), 0);
  }, 0);

  return {
    totalSubmissions,
    totalTickets
  };
}

function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8") {
  const fileBlob = new Blob([content], { type: mimeType });
  const fileUrl = URL.createObjectURL(fileBlob);
  const tempLink = document.createElement("a");

  tempLink.href = fileUrl;
  tempLink.download = filename;
  tempLink.style.display = "none";

  document.body.appendChild(tempLink);
  tempLink.click();
  document.body.removeChild(tempLink);
  URL.revokeObjectURL(fileUrl);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return;
  }

  const tempTextArea = document.createElement("textarea");
  tempTextArea.value = text;
  tempTextArea.setAttribute("readonly", "true");
  tempTextArea.style.position = "absolute";
  tempTextArea.style.left = "-9999px";
  document.body.appendChild(tempTextArea);
  tempTextArea.select();
  document.execCommand("copy");
  document.body.removeChild(tempTextArea);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidParticipantName(nameValue) {
  return NAME_FORMAT.test(nameValue.trim());
}

function getSubmissionFailureMessage(error) {
  const code = error?.code || "";
  if (code === "VALIDATION_ERROR") {
    return "Your entry could not be submitted. Please review your name and chip allocations, then try again.";
  }

  const mode = SUBMISSION_CONFIG?.mode === "api" ? "api" : "local";
  if (mode !== "api") {
    return "Submission failed. Please try again.";
  }

  const status = error?.details?.status;

  if (code === "API_ENDPOINT_MISSING") {
    return "Submission API is not configured. Ask an admin to set apiEndpoint, then try again.";
  }

  if (code === "API_NETWORK_ERROR") {
    return "Unable to reach the submission API. Check network connectivity and try Submit Entry again.";
  }

  if (code === "API_HTTP_ERROR" && Number.isFinite(status)) {
    return `Submission API returned status ${status}. Try Submit Entry again, then contact admin if it persists.`;
  }

  return "Submission failed in API mode. Try Submit Entry again.";
}

function getSubmissionFailureMetaText() {
  if (!state.submissionFailureCount || !state.lastSubmissionFailureAt) {
    return "";
  }

  const attemptLabel = state.submissionFailureCount === 1 ? "attempt" : "attempts";
  const localTime = new Date(state.lastSubmissionFailureAt).toLocaleTimeString();
  return `Failed ${state.submissionFailureCount} ${attemptLabel}. Last failure at ${localTime}.`;
}

function getApiHealthStatusText() {
  if (!state.lastApiHealthCheck) {
    return "No health check run yet.";
  }

  const checkedAt = new Date(state.lastApiHealthCheck.checkedAt).toLocaleTimeString();
  const statusPart = Number.isFinite(state.lastApiHealthCheck.status)
    ? ` (HTTP ${state.lastApiHealthCheck.status})`
    : "";

  return `${state.lastApiHealthCheck.message}${statusPart} Checked at ${checkedAt}.`;
}

function getApiHealthHistoryMarkup() {
  if (!state.apiHealthHistory.length) {
    return '<p class="confirmation-note">No API checks logged yet.</p>';
  }

  return state.apiHealthHistory.map((item) => {
    const checkedAt = new Date(item.checkedAt).toLocaleTimeString();
    const outcome = item.ok ? "PASS" : "FAIL";
    const statusPart = Number.isFinite(item.status) ? ` (HTTP ${item.status})` : "";
    const rowText = `${checkedAt} - ${outcome}${statusPart}`;
    return `<p class="confirmation-note">${escapeHtml(rowText)}</p>`;
  }).join("");
}

function recordApiHealthResult(result) {
  const historyEntry = {
    ok: Boolean(result.ok),
    status: result.status,
    checkedAt: result.checkedAt
  };

  state.apiHealthHistory = [historyEntry, ...state.apiHealthHistory].slice(0, 5);
  saveApiHealthHistory(state.apiHealthHistory);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

async function checkAdminSessionStatus() {
  state.adminAuthChecking = true;

  if (state.step === "adminExport") {
    renderAdminExportStep();
  }

  try {
    const result = await requestJson("/api/admin/session", { method: "GET" });

    if (result.ok) {
      state.adminAuthenticated = true;
      state.adminSessionExpiresAt = String(result.data?.expiresAt || "");
      state.adminLoadErrorCode = "";
      return { ok: true };
    }

    state.adminAuthenticated = false;
    state.adminSessionExpiresAt = "";

    if (result.status === 401) {
      state.adminLoadErrorCode = "SESSION_MISSING_OR_EXPIRED";
      state.adminLoadError = "Organizer session missing or expired. Sign in again to load shared submissions.";
      return { ok: false, code: "SESSION_MISSING_OR_EXPIRED" };
    }

    state.adminLoadErrorCode = "ADMIN_SESSION_UNAVAILABLE";
    state.adminLoadError = "Admin session check is unavailable right now.";
    return { ok: false, code: "ADMIN_SESSION_UNAVAILABLE" };
  } catch {
    state.adminAuthenticated = false;
    state.adminSessionExpiresAt = "";
    state.adminLoadErrorCode = "ADMIN_SESSION_UNAVAILABLE";
    state.adminLoadError = "Admin session check is unavailable right now.";
    return { ok: false, code: "ADMIN_SESSION_UNAVAILABLE" };
  } finally {
    state.adminAuthChecking = false;
    if (state.step === "adminExport") {
      renderAdminExportStep();
    }
  }
}

async function signInOrganizer(code) {
  state.adminSigningIn = true;
  if (state.step === "adminExport") {
    renderAdminExportStep();
  }

  try {
    const result = await requestJson("/api/admin/session", {
      method: "POST",
      body: JSON.stringify({ code })
    });

    if (!result.ok) {
      if (result.status === 401) {
        return { ok: false, code: "INVALID_CODE", message: "Organizer code is incorrect." };
      }

      return { ok: false, code: "SIGN_IN_UNAVAILABLE", message: "Organizer sign-in is unavailable right now." };
    }

    state.adminAuthenticated = true;
    state.adminSessionExpiresAt = String(result.data?.expiresAt || "");
    state.adminLoadErrorCode = "";
    state.adminLoadError = "";

    return { ok: true };
  } catch {
    return { ok: false, code: "SIGN_IN_UNAVAILABLE", message: "Organizer sign-in is unavailable right now." };
  } finally {
    state.adminSigningIn = false;
    if (state.step === "adminExport") {
      renderAdminExportStep();
    }
  }
}

async function signOutOrganizer() {
  state.adminSigningOut = true;
  if (state.step === "adminExport") {
    renderAdminExportStep();
  }

  try {
    await requestJson("/api/admin/session", { method: "DELETE" });
  } finally {
    state.adminSigningOut = false;
    state.adminAuthenticated = false;
    state.adminSessionExpiresAt = "";
    state.adminSharedSubmissions = [];
    state.adminUseLocalPilotData = false;
    state.adminLoadErrorCode = "SESSION_MISSING_OR_EXPIRED";
    state.adminLoadError = "Signed out. Sign in again to load shared submissions.";

    if (state.step === "adminExport") {
      renderAdminExportStep();
    }
  }
}

async function loadSharedAdminSubmissions() {
  state.adminLoadingShared = true;
  state.adminLoadError = "";
  state.adminLoadErrorCode = "";
  state.adminUseLocalPilotData = false;

  if (state.step === "adminExport") {
    renderAdminExportStep();
  }

  try {
    const result = await requestJson("/api/admin/submissions", { method: "GET" });

    if (result.ok) {
      state.adminAuthenticated = true;
      state.adminSharedSubmissions = Array.isArray(result.data?.entries) ? result.data.entries : [];
      return { ok: true };
    }

    state.adminSharedSubmissions = [];

    if (result.status === 401) {
      state.adminAuthenticated = false;
      state.adminSessionExpiresAt = "";
      state.adminLoadErrorCode = "SESSION_MISSING_OR_EXPIRED";
      state.adminLoadError = "Organizer session missing or expired. Sign in again to load shared submissions.";
      return { ok: false, code: "SESSION_MISSING_OR_EXPIRED" };
    }

    state.adminLoadErrorCode = "ADMIN_SUBMISSIONS_UNAVAILABLE";
    state.adminLoadError = "Shared submissions could not be loaded right now.";
    return { ok: false, code: "ADMIN_SUBMISSIONS_UNAVAILABLE" };
  } catch {
    state.adminSharedSubmissions = [];
    state.adminLoadErrorCode = "ADMIN_SUBMISSIONS_UNAVAILABLE";
    state.adminLoadError = "Shared submissions could not be loaded right now.";
    return { ok: false, code: "ADMIN_SUBMISSIONS_UNAVAILABLE" };
  } finally {
    state.adminLoadingShared = false;
    if (state.step === "adminExport") {
      renderAdminExportStep();
    }
  }
}

async function openAdminExportFlow(onInvalidCode) {
  const session = await checkAdminSessionStatus();

  if (!session.ok && session.code !== "SESSION_MISSING_OR_EXPIRED") {
    setNotice("Admin sign-in check is unavailable right now.");
    render();
    return;
  }

  if (!session.ok) {
    const code = window.prompt("Enter organizer admin code:", "");
    if (!code) {
      return;
    }

    const signIn = await signInOrganizer(code);
    if (!signIn.ok) {
      const message = signIn.code === "INVALID_CODE"
        ? "Organizer code was incorrect."
        : "Organizer sign-in is unavailable right now.";

      if (typeof onInvalidCode === "function") {
        onInvalidCode(message);
      } else {
        setNotice(message);
        render();
      }
      return;
    }
  }

  setNotice("");
  state.step = "adminExport";
  render();

  await loadSharedAdminSubmissions();
}

function renderParticipantCompletedStep() {
  const completion = state.participantCompletion;
  const savedSubmissions = getSavedSubmissions();
  const savedSubmission = state.lastSubmission
    || savedSubmissions.find((entry) => (entry.submissionId || entry.id || "") === (completion?.submissionId || ""))
    || savedSubmissions.find((entry) => (entry.participantId || "") === (completion?.participantId || ""))
    || null;
  const totalSubmittedTickets = savedSubmission
    ? PRIZES.reduce((sum, prize) => sum + getAllocationCount(savedSubmission, prize.id), 0)
    : "";
  const selectedPrizeCount = savedSubmission
    ? PRIZES.filter((prize) => getAllocationCount(savedSubmission, prize.id) > 0).length
    : "";
  const savedParticipantName = completion?.participantName || getParticipantName(savedSubmission) || "";
  const submittedAtText = completion ? new Date(completion.submittedAt).toLocaleString() : "";

  appRoot.innerHTML = `
    <main class="app-shell" aria-live="polite">
      <section class="confirmation confirmation--success">
        <img
          class="confirmation-logo"
          src="assets/images/raffle-royale-logo.png"
          alt="Raffle Royale logo"
          loading="eager"
          decoding="async"
          onerror="this.classList.add('is-hidden'); this.setAttribute('aria-hidden', 'true');"
        />
        <h1 class="confirmation-title">Your Chips Are In!</h1>
        ${getPilotBannerMarkup()}
        <p class="app-subtitle">Your Raffle Royale entry has been submitted successfully.</p>
        ${state.notice ? `<p class="status-message">${escapeHtml(state.notice)}</p>` : ""}

        <section class="submission-summary" aria-label="Submission summary">
          <h2 class="submission-summary-title">Submission Summary</h2>
          <div class="submission-summary-grid">
            <article class="submission-summary-item">
              <p class="submission-summary-label">Participant</p>
              <p class="submission-summary-value">${escapeHtml(savedParticipantName)}</p>
            </article>
            <article class="submission-summary-item">
              <p class="submission-summary-label">Total Chips Submitted</p>
              <p class="submission-summary-value">${escapeHtml(String(totalSubmittedTickets))}</p>
            </article>
            <article class="submission-summary-item">
              <p class="submission-summary-label">Selected Prizes</p>
              <p class="submission-summary-value">${escapeHtml(String(selectedPrizeCount))}</p>
            </article>
          </div>
          <p class="confirmation-win-note">Winners will be announced during the SuperTeam meeting on Tuesday, October 6.</p>
        </section>

        <div class="confirmation-details" aria-label="Existing submission details">
          <p>Participant ID: <strong>${escapeHtml(completion?.participantId || state.participantId)}</strong></p>
          <p>Name: <strong>${escapeHtml(savedParticipantName)}</strong></p>
          <p>Submission ID: <strong>${escapeHtml(completion?.submissionId || "")}</strong></p>
          <p>Submitted At: <strong>${escapeHtml(submittedAtText)}</strong></p>
          <p>Mode: <strong>${escapeHtml(getModeLabel())}</strong></p>
        </div>

        <section class="confirmation-testing-panel" aria-label="${PILOT_MODE ? "Pilot testing tools" : "Account tools"}">
          ${PILOT_MODE ? `<h2 class="confirmation-testing-title">Pilot Testing Tools</h2>
          <p class="confirmation-note">Reset This Browser for Testing is for pilot testing only and does not delete admin submission data.</p>` : ""}
          <div class="confirmation-actions">
            <button class="secondary-btn" id="open-admin-from-lock-btn" type="button">Admin Export</button>
            ${PILOT_MODE ? `<button class="secondary-btn" id="reset-browser-btn" type="button">Reset This Browser for Testing</button>` : ""}
          </div>
        </section>
      </section>
    </main>
  `;

  document.getElementById("open-admin-from-lock-btn").addEventListener("click", async () => {
    await openAdminExportFlow((message) => {
      setNotice(message);
      renderParticipantCompletedStep();
    });
  });

  const resetBrowserBtn = document.getElementById("reset-browser-btn");
  if (resetBrowserBtn) {
    resetBrowserBtn.addEventListener("click", () => {
      if (!confirmResetBrowserForTesting()) {
        return;
      }

      clearParticipantCompletionLock();
      state.participantId = resetParticipantId();
      resetEntryState();
      setNotice("Browser reset for pilot testing. You can submit a new test entry.");
      state.step = "name";
      render();
    });
  }
}

function renderNameStep(errorMessage = "") {
  appRoot.innerHTML = `
    <main class="app-shell" aria-live="polite">
      <header class="participant-hero" aria-label="Raffle hero">
        <h1 class="visually-hidden">Raffle Royale</h1>
        <div class="participant-hero-logo-wrap" aria-hidden="true">
          <img
            class="app-hero-logo"
            src="assets/images/raffle-royale-logo.png"
            alt="Raffle Royale logo"
            loading="eager"
            decoding="async"
            onerror="this.classList.add('is-hidden'); this.setAttribute('aria-hidden', 'true');"
          />
        </div>
        ${getPilotBannerMarkup()}
        <div class="participant-hero-intro" aria-label="Event introduction">
          <p class="app-subtitle hero-intro">Choose how you'll spend your 20 raffle chips.</p>
          <p class="app-subtitle hero-intro hero-intro-secondary">Go all in on one prize, or spread your chances across several.</p>
        </div>
        <div class="hero-divider" aria-hidden="true"></div>
      </header>
      ${state.notice ? `<p class="status-message">${escapeHtml(state.notice)}</p>` : ""}

      <form class="name-form" id="name-form" novalidate>
        <label class="label" for="participant-name">Participant Name</label>
        <input
          class="text-input"
          id="participant-name"
          name="participantName"
          type="text"
          maxlength="40"
          autocomplete="name"
          placeholder="First Name Last Initial"
          required
          aria-describedby="name-error"
        />
        <div class="confirmation-actions confirmation-actions--tight">
          <button class="primary-btn" type="submit">Continue</button>
          <button class="secondary-btn" id="open-admin-btn" type="button">Admin Export</button>
        </div>
        <p class="error-text" id="name-error">${escapeHtml(errorMessage)}</p>
      </form>
    </main>
  `;

  const form = document.getElementById("name-form");
  const input = document.getElementById("participant-name");
  input.value = state.nameDraft;
  input.focus();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const cleanName = input.value.trim();
    state.nameDraft = cleanName;

    if (!cleanName) {
      renderNameStep("Please enter your name before continuing.");
      return;
    }

    if (!isValidParticipantName(cleanName)) {
      renderNameStep("Use format: First Name + Last Initial (example: Taylor M).");
      return;
    }

    state.name = cleanName;
    setNotice("");
    state.step = "raffle";
    render();
  });

  document.getElementById("open-admin-btn").addEventListener("click", async () => {
    await openAdminExportFlow((message) => {
      renderNameStep(message);
    });
  });
}

function renderRaffleStep() {
  const eventPhase = getEventPhase();
  const allocationsLocked = eventPhase !== "live";
  const remaining = getRemainingTickets();
  const totalAllocated = getTotalAllocated();
  const readyForReview = remaining === 0 && !allocationsLocked;

  const cardsMarkup = PRIZES.map((prize) => {
    const count = state.allocations[prize.id];
    const isFlipped = state.flippedPrizeId === prize.id;
    const includesItems = Array.isArray(prize.includes) ? prize.includes : [];
    const includesMarkup = includesItems.length
      ? includesItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
      : "<li>Details coming soon.</li>";
    const teaserText = escapeHtml(prize.teaser || prize.description || "Placeholder prize package.");

    return `
      <article class="prize-card ${isFlipped ? "is-flipped" : ""}" data-prize-card data-prize-id="${prize.id}">
        <div class="prize-card-inner">
          <section class="prize-face prize-face-front" aria-hidden="${isFlipped ? "true" : "false"}"${isFlipped ? " inert" : ""}>
            <div class="prize-front-content">
              <div class="prize-media">
                <img
                  class="prize-image"
                  src="${escapeHtml(prize.image || "")}"
                  alt="${escapeHtml(prize.imageAlt || `${prize.name} artwork`)}"
                  loading="lazy"
                  decoding="async"
                  onerror="this.classList.add('is-hidden'); this.setAttribute('aria-hidden', 'true');"
                />
                <span class="winner-count" aria-label="${Number(prize.winnerCount || 0)} ${Number(prize.winnerCount || 0) === 1 ? "winner" : "winners"}">${Number(prize.winnerCount || 0)} ${Number(prize.winnerCount || 0) === 1 ? "Winner" : "Winners"}</span>
              </div>
              <h2 class="prize-name">${escapeHtml(prize.name)}</h2>
              <p class="prize-teaser">${teaserText}</p>
            </div>
            <button
              class="secondary-btn prize-flip-btn"
              type="button"
              data-prize-view-includes="${prize.id}"
              aria-label="View included details for ${escapeHtml(prize.name)}"
              aria-expanded="${isFlipped ? "true" : "false"}"
            >
              View Details
            </button>
            ${allocationsLocked ? `
            <div class="ticket-controls ticket-controls--locked" aria-label="Token allocation locked for ${escapeHtml(prize.name)}">
              <span class="ticket-lock-badge">${eventPhase === "preview" ? "🔒 Opens Sept 16" : "🔒 Bidding Closed"}</span>
            </div>
            ` : `
            <div class="ticket-controls">
              <button
                class="ticket-btn"
                type="button"
                data-action="decrement"
                data-prize-id="${prize.id}"
                aria-label="Remove chip from ${escapeHtml(prize.name)}"
                ${count === 0 ? "disabled" : ""}
              >
                -
              </button>
              <span class="ticket-count" aria-label="${count} chips assigned">${count}</span>
              <button
                class="ticket-btn"
                type="button"
                data-action="increment"
                data-prize-id="${prize.id}"
                aria-label="Add chip to ${escapeHtml(prize.name)}"
                ${remaining === 0 ? "disabled" : ""}
              >
                +
              </button>
            </div>
            `}
          </section>

          <section class="prize-face prize-face-back" aria-hidden="${isFlipped ? "false" : "true"}"${isFlipped ? "" : " inert"}>
            <h2 class="prize-name">${escapeHtml(prize.name)}</h2>
            <h3 class="prize-includes-heading">Included in This Prize</h3>
            <div class="prize-back-content">
              <ul class="prize-includes-list" aria-label="Included items for ${escapeHtml(prize.name)}">
                ${includesMarkup}
              </ul>
            </div>
            <button
              class="secondary-btn prize-back-btn"
              type="button"
              data-prize-back="${prize.id}"
              aria-label="Back to ${escapeHtml(prize.name)} details"
            >
              Back to Prize
            </button>
          </section>
        </div>
      </article>
    `;
  }).join("");

  const timelineMarkup = EVENT_TIMELINE_ITEMS
    .map((item) => buildTimelineCardMarkup(item))
    .join("");
  const howItWorksMarkup = HOW_IT_WORKS_ITEMS
    .map((item) => buildHowStepCardMarkup(item))
    .join("");
  const rulesMarkup = buildImportantRulesAccordionMarkup();

  appRoot.innerHTML = `
    <main class="app-shell" aria-live="polite">
      <header class="participant-hero" aria-label="Raffle hero">
        <h1 class="visually-hidden">Raffle Royale</h1>
        <div class="participant-hero-logo-wrap" aria-hidden="true">
          <img
            class="app-hero-logo"
            src="assets/images/raffle-royale-logo.png"
            alt="Raffle Royale logo"
            loading="eager"
            decoding="async"
            onerror="this.classList.add('is-hidden'); this.setAttribute('aria-hidden', 'true');"
          />
        </div>
        ${getPilotBannerMarkup()}
        ${getEventPhaseBannerMarkup()}
        <p class="app-subtitle hero-intro">${allocationsLocked ? "Browse the prizes below and start planning your strategy." : `Allocate all ${TOTAL_TICKETS} chips before continuing to review.`}</p>
        <section class="ticket-summary chip-dashboard" aria-label="Chip summary">
          <div class="chip-dashboard-stats">
            <article class="ticket-summary-item">
              <p class="ticket-summary-label">Player</p>
              <p class="ticket-summary-value">${escapeHtml(state.name)}</p>
            </article>
            <article class="ticket-summary-item">
              <p class="ticket-summary-label">Chips Allocated</p>
              <p class="ticket-summary-value">${totalAllocated} / ${TOTAL_TICKETS}</p>
            </article>
            <article class="ticket-summary-item">
              <p class="ticket-summary-label">Chips Remaining</p>
              <p class="ticket-summary-value ${readyForReview ? "is-complete" : ""}">${remaining}</p>
            </article>
          </div>
          <div class="chip-progress" role="progressbar" aria-label="Chips allocated" aria-valuemin="0" aria-valuemax="${TOTAL_TICKETS}" aria-valuenow="${totalAllocated}">
            <div class="chip-progress-track">
              <div class="chip-progress-fill ${totalAllocated >= TOTAL_TICKETS ? "is-complete" : ""}" style="width: ${Math.min(100, Math.round((totalAllocated / TOTAL_TICKETS) * 100))}%"></div>
            </div>
          </div>
        </section>
        <div class="hero-divider" aria-hidden="true"></div>
      </header>
      ${state.notice ? `<p class="status-message">${escapeHtml(state.notice)}</p>` : ""}

      <section class="event-info" aria-labelledby="event-info-heading">
        <div class="event-hype" aria-labelledby="event-info-heading">
          <h2 class="event-hype-title" id="event-info-heading">Welcome to Raffle Royale</h2>
          <p class="event-hype-lead">Twenty chips. Twelve prizes. One strategy. How will you play?</p>
        </div>

        <div class="timeline-heading-row">
          <h2 class="timeline-heading">🛣️ Road to the Drawing</h2>
        </div>
        <section class="event-timeline" aria-label="Event timeline">
          ${timelineMarkup}
        </section>

        <section class="how-it-works" aria-labelledby="how-it-works-heading">
          <h2 class="how-it-works-title" id="how-it-works-heading">How Raffle Royale Works</h2>
          <div class="how-it-works-steps" role="list">
            ${howItWorksMarkup}
          </div>
          <div class="important-rules-wrap">
            ${rulesMarkup}
          </div>
        </section>
      </section>

      <section class="prize-intro" aria-label="Prize introduction">
        <div class="prize-intro-divider" aria-hidden="true">
          <span class="suit suit-spade">♠</span>
          <span class="suit suit-heart">♥</span>
          <span class="suit suit-diamond">♦</span>
          <span class="suit suit-club">♣</span>
        </div>
        <h2 class="prize-intro-title">👑 Meet the Prizes</h2>
        <p class="prize-intro-lead">Twelve ways to play. How will you spend your 20 chips?</p>
      </section>

      <section class="card-grid" aria-label="Prize chip allocation cards">
        ${cardsMarkup}
      </section>

      <div class="confirmation-actions submit-wrap">
        <button class="secondary-btn" id="back-to-name-btn" type="button">Edit Name</button>
        <button class="primary-btn" id="review-btn" type="button" ${readyForReview ? "" : "disabled"}>Review Choices</button>
      </div>
      <p class="error-text" id="allocation-error">
        ${allocationsLocked ? escapeHtml(getEventPhaseLockedMessage(eventPhase)) : readyForReview ? "" : `Allocate ${remaining} more chip${remaining === 1 ? "" : "s"} to continue.`}
      </p>
    </main>
  `;

  const controls = appRoot.querySelectorAll(".ticket-btn");
  controls.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const prizeId = button.getAttribute("data-prize-id");
      const action = button.getAttribute("data-action");

      if (!prizeId || !action) {
        return;
      }

      state.allocations = applyTicketAction(state.allocations, action, prizeId);

      render();
    });
  });

  const viewIncludesButtons = appRoot.querySelectorAll("[data-prize-view-includes]");
  viewIncludesButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const prizeId = button.getAttribute("data-prize-view-includes");
      togglePrizeCardFlip(prizeId);
      render();
    });
  });

  const backButtons = appRoot.querySelectorAll("[data-prize-back]");
  backButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      state.flippedPrizeId = "";
      render();
    });
  });

  const prizeCards = appRoot.querySelectorAll("[data-prize-card]");
  prizeCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      if (target.closest(".ticket-controls") || target.closest(".prize-flip-btn") || target.closest(".prize-back-btn")) {
        return;
      }

      togglePrizeCardFlip(card.getAttribute("data-prize-id"));
      render();
    });
  });

  const eventInfoRoot = appRoot.querySelector(".event-info");
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  document.removeEventListener("keydown", handleEventInfoEscapeKeydown);
  setOpenEventInfoPanel(state.openEventInfoPanelId);
  setImportantRulesOpen(state.isImportantRulesOpen);

  if (eventInfoRoot) {
    const triggerButtons = eventInfoRoot.querySelectorAll(".event-timeline [data-event-panel-trigger]");
    const closeButtons = eventInfoRoot.querySelectorAll("[data-event-panel-close]");
    const triggerItems = eventInfoRoot.querySelectorAll(".event-timeline [data-event-panel-item]");
    const rulesTriggerButton = eventInfoRoot.querySelector("[data-important-rules-trigger]");
    const rulesCloseButton = eventInfoRoot.querySelector("[data-important-rules-close]");

    triggerButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const panelId = button.getAttribute("data-event-panel-trigger") || "";
        const shouldClose = state.openEventInfoPanelId === panelId;
        setOpenEventInfoPanel(shouldClose ? "" : panelId);
      });

      button.addEventListener("keydown", (event) => {
        if (event.key !== " " && event.key !== "Enter") {
          return;
        }

        event.preventDefault();
        const panelId = button.getAttribute("data-event-panel-trigger") || "";
        const shouldClose = state.openEventInfoPanelId === panelId;
        setOpenEventInfoPanel(shouldClose ? "" : panelId);
      });
    });

    eventInfoRoot.addEventListener("focusin", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const trigger = target.closest(".event-timeline [data-event-panel-trigger]");
      if (!(trigger instanceof HTMLElement)) {
        return;
      }

      const panelId = trigger.getAttribute("data-event-panel-trigger") || "";

      if (state.suppressEventInfoFocusOpenForId === panelId) {
        state.suppressEventInfoFocusOpenForId = "";
        return;
      }

      setOpenEventInfoPanel(panelId);
    });

    if (supportsHover) {
      triggerButtons.forEach((button) => {
        button.addEventListener("mouseenter", () => {
          const panelId = button.getAttribute("data-event-panel-trigger") || "";
          button.setAttribute("data-open-source", "hover");
          setOpenEventInfoPanel(panelId);
        });
      });

      triggerItems.forEach((item) => {
        item.addEventListener("mouseleave", () => {
          const panelId = item.getAttribute("data-event-panel-item") || "";
          if (panelId !== state.openEventInfoPanelId) {
            return;
          }

          const trigger = item.querySelector("[data-event-panel-trigger]");
          const openedByHover = trigger?.getAttribute("data-open-source") === "hover";
          const activeElement = document.activeElement;
          const focusInside = activeElement instanceof Element ? item.contains(activeElement) : false;

          if (openedByHover && !focusInside) {
            setOpenEventInfoPanel("");
          }
        });
      });
    }

    closeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const panelId = button.getAttribute("data-event-panel-close") || "";
        setOpenEventInfoPanel("", { returnFocus: true, focusTriggerId: panelId });
      });
    });

    if (rulesTriggerButton instanceof HTMLElement) {
      rulesTriggerButton.addEventListener("click", () => {
        setImportantRulesOpen(!state.isImportantRulesOpen);
      });

      rulesTriggerButton.addEventListener("keydown", (event) => {
        if (event.key !== " " && event.key !== "Enter") {
          return;
        }

        event.preventDefault();
        setImportantRulesOpen(!state.isImportantRulesOpen);
      });
    }

    if (rulesCloseButton instanceof HTMLElement) {
      rulesCloseButton.addEventListener("click", () => {
        setImportantRulesOpen(false, { returnFocus: true });
      });
    }

    document.addEventListener("keydown", handleEventInfoEscapeKeydown);
  }

  document.getElementById("review-btn").addEventListener("click", () => {
    if (allocationsLocked || getTotalAllocated() !== TOTAL_TICKETS) {
      return;
    }

    state.step = "review";
    render();
  });

  document.getElementById("back-to-name-btn").addEventListener("click", () => {
    state.step = "name";
    state.nameDraft = state.name;
    render();
  });

  if (totalAllocated > TOTAL_TICKETS) {
    const overflow = totalAllocated - TOTAL_TICKETS;
    document.getElementById("allocation-error").textContent = `Too many chips assigned by ${overflow}. Reduce before continuing.`;
  }
}

function renderReviewStep(errorMessage = "") {
  const remaining = getRemainingTickets();
  const isComplete = remaining === 0;
  const selectedPrizes = getSelectedPrizeAllocations(state.allocations);
  const failureMetaText = errorMessage ? getSubmissionFailureMetaText() : "";
  const totalAllocated = getTotalAllocated();
  const hasSubmissionError = Boolean(errorMessage);

  const allocationRows = selectedPrizes.length
    ? selectedPrizes.map((item) => `
      <article class="review-prize-row" aria-label="${escapeHtml(item.prize.name)} allocation">
        <img
          class="review-prize-thumb"
          src="${escapeHtml(item.prize.image)}"
          alt="${escapeHtml(item.prize.imageAlt || item.prize.name)}"
          loading="lazy"
          decoding="async"
        />
        <div class="review-prize-content">
          <p class="review-prize-name">${escapeHtml(item.prize.name)}</p>
          <p class="review-prize-count"><span class="review-chip-badge"><span aria-hidden="true">🟡</span> ${escapeHtml(formatTicketCountLabel(item.count))}</span></p>
        </div>
      </article>
    `).join("")
    : `<p class="confirmation-note">No prize entries selected yet.</p>`;

  appRoot.innerHTML = `
    <main class="app-shell" aria-live="polite">
      <section class="confirmation confirmation--review">
        <img
          class="confirmation-logo"
          src="assets/images/raffle-royale-logo.png"
          alt="Raffle Royale logo"
          loading="eager"
          decoding="async"
          onerror="this.classList.add('is-hidden'); this.setAttribute('aria-hidden', 'true');"
        />
        <h1 class="confirmation-title">Review Your Entry</h1>
        ${getPilotBannerMarkup()}
        <p class="app-subtitle">Confirm your name and chip allocations before submitting.</p>

        <section class="submission-summary" aria-label="Review summary">
          <h2 class="submission-summary-title">Entry Summary</h2>
          <div class="submission-summary-grid">
            <article class="submission-summary-item">
              <p class="submission-summary-label">Participant</p>
              <p class="submission-summary-value">${escapeHtml(state.name)}</p>
            </article>
            <article class="submission-summary-item">
              <p class="submission-summary-label">Total Chips</p>
              <p class="submission-summary-value">${totalAllocated} / ${TOTAL_TICKETS}</p>
            </article>
            <article class="submission-summary-item">
              <p class="submission-summary-label">Selected Prizes</p>
              <p class="submission-summary-value">${selectedPrizes.length}</p>
            </article>
          </div>
        </section>

        <section class="confirmation-details review-selected-prizes" aria-label="Selected prizes">
          <h2 class="review-section-title">YOUR CHIP ALLOCATIONS</h2>
          <p class="review-section-subtitle">Review where your ${TOTAL_TICKETS} chips will be entered.</p>
          <div class="review-prize-list">
            ${allocationRows}
          </div>
        </section>

        ${hasSubmissionError ? `
          <section class="submission-error-panel" role="alert" aria-label="Submission error">
            <h2 class="submission-error-title">We Couldn't Submit Your Entry</h2>
            <p class="submission-error-copy">Your chip allocations are safe. Nothing has been lost.</p>
            <div class="submission-error-tech" aria-label="Technical details">
              <p class="error-text">${escapeHtml(errorMessage)}</p>
              ${failureMetaText ? `<p class="confirmation-note">${escapeHtml(failureMetaText)}</p>` : ""}
            </div>
          </section>
        ` : ""}

        ${!hasSubmissionError ? `<p class="error-text">${escapeHtml(isComplete ? "" : `Allocate ${remaining} more chips before submitting.`)}</p>` : ""}

        <div class="review-action-copy" aria-label="Submission guidance">
          <p class="review-action-prompt">Ready to lock in your chip allocations?</p>
          <p class="review-action-note">Once submitted, your chip allocations cannot be changed.</p>
        </div>

        <div class="confirmation-actions review-action-bar">
          <button class="secondary-btn" id="edit-allocation-btn" type="button">Edit Allocation</button>
          <button class="primary-btn ${state.isSubmitting ? "is-loading" : ""}" id="final-submit-btn" type="button" ${isComplete && !state.isSubmitting ? "" : "disabled"}>${state.isSubmitting ? "Submitting Your Entry…" : "Submit Entry"}</button>
        </div>
      </section>
    </main>
  `;

  document.getElementById("edit-allocation-btn").addEventListener("click", () => {
    state.step = "raffle";
    render();
  });

  document.getElementById("final-submit-btn").addEventListener("click", async () => {
    if (!isAllocationWindowOpen()) {
      state.step = "raffle";
      setNotice(getEventPhaseLockedMessage());
      render();
      return;
    }

    if (!beginSubmissionAttempt()) {
      return;
    }

    if (getTotalAllocated() !== TOTAL_TICKETS) {
      finishSubmissionAttempt();
      renderReviewStep("All chips must be allocated before submitting.");
      return;
    }

    renderReviewStep(errorMessage);

    const parsedName = parseParticipantName(state.name);

    const submission = {
      participantId: state.participantId,
      participantName: parsedName.participantName,
      firstName: parsedName.firstName,
      lastInitial: parsedName.lastInitial,
      name: state.name,
      allocations: { ...state.allocations },
      totalTickets: getTotalAllocated(),
      submittedAt: new Date().toISOString()
    };

    try {
      const result = await SubmissionService.submitEntry(submission);
      state.lastSubmission = result.entry;
      setParticipantCompletionLock({
        participantId: result.entry.participantId,
        participantName: result.entry.participantName,
        submissionId: result.entry.submissionId,
        submittedAt: result.entry.submittedAt
      });
      state.submissionFailureCount = 0;
      state.lastSubmissionFailureAt = "";
      finishSubmissionAttempt();
      setNotice("Entry submitted successfully.");
      state.step = "confirmation";
      render();
    } catch (error) {
      state.submissionFailureCount += 1;
      state.lastSubmissionFailureAt = new Date().toISOString();
      finishSubmissionAttempt();
      renderReviewStep(getSubmissionFailureMessage(error));
    }
  });
}

function renderConfirmationStep() {
  const submittedEntry = state.lastSubmission;
  const submittedName = submittedEntry ? getParticipantName(submittedEntry) : state.name;
  const allocationRows = PRIZES.map((prize) => {
    const count = submittedEntry ? getAllocationCount(submittedEntry, prize.id) : 0;
    return `<p>${escapeHtml(prize.name)}: <strong>${count}</strong></p>`;
  }).join("");

  appRoot.innerHTML = `
    <main class="app-shell" aria-live="polite">
      <section class="confirmation">
        <h1 class="confirmation-title">Entry Submitted</h1>
        ${getPilotBannerMarkup()}
        <p class="app-subtitle">Thanks, ${escapeHtml(submittedName)}. Your raffle chips were recorded.</p>
        ${state.notice ? `<p class="status-message">${escapeHtml(state.notice)}</p>` : ""}

        <div class="confirmation-details" aria-label="Submitted allocation summary">
          <p>Participant ID: <strong>${escapeHtml(submittedEntry?.participantId || state.participantId)}</strong></p>
          <p>Name: <strong>${escapeHtml(submittedName)}</strong></p>
          <p>Submission ID: <strong>${escapeHtml(submittedEntry?.submissionId || "")}</strong></p>
          <p>Submitted At: <strong>${escapeHtml(submittedEntry ? new Date(submittedEntry.submittedAt).toLocaleString() : "")}</strong></p>
          <p>Mode: <strong>${escapeHtml(submittedEntry?.mode || APP_MODE)}</strong></p>
          ${allocationRows}
        </div>

        <div class="confirmation-actions">
          <button class="secondary-btn" id="open-admin-btn" type="button">Admin Export</button>
          <button class="secondary-btn" id="new-entry-btn" type="button">Start New Entry</button>
        </div>
      </section>
    </main>
  `;

  document.getElementById("open-admin-btn").addEventListener("click", async () => {
    await openAdminExportFlow((message) => {
      setNotice(message);
      renderConfirmationStep();
    });
  });

  document.getElementById("new-entry-btn").addEventListener("click", () => {
    setNotice("");
    resetEntryState();
    state.step = "name";
    render();
  });
}

function renderAdminExportStep() {
  const submissions = state.adminUseLocalPilotData ? getSavedSubmissions() : state.adminSharedSubmissions;
  const standardCsv = buildAdminExportCsv(submissions);
  const ticketPoolCsv = buildTicketPoolCsv(submissions);
  const standardRows = buildAdminExportRows(submissions);
  const ticketPoolRows = buildTicketPoolRows(submissions);
  const prizeSummary = buildPrizeTicketSummary(submissions);
  const dashboardSummary = buildAdminDashboardSummary(submissions);
  const apiMode = SUBMISSION_CONFIG?.mode === "api" ? "api" : "local";
  const apiHealthStatusText = getApiHealthStatusText();
  const apiHealthHistoryMarkup = getApiHealthHistoryMarkup();
  const sessionStateText = state.adminAuthenticated
    ? `Signed in${state.adminSessionExpiresAt ? ` (expires ${new Date(state.adminSessionExpiresAt).toLocaleTimeString()})` : ""}`
    : "Not signed in";
  const dataSourceLabel = state.adminUseLocalPilotData ? "LOCAL PILOT DATA (TROUBLESHOOTING)" : "SHARED DATABASE";
  const loadingLabel = state.adminLoadingShared || state.adminAuthChecking || state.adminSigningIn
    ? "Loading shared submissions..."
    : "";
  const showSessionReauth = state.adminLoadErrorCode === "SESSION_MISSING_OR_EXPIRED";
  const showUnavailableMessage = state.adminLoadErrorCode === "ADMIN_SUBMISSIONS_UNAVAILABLE" || state.adminLoadErrorCode === "ADMIN_SESSION_UNAVAILABLE";
  const summaryMarkup = prizeSummary
    .map((item) => `<p>${escapeHtml(item.prizeName)} (${escapeHtml(item.prizeId)}): <strong>${item.totalTickets}</strong> tickets, <strong>${item.participantCount}</strong> participant${item.participantCount === 1 ? "" : "s"}</p>`)
    .join("");
  const submissionDetailMarkup = submissions.length
    ? submissions.map((entry) => {
      const name = getParticipantName(entry);
      const submittedAt = entry.submittedAt ? new Date(entry.submittedAt).toLocaleString() : "";
      return `
        <article class="saved-entry-card">
          <div class="saved-entry-header">
            <h3>${escapeHtml(name || "Unnamed Participant")}</h3>
            <span>${escapeHtml(entry.mode || APP_MODE)}</span>
          </div>
          <p>Participant ID: <strong>${escapeHtml(entry.participantId || "")}</strong></p>
          <p>Submission ID: <strong>${escapeHtml(entry.submissionId || entry.id || "")}</strong></p>
          <p>Submitted At: <strong>${escapeHtml(submittedAt)}</strong></p>
        </article>
      `;
    }).join("")
    : '<p class="confirmation-note">No submissions saved yet.</p>';

  appRoot.innerHTML = `
    <main class="app-shell" aria-live="polite">
      <section class="confirmation">
        <h1 class="confirmation-title">Export Submissions</h1>
        ${getPilotBannerMarkup()}
        <p class="app-subtitle">Admin-only export view for intake records after submissions close.</p>
        ${state.notice ? `<p class="status-message">${escapeHtml(state.notice)}</p>` : ""}
        ${loadingLabel ? `<p class="confirmation-note">${escapeHtml(loadingLabel)}</p>` : ""}
        ${state.adminLoadError ? `<p class="error-text">${escapeHtml(state.adminLoadError)}</p>` : ""}
        ${state.adminUseLocalPilotData ? '<p class="error-text">Using Local Pilot Data only. This data is browser-specific and incomplete compared with shared submissions.</p>' : ""}

        <section class="saved-entries-panel" aria-label="Export summary">
          <h2 class="saved-entries-title">Export Summary</h2>
          <div class="saved-entries-list">
            <article class="saved-entry-card">
              <div class="saved-entry-header">
                <h3>Organizer Session</h3>
                <span>${escapeHtml(sessionStateText)}</span>
              </div>
              <p>Current admin data source: <strong>${escapeHtml(dataSourceLabel)}</strong></p>
              <div class="confirmation-actions confirmation-actions--tight">
                <button class="secondary-btn" id="admin-refresh-shared-btn" type="button" ${state.adminLoadingShared || state.adminAuthChecking || state.adminSigningIn ? "disabled" : ""}>Reload Shared Submissions</button>
                ${showSessionReauth ? `<button class="secondary-btn" id="admin-sign-in-again-btn" type="button" ${state.adminSigningIn ? "disabled" : ""}>Sign In Again</button>` : ""}
                ${showUnavailableMessage ? '<button class="secondary-btn" id="admin-use-local-btn" type="button">Use Local Pilot Data</button>' : ""}
                ${state.adminUseLocalPilotData ? '<button class="secondary-btn" id="admin-return-shared-btn" type="button">Return to Shared Data</button>' : ""}
                <button class="secondary-btn" id="admin-logout-btn" type="button" ${state.adminSigningOut ? "disabled" : ""}>${state.adminSigningOut ? "Signing out..." : "Logout"}</button>
              </div>
            </article>
            <article class="saved-entry-card">
              <div class="saved-entry-header">
                <h3>Pilot Mode Status</h3>
                <span>${escapeHtml(getModeLabel())}</span>
              </div>
              <p>Submission transport mode: ${escapeHtml(apiMode.toUpperCase())}</p>
            </article>
            <article class="saved-entry-card">
              <div class="saved-entry-header">
                <h3>Totals</h3>
                <span>${dashboardSummary.totalSubmissions}</span>
              </div>
              <p>Total submissions: <strong>${dashboardSummary.totalSubmissions}</strong></p>
              <p>Total tickets entered: <strong>${dashboardSummary.totalTickets}</strong></p>
              <p>Standard CSV rows: <strong>${standardRows.length}</strong></p>
              <p>Ticket pool rows: <strong>${ticketPoolRows.length}</strong></p>
            </article>
            <article class="saved-entry-card">
              <div class="saved-entry-header">
                <h3>Total Tickets by Prize</h3>
                <span>${PRIZES.length}</span>
              </div>
              ${summaryMarkup}
            </article>
            <article class="saved-entry-card">
              <div class="saved-entry-header">
                <h3>API Readiness</h3>
                <span>${escapeHtml(apiMode.toUpperCase())}</span>
              </div>
              <p>${escapeHtml(apiHealthStatusText)}</p>
              <div class="confirmation-actions confirmation-actions--tight">
                <button class="secondary-btn" id="run-api-health-check-btn" type="button" ${state.isCheckingApiHealth ? "disabled" : ""}>
                  ${state.isCheckingApiHealth ? "Checking..." : "Run API Check"}
                </button>
              </div>
            </article>
            <article class="saved-entry-card">
              <div class="saved-entry-header">
                <h3>Recent API Checks</h3>
                <span>${state.apiHealthHistory.length}</span>
              </div>
              ${apiHealthHistoryMarkup}
            </article>
          </div>
        </section>

        <section class="export-panel" aria-label="Export CSV">
          <h2 class="saved-entries-title">Standard CSV Preview</h2>
          <p class="confirmation-note">Columns: mode, participantId, submissionId, submittedAt, participantName, firstName, lastInitial, prizeName, prizeId, ticketsAllocated</p>
          <textarea class="export-textarea" id="admin-export-textarea" readonly>${escapeHtml(standardCsv)}</textarea>
          <div class="confirmation-actions confirmation-actions--tight">
            <button class="secondary-btn" id="copy-admin-csv-btn" type="button">Copy Standard CSV</button>
            <button class="secondary-btn" id="download-admin-csv-btn" type="button">Download Standard CSV</button>
            <button class="secondary-btn" id="download-ticket-pool-csv-btn" type="button">Download Ticket Pool CSV</button>
            <button class="secondary-btn" id="clear-test-data-btn" type="button">${PILOT_MODE ? "Clear All Pilot Data" : "Clear All Local Data"}</button>
          </div>
        </section>

        <section class="saved-entries-panel" aria-label="Submission details">
          <h2 class="saved-entries-title">Submission Details</h2>
          <div class="saved-entries-list">${submissionDetailMarkup}</div>
        </section>

        <div class="confirmation-actions">
          <button class="secondary-btn" id="back-to-confirmation-btn" type="button">Back</button>
        </div>
      </section>
    </main>
  `;

  const refreshSharedButton = document.getElementById("admin-refresh-shared-btn");
  if (refreshSharedButton) {
    refreshSharedButton.addEventListener("click", async () => {
      const session = await checkAdminSessionStatus();
      if (!session.ok && session.code === "SESSION_MISSING_OR_EXPIRED") {
        renderAdminExportStep();
        return;
      }

      await loadSharedAdminSubmissions();
    });
  }

  const signInAgainButton = document.getElementById("admin-sign-in-again-btn");
  if (signInAgainButton) {
    signInAgainButton.addEventListener("click", async () => {
      await openAdminExportFlow();
    });
  }

  const useLocalButton = document.getElementById("admin-use-local-btn");
  if (useLocalButton) {
    useLocalButton.addEventListener("click", () => {
      state.adminUseLocalPilotData = true;
      setNotice("Using local pilot data for troubleshooting only.");
      renderAdminExportStep();
    });
  }

  const returnSharedButton = document.getElementById("admin-return-shared-btn");
  if (returnSharedButton) {
    returnSharedButton.addEventListener("click", async () => {
      state.adminUseLocalPilotData = false;
      setNotice("");
      await loadSharedAdminSubmissions();
    });
  }

  const logoutButton = document.getElementById("admin-logout-btn");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await signOutOrganizer();
    });
  }

  document.getElementById("copy-admin-csv-btn").addEventListener("click", async () => {
    try {
      await copyTextToClipboard(standardCsv);
      setNotice("Standard CSV copied.");
    } catch {
      setNotice("Copy failed. Use the text area to select and copy manually.");
    }
    renderAdminExportStep();
  });

  document.getElementById("download-admin-csv-btn").addEventListener("click", () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadTextFile(`raffle-submissions-standard-${timestamp}.csv`, standardCsv, "text/csv;charset=utf-8");
    setNotice("Standard CSV download started.");
    renderAdminExportStep();
  });

  document.getElementById("download-ticket-pool-csv-btn").addEventListener("click", () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadTextFile(`raffle-submissions-ticket-pool-${timestamp}.csv`, ticketPoolCsv, "text/csv;charset=utf-8");
    setNotice("Ticket pool CSV download started.");
    renderAdminExportStep();
  });

  document.getElementById("clear-test-data-btn").addEventListener("click", () => {
    if (!confirmClearAllPilotData()) {
      return;
    }

    clearSavedSubmissions();
    clearSavedApiHealthHistory();
    clearParticipantCompletionLock();
    state.participantId = resetParticipantId();
    resetEntryState();
    state.lastApiHealthCheck = null;
    state.apiHealthHistory = [];
    setNotice(PILOT_MODE ? "All pilot data cleared." : "All local data cleared.");
    renderAdminExportStep();
  });

  document.getElementById("run-api-health-check-btn").addEventListener("click", async () => {
    state.isCheckingApiHealth = true;
    renderAdminExportStep();

    try {
      const result = await SubmissionService.checkHealth();
      state.lastApiHealthCheck = {
        ...result,
        checkedAt: new Date().toISOString()
      };
      recordApiHealthResult(state.lastApiHealthCheck);

      if (result.ok) {
        setNotice("API health check passed.");
      } else {
        setNotice("API health check reported an issue.");
      }
    } catch {
      state.lastApiHealthCheck = {
        ok: false,
        message: "API health check failed unexpectedly.",
        checkedAt: new Date().toISOString()
      };
      recordApiHealthResult(state.lastApiHealthCheck);
      setNotice("API health check failed unexpectedly.");
    }

    state.isCheckingApiHealth = false;
    renderAdminExportStep();
  });

  document.getElementById("back-to-confirmation-btn").addEventListener("click", () => {
    setNotice("");
    state.step = state.lastSubmission ? "confirmation" : "name";
    render();
  });
}

function render() {
  if (state.step !== "adminExport" && hasParticipantCompletionLock()) {
    renderParticipantCompletedStep();
    return;
  }

  if (state.step === "name") {
    renderNameStep();
    return;
  }

  if (state.step === "raffle") {
    renderRaffleStep();
    return;
  }

  if (state.step === "review") {
    renderReviewStep();
    return;
  }

  if (state.step === "adminExport") {
    renderAdminExportStep();
    return;
  }

  renderConfirmationStep();
}

window.RaffleRoyaleAppTestHooks = {
  PILOT_MODE,
  APP_MODE,
  isValidParticipantName,
  parseParticipantName,
  applyTicketAction,
  buildAdminExportRows,
  buildAdminExportCsv,
  buildTicketPoolRows,
  buildTicketPoolCsv,
  buildPrizeTicketSummary,
  buildAdminDashboardSummary,
  hasParticipantCompletionLock,
  setParticipantCompletionLock,
  clearParticipantCompletionLock,
  getModeLabel,
  confirmResetBrowserForTesting,
  confirmClearAllPilotData,
  beginSubmissionAttempt,
  finishSubmissionAttempt,
  getEventPhase,
  isAllocationWindowOpen,
  getEventPhaseLockedMessage,
  getIsSubmitting: () => state.isSubmitting,
  getParticipantId: () => state.participantId,
  setParticipantIdForTests: (id) => {
    state.participantId = id;
  }
};

render();

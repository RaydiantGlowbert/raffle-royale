const SubmissionService = {
  async submitEntry(entry) {
    const participantId = entry.participantId || getOrCreateParticipantId();
    const normalizedEntry = normalizeSubmissionEntry(entry);
    normalizedEntry.participantId = participantId;
    normalizedEntry.mode = APP_MODE;
    normalizedEntry.rawAllocationKeys = Object.keys(entry.allocations || {});

    validateSubmissionEntry(normalizedEntry, getSavedSubmissions());
    delete normalizedEntry.rawAllocationKeys;

    const storageMode = SUBMISSION_CONFIG?.storageMode === "local" ? "local" : "database";

    if (storageMode === "database") {
      await submitToApi(normalizedEntry);
      if (SUBMISSION_CONFIG?.mirrorLocalStorageOnSuccess) {
        saveSubmission(normalizedEntry);
      }
      console.log("[SubmissionService] Saved entry (database)", normalizedEntry);
    } else {
      saveSubmission(normalizedEntry);
      console.log("[SubmissionService] Saved entry (local)", normalizedEntry);
    }

    return {
      ok: true,
      entry: normalizedEntry
    };
  },

  async checkHealth() {
    const mode = SUBMISSION_CONFIG?.mode === "api" ? "api" : "local";
    if (mode !== "api") {
      return {
        ok: true,
        mode,
        message: "Local mode active. No external API health check required."
      };
    }

    const endpoint = String(SUBMISSION_CONFIG?.apiHealthEndpoint || SUBMISSION_CONFIG?.apiEndpoint || "").trim();
    if (!endpoint) {
      return {
        ok: false,
        mode,
        code: "API_ENDPOINT_MISSING",
        message: "API mode is enabled but no apiEndpoint/apiHealthEndpoint is configured."
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        return {
          ok: false,
          mode,
          code: "API_HTTP_ERROR",
          status: response.status,
          message: `Health check failed with status ${response.status}.`
        };
      }

      return {
        ok: true,
        mode,
        status: response.status,
        message: "API health check passed."
      };
    } catch {
      return {
        ok: false,
        mode,
        code: "API_NETWORK_ERROR",
        message: "Could not reach the API health endpoint."
      };
    }
  }
};

function normalizeSubmissionEntry(entry) {
  const submissionId = entry.submissionId || createSubmissionId();
  const submittedAt = entry.submittedAt || new Date().toISOString();
  const allocations = buildNormalizedAllocations(entry.allocations || {});
  const normalizedParticipant = normalizeParticipantFields(entry);
  const totalTickets = Number.isFinite(entry.totalTickets)
    ? Number(entry.totalTickets)
    : sumAllocationCounts(allocations);

  return {
    ...entry,
    participantName: normalizedParticipant.participantName,
    firstName: normalizedParticipant.firstName,
    lastInitial: normalizedParticipant.lastInitial,
    id: submissionId,
    submissionId,
    submittedAt,
    allocations,
    totalTickets,
    mode: entry.mode || APP_MODE,
    participantId: entry.participantId || getOrCreateParticipantId(),
    eventId: entry.eventId || SUBMISSION_CONFIG?.eventId || "",
    sourceAppVersion: entry.sourceAppVersion || SUBMISSION_CONFIG?.sourceAppVersion || "v1"
  };
}

function validateSubmissionEntry(entry, existingSubmissions) {
  const issues = [];
  const prizeIds = new Set(PRIZES.map((prize) => prize.id));
  const nameIsValid = /^[A-Za-z]+(?:[\-'][A-Za-z]+)?\s+[A-Za-z]\.?$/.test(String(entry.participantName || "").trim());

  if (!nameIsValid) {
    issues.push("Participant name format is invalid.");
  }

  if (!entry.submissionId) {
    issues.push("Submission ID is missing.");
  }

  if (!entry.participantId) {
    issues.push("Participant ID is missing.");
  }

  const allocationKeys = Object.keys(entry.allocations || {});
  const rawAllocationKeys = Array.isArray(entry.rawAllocationKeys) ? entry.rawAllocationKeys : allocationKeys;
  if (rawAllocationKeys.some((id) => !prizeIds.has(id))) {
    issues.push("Submission contains unknown prize IDs.");
  }

  allocationKeys.forEach((id) => {
    const value = Number(entry.allocations[id]);
    if (!Number.isFinite(value) || value < 0) {
      issues.push(`Allocation for ${id} must be a non-negative number.`);
      return;
    }

    if (!Number.isInteger(value)) {
      issues.push(`Allocation for ${id} must be a whole number.`);
    }
  });

  const totalFromAllocations = allocationKeys.reduce((sum, id) => sum + Number(entry.allocations[id] || 0), 0);
  if (totalFromAllocations !== TOTAL_TICKETS || Number(entry.totalTickets) !== TOTAL_TICKETS) {
    issues.push(`Total ticket allocation must equal ${TOTAL_TICKETS}.`);
  }

  const duplicateSubmission = (existingSubmissions || []).some((saved) => {
    return (saved.submissionId || saved.id) === entry.submissionId;
  });

  if (duplicateSubmission) {
    issues.push("Submission ID already exists.");
  }

  if (issues.length) {
    console.error("[SubmissionService] Validation failed", {
      submissionId: entry.submissionId,
      participantId: entry.participantId,
      issues
    });

    throw buildSubmissionError(
      "VALIDATION_ERROR",
      "Your entry could not be submitted. Please review your information and try again.",
      { issues }
    );
  }
}

function normalizeParticipantFields(entry) {
  const rawName = String(entry.participantName || entry.name || "").trim().replace(/\s+/g, " ");
  const candidateFirst = String(entry.firstName || "").trim();
  const candidateInitial = String(entry.lastInitial || "").replace(/\./g, "").charAt(0).toUpperCase();

  if (candidateFirst && candidateInitial) {
    return {
      participantName: `${candidateFirst} ${candidateInitial}`,
      firstName: candidateFirst,
      lastInitial: candidateInitial
    };
  }

  const [firstName = "", lastInitialRaw = ""] = rawName.split(" ");
  const lastInitial = String(lastInitialRaw || "").replace(/\./g, "").charAt(0).toUpperCase();

  return {
    participantName: `${firstName} ${lastInitial}`.trim(),
    firstName,
    lastInitial
  };
}

function buildNormalizedAllocations(rawAllocations) {
  return Object.fromEntries(
    PRIZES.map((prize) => [prize.id, Number(rawAllocations[prize.id] || 0)])
  );
}

function sumAllocationCounts(allocations) {
  return Object.values(allocations).reduce((sum, count) => sum + Number(count || 0), 0);
}

async function submitToApi(entry) {
  const endpoint = String(SUBMISSION_CONFIG?.apiEndpoint || "/api/submissions").trim();

  if (!endpoint) {
    throw buildSubmissionError("API_ENDPOINT_MISSING", "Submission mode is api but apiEndpoint is empty.");
  }

  const payload = {
    participantId: entry.participantId || "",
    submissionId: entry.submissionId,
    submittedAt: entry.submittedAt,
    participantName: entry.participantName || entry.name || "",
    firstName: entry.firstName || "",
    lastInitial: entry.lastInitial || "",
    mode: entry.mode || APP_MODE,
    totalTickets: entry.totalTickets,
    allocations: { ...entry.allocations },
    eventId: entry.eventId,
    sourceAppVersion: entry.sourceAppVersion
  };

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch {
    throw buildSubmissionError("API_NETWORK_ERROR", "Could not reach submission API endpoint.");
  }

  if (!response.ok) {
    let responseBody = null;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }

    throw buildSubmissionError(
      "API_HTTP_ERROR",
      `Submission API request failed (${response.status}).`,
      {
        status: response.status,
        responseBody
      }
    );
  }
}

function buildSubmissionError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function createSubmissionId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `entry-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

window.RaffleRoyaleSubmissionTestHooks = {
  normalizeSubmissionEntry,
  buildNormalizedAllocations,
  sumAllocationCounts,
  validateSubmissionEntry
};

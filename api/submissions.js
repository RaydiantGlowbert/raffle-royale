import { getSqlClient } from "./_db.js";

const NAME_FORMAT = /^[A-Za-z]+(?:[\-'][A-Za-z]+)?\s+[A-Za-z]\.?$/;
const ALLOWED_MODES = new Set(["pilot", "live"]);
const EXPECTED_PRIZE_IDS = ["p1", "p2", "p3", "p4", "p5"];
const EXPECTED_TOTAL_TICKETS = 20;

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function parseRequestBody(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "Missing submission payload." };
  }

  const submissionId = String(body.submissionId || "").trim();
  const participantId = String(body.participantId || "").trim();
  const participantName = String(body.participantName || "").trim();
  const firstName = String(body.firstName || "").trim();
  const lastInitial = String(body.lastInitial || "").replace(/\./g, "").trim().charAt(0).toUpperCase();
  const mode = String(body.mode || "").trim();
  const eventId = String(body.eventId || "raffle-royale-2026").trim();
  const sourceAppVersion = String(body.sourceAppVersion || "v1").trim();
  const allocations = body.allocations || {};
  const submittedAtClient = body.submittedAt ? String(body.submittedAt) : null;

  if (!submissionId || !participantId || !participantName || !firstName || !lastInitial) {
    return { ok: false, message: "Required submission fields are missing." };
  }

  if (!NAME_FORMAT.test(participantName)) {
    return { ok: false, message: "Participant name format is invalid." };
  }

  if (!ALLOWED_MODES.has(mode)) {
    return { ok: false, message: "Mode is invalid." };
  }

  const rawAllocationKeys = Object.keys(allocations);
  if (rawAllocationKeys.some((key) => !EXPECTED_PRIZE_IDS.includes(key))) {
    return { ok: false, message: "Submission contains unknown prize IDs." };
  }

  const normalizedAllocations = Object.fromEntries(
    EXPECTED_PRIZE_IDS.map((id) => [id, Number(allocations[id] || 0)])
  );

  for (const [prizeId, value] of Object.entries(normalizedAllocations)) {
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      return { ok: false, message: `Allocation for ${prizeId} must be a non-negative whole number.` };
    }
  }

  const totalFromAllocations = Object.values(normalizedAllocations).reduce((sum, value) => sum + value, 0);
  const totalTickets = Number(body.totalTickets);

  if (totalFromAllocations !== EXPECTED_TOTAL_TICKETS || totalTickets !== EXPECTED_TOTAL_TICKETS) {
    return { ok: false, message: `Total ticket allocation must equal ${EXPECTED_TOTAL_TICKETS}.` };
  }

  return {
    ok: true,
    payload: {
      submissionId,
      participantId,
      participantName,
      firstName,
      lastInitial,
      mode,
      eventId,
      sourceAppVersion,
      totalTickets,
      allocations: normalizedAllocations,
      submittedAtClient
    }
  };
}

export async function POST(request) {
  const sql = getSqlClient();
  if (!sql) {
    return jsonResponse(500, {
      ok: false,
      code: "DB_NOT_CONFIGURED",
      message: "Database is not configured."
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, {
      ok: false,
      code: "INVALID_JSON",
      message: "Request body must be valid JSON."
    });
  }

  const parsed = parseRequestBody(body);
  if (!parsed.ok) {
    return jsonResponse(422, {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.message
    });
  }

  const input = parsed.payload;

  try {
    const inserted = await sql`
      insert into submissions (
        submission_id,
        event_id,
        participant_id,
        participant_name,
        first_name,
        last_initial,
        mode,
        total_tickets,
        p1_tickets,
        p2_tickets,
        p3_tickets,
        p4_tickets,
        p5_tickets,
        submitted_at_client
      )
      values (
        ${input.submissionId},
        ${input.eventId},
        ${input.participantId},
        ${input.participantName},
        ${input.firstName},
        ${input.lastInitial},
        ${input.mode},
        ${input.totalTickets},
        ${input.allocations.p1},
        ${input.allocations.p2},
        ${input.allocations.p3},
        ${input.allocations.p4},
        ${input.allocations.p5},
        ${input.submittedAtClient}
      )
      returning submission_id, event_id, participant_id, submitted_at
    `;

    const row = inserted[0] || {};

    return jsonResponse(201, {
      ok: true,
      entry: {
        submissionId: row.submission_id || input.submissionId,
        eventId: row.event_id || input.eventId,
        participantId: row.participant_id || input.participantId,
        submittedAt: row.submitted_at || new Date().toISOString()
      }
    });
  } catch (error) {
    if (error && error.code === "23505") {
      return jsonResponse(409, {
        ok: false,
        code: "DUPLICATE_SUBMISSION",
        message: "Submission already exists for this event or submission ID."
      });
    }

    if (error && error.code === "23514") {
      return jsonResponse(422, {
        ok: false,
        code: "VALIDATION_ERROR",
        message: "Submission failed database validation checks."
      });
    }

    return jsonResponse(500, {
      ok: false,
      code: "DB_WRITE_FAILED",
      message: "Submission could not be saved."
    });
  }
}

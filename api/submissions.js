import { getSqlClient } from "./_db.js";
import { getAllowedPrizeIds, normalizeAndValidateAllocations } from "./_prizeValidation.js";
import { getEventPhase } from "./_eventWindow.js";

const NAME_FORMAT = /^[A-Za-z]+(?:[\-'][A-Za-z]+)?\s+[A-Za-z]+(?:[\-'][A-Za-z]+)?\.?$/;
const ALLOWED_MODES = new Set(["pilot", "live"]);
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

function parseRequestBody(body, allowedPrizeIds) {
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

  const allocationValidation = normalizeAndValidateAllocations(allocations, {
    allowedPrizeIds,
    expectedTotalTickets: EXPECTED_TOTAL_TICKETS
  });

  if (!allocationValidation.ok) {
    return { ok: false, message: allocationValidation.message };
  }

  const totalTickets = Number(body.totalTickets);
  if (totalTickets !== EXPECTED_TOTAL_TICKETS) {
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
      totalTickets,
      allocations: allocationValidation.normalized,
      nonZeroAllocations: allocationValidation.nonZeroEntries,
      submittedAtClient
    }
  };
}

export async function POST(request) {
  const eventPhase = getEventPhase();
  if (eventPhase !== "live") {
    const message = eventPhase === "preview"
      ? "Token allocation opens September 16, 2026."
      : "Bidding closed September 23, 2026. Winners will be announced at SuperTeam on October 6.";

    return jsonResponse(403, {
      ok: false,
      code: "RAFFLE_NOT_LIVE",
      message
    });
  }

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

  const allowedPrizeIds = getAllowedPrizeIds();
  const parsed = parseRequestBody(body, allowedPrizeIds);
  if (!parsed.ok) {
    return jsonResponse(422, {
      ok: false,
      code: "VALIDATION_ERROR",
      message: parsed.message
    });
  }

  const input = parsed.payload;
  const legacyP1Tickets = Number(input.allocations.p1 || 0);
  const legacyP2Tickets = Number(input.allocations.p2 || 0);
  const legacyP3Tickets = Number(input.allocations.p3 || 0);
  const legacyP4Tickets = Number(input.allocations.p4 || 0);
  const legacyP5Tickets = Number(input.allocations.p5 || 0);

  try {
    const [inserted] = await sql.transaction((txn) => {
      const queries = [
        txn`
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
            ${legacyP1Tickets},
            ${legacyP2Tickets},
            ${legacyP3Tickets},
            ${legacyP4Tickets},
            ${legacyP5Tickets},
            ${input.submittedAtClient}
          )
          returning submission_id, event_id, participant_id, submitted_at
        `
      ];

      input.nonZeroAllocations.forEach((item) => {
        queries.push(
          txn`
            insert into submission_allocations (
              submission_id,
              prize_id,
              tickets_allocated
            )
            values (
              ${input.submissionId},
              ${item.prizeId},
              ${item.ticketsAllocated}
            )
          `
        );
      });

      return queries;
    });

    const row = inserted?.[0] || {};

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
        code: "DB_CONSTRAINT_ERROR",
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

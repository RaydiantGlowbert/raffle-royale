import { getSqlClient } from "../_db.js";
import { readSessionFromRequest } from "../_adminAuth.js";
import { getAllowedPrizeIds, rebuildAllocationsObject } from "../_prizeValidation.js";

const DEFAULT_EVENT_ID = "raffle-royale-2026";

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function getRaffleEventId() {
  const configured = String(process.env.RAFFLE_EVENT_ID || "").trim();
  return configured || DEFAULT_EVENT_ID;
}

function normalizeRow(row, allowedPrizeIds) {
  const allocationRows = Array.isArray(row.allocations_json) ? row.allocations_json : [];

  return {
    submissionId: row.submission_id,
    id: row.submission_id,
    eventId: row.event_id,
    participantId: row.participant_id,
    participantName: row.participant_name,
    firstName: row.first_name,
    lastInitial: row.last_initial,
    mode: row.mode,
    totalTickets: Number(row.total_tickets),
    allocations: rebuildAllocationsObject(allocationRows, allowedPrizeIds),
    submittedAt: new Date(row.submitted_at).toISOString()
  };
}

export async function GET(request) {
  const session = readSessionFromRequest(request);
  if (!session.ok) {
    const status = session.code === "SESSION_CONFIG_ERROR" ? 500 : 401;
    return jsonResponse(status, {
      ok: false,
      code: session.code,
      message: session.message
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

  const eventId = getRaffleEventId();
  const allowedPrizeIds = getAllowedPrizeIds();

  try {
    const rows = await sql`
      select
        s.submission_id,
        s.event_id,
        s.participant_id,
        s.participant_name,
        s.first_name,
        s.last_initial,
        s.mode,
        s.total_tickets,
        coalesce(
          json_agg(
            json_build_object(
              'prize_id', sa.prize_id,
              'tickets_allocated', sa.tickets_allocated
            )
          ) filter (where sa.id is not null),
          '[]'::json
        ) as allocations_json,
        s.submitted_at
      from submissions s
      left join submission_allocations sa
        on sa.submission_id = s.submission_id
      where s.event_id = ${eventId}
      group by
        s.submission_id,
        s.event_id,
        s.participant_id,
        s.participant_name,
        s.first_name,
        s.last_initial,
        s.mode,
        s.total_tickets,
        s.submitted_at
      order by s.submitted_at desc
    `;

    const entries = rows.map((row) => normalizeRow(row, allowedPrizeIds));

    return jsonResponse(200, {
      ok: true,
      source: "database",
      count: entries.length,
      entries
    });
  } catch {
    return jsonResponse(503, {
      ok: false,
      code: "ADMIN_SUBMISSIONS_UNAVAILABLE",
      message: "Shared submissions could not be loaded right now."
    });
  }
}

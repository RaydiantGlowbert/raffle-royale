import { getSqlClient } from "../_db.js";
import { readSessionFromRequest } from "../_adminAuth.js";

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

function normalizeRow(row) {
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
    allocations: {
      p1: Number(row.p1_tickets || 0),
      p2: Number(row.p2_tickets || 0),
      p3: Number(row.p3_tickets || 0),
      p4: Number(row.p4_tickets || 0),
      p5: Number(row.p5_tickets || 0)
    },
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

  try {
    const rows = await sql`
      select
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
        submitted_at
      from submissions
      where event_id = ${eventId}
      order by submitted_at desc
    `;

    const entries = rows.map(normalizeRow);

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

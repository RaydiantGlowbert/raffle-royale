import { getSqlClient } from "./_db.js";

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

export async function GET() {
  const sql = getSqlClient();
  if (!sql) {
    return jsonResponse(500, {
      ok: false,
      database: "disconnected",
      timestamp: new Date().toISOString()
    });
  }

  try {
    const rows = await sql`select now() as server_time`;

    return jsonResponse(200, {
      ok: true,
      database: "connected",
      timestamp: rows[0]?.server_time || new Date().toISOString()
    });
  } catch {
    return jsonResponse(503, {
      ok: false,
      database: "disconnected",
      timestamp: new Date().toISOString()
    });
  }
}

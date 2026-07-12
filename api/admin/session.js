import {
  clearSessionCookieHeader,
  createSessionCookieHeader,
  getOrganizerAccessCode,
  readSessionFromRequest
} from "../_adminAuth.js";

function jsonResponse(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders
    }
  });
}

export async function POST(request) {
  const organizerCode = getOrganizerAccessCode();
  if (!organizerCode) {
    return jsonResponse(500, {
      ok: false,
      code: "SESSION_CONFIG_ERROR",
      message: "Organizer session is not configured."
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, {
      ok: false,
      code: "INVALID_REQUEST",
      message: "Code is required."
    });
  }

  const code = String(body?.code || "").trim();
  if (!code) {
    return jsonResponse(400, {
      ok: false,
      code: "INVALID_REQUEST",
      message: "Code is required."
    });
  }

  if (code !== organizerCode) {
    return jsonResponse(401, {
      ok: false,
      code: "INVALID_CODE",
      message: "Organizer code is incorrect."
    });
  }

  const cookie = createSessionCookieHeader(request);
  if (!cookie) {
    return jsonResponse(500, {
      ok: false,
      code: "SESSION_CONFIG_ERROR",
      message: "Organizer session is not configured."
    });
  }

  return jsonResponse(
    200,
    {
      ok: true,
      authenticated: true,
      expiresAt: cookie.expiresAt
    },
    {
      "set-cookie": cookie.headerValue
    }
  );
}

export async function GET(request) {
  const session = readSessionFromRequest(request);
  if (!session.ok) {
    const status = session.code === "SESSION_CONFIG_ERROR" ? 500 : 401;
    return jsonResponse(status, {
      ok: false,
      authenticated: false,
      code: session.code,
      message: session.message
    });
  }

  return jsonResponse(200, {
    ok: true,
    authenticated: true,
    expiresAt: session.expiresAt
  });
}

export async function DELETE(request) {
  return jsonResponse(
    200,
    {
      ok: true,
      authenticated: false
    },
    {
      "set-cookie": clearSessionCookieHeader(request)
    }
  );
}

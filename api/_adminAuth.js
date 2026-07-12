import crypto from "node:crypto";

const SESSION_COOKIE_NAME = "rr_admin_session";
const DEFAULT_SESSION_TTL_SECONDS = 7200;

function base64UrlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input) {
  const normalized = String(input || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padLength = normalized.length % 4;
  const padded = padLength ? `${normalized}${"=".repeat(4 - padLength)}` : normalized;
  return Buffer.from(padded, "base64").toString("utf8");
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const eqIndex = part.indexOf("=");
      if (eqIndex <= 0) {
        return acc;
      }

      const key = part.slice(0, eqIndex).trim();
      const value = part.slice(eqIndex + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

function getSessionSecret() {
  return String(process.env.ORGANIZER_SESSION_SECRET || "").trim();
}

function getOrganizerAccessCode() {
  return String(process.env.ORGANIZER_ACCESS_CODE || "").trim();
}

function getSessionTtlSeconds() {
  const raw = Number(process.env.ORGANIZER_SESSION_TTL_SECONDS);
  if (Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw);
  }

  return DEFAULT_SESSION_TTL_SECONDS;
}

function signPayload(payloadBase64) {
  const secret = getSessionSecret();
  if (!secret) {
    return "";
  }

  return base64UrlEncode(
    crypto
      .createHmac("sha256", secret)
      .update(payloadBase64)
      .digest()
  );
}

function secureCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionToken(now = Date.now()) {
  const ttlSeconds = getSessionTtlSeconds();
  const expiresAtEpochMs = now + ttlSeconds * 1000;

  const payload = {
    role: "organizer",
    iat: now,
    exp: expiresAtEpochMs
  };

  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadBase64);

  if (!signature) {
    return null;
  }

  return {
    token: `${payloadBase64}.${signature}`,
    expiresAtEpochMs,
    ttlSeconds
  };
}

function readSessionFromRequest(request, now = Date.now()) {
  const secret = getSessionSecret();
  if (!secret) {
    return {
      ok: false,
      code: "SESSION_CONFIG_ERROR",
      message: "Organizer session is not configured."
    };
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];

  if (!token || !token.includes(".")) {
    return {
      ok: false,
      code: "SESSION_MISSING_OR_EXPIRED",
      message: "Organizer session is missing or expired."
    };
  }

  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) {
    return {
      ok: false,
      code: "SESSION_MISSING_OR_EXPIRED",
      message: "Organizer session is missing or expired."
    };
  }

  const expectedSignature = signPayload(payloadBase64);
  if (!expectedSignature || !secureCompare(expectedSignature, signature)) {
    return {
      ok: false,
      code: "SESSION_MISSING_OR_EXPIRED",
      message: "Organizer session is missing or expired."
    };
  }

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadBase64));
  } catch {
    return {
      ok: false,
      code: "SESSION_MISSING_OR_EXPIRED",
      message: "Organizer session is missing or expired."
    };
  }

  if (!payload || payload.role !== "organizer" || !Number.isFinite(payload.exp) || payload.exp <= now) {
    return {
      ok: false,
      code: "SESSION_MISSING_OR_EXPIRED",
      message: "Organizer session is missing or expired."
    };
  }

  return {
    ok: true,
    expiresAt: new Date(payload.exp).toISOString()
  };
}

function isSecureRequest(request) {
  const forwardedProto = String(request.headers.get("x-forwarded-proto") || "").toLowerCase();
  if (forwardedProto === "https") {
    return true;
  }

  return process.env.NODE_ENV === "production";
}

function buildCookieParts(value, maxAgeSeconds, request) {
  const parts = [
    `${SESSION_COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAgeSeconds}`
  ];

  if (isSecureRequest(request)) {
    parts.push("Secure");
  }

  return parts;
}

function createSessionCookieHeader(request) {
  const signed = createSessionToken();
  if (!signed) {
    return null;
  }

  return {
    headerValue: buildCookieParts(signed.token, signed.ttlSeconds, request).join("; "),
    expiresAt: new Date(signed.expiresAtEpochMs).toISOString()
  };
}

function clearSessionCookieHeader(request) {
  return buildCookieParts("", 0, request).join("; ");
}

export {
  SESSION_COOKIE_NAME,
  DEFAULT_SESSION_TTL_SECONDS,
  getOrganizerAccessCode,
  getSessionTtlSeconds,
  createSessionCookieHeader,
  clearSessionCookieHeader,
  readSessionFromRequest
};

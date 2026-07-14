const DEFAULT_PRIZE_IDS = [
  "royal-flush-retreat",
  "vegas-main-character",
  "high-roller-time-bank",
  "mentor-mvp-pack",
  "double-down-development",
  "brew-crew-casey",
  "good-fortune-giveaway",
  "wise-mentor-collection",
  "casino-royale-collection",
  "purr-fect-companion-pack",
  "top-dog-pack"
];
const DEFAULT_TOTAL_TICKETS = 20;

export function getAllowedPrizeIds() {
  const raw = String(process.env.RAFFLE_PRIZE_IDS || "").trim();
  if (!raw) {
    return [...DEFAULT_PRIZE_IDS];
  }

  const parsed = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const deduped = [...new Set(parsed)];
  return deduped.length ? deduped : [...DEFAULT_PRIZE_IDS];
}

export function normalizeAndValidateAllocations(rawAllocations, options = {}) {
  const allowedPrizeIds = Array.isArray(options.allowedPrizeIds)
    ? options.allowedPrizeIds
    : getAllowedPrizeIds();
  const expectedTotalTickets = Number.isFinite(options.expectedTotalTickets)
    ? Number(options.expectedTotalTickets)
    : DEFAULT_TOTAL_TICKETS;

  const candidate = rawAllocations && typeof rawAllocations === "object" ? rawAllocations : {};
  const rawKeys = Object.keys(candidate);

  if (rawKeys.some((id) => !allowedPrizeIds.includes(id))) {
    return {
      ok: false,
      message: "Submission contains unknown prize IDs."
    };
  }

  const normalized = {};

  for (const prizeId of allowedPrizeIds) {
    const value = Number(candidate[prizeId] || 0);

    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      return {
        ok: false,
        message: `Allocation for ${prizeId} must be a non-negative whole number.`
      };
    }

    normalized[prizeId] = value;
  }

  const totalAllocated = Object.values(normalized).reduce((sum, value) => sum + value, 0);
  if (totalAllocated !== expectedTotalTickets) {
    return {
      ok: false,
      message: `Total ticket allocation must equal ${expectedTotalTickets}.`
    };
  }

  return {
    ok: true,
    allowedPrizeIds,
    normalized,
    totalAllocated,
    nonZeroEntries: Object.entries(normalized)
      .filter(([, value]) => value > 0)
      .map(([prizeId, ticketsAllocated]) => ({ prizeId, ticketsAllocated }))
  };
}

export function rebuildAllocationsObject(allocationRows, allowedPrizeIds) {
  const baseline = Object.fromEntries(allowedPrizeIds.map((id) => [id, 0]));
  for (const row of allocationRows) {
    const prizeId = String(row.prize_id || "");
    const tickets = Number(row.tickets_allocated || 0);
    if (!baseline.hasOwnProperty(prizeId)) {
      continue;
    }

    baseline[prizeId] = tickets;
  }

  return baseline;
}

export const PrizeValidation = {
  DEFAULT_PRIZE_IDS,
  DEFAULT_TOTAL_TICKETS,
  getAllowedPrizeIds,
  normalizeAndValidateAllocations,
  rebuildAllocationsObject
};

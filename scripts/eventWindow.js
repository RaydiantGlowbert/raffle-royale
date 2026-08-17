// Raffle Royale event window (Eastern Time boundaries)
// Preview:  before September 16, 2026 (browse only, allocation locked)
// Live:     September 16, 2026 - September 23, 2026 (allocation + submission open)
// Closed:   on/after September 24, 2026 (browse only, allocation locked)
const EVENT_TIME_ZONE = "America/New_York";
const RAFFLE_LIVE_START_ET = "2026-09-16T00:00:00";
const RAFFLE_CLOSED_START_ET = "2026-09-24T00:00:00";

function getEasternDateTimeString(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);

  const lookup = {};
  parts.forEach((part) => {
    lookup[part.type] = part.value;
  });

  const hour = lookup.hour === "24" ? "00" : lookup.hour;
  return `${lookup.year}-${lookup.month}-${lookup.day}T${hour}:${lookup.minute}:${lookup.second}`;
}

function getEventPhase(nowDate = new Date()) {
  const nowEt = getEasternDateTimeString(nowDate);

  if (nowEt < RAFFLE_LIVE_START_ET) {
    return "preview";
  }

  if (nowEt < RAFFLE_CLOSED_START_ET) {
    return "live";
  }

  return "closed";
}

function isAllocationWindowOpen(nowDate = new Date()) {
  return getEventPhase(nowDate) === "live";
}

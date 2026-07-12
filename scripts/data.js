// Version 1 fixed prize list: exactly five prize buckets.
const PRIZES = [
  {
    id: "p1",
    name: "Golden Ticket Upgrade",
    description: "Premium event perks and priority access package.",
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Golden Ticket Upgrade"
  },
  {
    id: "p2",
    name: "Mystery Prize Chest",
    description: "A curated surprise bundle revealed at draw time.",
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Mystery Prize Chest"
  },
  {
    id: "p3",
    name: "Coffee Bar Boost",
    description: "Cafe gift bundle for drinks and snack upgrades.",
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Coffee Bar Boost"
  },
  {
    id: "p4",
    name: "Lunch on the House",
    description: "Meal voucher package for a hosted lunch outing.",
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Lunch on the House"
  },
  {
    id: "p5",
    name: "Arcade Power Pass",
    description: "Arcade credits and bonus play session package.",
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Arcade Power Pass"
  }
];

const TOTAL_TICKETS = 20;

const PILOT_MODE = true;
const APP_MODE = PILOT_MODE ? "pilot" : "live";

// Submission mode is local by default for MVP intake testing.
// Switch mode to "api" and set apiEndpoint when backend is ready.
const SUBMISSION_CONFIG = {
  mode: "api", // "local" | "api"
  apiEndpoint: "/api/submissions",
  apiHealthEndpoint: "/api/db-health",
  storageMode: "database", // "database" | "local"
  mirrorLocalStorageOnSuccess: true,
  eventId: "raffle-royale-2026",
  sourceAppVersion: "v1"
};

const ALL_PRIZE_CONFIG = [
  {
    id: "royal-flush-retreat",
    name: "Royal Flush Retreat",
    winnerCount: 5,
    active: true,
    teaser: "Recharge, reset, and invest in yourself with a wellness experience designed to help you return refreshed.",
    description: "Step away from the table and invest in yourself. This wellness experience is designed to encourage rest, renewal, and personal well-being—because taking time to recharge helps us bring our best selves back to the students we serve.",
    includes: [
      "One Wellness Recharge Day to focus on rest, reflection, and personal well-being without using your FTO balance (pending final approval)."
    ],
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Royal Flush Retreat wellness recharge package"
  },
  {
    id: "vegas-main-character",
    name: "Vegas Main Character Energy",
    winnerCount: 3,
    active: true,
    teaser: "Step into the spotlight with VIP Summit perks and Vegas-themed extras worthy of a high roller.",
    description: "The Strip is calling your name. Step into the spotlight with a VIP Summit experience featuring exclusive perks and Vegas-themed goodies worthy of a high roller.",
    includes: [
      "Reserved VIP breakfast seating one morning at Summit",
      "Crown & sash to celebrate your main character moment",
      "A $25 hotel snack basket",
      "A curated assortment of Vegas-themed souvenirs and accessories"
    ],
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Vegas Main Character Energy VIP Summit experience"
  },
  {
    id: "high-roller-time-bank",
    name: "High Roller Time Bank",
    winnerCount: 3,
    active: true,
    teaser: "Enjoy flexible workday perks designed to help you recharge, reset, and make the day work better for you.",
    description: "Small moments of flexibility can make a big difference. This collection of time-saving perks gives you the freedom to recharge, reset, and make your workday work a little better for you.",
    includes: [
      "2-Hour Pass: Take up to two hours away from work during your scheduled workday without using FTO, coordinated with your manager.",
      "1-Hour Nap Pass: Step away for an hour during your workday to rest, recharge, or simply unplug before returning refreshed.",
      "Camera-Off Pass: Enjoy one meeting with your camera off (when appropriate), giving you a chance to recharge while still fully participating."
    ],
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for High Roller Time Bank flexible workday perk bundle"
  },
  {
    id: "mentor-mvp-pack",
    name: "Mentor MVP Pack",
    winnerCount: 2,
    active: true,
    teaser: "Choose the official WGU gear and merchandise you'll actually use and enjoy.",
    description: "Show your WGU pride in style. Celebrate your impact with the opportunity to choose the official WGU gear you'll actually use. Whether you're looking for apparel, office essentials, or your next favorite piece of WGU merchandise, this prize lets you build your own MVP collection.",
    includes: [
      "Up to $50 to spend in the official WGU Store",
      "Choose your own official WGU-branded apparel, accessories, and merchandise"
    ],
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Mentor MVP Pack WGU store selection"
  },
  {
    id: "double-down-development",
    name: "Double Down on Development",
    winnerCount: 5,
    active: true,
    teaser: "Invest in your growth with a book, dedicated reflection time, and a personalized note of encouragement.",
    description: "The best investment you can make is in yourself. Whether you're exploring a new leadership idea, building a new skill, or finding fresh inspiration, this prize is designed to support your personal and professional growth.",
    includes: [
      "Up to $30 toward an Amazon book of your choice",
      "A personalized note of encouragement",
      "Focus & Reflect Pass (1 Hour): Take one hour during your workday to step away from daily responsibilities and invest in learning, reflection, or professional development."
    ],
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Double Down on Development growth and learning package"
  },
  {
    id: "brew-crew-casey",
    name: "Brew Crew with Casey",
    winnerCount: 1,
    active: true,
    teaser: "Enjoy a relaxed Summit coffee conversation with Casey-and invite one fellow mentor to join you.",
    description: "Pull up a chair and pour a cup. Enjoy a relaxed coffee conversation with Casey during Summit—a chance to connect, share ideas, ask questions, and enjoy meaningful conversation in a small-group setting.",
    includes: [
      "Private coffee meet-up with Casey during Summit",
      "Invite one fellow mentor to join you",
      "Casual conversation and networking in a relaxed setting"
    ],
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Brew Crew with Casey private coffee conversation"
  },
  {
    id: "good-fortune-giveaway",
    name: "Good Fortune Giveaway",
    winnerCount: 1,
    active: true,
    teaser: "Celebrate a teammate, spread kindness, and create a little extra good fortune across WGU.",
    description: "Winning feels even better when you can share it. Celebrate the spirit of encouragement by recognizing a teammate, spreading kindness, and creating a little extra good fortune for those around you.",
    includes: [
      "$20 Motivosity to recognize teammates",
      "Peer Spotlight Pass",
      "Donation to the WGU Scholarship Fund in your honor"
    ],
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Good Fortune Giveaway recognition and giving package"
  },
  {
    id: "wise-mentor-collection",
    name: "Wise Mentor Collection",
    winnerCount: 2,
    active: true,
    teaser: "Brighten your workspace with owl-inspired gifts and meaningful mentor keepsakes.",
    description: "Wisdom never goes out of style. Celebrate the heart of mentoring with a thoughtfully curated collection of owl-inspired décor, mentor favorites, and meaningful keepsakes designed to brighten your workspace and remind you of the difference you make every day.",
    includes: [
      "A curated assortment of owl-themed gifts and mentor-inspired keepsakes."
    ],
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Wise Mentor Collection owl-themed keepsakes"
  },
  {
    id: "casino-royale-collection",
    name: "Casino Royale Collection",
    winnerCount: 2,
    active: true,
    teaser: "Bring the excitement of the casino home with games, decor, drinkware, and Vegas-inspired accessories.",
    description: "Bring the excitement of the casino home. From game-night favorites to fun Vegas-inspired accessories, this collection is packed with surprises for anyone who loves the thrill of the casino.",
    includes: [
      "A curated assortment of casino-themed games, décor, drinkware, and accessories."
    ],
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Casino Royale Collection games and accessories"
  },
  {
    id: "purr-fect-companion-pack",
    name: "Purr-fect Companion Pack",
    winnerCount: 1,
    active: true,
    teaser: "Treat your favorite feline to a jackpot of toys, treats, and cozy comforts.",
    description: "Every lucky cat deserves a jackpot. Treat your favorite feline (and yourself) to a purr-fect collection of toys, treats, and cozy comforts.",
    includes: [
      "A curated assortment of cat-themed gifts, toys, treats, and home accessories."
    ],
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Purr-fect Companion Pack cat gift assortment"
  },
  {
    id: "top-dog-pack",
    name: "Top Dog Pack",
    winnerCount: 1,
    active: true,
    teaser: "Surprise your four-legged best friend with a tail-wagging collection of toys, treats, and accessories.",
    description: "Because every good dog deserves a jackpot. Surprise your four-legged best friend with a tail-wagging collection of toys, treats, and cozy comforts.",
    includes: [
      "A curated assortment of dog-themed gifts, toys, treats, and accessories."
    ],
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for Top Dog Pack dog gift assortment"
  },
  {
    id: "presidents-pick",
    name: "The President's Pick",
    winnerCount: 1,
    active: false,
    teaser: "Receive a personalized message celebrating your dedication, impact, and commitment to WGU's mission.",
    description: "Some prizes become keepsakes for a lifetime. Receive a personalized video message from WGU President Scott Pulsipher, created just for you in recognition of your dedication and impact.",
    includes: [
      "A personalized congratulatory video message from WGU President Scott Pulsipher",
      "Recognition celebrating your commitment to WGU's mission and the students you serve"
    ],
    image: "assets/images/prize-placeholder.svg",
    imageAlt: "Placeholder image for The President's Pick personalized recognition award"
  }
];

const PRIZES = ALL_PRIZE_CONFIG.filter((prize) => prize.active);

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
  eventId: "raffle-royale-2026-final-pilot",
  sourceAppVersion: "v1"
};

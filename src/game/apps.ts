import type { Mission, Bug, TestEnvState } from "../types";

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 100;

export interface LevelModifiers {
  level: number;
  timeMultiplier: number;   // scales mission.timeLimit
  xpMultiplier: number;     // scales base XP reward on valid reports
  freeHints: number;        // hints usable per mission before an XP penalty kicks in
  hintPenalty: number;      // XP deducted per hint beyond the free allowance
  label: string;            // human-readable difficulty band
}

/**
 * Turns a 1–100 player-chosen level into concrete gameplay modifiers.
 * Difficulty ramps up smoothly: less time, bigger XP payouts (and bigger
 * risk), fewer free hints, and steeper hint penalties as level increases.
 */
export function getLevelModifiers(level: number): LevelModifiers {
  const clamped = Math.min(Math.max(Math.round(level), MIN_LEVEL), MAX_LEVEL);
  const progress = (clamped - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL); // 0 → 1

  const timeMultiplier = 1.2 - progress * 0.7;        // level 1: 1.2x time, level 100: 0.5x time
  const xpMultiplier = 1 + progress * 2;               // level 1: 1x XP, level 100: 3x XP
  const freeHints = clamped <= 25 ? 3 : clamped <= 50 ? 2 : clamped <= 75 ? 1 : 0;
  const hintPenalty = Math.round(10 + progress * 50);  // level 1: 10 XP, level 100: 60 XP

  const label =
    clamped <= 20 ? "Rookie" :
    clamped <= 40 ? "Junior" :
    clamped <= 60 ? "Veteran" :
    clamped <= 80 ? "Elite" : "Legendary";

  return { level: clamped, timeMultiplier, xpMultiplier, freeHints, hintPenalty, label };
}

export function scaleMissionForLevel(mission: Mission, level: number): Mission {
  const mods = getLevelModifiers(level);
  return {
    ...mission,
    timeLimit: Math.max(90, Math.round(mission.timeLimit * mods.timeMultiplier)),
    bugs: mission.bugs.map(b => ({ ...b, xpReward: Math.round(b.xpReward * mods.xpMultiplier) })),
  };
}

// ===== Level Progression (1-100, linear unlock) =====
// The 100 levels are split into 3 bands, one per application archetype,
// ordered easiest to hardest (login < e-commerce < banking). Within a band
// the number of bugs you must find climbs from 2 up toward the app's full
// bug pool, and the shared getLevelModifiers() curve keeps shrinking the
// clock / growing the XP / tightening hints across the whole 1-100 range —
// so every single level feels a little harder than the last.
interface LevelBand {
  from: number;
  to: number;
  missionIndex: number; // index into ALL_MISSIONS
}

function getLevelBands(): LevelBand[] {
  return [
    { from: 1, to: 20, missionIndex: 0 },   // Authentication System (Ch 1)
    { from: 21, to: 40, missionIndex: 1 },  // E-Commerce System (Ch 2)
    { from: 41, to: 60, missionIndex: 2 },  // Banking Application (Ch 3)
    { from: 61, to: 80, missionIndex: 3 },  // Clinical Healthcare EHR (Ch 4)
    { from: 81, to: 100, missionIndex: 3 }, // Temporary Ch 4 until Ch 5 is mounted
  ];
}

/** Deterministic shuffle so the same level always gets the same bug set. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = Math.floor((s / 2147483647) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Which band (and how far through it) a given level falls into. */
export function getLevelBandInfo(level: number): { band: LevelBand; bandIndex: number; posInBand: number } {
  const clamped = Math.min(Math.max(Math.round(level), MIN_LEVEL), MAX_LEVEL);
  const bands = getLevelBands();
  const bandIndex = bands.findIndex(b => clamped >= b.from && clamped <= b.to);
  const band = bands[bandIndex === -1 ? bands.length - 1 : bandIndex];
  const posInBand = band.to === band.from ? 1 : (clamped - band.from) / (band.to - band.from);
  return { band, bandIndex: bandIndex === -1 ? bands.length - 1 : bandIndex, posInBand };
}

/**
 * Builds the actual mission a player faces at a given level: a
 * progressively larger, harder-scaled slice of one of the 3 app archetypes.
 */
export function getLevelMission(level: number, allMissions: Mission[]): Mission {
  const clamped = Math.min(Math.max(Math.round(level), MIN_LEVEL), MAX_LEVEL);
  const { band, posInBand } = getLevelBandInfo(clamped);
  const base = allMissions[band.missionIndex];

  const bugCount = Math.max(2, Math.min(base.bugs.length, Math.round(2 + posInBand * (base.bugs.length - 2))));
  const bugs = seededShuffle(base.bugs, clamped * 7919 + 13).slice(0, bugCount);

  const scaled = scaleMissionForLevel({ ...base, bugs }, clamped);
  return scaled;
}

export const INITIAL_ENV: () => TestEnvState = () => ({
  username: "", password: "", loggedIn: false, otp: "", resetEmail: "",
  otpUsed: false, loginAttempts: 0,
  searchQuery: "", cart: [], coupon: "", couponApplied: false, couponCount: 0,
  address: "", paymentMethod: "", orderPlaced: false, wishlist: [],
  balance: 5000, transferTo: "", transferAmount: 0,
  depositAmount: 0, withdrawAmount: 0,
  transactions: [], txIdCounter: 1,
  selectedSeat: null, bookedSeats: [], cancelledSeat: null,
  patientName: "Eleanor Vance (PID-4092)", patientAge: 8, patientWeightLbs: 55,
  heartRateBpm: 82, bloodPressureSystolic: 110, bloodPressureDiastolic: 70, oxygenSaturation: 98,
  prescribedDrug: "", calculatedDosageMg: 0, breakGlassActive: false, allergyWarningDismissed: false,
  ehrAuditLogs: [
    { id: "log-1", action: "PATIENT_ADMISSION", user: "Dr. Chen (MD)", timestamp: "08:15 AM", details: "Routine pediatric diagnostic intake." }
  ],
  viewport: "desktop", consoleOpen: false, activeDevTab: "console", consoleInput: "",
  consoleOutput: [], consoleLogs: [
    { id: "c1", type: "info", message: "QA DevTools runtime initialized.", timestamp: new Date().toLocaleTimeString() }
  ],
  networkLog: [], networkLogs: [
    { id: "n1", method: "GET", url: "/api/health", status: 200, timeMs: 32, timestamp: new Date().toLocaleTimeString(), response: JSON.stringify({ status: "ok", service: "ready" }) }
  ],
});

export const LOGIN_BUGS: Bug[] = [
  {
    id: "login-01", title: "Login succeeds with empty username",
    description: "The system allows login when username is left blank.",
    severity: "high", priority: "P1", category: "Validation",
    technique: "Boundary Value Analysis",
    hints: ["What happens when fields are empty?", "Try logging in without a username."],
    xpReward: 100,
  },
  {
    id: "login-02", title: "Login succeeds with empty password",
    description: "The system allows login when password is left blank.",
    severity: "critical", priority: "P1", category: "Security",
    technique: "Exploratory Testing",
    hints: ["Have you tried logging in without a password?", "Security is about checking what's missing."],
    xpReward: 200,
  },
  {
    id: "login-03", title: "Password field accepts spaces",
    description: "Password validation allows a password of only spaces.",
    severity: "medium", priority: "P2", category: "Validation",
    technique: "Equivalence Partitioning",
    hints: ["What constitutes a 'real' password?", "Try whitespace-only input."],
    xpReward: 60,
  },
  {
    id: "login-04", title: "No rate limiting on login attempts",
    description: "Unlimited login attempts without lockout or delay.",
    severity: "high", priority: "P2", category: "Security",
    technique: "Functional Testing",
    hints: ["Try logging in many times in a row.", "How many attempts can you make?"]
      ,
    xpReward: 120,
  },
  {
    id: "login-05", title: "OTP can be reused after reset",
    description: "After using the OTP for password reset, the same OTP still works.",
    severity: "critical", priority: "P1", category: "Security",
    technique: "State Testing",
    hints: ["Reset the password using the OTP. What happens if you try the OTP again?"],
    xpReward: 180,
  },
  {
    id: "login-06", title: "Password reset email has no validation",
    description: "Password reset accepts any string, including invalid emails.",
    severity: "low", priority: "P3", category: "Validation",
    technique: "Input Validation",
    hints: ["What happens if you type a random string in the reset email field?"],
    xpReward: 40,
  },
];

export const ECOMMERCE_BUGS: Bug[] = [
  {
    id: "ecom-01", title: "Cart quantity can be set to negative",
    description: "Users can set product quantity to negative values, resulting in negative totals.",
    severity: "high", priority: "P1", category: "Functional",
    technique: "Boundary Value Analysis",
    hints: ["Try setting the cart quantity to 0 or a negative number.", "What happens at the edges?"],
    xpReward: 100,
  },
  {
    id: "ecom-02", title: "Coupon can be applied multiple times",
    description: "The same coupon code can be applied repeatedly, stacking discounts indefinitely.",
    severity: "high", priority: "P2", category: "Logic",
    technique: "Exploratory Testing",
    hints: ["Apply the coupon once. Then try applying it again.", "What happens to the discount?"],
    xpReward: 120,
  },
  {
    id: "ecom-03", title: "Product price changes at checkout",
    description: "The total is calculated incorrectly when items are in cart.",
    severity: "critical", priority: "P1", category: "Functional",
    technique: "Functional Testing",
    hints: ["Add items to cart and check the total carefully.", "Does the math add up?"],
    xpReward: 180,
  },
  {
    id: "ecom-04", title: "Empty address allows order placement",
    description: "Users can place orders without providing a shipping address.",
    severity: "medium", priority: "P2", category: "Validation",
    technique: "Input Validation",
    hints: ["Try placing an order without entering an address."],
    xpReward: 80,
  },
  {
    id: "ecom-05", title: "Wishlist items not persisted",
    description: "Items added to wishlist disappear when searching.",
    severity: "low", priority: "P4", category: "State",
    technique: "State Testing",
    hints: ["Add something to wishlist, then try searching. What happens?"],
    xpReward: 50,
  },
  {
    id: "ecom-06", title: "Quantity 99999 causes overflow in total",
    description: "Very large quantities produce incorrect or negative totals due to integer overflow.",
    severity: "high", priority: "P2", category: "Boundary",
    technique: "Boundary Value Analysis",
    hints: ["What happens with extremely large quantities?"],
    xpReward: 140,
  },
];

export const BANKING_BUGS: Bug[] = [
  {
    id: "bank-01", title: "Transfer allows negative amount",
    description: "Negative transfer amounts are accepted, effectively depositing money.",
    severity: "critical", priority: "P1", category: "Security",
    technique: "Boundary Value Analysis",
    hints: ["What happens if you transfer a negative amount?"],
    xpReward: 200,
  },
  {
    id: "bank-02", title: "Transfer exceeds balance",
    description: "User can transfer more than their current balance.",
    severity: "critical", priority: "P1", category: "Security",
    technique: "Functional Testing",
    hints: ["Try transferring more than your current balance."],
    xpReward: 180,
  },
  {
    id: "bank-03", title: "Transaction history shows wrong balance",
    description: "After a transfer, the transaction list shows incorrect balance.",
    severity: "high", priority: "P2", category: "State",
    technique: "State Testing",
    hints: ["Check your transaction history after a transfer. Does it look right?"],
    xpReward: 120,
  },
  {
    id: "bank-04", title: "Decimal amount not handled correctly",
    description: "Deposits with decimal amounts are rounded down.",
    severity: "medium", priority: "P2", category: "Functional",
    technique: "Equivalence Partitioning",
    hints: ["Try depositing $99.99. What actually gets added?"],
    xpReward: 90,
  },
  {
    id: "bank-05", title: "Transfer to empty account accepted",
    description: "System accepts transfer with no destination account specified.",
    severity: "high", priority: "P1", category: "Validation",
    technique: "Input Validation",
    hints: ["Try sending a transfer without entering an account number."],
    xpReward: 110,
  },
  {
    id: "bank-06", title: "Duplicate transaction on double-click",
    description: "Clicking deposit or transfer twice creates two identical transactions.",
    severity: "medium", priority: "P3", category: "State",
    technique: "Exploratory Testing",
    hints: ["What happens if you click deposit really fast twice?"],
    xpReward: 80,
  },
];

export const HEALTHCARE_BUGS: Bug[] = [
  {
    id: "health-01",
    title: "Pediatric dosage calculation applies inverted conversion factor",
    description: "When converting patient weight from pounds to kilograms for pediatric amoxicillin dosage, the calculator multiplies instead of divides, resulting in a dangerous 10x overdose.",
    severity: "critical",
    priority: "P1",
    category: "Calculation",
    technique: "Boundary Value Analysis",
    hints: [
      "Check the pediatric dosage calculator tab with a child's weight in lbs.",
      "Does 55 lbs equal ~25 kg or 121 kg in the formula? Verify the math.",
    ],
    xpReward: 220,
  },
  {
    id: "health-02",
    title: "Unmasked PHI and SSN leaked in diagnostic API response",
    description: "The patient diagnostic vitals endpoint returns unencrypted Social Security Numbers and unredacted psychiatric evaluation notes in the network payload.",
    severity: "high",
    priority: "P1",
    category: "Compliance",
    technique: "API & Data Security",
    hints: [
      "Open F12 DevTools and look at the Network tab when loading patient records.",
      "Check the JSON payload response for /api/v1/patient/vitals.",
    ],
    xpReward: 160,
  },
  {
    id: "health-03",
    title: "Impossible physiological vitals accepted by triage form",
    description: "The clinical triage intake allows negative heart rate (-15 bpm) and impossible systolic blood pressure (450 mmHg) without validation error.",
    severity: "medium",
    priority: "P2",
    category: "Validation",
    technique: "Boundary Value Analysis",
    hints: [
      "Try entering negative or superhuman vital sign values in the vitals entry form.",
      "Does the system validate realistic physiological ranges for pulse or BP?",
    ],
    xpReward: 110,
  },
  {
    id: "health-04",
    title: "Concurrent chart save silently drops allergy alert without lock",
    description: "Saving vitals while a pending allergy update is active silently overwrites the patient's critical Penicillin anaphylaxis warning without a merge conflict warning.",
    severity: "high",
    priority: "P2",
    category: "Concurrency",
    technique: "State Testing",
    hints: [
      "Look at the Allergy Conflict indicator on the patient banner.",
      "Try clicking 'Sync Remote Chart Changes' or saving vitals while allergy alert is pending.",
    ],
    xpReward: 150,
  },
  {
    id: "health-05",
    title: "Emergency Break-Glass access fails to write to HIPAA audit log",
    description: "Activating emergency 'Break-Glass' protocol to access restricted patient records does not create a mandatory timestamped entry in the compliance audit trail.",
    severity: "critical",
    priority: "P1",
    category: "Security",
    technique: "Audit Trail Verification",
    hints: [
      "Trigger the red 'Break-Glass Emergency Override' button on the patient chart.",
      "Check the 'HIPAA Audit Trail' tab to see if the override event was logged.",
    ],
    xpReward: 200,
  },
  {
    id: "health-06",
    title: "Severe drug contraindication alert suppressed for anticoagulants",
    description: "Prescribing Warfarin alongside Heparin fails to trigger the mandatory hard-stop contraindication modal alert.",
    severity: "high",
    priority: "P2",
    category: "Safety Logic",
    technique: "Equivalence Partitioning",
    hints: [
      "Test the Medication Order section.",
      "Try prescribing an interacting anticoagulant like Warfarin or Aspirin to a patient already on Heparin.",
    ],
    xpReward: 140,
  },
];

export const ALL_MISSIONS: Mission[] = [
  {
    id: "login", title: "Authentication System", icon: "🔐",
    difficulty: 1,
    description: "Test the login, registration, OTP, and password reset flow of a new authentication system. Look for validation bypasses, security gaps, and state-related bugs.",
    clientName: "SecureAuth Corp", sprintName: "Sprint 14",
    timeLimit: 600, bugs: LOGIN_BUGS,
    requirements: [
      "Password must contain at least 8 characters",
      "Username cannot be empty",
      "OTP should be single-use only",
      "Login should lock after 10 failed attempts",
    ],
  },
  {
    id: "ecommerce", title: "E-Commerce System", icon: "🛒",
    difficulty: 2,
    description: "Test a brand-new online store — product search, cart management, coupon codes, checkout, and payment flow. Focus on pricing accuracy and business logic.",
    clientName: "ShopWave Inc", sprintName: "Sprint 22",
    timeLimit: 720, bugs: ECOMMERCE_BUGS,
    requirements: [
      "Cart quantity must be 1 or greater",
      "Coupon 'SAVE10' gives 10% off, applied only once",
      "Shipping address is required for checkout",
      "Total must equal sum of (price × quantity) minus discounts",
    ],
  },
  {
    id: "banking", title: "Banking Application", icon: "🏦",
    difficulty: 3,
    description: "Test a digital banking platform — transfers, deposits, withdrawals, and transaction history. Security and accuracy are paramount. No room for error here.",
    clientName: "NeoBank Ltd", sprintName: "Sprint 8",
    timeLimit: 900, bugs: BANKING_BUGS,
    requirements: [
      "Transfer amount must be positive",
      "Transfer cannot exceed available balance",
      "Transaction history must reflect accurate balances",
      "Decimal amounts must be preserved to 2 decimal places",
    ],
  },
  {
    id: "healthcare",
    title: "Clinical EHR & Diagnostic Portal",
    icon: "🏥",
    difficulty: 4,
    description: "Test an enterprise Electronic Health Records (EHR) portal — clinical triage vitals, pediatric dosage calculators, medication prescription safety checks, and HIPAA compliance audit logging.",
    clientName: "PulseCare Systems",
    sprintName: "Sprint 41",
    timeLimit: 840,
    bugs: HEALTHCARE_BUGS,
    requirements: [
      "Pediatric dosage formulas must accurately calculate mg/kg without unit inversion",
      "Protected Health Information (PHI) like SSN must be masked in all API responses",
      "Vitals input must reject non-physiological values (e.g. pulse < 30 or > 250 bpm)",
      "Emergency Break-Glass overrides must be permanently written to the HIPAA audit trail",
      "Dangerous drug contraindications must trigger mandatory hard-stop warnings",
    ],
  },
];

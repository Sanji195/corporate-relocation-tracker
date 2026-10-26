const fs = require("fs");
const path = require("path");

const STORE_PATH = "/tmp/mobility_data_v2.json";

const INITIAL_DATA = [
  {
    id: "expat-1",
    employeeId: "EXP-1042",
    fullName: "Elena Rostova",
    email: "elena.rostova@techcorp.global",
    originCountry: "Estonia",
    hostCountry: "United Kingdom",
    city: "London",
    department: "Platform Engineering",
    jobTitle: "Principal Cloud Architect",
    status: "CRITICAL",
    budgetHousing: 18000,
    budgetFlights: 4500,
    budgetShipping: 9000,
    budgetSettling: 3500,
    workPermits: [
      {
        id: "perm-1",
        permitType: "Skilled Worker Visa (Tier 2)",
        permitNumber: "GBR-9928104",
        issuingCountry: "United Kingdom",
        issuedDate: "2023-11-15T00:00:00.000Z",
        expiryDate: new Date(Date.now() + 24 * 86400000).toISOString(),
        status: "CRITICAL",
        cosAssigned: true,
        medicalCompleted: true,
        biometricsDone: false,
        submittedToGovt: false,
        counselNotes: "Sponsorship assigned. Employee must book biometrics at Croydon VAC."
      }
    ],
    travelRecords: [
      {
        id: "tr-1",
        country: "United Kingdom",
        entryDate: "2026-01-10T00:00:00.000Z",
        exitDate: "2026-06-30T00:00:00.000Z",
        durationDays: 171,
        taxYear: 2026,
        purpose: "Primary Relocation Assignment"
      }
    ],
    expenseClaims: [
      {
        id: "exp-1",
        title: "Serviced Apartment (Canary Wharf)",
        category: "TEMPORARY_HOUSING",
        amount: 8500,
        currency: "GBP",
        amountInUSD: 10800,
        vendor: "Cheval Residences",
        status: "APPROVED"
      },
      {
        id: "exp-2",
        title: "Relocation Freight Container",
        category: "CONTAINER_SHIPPING",
        amount: 5200,
        currency: "EUR",
        amountInUSD: 5600,
        vendor: "Santa Fe Relocation",
        status: "REIMBURSED"
      }
    ]
  },
  {
    id: "expat-2",
    employeeId: "EXP-2091",
    fullName: "Kenji Sato",
    email: "kenji.sato@techcorp.global",
    originCountry: "Japan",
    hostCountry: "United States",
    city: "San Francisco",
    department: "Product Design",
    jobTitle: "Lead UX Researcher",
    status: "ACTIVE",
    budgetHousing: 25000,
    budgetFlights: 6000,
    budgetShipping: 12000,
    budgetSettling: 5000,
    workPermits: [
      {
        id: "perm-2",
        permitType: "L-1A Intra-Company Transferee",
        permitNumber: "USA-7719280",
        issuingCountry: "United States",
        issuedDate: "2024-03-01T00:00:00.000Z",
        expiryDate: new Date(Date.now() + 210 * 86400000).toISOString(),
        status: "VALID",
        cosAssigned: true,
        medicalCompleted: true,
        biometricsDone: true,
        submittedToGovt: true,
        counselNotes: "I-797 approval notice on file through 2027."
      }
    ],
    travelRecords: [
      {
        id: "tr-2",
        country: "United States",
        entryDate: "2026-01-05T00:00:00.000Z",
        exitDate: "2026-07-18T00:00:00.000Z",
        durationDays: 194,
        taxYear: 2026,
        purpose: "Substantial Physical Presence Assignment"
      }
    ],
    expenseClaims: [
      {
        id: "exp-3",
        title: "Executive Housing - Bay Area",
        category: "TEMPORARY_HOUSING",
        amount: 14200,
        currency: "USD",
        amountInUSD: 14200,
        vendor: "Oakwood Corporate Housing",
        status: "APPROVED"
      }
    ]
  },
  {
    id: "expat-3",
    employeeId: "EXP-3108",
    fullName: "Priya Sharma",
    email: "priya.sharma@techcorp.global",
    originCountry: "India",
    hostCountry: "Germany",
    city: "Munich",
    department: "Data Engineering",
    jobTitle: "Senior Machine Learning Specialist",
    status: "ACTIVE",
    budgetHousing: 16000,
    budgetFlights: 3500,
    budgetShipping: 8000,
    budgetSettling: 3000,
    workPermits: [
      {
        id: "perm-3",
        permitType: "EU Blue Card",
        permitNumber: "DEU-4401928",
        issuingCountry: "Germany",
        issuedDate: "2024-05-10T00:00:00.000Z",
        expiryDate: new Date(Date.now() + 55 * 86400000).toISOString(),
        status: "EXPIRING_SOON",
        cosAssigned: true,
        medicalCompleted: true,
        biometricsDone: false,
        submittedToGovt: false,
        counselNotes: "Renewal submitted to Munich Immigration Office; biometrics pending."
      }
    ],
    travelRecords: [
      {
        id: "tr-3",
        country: "Germany",
        entryDate: "2026-02-01T00:00:00.000Z",
        exitDate: "2026-06-15T00:00:00.000Z",
        durationDays: 134,
        taxYear: 2026,
        purpose: "R&D Center Assignment"
      }
    ],
    expenseClaims: [
      {
        id: "exp-5",
        title: "Airfare Mumbai to Munich",
        category: "FLIGHT_TRAVEL",
        amount: 1100,
        currency: "EUR",
        amountInUSD: 1180,
        vendor: "Lufthansa",
        status: "PENDING"
      }
    ]
  }
];

// ---- Persistence -----------------------------------------------------------
// NOTE: Vercel functions have an ephemeral filesystem. /tmp survives only while a
// serverless instance is warm, so data resets on cold starts. For real persistence
// run the Express + Prisma server (npm run dev) or swap this for a hosted DB.
function clone(v) { return JSON.parse(JSON.stringify(v)); }

let memoryStore = null; // fallback if /tmp is not writable

function readStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      if (raw) return JSON.parse(raw);
    }
  } catch (e) {}
  if (memoryStore) return memoryStore;
  const fresh = clone(INITIAL_DATA);
  writeStore(fresh);
  return fresh;
}

function writeStore(data) {
  memoryStore = data;
  try { fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2)); } catch (e) {}
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (req.body && typeof req.body === "string") {
    try { return Promise.resolve(JSON.parse(req.body)); } catch (e) { return Promise.resolve({}); }
  }
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { resolve({}); }
    });
    req.on("error", () => resolve({}));
  });
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const rid = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const validDate = (v) => { const d = new Date(v); return isNaN(d.getTime()) ? null : d; };

function loadIndexHtml() {
  const candidates = [
    path.join(__dirname, "..", "public", "index.html"),
    path.join(process.cwd(), "public", "index.html"),
    path.join(process.cwd(), "backend", "public", "index.html")
  ];
  for (const file of candidates) {
    try { if (fs.existsSync(file)) return fs.readFileSync(file, "utf-8"); } catch (e) {}
  }
  return null;
}

// ---- Route handlers --------------------------------------------------------
function createExpatriate(body) {
  const required = ["fullName", "email", "originCountry", "hostCountry", "city", "department", "jobTitle", "permitType"];
  const missing = required.filter((k) => !body[k] || !String(body[k]).trim());
  if (missing.length) throw new HttpError(400, `Missing required fields: ${missing.join(", ")}`);

  const store = readStore();
  if (store.some((e) => e.email.toLowerCase() === String(body.email).toLowerCase())) {
    throw new HttpError(400, "An expatriate with this email already exists.");
  }

  let employeeId = body.employeeId;
  if (!employeeId) {
    do { employeeId = "EXP-" + Math.floor(1000 + Math.random() * 9000); }
    while (store.some((e) => e.employeeId === employeeId));
  }

  const expiry = body.expiryDate ? validDate(body.expiryDate) : new Date(Date.now() + 90 * 86400000);
  if (!expiry) throw new HttpError(400, "Invalid permit expiry date.");
  const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000);
  const permitStatus = daysLeft <= 30 ? "CRITICAL" : daysLeft <= 90 ? "EXPIRING_SOON" : "VALID";

  const expat = {
    id: rid("expat"),
    employeeId,
    fullName: String(body.fullName).trim(),
    email: String(body.email).trim(),
    originCountry: String(body.originCountry).trim(),
    hostCountry: String(body.hostCountry).trim(),
    city: String(body.city).trim(),
    department: String(body.department).trim(),
    jobTitle: String(body.jobTitle).trim(),
    status: "ACTIVE",
    budgetHousing: Number(body.budgetHousing) || 15000,
    budgetFlights: Number(body.budgetFlights) || 4000,
    budgetShipping: Number(body.budgetShipping) || 8000,
    budgetSettling: Number(body.budgetSettling) || 3000,
    workPermits: [{
      id: rid("perm"),
      permitType: String(body.permitType).trim(),
      permitNumber: "PRM-" + Math.floor(100000 + Math.random() * 900000),
      issuingCountry: String(body.hostCountry).trim(),
      issuedDate: new Date().toISOString(),
      expiryDate: expiry.toISOString(),
      status: permitStatus,
      cosAssigned: true,
      medicalCompleted: false,
      biometricsDone: false,
      submittedToGovt: false,
      counselNotes: "Initial relocation record."
    }],
    travelRecords: [],
    expenseClaims: []
  };
  store.unshift(expat);
  writeStore(store);
  return expat;
}

function updateVisaWorkflow(id, body) {
  const store = readStore();
  let permit = null;
  for (const expat of store) {
    for (const p of expat.workPermits) if (p.id === id) permit = p;
  }
  if (!permit) throw new HttpError(404, "Work permit not found.");

  for (const k of ["cosAssigned", "medicalCompleted", "biometricsDone", "submittedToGovt"]) {
    if (body[k] !== undefined) permit[k] = Boolean(body[k]);
  }
  if (body.counselNotes !== undefined) permit.counselNotes = body.counselNotes;
  if (body.status) permit.status = body.status;
  if (body.newExpiryDate) {
    const d = validDate(body.newExpiryDate);
    if (!d) throw new HttpError(400, "Invalid expiry date.");
    permit.expiryDate = d.toISOString();
  }
  writeStore(store);
  return permit;
}

function createTravelLog(body) {
  const store = readStore();
  const expat = store.find((e) => e.id === body.expatriateId);
  if (!expat) throw new HttpError(404, "Expatriate not found.");
  const entry = validDate(body.entryDate);
  if (!entry) throw new HttpError(400, "A valid entry date is required.");
  const exit = body.exitDate ? validDate(body.exitDate) : new Date();
  if (!exit) throw new HttpError(400, "Invalid exit date.");
  if (exit < entry) throw new HttpError(400, "Exit date cannot be before entry date.");

  const log = {
    id: rid("tr"),
    country: String(body.country || expat.hostCountry),
    entryDate: entry.toISOString(),
    exitDate: body.exitDate ? exit.toISOString() : null,
    durationDays: Math.max(1, Math.ceil((exit.getTime() - entry.getTime()) / 86400000)),
    taxYear: entry.getFullYear(),
    purpose: body.purpose || "Assignment"
  };
  expat.travelRecords.push(log);
  writeStore(store);
  return log;
}

function createExpense(body) {
  const store = readStore();
  const expat = store.find((e) => e.id === body.expatriateId);
  if (!expat) throw new HttpError(404, "Expatriate not found.");
  const amount = Number(body.amount);
  if (!body.title || !body.vendor) throw new HttpError(400, "Title and vendor are required.");
  if (!isFinite(amount) || amount <= 0) throw new HttpError(400, "Amount must be a positive number.");

  const claim = {
    id: rid("exp"),
    title: String(body.title),
    category: body.category || "TEMPORARY_HOUSING",
    amount,
    currency: body.currency || "USD",
    amountInUSD: Number(body.amountInUSD) > 0 ? Number(body.amountInUSD) : amount,
    vendor: String(body.vendor),
    status: "PENDING"
  };
  expat.expenseClaims.push(claim);
  writeStore(store);
  return claim;
}

function updateExpenseStatus(id, body) {
  const allowed = ["PENDING", "APPROVED", "REIMBURSED", "REJECTED"];
  if (!allowed.includes(body.status)) throw new HttpError(400, `Status must be one of: ${allowed.join(", ")}`);
  const store = readStore();
  for (const expat of store) {
    const claim = expat.expenseClaims.find((c) => c.id === id);
    if (claim) {
      claim.status = body.status;
      claim.reviewedBy = body.reviewedBy || "Global Mobility Admin";
      claim.reviewedDate = new Date().toISOString();
      writeStore(store);
      return claim;
    }
  }
  throw new HttpError(404, "Expense claim not found.");
}

// ---- Entry point -----------------------------------------------------------
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const method = req.method || "GET";
  if (method === "OPTIONS") return res.status(200).end();

  const pathname = (req.url || "/").split("?")[0].replace(/\/+$/, "") || "/";
  const send = (status, payload) => res.status(status).json(payload);

  // Anything that is not an /api/<resource> call is the web UI.
  const apiMatch = pathname.match(/^\/api\/(.+)$/);
  if (!apiMatch) {
    const html = loadIndexHtml();
    if (!html) return send(500, { error: "public/index.html not found in deployment bundle." });
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(html);
  }

  const parts = apiMatch[1].split("/").filter(Boolean);
  try {
    const body = method === "POST" || method === "PATCH" ? await parseBody(req) : {};

    if (parts[0] === "health" && method === "GET") {
      return send(200, { status: "ok", runtime: "Vercel Native JS", timestamp: new Date().toISOString() });
    }
    if (parts[0] === "expatriates" && parts.length === 1) {
      if (method === "GET") return send(200, readStore());
      if (method === "POST") return send(201, createExpatriate(body));
    }
    if (parts[0] === "visas" && parts[2] === "renewal-workflow" && method === "PATCH") {
      return send(200, updateVisaWorkflow(parts[1], body));
    }
    if (parts[0] === "travel-logs" && parts.length === 1 && method === "POST") {
      return send(201, createTravelLog(body));
    }
    if (parts[0] === "expenses" && parts.length === 1 && method === "POST") {
      return send(201, createExpense(body));
    }
    if (parts[0] === "expenses" && parts[2] === "status" && method === "PATCH") {
      return send(200, updateExpenseStatus(parts[1], body));
    }
    return send(404, { error: `No route for ${method} /api/${parts.join("/")}` });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    return send(status, { error: err.message || "Internal server error" });
  }
};

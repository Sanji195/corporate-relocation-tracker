const fs = require("fs");
const path = require("path");

const STORE_PATH = "/tmp/mobility_data.json";

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
      }
    ]
  }
];

function readStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, "utf-8");
      if (data) return JSON.parse(data);
    }
  } catch (e) {}
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(INITIAL_DATA, null, 2));
  } catch (e) {}
  return INITIAL_DATA;
}

function writeStore(data) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
  } catch (e) {}
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { resolve({}); }
    });
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const url = req.url || "/";
  const method = req.method || "GET";

  try {
    // If request is not for an API route, serve public/index.html
    if (!url.startsWith("/api")) {
      const htmlPath = path.join(__dirname, "../public/index.html");
      if (fs.existsSync(htmlPath)) {
        const html = fs.readFileSync(htmlPath, "utf-8");
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(200).send(html);
      } else {
        return res.status(404).send("Frontend public/index.html not found in backend folder.");
      }
    }

    const body = method === "POST" || method === "PATCH" ? await parseBody(req) : {};

    if (url.includes("/api/expatriates") && method === "GET") {
      return res.status(200).json(readStore());
    }

    if (url.includes("/api/expatriates") && method === "POST") {
      const store = readStore();
      const newExpat = {
        id: "expat-" + Date.now(),
        employeeId: body.employeeId || "EXP-" + Math.floor(1000 + Math.random() * 9000),
        fullName: body.fullName || "New Expatriate",
        email: body.email || "employee@corp.com",
        originCountry: body.originCountry || "India",
        hostCountry: body.hostCountry || "United Kingdom",
        city: body.city || "London",
        department: body.department || "Operations",
        jobTitle: body.jobTitle || "Specialist",
        status: "ACTIVE",
        budgetHousing: Number(body.budgetHousing) || 15000,
        budgetFlights: Number(body.budgetFlights) || 4000,
        budgetShipping: Number(body.budgetShipping) || 8000,
        budgetSettling: Number(body.budgetSettling) || 3000,
        workPermits: [
          {
            id: "perm-" + Date.now(),
            permitType: body.permitType || "Work Visa",
            permitNumber: "PRM-" + Math.floor(100000 + Math.random() * 900000),
            issuingCountry: body.hostCountry || "United Kingdom",
            issuedDate: new Date().toISOString(),
            expiryDate: new Date(body.expiryDate || Date.now() + 90 * 86400000).toISOString(),
            status: "VALID",
            cosAssigned: true,
            medicalCompleted: false,
            biometricsDone: false,
            submittedToGovt: false,
            counselNotes: "Initial record."
          }
        ],
        travelRecords: [],
        expenseClaims: []
      };
      store.unshift(newExpat);
      writeStore(store);
      return res.status(201).json(newExpat);
    }

    if (url.includes("/api/travel-logs") && method === "POST") {
      const store = readStore();
      const entry = new Date(body.entryDate || Date.now());
      const exit = body.exitDate ? new Date(body.exitDate) : new Date();
      const durationDays = Math.max(1, Math.ceil((exit.getTime() - entry.getTime()) / 86400000));

      const newLog = {
        id: "tr-" + Date.now(),
        country: body.country || "Host Country",
        entryDate: entry.toISOString(),
        exitDate: exit.toISOString(),
        durationDays,
        taxYear: entry.getFullYear(),
        purpose: body.purpose || "Assignment"
      };

      const expat = store.find((e) => e.id === body.expatriateId);
      if (expat) {
        expat.travelRecords.push(newLog);
        writeStore(store);
      }
      return res.status(201).json(newLog);
    }

    if (url.includes("/api/expenses") && method === "POST") {
      const store = readStore();
      const newClaim = {
        id: "exp-" + Date.now(),
        title: body.title || "Moving Expense",
        category: body.category || "TEMPORARY_HOUSING",
        amount: Number(body.amount) || 1000,
        currency: body.currency || "USD",
        amountInUSD: Number(body.amountInUSD || body.amount || 1000),
        vendor: body.vendor || "Vendor",
        status: "PENDING"
      };

      const expat = store.find((e) => e.id === body.expatriateId);
      if (expat) {
        expat.expenseClaims.push(newClaim);
        writeStore(store);
      }
      return res.status(201).json(newClaim);
    }

    return res.status(404).json({ error: "API route not found" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

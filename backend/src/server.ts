import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import path from "path";
import { Prisma, PrismaClient } from "@prisma/client";
import { MobilityService } from "./services/mobilityService";

const app = express();
const prisma = new PrismaClient();
const mobilityService = new MobilityService();

app.use(cors());
app.use(express.json());

const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

// ---- helpers ---------------------------------------------------------------
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Prisma returns Decimal objects which JSON-serialise to strings ("18000").
// Convert them to real numbers so clients can do arithmetic safely.
function serialize<T>(value: T): any {
  if (value === null || value === undefined) return value;
  if (Prisma.Decimal.isDecimal(value)) return (value as any).toNumber();
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as any).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

const wrap =
  (fn: (req: Request, res: Response) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res).catch(next);

const validDate = (v: any): Date | null => {
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const EXPAT_INCLUDE = { workPermits: true, travelRecords: true, expenseClaims: true };

// ---- routes ----------------------------------------------------------------
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get(
  "/api/expatriates",
  wrap(async (_req, res) => {
    const expats = await prisma.expatriate.findMany({
      include: EXPAT_INCLUDE,
      orderBy: { createdAt: "desc" }
    });
    res.json(serialize(expats));
  })
);

app.post(
  "/api/expatriates",
  wrap(async (req, res) => {
    const {
      employeeId, fullName, email, originCountry, hostCountry, city,
      department, jobTitle, budgetHousing, budgetFlights, budgetShipping,
      budgetSettling, permitType, permitNumber, expiryDate
    } = req.body;

    const required = { fullName, email, originCountry, hostCountry, city, department, jobTitle };
    const missing = Object.entries(required).filter(([, v]) => !v || !String(v).trim()).map(([k]) => k);
    if (missing.length) throw new HttpError(400, `Missing required fields: ${missing.join(", ")}`);

    const expiry = expiryDate ? validDate(expiryDate) : new Date(Date.now() + 90 * 86400000);
    if (!expiry) throw new HttpError(400, "Invalid permit expiry date.");
    const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86400000);

    try {
      const created = await prisma.expatriate.create({
        data: {
          employeeId: employeeId || `EXP-${Math.floor(10000 + Math.random() * 90000)}`,
          fullName: String(fullName).trim(),
          email: String(email).trim(),
          originCountry: String(originCountry).trim(),
          hostCountry: String(hostCountry).trim(),
          city: String(city).trim(),
          department: String(department).trim(),
          jobTitle: String(jobTitle).trim(),
          status: "ACTIVE",
          budgetHousing: Number(budgetHousing) || 15000,
          budgetFlights: Number(budgetFlights) || 4000,
          budgetShipping: Number(budgetShipping) || 8000,
          budgetSettling: Number(budgetSettling) || 3000,
          workPermits: permitType
            ? {
                create: {
                  permitType,
                  permitNumber: permitNumber || `PRM-${Math.floor(100000 + Math.random() * 900000)}${Math.floor(Math.random() * 100)}`,
                  issuingCountry: hostCountry,
                  issuedDate: new Date(),
                  expiryDate: expiry,
                  status: daysLeft <= 30 ? "CRITICAL" : daysLeft <= 90 ? "EXPIRING_SOON" : "VALID",
                  cosAssigned: true,
                  counselNotes: "Initial relocation record."
                }
              }
            : undefined
        },
        include: EXPAT_INCLUDE
      });
      res.status(201).json(serialize(created));
    } catch (err: any) {
      if (err?.code === "P2002") throw new HttpError(400, "An expatriate with this email or employee ID already exists.");
      throw err;
    }
  })
);

app.patch(
  "/api/visas/:id/renewal-workflow",
  wrap(async (req, res) => {
    const { cosAssigned, medicalCompleted, biometricsDone, submittedToGovt, counselNotes, status, newExpiryDate } = req.body;

    // Only touch fields that were actually sent (previously omitted flags were reset to false).
    const data: Prisma.WorkPermitUpdateInput = {};
    if (cosAssigned !== undefined) data.cosAssigned = Boolean(cosAssigned);
    if (medicalCompleted !== undefined) data.medicalCompleted = Boolean(medicalCompleted);
    if (biometricsDone !== undefined) data.biometricsDone = Boolean(biometricsDone);
    if (submittedToGovt !== undefined) data.submittedToGovt = Boolean(submittedToGovt);
    if (counselNotes !== undefined) data.counselNotes = counselNotes;
    if (status) data.status = status;
    if (newExpiryDate) {
      const d = validDate(newExpiryDate);
      if (!d) throw new HttpError(400, "Invalid expiry date.");
      data.expiryDate = d;
    }

    try {
      const updated = await prisma.workPermit.update({ where: { id: req.params.id }, data });
      res.json(serialize(updated));
    } catch (err: any) {
      if (err?.code === "P2025") throw new HttpError(404, "Work permit not found.");
      throw err;
    }
  })
);

app.post(
  "/api/travel-logs",
  wrap(async (req, res) => {
    const { expatriateId, country, entryDate, exitDate, purpose } = req.body;
    const entry = validDate(entryDate);
    if (!expatriateId || !entry) throw new HttpError(400, "expatriateId and a valid entryDate are required.");
    const exit = exitDate ? validDate(exitDate) : new Date();
    if (!exit) throw new HttpError(400, "Invalid exit date.");
    if (exit < entry) throw new HttpError(400, "Exit date cannot be before entry date.");

    const expat = await prisma.expatriate.findUnique({ where: { id: expatriateId } });
    if (!expat) throw new HttpError(404, "Expatriate not found.");

    const log = await prisma.travelLog.create({
      data: {
        expatriateId,
        country: country || expat.hostCountry,
        entryDate: entry,
        exitDate: exitDate ? exit : null,
        durationDays: Math.max(1, Math.ceil((exit.getTime() - entry.getTime()) / 86400000)),
        taxYear: entry.getFullYear(),
        purpose
      }
    });
    res.status(201).json(serialize(log));
  })
);

app.post(
  "/api/expenses",
  wrap(async (req, res) => {
    const { expatriateId, title, category, amount, currency, amountInUSD, vendor } = req.body;
    const amt = Number(amount);
    if (!expatriateId || !title || !vendor) throw new HttpError(400, "expatriateId, title and vendor are required.");
    if (!isFinite(amt) || amt <= 0) throw new HttpError(400, "Amount must be a positive number.");

    const expat = await prisma.expatriate.findUnique({ where: { id: expatriateId } });
    if (!expat) throw new HttpError(404, "Expatriate not found.");

    const expense = await prisma.expenseClaim.create({
      data: {
        expatriateId,
        title,
        category: category || "TEMPORARY_HOUSING",
        amount: amt,
        currency: currency || "USD",
        amountInUSD: Number(amountInUSD) > 0 ? Number(amountInUSD) : amt,
        vendor,
        status: "PENDING"
      }
    });
    res.status(201).json(serialize(expense));
  })
);

app.patch(
  "/api/expenses/:id/status",
  wrap(async (req, res) => {
    const { status, reviewedBy } = req.body;
    const allowed = ["PENDING", "APPROVED", "REIMBURSED", "REJECTED"];
    if (!allowed.includes(status)) throw new HttpError(400, `Status must be one of: ${allowed.join(", ")}`);
    try {
      const updated = await prisma.expenseClaim.update({
        where: { id: req.params.id },
        data: { status, reviewedBy: reviewedBy || "Global Mobility Admin", reviewedDate: new Date() }
      });
      res.json(serialize(updated));
    } catch (err: any) {
      if (err?.code === "P2025") throw new HttpError(404, "Expense claim not found.");
      throw err;
    }
  })
);

// ---- analytics (MobilityService) -------------------------------------------
app.get(
  "/api/visas/expiring",
  wrap(async (req, res) => {
    const days = Number(req.query.days) || 90;
    res.json(serialize(await mobilityService.getExpiringVisas(days)));
  })
);

app.get(
  "/api/expatriates/:id/tax-residency",
  wrap(async (req, res) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    try {
      res.json(await mobilityService.getTaxResidencyStatus(req.params.id, year));
    } catch (err: any) {
      if (err.message === "Expatriate not found") throw new HttpError(404, err.message);
      throw err;
    }
  })
);

app.get(
  "/api/expatriates/:id/allowance",
  wrap(async (req, res) => {
    try {
      res.json(await mobilityService.getRelocationAllowanceSummary(req.params.id));
    } catch (err: any) {
      if (err.message === "Expatriate not found") throw new HttpError(404, err.message);
      throw err;
    }
  })
);

// ---- fallbacks ---------------------------------------------------------------
app.use("/api", (req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.originalUrl}` });
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof HttpError ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: err.message || "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Corporate Relocation & Visa Tracker running at http://localhost:${PORT}`);
});

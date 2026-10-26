import express, { Request, Response } from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/expatriates", async (_req: Request, res: Response) => {
  try {
    const expats = await prisma.expatriate.findMany({
      include: {
        workPermits: true,
        travelRecords: true,
        expenseClaims: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(expats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/expatriates", async (req: Request, res: Response) => {
  try {
    const {
      employeeId,
      fullName,
      email,
      originCountry,
      hostCountry,
      city,
      department,
      jobTitle,
      budgetHousing,
      budgetFlights,
      budgetShipping,
      budgetSettling,
      permitType,
      permitNumber,
      expiryDate,
    } = req.body;

    const newExpat = await prisma.expatriate.create({
      data: {
        employeeId: employeeId || `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName,
        email,
        originCountry,
        hostCountry,
        city,
        department,
        jobTitle,
        status: "ACTIVE",
        budgetHousing: Number(budgetHousing) || 15000,
        budgetFlights: Number(budgetFlights) || 4000,
        budgetShipping: Number(budgetShipping) || 8000,
        budgetSettling: Number(budgetSettling) || 3000,
        workPermits: {
          create: [
            {
              permitType: permitType || "Work Visa",
              permitNumber: permitNumber || `PRM-${Math.floor(100000 + Math.random() * 900000)}`,
              issuingCountry: hostCountry,
              expiryDate: new Date(expiryDate || Date.now() + 90 * 86400000),
              status: "VALID",
              cosAssigned: true,
              medicalCompleted: false,
              biometricsDone: false,
              submittedToGovt: false,
              counselNotes: "Initial record.",
            },
          ],
        },
      },
      include: {
        workPermits: true,
        travelRecords: true,
        expenseClaims: true,
      },
    });
    res.status(201).json(newExpat);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/visas/:id/renewal-workflow", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cosAssigned, medicalCompleted, biometricsDone, submittedToGovt, counselNotes, status, newExpiryDate } = req.body;

    const updateData: any = {
      cosAssigned: Boolean(cosAssigned),
      medicalCompleted: Boolean(medicalCompleted),
      biometricsDone: Boolean(biometricsDone),
      submittedToGovt: Boolean(submittedToGovt),
      counselNotes,
      status,
    };
    if (newExpiryDate) {
      updateData.expiryDate = new Date(newExpiryDate);
    }

    const updated = await prisma.workPermit.update({
      where: { id },
      data: updateData,
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/travel-logs", async (req: Request, res: Response) => {
  try {
    const { expatriateId, country, entryDate, exitDate, purpose } = req.body;
    const entry = new Date(entryDate);
    const exit = exitDate ? new Date(exitDate) : new Date();
    const durationDays = Math.max(1, Math.ceil((exit.getTime() - entry.getTime()) / 86400000));

    const log = await prisma.travelRecord.create({
      data: {
        expatriateId,
        country,
        entryDate: entry,
        exitDate: exit,
        durationDays,
        taxYear: entry.getFullYear(),
        purpose,
      },
    });
    res.status(201).json(log);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/expenses", async (req: Request, res: Response) => {
  try {
    const { expatriateId, title, category, amount, currency, amountInUSD, vendor } = req.body;
    const claim = await prisma.expenseClaim.create({
      data: {
        expatriateId,
        title,
        category,
        amount: Number(amount),
        currency: currency || "USD",
        amountInUSD: Number(amountInUSD || amount),
        vendor,
        status: "PENDING",
      },
    });
    res.status(201).json(claim);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/expenses/:id/status", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await prisma.expenseClaim.update({
      where: { id },
      data: { status },
    });
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;

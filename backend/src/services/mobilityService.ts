import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class MobilityService {
  async getTaxResidencyStatus(expatId: string, taxYear: number) {
    const expat = await prisma.expatriate.findUnique({
      where: { id: expatId },
      include: {
        travelRecords: {
          where: { taxYear }
        }
      }
    });

    if (!expat) {
      throw new Error("Expatriate not found");
    }

    const hostTravels = expat.travelRecords.filter(
      (t: any) => t.country.toLowerCase() === expat.hostCountry.toLowerCase()
    );
    const totalDays = hostTravels.reduce((acc: number, log: any) => acc + log.durationDays, 0);

    let riskLevel = "SAFE";
    let guidance = "Expatriate is well within standard non-residency limits.";

    if (totalDays >= 183) {
      riskLevel = "CRITICAL_RESIDENCY_TRIGGERED";
      guidance = "Statutory 183-day rule exceeded. Subject to host domestic tax residency and shadow payroll obligations.";
    } else if (totalDays >= 120) {
      riskLevel = "ATTENTION";
      guidance = "Approaching 183-day threshold. Monitor travel itinerary closely.";
    }

    return {
      expatriate: expat.fullName,
      hostCountry: expat.hostCountry,
      taxYear,
      daysInCountry: totalDays,
      thresholdLimit: 183,
      daysRemaining: Math.max(0, 183 - totalDays),
      riskLevel,
      guidance
    };
  }

  async getExpiringVisas(daysThreshold: number = 90) {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);

    const permits = await prisma.workPermit.findMany({
      where: {
        expiryDate: { lte: thresholdDate },
        status: { not: "IN_RENEWAL" }
      },
      include: { expatriate: true },
      orderBy: { expiryDate: "asc" }
    });

    return permits.map((permit: any) => {
      const diffTime = permit.expiryDate.getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...permit,
        daysRemaining: daysLeft,
        urgency: daysLeft <= 30 ? "CRITICAL" : "WARNING"
      };
    });
  }

  async getRelocationAllowanceSummary(expatId: string) {
    const expat = await prisma.expatriate.findUnique({
      where: { id: expatId },
      include: {
        expenseClaims: {
          where: { status: { in: ["APPROVED", "REIMBURSED"] } }
        }
      }
    });

    if (!expat) {
      throw new Error("Expatriate not found");
    }

    const spentByCategory: { [key: string]: number } = {
      TEMPORARY_HOUSING: 0,
      FLIGHT_TRAVEL: 0,
      CONTAINER_SHIPPING: 0,
      SETTLING_IN: 0,
      OTHER: 0
    };

    expat.expenseClaims.forEach((claim: any) => {
      const cat = claim.category as string;
      if (typeof spentByCategory[cat] === "number") {
        spentByCategory[cat] += Number(claim.amountInUSD);
      } else {
        spentByCategory.OTHER += Number(claim.amountInUSD);
      }
    });

    const totalAllocated =
      Number(expat.budgetHousing) +
      Number(expat.budgetFlights) +
      Number(expat.budgetShipping) +
      Number(expat.budgetSettling);

    const totalSpent = Object.values(spentByCategory).reduce((a: number, b: number) => a + b, 0);

    return {
      expatriateId: expat.id,
      fullName: expat.fullName,
      totalBudgetUSD: totalAllocated,
      totalSpentUSD: totalSpent,
      remainingUSD: totalAllocated - totalSpent,
      breakdown: {
        housing: { allocated: Number(expat.budgetHousing), spent: spentByCategory.TEMPORARY_HOUSING },
        flights: { allocated: Number(expat.budgetFlights), spent: spentByCategory.FLIGHT_TRAVEL },
        shipping: { allocated: Number(expat.budgetShipping), spent: spentByCategory.CONTAINER_SHIPPING },
        settlingIn: { allocated: Number(expat.budgetSettling), spent: spentByCategory.SETTLING_IN }
      }
    };
  }
}

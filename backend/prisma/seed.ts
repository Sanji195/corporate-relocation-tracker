import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.expenseClaim.deleteMany();
  await prisma.travelLog.deleteMany();
  await prisma.workPermit.deleteMany();
  await prisma.expatriate.deleteMany();

  await prisma.expatriate.create({
    data: {
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
      workPermits: {
        create: {
          permitType: "Skilled Worker Visa (Tier 2)",
          permitNumber: "GBR-9928104",
          issuingCountry: "United Kingdom",
          issuedDate: new Date("2023-11-15"),
          expiryDate: new Date(Date.now() + 24 * 24 * 60 * 60 * 1000),
          status: "CRITICAL",
          cosAssigned: true,
          medicalCompleted: true,
          biometricsDone: false,
          submittedToGovt: false,
          counselNotes: "Sponsorship assigned. Employee must book biometrics at Croydon VAC."
        }
      },
      travelRecords: {
        create: [
          {
            country: "United Kingdom",
            entryDate: new Date("2026-01-10"),
            exitDate: new Date("2026-06-30"),
            durationDays: 171,
            taxYear: 2026,
            purpose: "Primary Relocation Assignment"
          }
        ]
      },
      expenseClaims: {
        create: [
          {
            title: "Serviced Apartment (Canary Wharf)",
            category: "TEMPORARY_HOUSING",
            amount: 8500,
            currency: "GBP",
            amountInUSD: 10800,
            vendor: "Cheval Residences",
            status: "APPROVED"
          },
          {
            title: "Relocation Freight Container",
            category: "CONTAINER_SHIPPING",
            amount: 5200,
            currency: "EUR",
            amountInUSD: 5600,
            vendor: "Santa Fe Relocation",
            status: "REIMBURSED"
          }
        ]
      }
    }
  });

  await prisma.expatriate.create({
    data: {
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
      workPermits: {
        create: {
          permitType: "L-1A Intra-Company Transferee",
          permitNumber: "USA-7719280",
          issuingCountry: "United States",
          issuedDate: new Date("2024-03-01"),
          expiryDate: new Date(Date.now() + 210 * 24 * 60 * 60 * 1000),
          status: "VALID",
          cosAssigned: true,
          medicalCompleted: true,
          biometricsDone: true,
          submittedToGovt: true,
          counselNotes: "I-797 approval notice on file through 2027."
        }
      },
      travelRecords: {
        create: [
          {
            country: "United States",
            entryDate: new Date("2026-01-05"),
            exitDate: new Date("2026-07-18"),
            durationDays: 194,
            taxYear: 2026,
            purpose: "Substantial Physical Presence Assignment"
          }
        ]
      },
      expenseClaims: {
        create: [
          {
            title: "Executive Housing - Bay Area",
            category: "TEMPORARY_HOUSING",
            amount: 14200,
            currency: "USD",
            amountInUSD: 14200,
            vendor: "Oakwood Corporate Housing",
            status: "APPROVED"
          },
          {
            title: "Tokyo to SFO Business Class Flight",
            category: "FLIGHT_TRAVEL",
            amount: 4100,
            currency: "USD",
            amountInUSD: 4100,
            vendor: "All Nippon Airways",
            status: "APPROVED"
          }
        ]
      }
    }
  });

  await prisma.expatriate.create({
    data: {
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
      workPermits: {
        create: {
          permitType: "EU Blue Card",
          permitNumber: "DEU-4401928",
          issuingCountry: "Germany",
          issuedDate: new Date("2024-05-10"),
          expiryDate: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
          status: "EXPIRING_SOON",
          cosAssigned: true,
          medicalCompleted: true,
          biometricsDone: false,
          submittedToGovt: false,
          counselNotes: "Renewal submitted to Munich Immigration Office; biometrics pending appointment."
        }
      },
      travelRecords: {
        create: [
          {
            country: "Germany",
            entryDate: new Date("2026-02-01"),
            exitDate: new Date("2026-06-15"),
            durationDays: 134,
            taxYear: 2026,
            purpose: "R&D Center Assignment"
          }
        ]
      },
      expenseClaims: {
        create: [
          {
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
    }
  });

  console.log("Database seeded successfully with 3 complete Expatriate mobility portfolios.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
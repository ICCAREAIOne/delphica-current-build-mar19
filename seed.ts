import { drizzle } from "drizzle-orm/mysql2";
import { patients } from "./drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

const samplePatients = [
  {
    mrn: "MRN001234",
    firstName: "John",
    lastName: "Anderson",
    dateOfBirth: new Date("1965-03-15"),
    gender: "male" as const,
    email: "john.anderson@email.com",
    phone: "(555) 123-4567",
    allergies: ["Penicillin", "Sulfa drugs"],
    chronicConditions: ["Type 2 Diabetes", "Hypertension"],
    currentMedications: ["Metformin 500mg", "Lisinopril 10mg"],
    status: "active" as const,
  },
  {
    mrn: "MRN005678",
    firstName: "Sarah",
    lastName: "Mitchell",
    dateOfBirth: new Date("1978-07-22"),
    gender: "female" as const,
    email: "sarah.mitchell@email.com",
    phone: "(555) 234-5678",
    allergies: ["Latex"],
    chronicConditions: ["Asthma"],
    currentMedications: ["Albuterol inhaler"],
    status: "active" as const,
  },
];

async function seed() {
  for (const patient of samplePatients) {
    await db.insert(patients).values(patient);
    console.log(`✓ ${patient.firstName} ${patient.lastName}`);
  }
  process.exit(0);
}

seed();

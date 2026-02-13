import { drizzle } from "drizzle-orm/mysql2";
import { patients } from "./drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

const samplePatients = [
  {
    mrn: "MRN001234",
    firstName: "John",
    lastName: "Anderson",
    dateOfBirth: new Date("1965-03-15"),
    gender: "male",
    email: "john.anderson@email.com",
    phone: "(555) 123-4567",
    address: "123 Main St, Boston, MA 02101",
    allergies: ["Penicillin", "Sulfa drugs"],
    chronicConditions: ["Type 2 Diabetes", "Hypertension"],
    currentMedications: ["Metformin 500mg", "Lisinopril 10mg", "Atorvastatin 20mg"],
    status: "active",
  },
  {
    mrn: "MRN005678",
    firstName: "Sarah",
    lastName: "Mitchell",
    dateOfBirth: new Date("1978-07-22"),
    gender: "female",
    email: "sarah.mitchell@email.com",
    phone: "(555) 234-5678",
    address: "456 Oak Ave, Cambridge, MA 02138",
    allergies: ["Latex"],
    chronicConditions: ["Asthma"],
    currentMedications: ["Albuterol inhaler", "Fluticasone inhaler"],
    status: "active",
  },
  {
    mrn: "MRN009012",
    firstName: "Robert",
    lastName: "Chen",
    dateOfBirth: new Date("1952-11-08"),
    gender: "male",
    email: "robert.chen@email.com",
    phone: "(555) 345-6789",
    address: "789 Elm St, Somerville, MA 02144",
    allergies: [],
    chronicConditions: ["Coronary Artery Disease", "Hyperlipidemia", "Chronic Kidney Disease Stage 3"],
    currentMedications: ["Aspirin 81mg", "Clopidogrel 75mg", "Metoprolol 50mg", "Rosuvastatin 40mg"],
    status: "active",
  },
  {
    mrn: "MRN003456",
    firstName: "Maria",
    lastName: "Rodriguez",
    dateOfBirth: new Date("1990-05-30"),
    gender: "female",
    email: "maria.rodriguez@email.com",
    phone: "(555) 456-7890",
    address: "321 Pine Rd, Brookline, MA 02445",
    allergies: ["Codeine"],
    chronicConditions: [],
    currentMedications: [],
    status: "active",
  },
  {
    mrn: "MRN007890",
    firstName: "James",
    lastName: "Thompson",
    dateOfBirth: new Date("1945-09-12"),
    gender: "male",
    email: "james.thompson@email.com",
    phone: "(555) 567-8901",
    address: "654 Maple Dr, Newton, MA 02458",
    allergies: ["NSAIDs"],
    chronicConditions: ["COPD", "Osteoarthritis", "Benign Prostatic Hyperplasia"],
    currentMedications: ["Tiotropium inhaler", "Acetaminophen 500mg PRN", "Tamsulosin 0.4mg"],
    status: "active",
  },
];

async function seedPatients() {
  console.log("Seeding sample patients...");
  
  for (const patient of samplePatients) {
    try {
      await db.insert(patients).values(patient);
      console.log(`✓ Created patient: ${patient.firstName} ${patient.lastName} (${patient.mrn})`);
    } catch (error) {
      console.error(`✗ Error creating patient ${patient.mrn}:`, error.message);
    }
  }
  
  console.log("Seeding complete!");
  process.exit(0);
}

seedPatients().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});

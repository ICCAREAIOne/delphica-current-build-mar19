import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Patients table - core clinical data
 */
export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  mrn: varchar("mrn", { length: 64 }).notNull().unique(), // Medical Record Number
  firstName: varchar("firstName", { length: 128 }).notNull(),
  lastName: varchar("lastName", { length: 128 }).notNull(),
  dateOfBirth: timestamp("dateOfBirth").notNull(),
  gender: mysqlEnum("gender", ["male", "female", "other", "unknown"]).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  address: text("address"),
  allergies: json("allergies").$type<string[]>(), // Array of allergy descriptions
  chronicConditions: json("chronicConditions").$type<string[]>(), // Array of chronic conditions
  currentMedications: json("currentMedications").$type<string[]>(), // Array of current medications
  status: mysqlEnum("status", ["active", "inactive", "discharged"]).default("active").notNull(),
  assignedPhysicianId: int("assignedPhysicianId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

/**
 * DAO Protocol Entries - structured diagnosis and treatment records
 */
export const daoProtocolEntries = mysqlTable("dao_protocol_entries", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  chiefComplaint: text("chiefComplaint").notNull(),
  symptoms: json("symptoms").$type<string[]>().notNull(), // Array of symptom descriptions
  vitalSigns: json("vitalSigns").$type<{
    temperature?: number;
    bloodPressure?: string;
    heartRate?: number;
    respiratoryRate?: number;
    oxygenSaturation?: number;
  }>(),
  physicalExamFindings: text("physicalExamFindings"),
  labResults: json("labResults").$type<Array<{
    testName: string;
    value: string;
    unit: string;
    normalRange: string;
    date: string;
  }>>(),
  imagingResults: json("imagingResults").$type<Array<{
    type: string;
    findings: string;
    date: string;
  }>>(),
  diagnosis: text("diagnosis").notNull(),
  differentialDiagnosis: json("differentialDiagnosis").$type<string[]>(), // Array of differential diagnoses
  treatmentPlan: text("treatmentPlan").notNull(),
  status: mysqlEnum("status", ["draft", "completed", "revised"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DaoProtocolEntry = typeof daoProtocolEntries.$inferSelect;
export type InsertDaoProtocolEntry = typeof daoProtocolEntries.$inferInsert;

/**
 * Delphi Simulations - AI-powered scenario exploration
 */
export const delphiSimulations = mysqlTable("delphi_simulations", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  daoEntryId: int("daoEntryId").references(() => daoProtocolEntries.id),
  scenarioDescription: text("scenarioDescription").notNull(),
  treatmentOptions: json("treatmentOptions").$type<Array<{
    option: string;
    description: string;
    predictedOutcome: string;
    confidence: number;
    risks: string[];
    benefits: string[];
  }>>().notNull(),
  selectedOption: text("selectedOption"),
  aiAnalysis: text("aiAnalysis").notNull(), // Full AI-generated analysis
  conversationHistory: json("conversationHistory").$type<Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DelphiSimulation = typeof delphiSimulations.$inferSelect;
export type InsertDelphiSimulation = typeof delphiSimulations.$inferInsert;

/**
 * Causal Insights - evidence-based AI recommendations
 */
export const causalInsights = mysqlTable("causal_insights", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  daoEntryId: int("daoEntryId").references(() => daoProtocolEntries.id),
  insightType: mysqlEnum("insightType", ["risk_prediction", "treatment_efficacy", "pattern_analysis", "causal_relationship"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  causalFactors: json("causalFactors").$type<Array<{
    factor: string;
    impact: string;
    confidence: number;
  }>>().notNull(),
  evidenceSources: json("evidenceSources").$type<Array<{
    source: string;
    citation: string;
    relevance: number;
  }>>(),
  recommendations: json("recommendations").$type<string[]>().notNull(),
  confidenceScore: int("confidenceScore").notNull(), // 0-100
  aiGeneratedAt: timestamp("aiGeneratedAt").defaultNow().notNull(),
  reviewedByPhysician: boolean("reviewedByPhysician").default(false).notNull(),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CausalInsight = typeof causalInsights.$inferSelect;
export type InsertCausalInsight = typeof causalInsights.$inferInsert;

/**
 * Precision Care Plans - personalized AI-optimized treatment plans
 */
export const precisionCarePlans = mysqlTable("precision_care_plans", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  daoEntryId: int("daoEntryId").references(() => daoProtocolEntries.id),
  delphiSimulationId: int("delphiSimulationId").references(() => delphiSimulations.id),
  planTitle: varchar("planTitle", { length: 255 }).notNull(),
  diagnosis: text("diagnosis").notNull(),
  goals: json("goals").$type<string[]>().notNull(),
  interventions: json("interventions").$type<Array<{
    intervention: string;
    frequency: string;
    duration: string;
    rationale: string;
  }>>().notNull(),
  medications: json("medications").$type<Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
    purpose: string;
  }>>(),
  lifestyle: json("lifestyle").$type<Array<{
    recommendation: string;
    rationale: string;
  }>>(),
  followUp: json("followUp").$type<Array<{
    action: string;
    timeframe: string;
  }>>().notNull(),
  aiRationale: text("aiRationale").notNull(), // AI explanation for plan choices
  status: mysqlEnum("status", ["draft", "pending_review", "approved", "active", "completed", "revised"]).default("draft").notNull(),
  approvedAt: timestamp("approvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PrecisionCarePlan = typeof precisionCarePlans.$inferSelect;
export type InsertPrecisionCarePlan = typeof precisionCarePlans.$inferInsert;

/**
 * Safety Reviews - Digital Review Board verification records
 */
export const safetyReviews = mysqlTable("safety_reviews", {
  id: int("id").autoincrement().primaryKey(),
  carePlanId: int("carePlanId").references(() => precisionCarePlans.id),
  daoEntryId: int("daoEntryId").references(() => daoProtocolEntries.id),
  reviewType: mysqlEnum("reviewType", ["automated", "physician_override", "compliance_check"]).notNull(),
  safetyAlerts: json("safetyAlerts").$type<Array<{
    severity: "critical" | "warning" | "info";
    category: string;
    message: string;
    recommendation: string;
  }>>(),
  complianceChecks: json("complianceChecks").$type<Array<{
    guideline: string;
    status: "pass" | "fail" | "warning";
    details: string;
  }>>(),
  overallStatus: mysqlEnum("overallStatus", ["approved", "flagged", "rejected"]).notNull(),
  reviewerNotes: text("reviewerNotes"),
  reviewedById: int("reviewedById").references(() => users.id),
  overrideJustification: text("overrideJustification"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SafetyReview = typeof safetyReviews.$inferSelect;
export type InsertSafetyReview = typeof safetyReviews.$inferInsert;

/**
 * Clinical Outcomes - marketplace feedback loop for continuous learning
 */
export const clinicalOutcomes = mysqlTable("clinical_outcomes", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  carePlanId: int("carePlanId").references(() => precisionCarePlans.id),
  daoEntryId: int("daoEntryId").references(() => daoProtocolEntries.id),
  outcomeType: mysqlEnum("outcomeType", ["treatment_success", "partial_success", "no_improvement", "adverse_event", "followup"]).notNull(),
  description: text("description").notNull(),
  metrics: json("metrics").$type<Array<{
    metric: string;
    baseline: string;
    current: string;
    improvement: string;
  }>>(),
  patientSatisfaction: int("patientSatisfaction"), // 1-10 scale
  adverseEvents: json("adverseEvents").$type<Array<{
    event: string;
    severity: string;
    resolution: string;
  }>>(),
  lessonsLearned: text("lessonsLearned"),
  feedbackForAI: text("feedbackForAI"), // Structured feedback to improve AI models
  documentedById: int("documentedById").notNull().references(() => users.id),
  outcomeDate: timestamp("outcomeDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClinicalOutcome = typeof clinicalOutcomes.$inferSelect;
export type InsertClinicalOutcome = typeof clinicalOutcomes.$inferInsert;

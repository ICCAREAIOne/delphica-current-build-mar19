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

/**
 * Coding Quality Metrics - tracks accuracy and quality of medical coding
 */
export const codingQualityMetrics = mysqlTable("coding_quality_metrics", {
  id: int("id").autoincrement().primaryKey(),
  daoEntryId: int("daoEntryId").notNull().references(() => daoProtocolEntries.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  
  // ICD-10 Coding Metrics
  icd10CodesGenerated: int("icd10CodesGenerated").notNull(),
  icd10CodesAccepted: int("icd10CodesAccepted").notNull(),
  icd10CodesModified: int("icd10CodesModified").notNull(),
  icd10CodesRejected: int("icd10CodesRejected").notNull(),
  icd10AvgConfidence: int("icd10AvgConfidence").notNull(), // 0-100
  
  // CPT Coding Metrics
  cptCodesGenerated: int("cptCodesGenerated").notNull(),
  cptCodesAccepted: int("cptCodesAccepted").notNull(),
  cptCodesModified: int("cptCodesModified").notNull(),
  cptCodesRejected: int("cptCodesRejected").notNull(),
  cptAvgConfidence: int("cptAvgConfidence").notNull(), // 0-100
  
  // Documentation Quality Scores
  documentationCompletenessScore: int("documentationCompletenessScore").notNull(), // 0-100
  clinicalSpecificityScore: int("clinicalSpecificityScore").notNull(), // 0-100
  codingAccuracyScore: int("codingAccuracyScore").notNull(), // 0-100
  reimbursementOptimizationScore: int("reimbursementOptimizationScore").notNull(), // 0-100
  overallQualityScore: int("overallQualityScore").notNull(), // 0-100
  
  // Improvement Suggestions
  suggestions: json("suggestions").$type<Array<{
    category: "documentation" | "coding" | "specificity" | "reimbursement";
    priority: "high" | "medium" | "low";
    issue: string;
    recommendation: string;
    potentialImpact: string;
  }>>(),
  
  // Processing Metadata
  processingTimeMs: int("processingTimeMs").notNull(),
  aiModelVersion: varchar("aiModelVersion", { length: 64 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CodingQualityMetric = typeof codingQualityMetrics.$inferSelect;
export type InsertCodingQualityMetric = typeof codingQualityMetrics.$inferInsert;

/**
 * Physician Performance Analytics - aggregated metrics per physician
 */
export const physicianPerformanceAnalytics = mysqlTable("physician_performance_analytics", {
  id: int("id").autoincrement().primaryKey(),
  physicianId: int("physicianId").notNull().references(() => users.id),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  
  // Volume Metrics
  totalEncounters: int("totalEncounters").notNull(),
  totalCodesGenerated: int("totalCodesGenerated").notNull(),
  totalCodesAccepted: int("totalCodesAccepted").notNull(),
  
  // Accuracy Metrics
  avgCodingAccuracy: int("avgCodingAccuracy").notNull(), // 0-100
  avgDocumentationQuality: int("avgDocumentationQuality").notNull(), // 0-100
  avgReimbursementOptimization: int("avgReimbursementOptimization").notNull(), // 0-100
  
  // Trend Analysis
  accuracyTrend: mysqlEnum("accuracyTrend", ["improving", "stable", "declining"]).notNull(),
  qualityTrend: mysqlEnum("qualityTrend", ["improving", "stable", "declining"]).notNull(),
  
  // Common Patterns
  commonCodingGaps: json("commonCodingGaps").$type<Array<{
    gap: string;
    frequency: number;
    recommendation: string;
  }>>(),
  strengthAreas: json("strengthAreas").$type<Array<{
    area: string;
    score: number;
  }>>(),
  improvementAreas: json("improvementAreas").$type<Array<{
    area: string;
    currentScore: number;
    targetScore: number;
    actionItems: string[];
  }>>(),
  
  // Financial Impact
  estimatedReimbursementImpact: int("estimatedReimbursementImpact"), // in cents
  potentialReimbursementGain: int("potentialReimbursementGain"), // in cents
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PhysicianPerformanceAnalytic = typeof physicianPerformanceAnalytics.$inferSelect;
export type InsertPhysicianPerformanceAnalytic = typeof physicianPerformanceAnalytics.$inferInsert;


/**
 * Protocol Applications - tracks when protocols are applied to encounters
 */
export const protocolApplications = mysqlTable("protocol_applications", {
  id: int("id").autoincrement().primaryKey(),
  protocolId: varchar("protocolId", { length: 128 }).notNull(), // e.g., "fatigue", "chest-pain"
  protocolName: varchar("protocolName", { length: 255 }).notNull(),
  daoEntryId: int("daoEntryId").notNull().references(() => daoProtocolEntries.id),
  patientId: int("patientId").notNull().references(() => patients.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  appliedAt: timestamp("appliedAt").defaultNow().notNull(),
  
  // Track which protocol sections were used
  sectionsUsed: json("sectionsUsed").$type<string[]>(), // e.g., ["initial_assessment", "lab_workup", "differential"]
  
  // Feedback tracking
  feedbackSubmitted: boolean("feedbackSubmitted").default(false).notNull(),
  feedbackRating: int("feedbackRating"), // 1-5 stars
  feedbackComment: text("feedbackComment"),
  feedbackSubmittedAt: timestamp("feedbackSubmittedAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProtocolApplication = typeof protocolApplications.$inferSelect;
export type InsertProtocolApplication = typeof protocolApplications.$inferInsert;

/**
 * Lab Order Templates - protocol-specific lab order bundles
 */
export const labOrderTemplates = mysqlTable("lab_order_templates", {
  id: int("id").autoincrement().primaryKey(),
  protocolId: varchar("protocolId", { length: 128 }).notNull(), // Links to protocol
  templateName: varchar("templateName", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["first_line", "additional", "specialized"]).notNull(),
  
  // Lab tests in this template
  labTests: json("labTests").$type<Array<{
    testName: string;
    testCode: string; // CPT code
    description: string;
    normalRange?: string;
    priority: "routine" | "urgent" | "stat";
  }>>().notNull(),
  
  // Usage tracking
  timesOrdered: int("timesOrdered").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LabOrderTemplate = typeof labOrderTemplates.$inferSelect;
export type InsertLabOrderTemplate = typeof labOrderTemplates.$inferInsert;

/**
 * Protocol Outcomes - clinical results from using protocols
 */
export const protocolOutcomes = mysqlTable("protocol_outcomes", {
  id: int("id").autoincrement().primaryKey(),
  protocolApplicationId: int("protocolApplicationId").notNull().references(() => protocolApplications.id),
  patientId: int("patientId").notNull().references(() => patients.id),
  daoEntryId: int("daoEntryId").notNull().references(() => daoProtocolEntries.id),
  
  // Outcome tracking
  outcomeType: mysqlEnum("outcomeType", ["diagnosis_confirmed", "diagnosis_changed", "treatment_successful", "treatment_modified", "referred", "ongoing"]).notNull(),
  finalDiagnosis: text("finalDiagnosis"),
  diagnosisMatchedProtocol: boolean("diagnosisMatchedProtocol"), // Did final diagnosis match protocol's differential?
  
  // Clinical metrics
  timeToResolution: int("timeToResolution"), // Days from protocol application to resolution
  labsOrdered: int("labsOrdered"),
  labsAbnormal: int("labsAbnormal"),
  followUpVisits: int("followUpVisits"),
  
  // Quality metrics
  protocolAdherence: int("protocolAdherence"), // 0-100 percentage
  patientSatisfaction: int("patientSatisfaction"), // 1-10 scale
  
  notes: text("notes"),
  documentedById: int("documentedById").notNull().references(() => users.id),
  outcomeDate: timestamp("outcomeDate").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProtocolOutcome = typeof protocolOutcomes.$inferSelect;
export type InsertProtocolOutcome = typeof protocolOutcomes.$inferInsert;

// Clinical Knowledge Base Tables
export const knowledgeBase = mysqlTable("knowledge_base", {
  id: int("id").autoincrement().primaryKey(),
  compoundName: varchar("compound_name", { length: 255 }).notNull(), // e.g., "Cinnamic Acid", "Ferulic Acid"
  category: varchar("category", { length: 128 }).notNull(), // e.g., "PPAR-gamma Agonist", "Anti-inflammatory", "Insulin Sensitizer"
  summary: text("summary").notNull(), // Brief description
  mechanisms: json("mechanisms").$type<Array<{name: string, description: string}>>().notNull(), // Array of mechanism objects
  clinicalEvidence: json("clinical_evidence").$type<Array<{finding: string, source: string}>>().notNull(), // Array of evidence objects
  dosing: json("dosing").$type<{typical: string, range: string, notes: string}>(), // Dosing information
  contraindications: json("contraindications").$type<string[]>(), // Array of contraindications
  interactions: json("interactions").$type<string[]>(), // Array of drug/supplement interactions
  sources: json("sources").$type<string[]>().notNull(), // Array of source URLs/citations
  tags: json("tags").$type<string[]>().notNull(), // Array of searchable tags
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  createdBy: int("created_by").references(() => users.id),
});

export const knowledgeBaseReferences = mysqlTable("knowledge_base_references", {
  id: int("id").autoincrement().primaryKey(),
  knowledgeBaseId: int("knowledge_base_id").notNull().references(() => knowledgeBase.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }).notNull(),
  authors: text("authors"),
  journal: varchar("journal", { length: 255 }),
  year: int("year"),
  doi: varchar("doi", { length: 128 }),
  pmid: varchar("pmid", { length: 32 }),
  url: text("url"),
  abstract: text("abstract"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledgeBaseUsage = mysqlTable("knowledge_base_usage", {
  id: int("id").autoincrement().primaryKey(),
  knowledgeBaseId: int("knowledge_base_id").notNull().references(() => knowledgeBase.id),
  encounterId: int("encounter_id"), // Reference to encounter (table not yet created)
  physicianId: int("physician_id").notNull().references(() => users.id),
  context: varchar("context", { length: 128 }), // How it was used (e.g., "treatment_plan", "differential_diagnosis")
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export type KnowledgeBase = typeof knowledgeBase.$inferSelect;
export type InsertKnowledgeBase = typeof knowledgeBase.$inferInsert;
export type KnowledgeBaseReference = typeof knowledgeBaseReferences.$inferSelect;
export type InsertKnowledgeBaseReference = typeof knowledgeBaseReferences.$inferInsert;
export type KnowledgeBaseUsage = typeof knowledgeBaseUsage.$inferSelect;
export type InsertKnowledgeBaseUsage = typeof knowledgeBaseUsage.$inferInsert;

/**
 * Patient Intake Sessions - AI avatar intake conversations
 */
export const intakeSessions = mysqlTable("intake_sessions", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patient_id").references(() => patients.id),
  sessionToken: varchar("session_token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("status", ["in_progress", "completed", "abandoned"]).default("in_progress").notNull(),
  collectedData: json("collected_data").$type<{
    chiefComplaint?: string;
    symptoms?: string[];
    duration?: string;
    severity?: string;
    medicalHistory?: string[];
    currentMedications?: string[];
    allergies?: string[];
    socialHistory?: {
      smoking?: string;
      alcohol?: string;
      exercise?: string;
    };
    reviewOfSystems?: Record<string, string[]>;
  }>(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type IntakeSession = typeof intakeSessions.$inferSelect;
export type InsertIntakeSession = typeof intakeSessions.$inferInsert;

/**
 * Intake Messages - conversation history for intake sessions
 */
export const intakeMessages = mysqlTable("intake_messages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("session_id").notNull().references(() => intakeSessions.id),
  role: mysqlEnum("role", ["assistant", "user"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type IntakeMessage = typeof intakeMessages.$inferSelect;
export type InsertIntakeMessage = typeof intakeMessages.$inferInsert;

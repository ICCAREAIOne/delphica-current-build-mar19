import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, decimal, date, index } from "drizzle-orm/mysql-core";

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
  
  // Stripe subscription fields
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  subscriptionStatus: mysqlEnum("subscription_status", ["active", "canceled", "past_due", "trialing", "inactive"]).default("inactive"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  
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
  patientName: varchar("patient_name", { length: 255 }),
  patientEmail: varchar("patient_email", { length: 320 }),
  language: varchar("language", { length: 10 }).notNull().default("en"),
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

/**
 * Patient Lab Results - stores lab data uploaded by patients
 */
export const patientLabResults = mysqlTable("patient_lab_results", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patient_id").notNull().references(() => patients.id),
  uploadedBy: mysqlEnum("uploaded_by", ["patient", "physician", "system"]).default("patient").notNull(),
  uploadMethod: mysqlEnum("upload_method", ["manual_entry", "pdf_upload", "hl7_integration"]).notNull(),
  
  // Lab data
  testDate: timestamp("test_date").notNull(),
  labName: varchar("lab_name", { length: 255 }),
  testResults: json("test_results").$type<Array<{
    testName: string;
    value: string;
    unit: string;
    normalRange: string;
    flag?: "high" | "low" | "critical" | "normal";
  }>>().notNull(),
  
  // PDF storage
  pdfUrl: text("pdf_url"), // S3 URL if uploaded as PDF
  pdfText: text("pdf_text"), // Extracted text from PDF
  
  // Review status
  reviewedByPhysician: boolean("reviewed_by_physician").default(false).notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedById: int("reviewed_by_id").references(() => users.id),
  physicianNotes: text("physician_notes"), // Physician annotations and comments
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PatientLabResult = typeof patientLabResults.$inferSelect;
export type InsertPatientLabResult = typeof patientLabResults.$inferInsert;

/**
 * Patient Care Plans - physician-created care plans viewable by patients
 */
export const patientCarePlans = mysqlTable("patient_care_plans", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patient_id").notNull().references(() => patients.id),
  physicianId: int("physician_id").notNull().references(() => users.id),
  precisionCarePlanId: int("precision_care_plan_id").references(() => precisionCarePlans.id),
  
  title: varchar("title", { length: 255 }).notNull(),
  diagnosis: text("diagnosis").notNull(),
  goals: json("goals").$type<string[]>().notNull(),
  
  // Treatment components
  medications: json("medications").$type<Array<{
    name: string;
    dosage: string;
    frequency: string;
    instructions: string;
    startDate: string;
    endDate?: string;
  }>>(),
  lifestyle: json("lifestyle").$type<Array<{
    category: string;
    recommendation: string;
    frequency?: string;
  }>>(),
  monitoring: json("monitoring").$type<Array<{
    metric: string;
    frequency: string;
    target: string;
    instructions: string;
  }>>().notNull(),
  
  // Check-in schedule
  checkInFrequency: mysqlEnum("check_in_frequency", ["daily", "every_other_day", "weekly", "biweekly", "monthly"]).notNull(),
  nextCheckInDate: timestamp("next_check_in_date").notNull(),
  
  // Status
  status: mysqlEnum("status", ["active", "completed", "paused", "cancelled"]).default("active").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  
  // Patient visibility
  sharedWithPatient: boolean("shared_with_patient").default(false).notNull(),
  sharedAt: timestamp("shared_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PatientCarePlan = typeof patientCarePlans.$inferSelect;
export type InsertPatientCarePlan = typeof patientCarePlans.$inferInsert;

/**
 * Patient Check-ins - daily/weekly/biweekly progress tracking
 */
export const patientCheckIns = mysqlTable("patient_check_ins", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patient_id").notNull().references(() => patients.id),
  carePlanId: int("care_plan_id").notNull().references(() => patientCarePlans.id),
  
  // Check-in data
  checkInDate: timestamp("check_in_date").notNull(),
  overallFeeling: int("overall_feeling").notNull(), // 1-10 scale
  symptoms: json("symptoms").$type<Array<{
    symptom: string;
    severity: number; // 1-10
    notes?: string;
  }>>(),
  
  // Tracked metrics
  metrics: json("metrics").$type<Array<{
    metric: string;
    value: string;
    unit?: string;
  }>>(),
  
  // Medication adherence
  medicationsTaken: json("medications_taken").$type<Array<{
    medicationName: string;
    taken: boolean;
    missedReason?: string;
  }>>(),
  
  // Lifestyle adherence
  lifestyleAdherence: json("lifestyle_adherence").$type<Array<{
    activity: string;
    completed: boolean;
    notes?: string;
  }>>(),
  
  // AI conversation
  conversationSummary: text("conversation_summary"),
  aiConcerns: json("ai_concerns").$type<string[]>(), // AI-identified concerns
  
  // Alert status
  alertGenerated: boolean("alert_generated").default(false).notNull(),
  alertSeverity: mysqlEnum("alert_severity", ["low", "medium", "high", "critical"]),
  alertReason: text("alert_reason"),
  
  // Physician review
  reviewedByPhysician: boolean("reviewed_by_physician").default(false).notNull(),
  reviewedAt: timestamp("reviewed_at"),
  physicianResponse: text("physician_response"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PatientCheckIn = typeof patientCheckIns.$inferSelect;
export type InsertPatientCheckIn = typeof patientCheckIns.$inferInsert;

/**
 * Patient Conversations - AI avatar conversation history
 */
export const patientConversations = mysqlTable("patient_conversations", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patient_id").notNull().references(() => patients.id),
  carePlanId: int("care_plan_id").references(() => patientCarePlans.id),
  checkInId: int("check_in_id").references(() => patientCheckIns.id),
  
  conversationType: mysqlEnum("conversation_type", ["check_in", "question", "symptom_report", "general"]).notNull(),
  language: varchar("language", { length: 10 }).notNull().default("en"),
  
  messages: json("messages").$type<Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: number;
  }>>().notNull(),
  
  // Context preservation
  contextSummary: text("context_summary"), // AI-generated summary of conversation context
  keyTopics: json("key_topics").$type<string[]>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PatientConversation = typeof patientConversations.$inferSelect;
export type InsertPatientConversation = typeof patientConversations.$inferInsert;

/**
 * Physician Alerts - alerts for deteriorating patients
 */
export const physicianAlerts = mysqlTable("physician_alerts", {
  id: int("id").autoincrement().primaryKey(),
  physicianId: int("physician_id").notNull().references(() => users.id),
  patientId: int("patient_id").notNull().references(() => patients.id),
  carePlanId: int("care_plan_id").references(() => patientCarePlans.id),
  checkInId: int("check_in_id").references(() => patientCheckIns.id),
  
  alertType: mysqlEnum("alert_type", [
    "worsening_symptoms",
    "missed_medications",
    "abnormal_vitals",
    "patient_concern",
    "no_improvement",
    "adverse_reaction"
  ]).notNull(),
  
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  
  // AI analysis
  aiAnalysis: text("ai_analysis"),
  suggestedActions: json("suggested_actions").$type<string[]>(),
  
  // Status
  status: mysqlEnum("status", ["pending", "acknowledged", "in_progress", "resolved", "dismissed"]).default("pending").notNull(),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PhysicianAlert = typeof physicianAlerts.$inferSelect;
export type InsertPhysicianAlert = typeof physicianAlerts.$inferInsert;

/**
 * Lab Request Forms - generated lab requisitions
 */
export const labRequestForms = mysqlTable("lab_request_forms", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patient_id").notNull().references(() => patients.id),
  physicianId: int("physician_id").notNull().references(() => users.id),
  carePlanId: int("care_plan_id").references(() => patientCarePlans.id),
  
  // Form data
  requestDate: timestamp("request_date").notNull(),
  diagnosis: text("diagnosis").notNull(),
  icd10Codes: json("icd10_codes").$type<string[]>().notNull(),
  
  testsRequested: json("tests_requested").$type<Array<{
    testName: string;
    testCode: string;
    priority: "routine" | "urgent" | "stat";
    clinicalIndication: string;
  }>>().notNull(),
  
  // Clinical information
  clinicalHistory: text("clinical_history"),
  currentMedications: json("current_medications").$type<string[]>(),
  relevantFindings: text("relevant_findings"),
  
  // Form generation
  formPdfUrl: text("form_pdf_url"), // Generated PDF form URL
  generatedAt: timestamp("generated_at"),
  
  // Status tracking
  status: mysqlEnum("status", ["draft", "generated", "sent_to_patient", "completed"]).default("draft").notNull(),
  sentToPatientAt: timestamp("sent_to_patient_at"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type LabRequestForm = typeof labRequestForms.$inferSelect;
export type InsertLabRequestForm = typeof labRequestForms.$inferInsert;

/**
 * Patient Progress Metrics - aggregated progress data for visualization
 */
export const patientProgressMetrics = mysqlTable("patient_progress_metrics", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patient_id").notNull().references(() => patients.id),
  carePlanId: int("care_plan_id").notNull().references(() => patientCarePlans.id),
  
  // Time period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // Aggregated metrics
  avgOverallFeeling: int("avg_overall_feeling"), // 1-10
  avgSymptomSeverity: int("avg_symptom_severity"), // 1-10
  medicationAdherence: int("medication_adherence"), // 0-100%
  lifestyleAdherence: int("lifestyle_adherence"), // 0-100%
  checkInCompletionRate: int("check_in_completion_rate"), // 0-100%
  
  // Trend analysis
  overallTrend: mysqlEnum("overall_trend", ["improving", "stable", "declining", "fluctuating"]).notNull(),
  symptomTrend: mysqlEnum("symptom_trend", ["improving", "stable", "worsening"]),
  
  // Alerts
  alertsGenerated: int("alerts_generated").default(0).notNull(),
  criticalAlertsGenerated: int("critical_alerts_generated").default(0).notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PatientProgressMetric = typeof patientProgressMetrics.$inferSelect;
export type InsertPatientProgressMetric = typeof patientProgressMetrics.$inferInsert;

/**
 * Patient enrollment invitations
 */
export const patientInvitations = mysqlTable("patient_invitations", {
  id: int("id").autoincrement().primaryKey(),
  physicianId: int("physician_id").notNull().references(() => users.id),
  patientEmail: varchar("patient_email", { length: 320 }).notNull(),
  patientName: varchar("patient_name", { length: 256 }),
  invitationToken: varchar("invitation_token", { length: 128 }).notNull().unique(),
  status: mysqlEnum("status", ["pending", "accepted", "expired"]).default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PatientInvitation = typeof patientInvitations.$inferSelect;
export type InsertPatientInvitation = typeof patientInvitations.$inferInsert;

/**
 * Protocol PDF deliveries tracking
 */
export const protocolDeliveries = mysqlTable("protocol_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  carePlanId: int("care_plan_id").references(() => patientCarePlans.id),
  protocolName: varchar("protocol_name", { length: 256 }).notNull(),
  deliveryType: mysqlEnum("delivery_type", ["enrollment", "manual", "update"]).notNull(),
  emailSent: boolean("email_sent").default(false).notNull(),
  emailMessageId: varchar("email_message_id", { length: 256 }),
  pdfGenerated: boolean("pdf_generated").default(false).notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProtocolDelivery = typeof protocolDeliveries.$inferSelect;
export type InsertProtocolDelivery = typeof protocolDeliveries.$inferInsert;

/**
 * Protocol customization audit trail
 */
export const protocolCustomizationAudit = mysqlTable("protocol_customization_audit", {
  id: int("id").autoincrement().primaryKey(),
  protocolDeliveryId: int("protocol_delivery_id").notNull().references(() => protocolDeliveries.id),
  carePlanId: int("care_plan_id").notNull().references(() => patientCarePlans.id),
  physicianId: int("physician_id").notNull().references(() => users.id),
  patientId: int("patient_id").notNull().references(() => users.id),
  
  // Original protocol data
  originalProtocol: json("original_protocol").$type<{
    title: string;
    diagnosis: string;
    duration: string;
    goals: string[];
    interventions: Array<{ category: string; items: string[] }>;
    medications?: Array<{ name: string; dosage: string; frequency: string; instructions?: string }>;
    lifestyle?: string[];
    followUp?: { frequency: string; metrics: string[] };
    warnings?: string[];
  }>().notNull(),
  
  // Customized protocol data
  customizedProtocol: json("customized_protocol").$type<{
    title: string;
    diagnosis: string;
    duration: string;
    goals: string[];
    interventions: Array<{ category: string; items: string[] }>;
    medications?: Array<{ name: string; dosage: string; frequency: string; instructions?: string }>;
    lifestyle?: string[];
    followUp?: { frequency: string; metrics: string[] };
    warnings?: string[];
  }>().notNull(),
  
  // Change summary
  changesSummary: json("changes_summary").$type<Array<{
    field: string;
    changeType: "added" | "removed" | "modified";
    oldValue?: string;
    newValue?: string;
    reason?: string;
  }>>(),
  
  // Justification for changes
  customizationReason: text("customization_reason"),
  allergenConflictsResolved: json("allergen_conflicts_resolved").$type<string[]>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProtocolCustomizationAudit = typeof protocolCustomizationAudit.$inferSelect;
export type InsertProtocolCustomizationAudit = typeof protocolCustomizationAudit.$inferInsert;

/**
 * Protocol templates library
 */
export const protocolTemplates = mysqlTable("protocol_templates", {
  id: int("id").autoincrement().primaryKey(),
  createdBy: int("created_by").notNull().references(() => users.id),
  
  // Template metadata
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 128 }).notNull(), // e.g., "Diabetes", "Hypertension", "Chronic Pain"
  tags: json("tags").$type<string[]>(), // For search/filtering
  
  // Template content
  templateData: json("template_data").$type<{
    diagnosis: string;
    duration: string;
    goals: string[];
    interventions: Array<{ category: string; items: string[] }>;
    medications?: Array<{ name: string; dosage: string; frequency: string; instructions?: string }>;
    lifestyle?: string[];
    followUp?: { frequency: string; metrics: string[] };
    warnings?: string[];
  }>().notNull(),
  
  // Usage tracking
  usageCount: int("usage_count").default(0).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  
  // Visibility
  isPublic: boolean("is_public").default(false).notNull(), // Can other physicians use it?
  isDefault: boolean("is_default").default(false).notNull(), // System-provided template
  
  // Status
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ProtocolTemplate = typeof protocolTemplates.$inferSelect;
export type InsertProtocolTemplate = typeof protocolTemplates.$inferInsert;

/**
 * Protocol template versions - Track template changes over time
 */
export const protocolTemplateVersions = mysqlTable("protocol_template_versions", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("template_id").notNull().references(() => protocolTemplates.id, { onDelete: "cascade" }),
  
  versionNumber: int("version_number").notNull(), // 1, 2, 3, etc.
  changeSummary: text("change_summary").notNull(), // What changed in this version
  changedBy: int("changed_by").notNull().references(() => users.id),
  
  // Snapshot of template data at this version
  templateData: json("template_data").$type<{
    diagnosis: string;
    duration: string;
    goals: string[];
    interventions: Array<{ category: string; items: string[] }>;
    medications?: Array<{ name: string; dosage: string; frequency: string; instructions?: string }>;
    lifestyle?: string[];
    followUp?: { frequency: string; metrics: string[] };
    warnings?: string[];
  }>().notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProtocolTemplateVersion = typeof protocolTemplateVersions.$inferSelect;
export type InsertProtocolTemplateVersion = typeof protocolTemplateVersions.$inferInsert;

/**
 * Physician template presets - Personalized template modifications
 */
export const physicianTemplatePresets = mysqlTable("physician_template_presets", {
  id: int("id").autoincrement().primaryKey(),
  physicianId: int("physician_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  baseTemplateId: int("base_template_id").references(() => protocolTemplates.id, { onDelete: "set null" }),
  
  // Preset metadata
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 128 }).notNull(),
  tags: json("tags").$type<string[]>(),
  
  // Customized template data
  templateData: json("template_data").$type<{
    diagnosis: string;
    duration: string;
    goals: string[];
    interventions: Array<{ category: string; items: string[] }>;
    medications?: Array<{ name: string; dosage: string; frequency: string; instructions?: string }>;
    lifestyle?: string[];
    followUp?: { frequency: string; metrics: string[] };
    warnings?: string[];
  }>().notNull(),
  
  // Usage tracking
  usageCount: int("usage_count").default(0).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PhysicianTemplatePreset = typeof physicianTemplatePresets.$inferSelect;
export type InsertPhysicianTemplatePreset = typeof physicianTemplatePresets.$inferInsert;

/**
 * Template usage logs - Track when and how templates are used
 */
export const templateUsageLogs = mysqlTable("template_usage_logs", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("template_id").references(() => protocolTemplates.id, { onDelete: "set null" }),
  presetId: int("preset_id").references(() => physicianTemplatePresets.id, { onDelete: "set null" }),
  physicianId: int("physician_id").notNull().references(() => users.id),
  patientId: int("patient_id").references(() => users.id, { onDelete: "set null" }),
  
  // Usage context
  wasCustomized: boolean("was_customized").default(false).notNull(),
  customizationCount: int("customization_count").default(0), // Number of fields modified
  
  // Outcome tracking (filled in later)
  outcomeRecorded: boolean("outcome_recorded").default(false).notNull(),
  outcomeSuccess: boolean("outcome_success"), // Did protocol achieve goals?
  outcomeNotes: text("outcome_notes"),
  outcomeRecordedAt: timestamp("outcome_recorded_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TemplateUsageLog = typeof templateUsageLogs.$inferSelect;
export type InsertTemplateUsageLog = typeof templateUsageLogs.$inferInsert;

/**
 * Template outcome correlations - Aggregate analytics
 */
export const templateOutcomeCorrelations = mysqlTable("template_outcome_correlations", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("template_id").notNull().references(() => protocolTemplates.id, { onDelete: "cascade" }),
  
  // Aggregated metrics
  totalUsages: int("total_usages").default(0).notNull(),
  successfulOutcomes: int("successful_outcomes").default(0).notNull(),
  unsuccessfulOutcomes: int("unsuccessful_outcomes").default(0).notNull(),
  successRate: decimal("success_rate", { precision: 5, scale: 2 }), // Percentage
  
  // Customization patterns
  avgCustomizationCount: decimal("avg_customization_count", { precision: 5, scale: 2 }),
  mostCustomizedFields: json("most_customized_fields").$type<string[]>(),
  
  lastCalculatedAt: timestamp("last_calculated_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type TemplateOutcomeCorrelation = typeof templateOutcomeCorrelations.$inferSelect;
export type InsertTemplateOutcomeCorrelation = typeof templateOutcomeCorrelations.$inferInsert;


/**
 * Medical codes - Standardized medical coding (ICD-10, CPT, SNOMED)
 */
export const medicalCodes = mysqlTable("medical_codes", {
  id: int("id").autoincrement().primaryKey(),
  
  // Code details
  codeType: mysqlEnum("code_type", ["ICD10", "CPT", "SNOMED"]).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: text("description").notNull(),
  
  // Additional metadata
  category: varchar("category", { length: 100 }),
  isActive: boolean("is_active").default(true).notNull(),
  effectiveDate: date("effective_date"),
  expirationDate: date("expiration_date"),
  
  // Search optimization
  searchTerms: text("search_terms"), // Comma-separated alternative terms
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  codeIdx: index("code_idx").on(table.code),
  codeTypeIdx: index("code_type_idx").on(table.codeType),
}));

export type MedicalCode = typeof medicalCodes.$inferSelect;
export type InsertMedicalCode = typeof medicalCodes.$inferInsert;

/**
 * Protocol medical codes - Junction table linking protocols to medical codes
 */
export const protocolMedicalCodes = mysqlTable("protocol_medical_codes", {
  id: int("id").autoincrement().primaryKey(),
  
  // References
  carePlanId: int("care_plan_id").references(() => patientCarePlans.id, { onDelete: "cascade" }),
  protocolDeliveryId: int("protocol_delivery_id").references(() => protocolDeliveries.id, { onDelete: "cascade" }),
  medicalCodeId: int("medical_code_id").notNull().references(() => medicalCodes.id),
  
  // Code assignment context
  codeType: mysqlEnum("code_type", ["ICD10", "CPT", "SNOMED"]).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(), // Primary diagnosis/procedure
  assignmentMethod: mysqlEnum("assignment_method", ["automatic", "manual", "verified"]).default("automatic").notNull(),
  
  // Verification
  verifiedBy: int("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  verificationNotes: text("verification_notes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProtocolMedicalCode = typeof protocolMedicalCodes.$inferSelect;
export type InsertProtocolMedicalCode = typeof protocolMedicalCodes.$inferInsert;

/**
 * Medical code mappings - AI-generated mappings between clinical terms and codes
 */
export const medicalCodeMappings = mysqlTable("medical_code_mappings", {
  id: int("id").autoincrement().primaryKey(),
  
  // Clinical term to code mapping
  clinicalTerm: varchar("clinical_term", { length: 255 }).notNull(),
  medicalCodeId: int("medical_code_id").notNull().references(() => medicalCodes.id),
  
  // Mapping metadata
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // 0-100 confidence score
  mappingSource: mysqlEnum("mapping_source", ["AI", "manual", "verified"]).default("AI").notNull(),
  
  // Usage tracking
  usageCount: int("usage_count").default(0).notNull(),
  lastUsedAt: timestamp("last_used_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  clinicalTermIdx: index("clinical_term_idx").on(table.clinicalTerm),
}));

export type MedicalCodeMapping = typeof medicalCodeMappings.$inferSelect;
export type InsertMedicalCodeMapping = typeof medicalCodeMappings.$inferInsert;

/**
 * Provider Profiles - physician practice information for billing
 */
export const providerProfiles = mysqlTable("provider_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  
  // Provider identification
  npi: varchar("npi", { length: 10 }).notNull(), // National Provider Identifier (10 digits)
  taxId: varchar("taxId", { length: 20 }).notNull(), // Tax ID / EIN
  licenseNumber: varchar("licenseNumber", { length: 64 }),
  licenseState: varchar("licenseState", { length: 2 }), // Two-letter state code
  
  // Practice information
  practiceName: varchar("practiceName", { length: 255 }).notNull(),
  practiceAddress: text("practiceAddress").notNull(),
  practiceCity: varchar("practiceCity", { length: 128 }).notNull(),
  practiceState: varchar("practiceState", { length: 2 }).notNull(),
  practiceZip: varchar("practiceZip", { length: 10 }).notNull(),
  practicePhone: varchar("practicePhone", { length: 32 }).notNull(),
  practiceFax: varchar("practiceFax", { length: 32 }),
  
  // Taxonomy code for specialty
  taxonomyCode: varchar("taxonomyCode", { length: 10 }), // Healthcare Provider Taxonomy Code
  specialty: varchar("specialty", { length: 128 }),
  
  // Billing contact
  billingContactName: varchar("billingContactName", { length: 255 }),
  billingContactPhone: varchar("billingContactPhone", { length: 32 }),
  billingContactEmail: varchar("billingContactEmail", { length: 320 }),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(), // Primary profile for this user
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProviderProfile = typeof providerProfiles.$inferSelect;
export type InsertProviderProfile = typeof providerProfiles.$inferInsert;

/**
 * Billing Claims - CMS-1500 claim records
 */
export const billingClaims = mysqlTable("billing_claims", {
  id: int("id").autoincrement().primaryKey(),
  claimNumber: varchar("claimNumber", { length: 64 }).notNull().unique(), // Auto-generated claim number
  
  // References
  protocolDeliveryId: int("protocolDeliveryId").notNull().references(() => protocolDeliveries.id),
  patientId: int("patientId").notNull().references(() => patients.id),
  providerProfileId: int("providerProfileId").notNull().references(() => providerProfiles.id),
  createdByUserId: int("createdByUserId").notNull().references(() => users.id),
  
  // Patient insurance information
  insuranceCompany: varchar("insuranceCompany", { length: 255 }),
  insurancePolicyNumber: varchar("insurancePolicyNumber", { length: 128 }),
  insuranceGroupNumber: varchar("insuranceGroupNumber", { length: 128 }),
  subscriberName: varchar("subscriberName", { length: 255 }),
  subscriberDob: timestamp("subscriberDob"),
  relationshipToSubscriber: mysqlEnum("relationshipToSubscriber", ["self", "spouse", "child", "other"]),
  
  // Claim details
  serviceDate: timestamp("serviceDate").notNull(),
  diagnosisCodes: json("diagnosisCodes").$type<string[]>().notNull(), // ICD-10 codes
  procedureCodes: json("procedureCodes").$type<{
    code: string;
    description: string;
    charge: number;
    units: number;
  }[]>().notNull(), // CPT codes with charges
  
  totalCharges: decimal("totalCharges", { precision: 10, scale: 2 }).notNull(),
  
  // Claim status
  status: mysqlEnum("status", ["draft", "submitted", "pending", "paid", "denied", "appealed"]).default("draft").notNull(),
  submittedDate: timestamp("submittedDate"),
  paidDate: timestamp("paidDate"),
  paidAmount: decimal("paidAmount", { precision: 10, scale: 2 }),
  
  // Additional information
  notes: text("notes"),
  denialReason: text("denialReason"),
  
  // PDF storage
  pdfUrl: text("pdfUrl"), // S3 URL for generated CMS-1500 PDF
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BillingClaim = typeof billingClaims.$inferSelect;
export type InsertBillingClaim = typeof billingClaims.$inferInsert;


/**
 * Clinical Sessions - DAO Protocol Interface
 * Structured clinical data entry for diagnosis and treatment capture
 */
export const clinicalSessions = mysqlTable("clinical_sessions", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  
  // Session metadata
  sessionType: mysqlEnum("sessionType", ["initial_consultation", "follow_up", "emergency", "routine_checkup"]).notNull(),
  sessionDate: timestamp("sessionDate").notNull(),
  chiefComplaint: text("chiefComplaint"), // Primary reason for visit
  
  // Session status
  status: mysqlEnum("status", ["in_progress", "completed", "cancelled"]).default("in_progress").notNull(),
  
  // Clinical notes
  historyOfPresentIllness: text("historyOfPresentIllness"),
  reviewOfSystems: json("reviewOfSystems").$type<Record<string, string>>(), // Systematic review
  physicalExamFindings: text("physicalExamFindings"),
  assessmentAndPlan: text("assessmentAndPlan"),
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type ClinicalSession = typeof clinicalSessions.$inferSelect;
export type InsertClinicalSession = typeof clinicalSessions.$inferInsert;

/**
 * Diagnosis Entries - Structured diagnosis capture
 */
export const diagnosisEntries = mysqlTable("diagnosis_entries", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => clinicalSessions.id),
  
  // Diagnosis information
  diagnosisCode: varchar("diagnosisCode", { length: 16 }), // ICD-10 code
  diagnosisName: varchar("diagnosisName", { length: 255 }).notNull(),
  diagnosisType: mysqlEnum("diagnosisType", ["primary", "secondary", "differential"]).notNull(),
  
  // Clinical details
  severity: mysqlEnum("severity", ["mild", "moderate", "severe", "critical"]),
  onset: varchar("onset", { length: 128 }), // When symptoms started
  duration: varchar("duration", { length: 128 }), // How long symptoms have lasted
  symptoms: json("symptoms").$type<string[]>(), // Associated symptoms
  
  // Supporting information
  clinicalNotes: text("clinicalNotes"),
  confidence: mysqlEnum("confidence", ["low", "medium", "high"]).default("medium"),
  
  // Status
  status: mysqlEnum("status", ["active", "resolved", "chronic", "ruled_out"]).default("active").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DiagnosisEntry = typeof diagnosisEntries.$inferSelect;
export type InsertDiagnosisEntry = typeof diagnosisEntries.$inferInsert;

/**
 * Treatment Entries - Structured treatment capture
 */
export const treatmentEntries = mysqlTable("treatment_entries", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => clinicalSessions.id),
  diagnosisId: int("diagnosisId").references(() => diagnosisEntries.id), // Optional link to diagnosis
  
  // Treatment information
  treatmentType: mysqlEnum("treatmentType", ["medication", "procedure", "therapy", "lifestyle", "referral"]).notNull(),
  treatmentName: varchar("treatmentName", { length: 255 }).notNull(),
  treatmentCode: varchar("treatmentCode", { length: 16 }), // CPT code for procedures
  
  // Medication-specific fields
  dosage: varchar("dosage", { length: 128 }),
  frequency: varchar("frequency", { length: 128 }),
  route: varchar("route", { length: 64 }), // oral, IV, topical, etc.
  duration: varchar("duration", { length: 128 }), // Treatment duration
  
  // General treatment details
  instructions: text("instructions"),
  rationale: text("rationale"), // Why this treatment was chosen
  expectedOutcome: text("expectedOutcome"),
  
  // Monitoring
  sideEffects: json("sideEffects").$type<string[]>(),
  contraindications: json("contraindications").$type<string[]>(),
  monitoringParameters: text("monitoringParameters"),
  
  // Status
  status: mysqlEnum("status", ["proposed", "active", "completed", "discontinued"]).default("proposed").notNull(),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TreatmentEntry = typeof treatmentEntries.$inferSelect;
export type InsertTreatmentEntry = typeof treatmentEntries.$inferInsert;

/**
 * Clinical Observations - Vital signs and measurements
 */
export const clinicalObservations = mysqlTable("clinical_observations", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => clinicalSessions.id),
  
  // Observation details
  observationType: varchar("observationType", { length: 128 }).notNull(), // BP, HR, Temp, etc.
  observationValue: varchar("observationValue", { length: 255 }).notNull(),
  unit: varchar("unit", { length: 32 }), // mmHg, bpm, °F, etc.
  
  // Context
  notes: text("notes"),
  isAbnormal: boolean("isAbnormal").default(false),
  
  observedAt: timestamp("observedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClinicalObservation = typeof clinicalObservations.$inferSelect;
export type InsertClinicalObservation = typeof clinicalObservations.$inferInsert;


/**
 * ========================================
 * CAUSAL BRAIN INTELLIGENCE HUB
 * ========================================
 * Central AI orchestration for evidence-based treatment recommendations
 */

/**
 * Treatment Recommendations - AI-generated treatment suggestions
 */
export const treatmentRecommendations = mysqlTable("treatment_recommendations", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => clinicalSessions.id),
  patientId: int("patientId").notNull().references(() => patients.id),
  
  // Recommendation details
  treatmentName: varchar("treatmentName", { length: 255 }).notNull(),
  treatmentType: varchar("treatmentType", { length: 128 }).notNull(), // medication, procedure, lifestyle, etc.
  
  // AI analysis
  confidenceScore: decimal("confidenceScore", { precision: 5, scale: 2 }).notNull(), // 0-100
  reasoning: text("reasoning").notNull(), // AI explanation
  evidenceSources: json("evidenceSources").$type<Array<{
    title: string;
    authors?: string;
    publicationDate?: string;
    journal?: string;
    doi?: string;
    pmid?: string;
    keyFindings?: string;
    evidenceGrade?: string;
    studyType?: string;
    relevanceScore: number;
    isVerified: boolean;
  }>>(), // Full EvidenceSource objects — isVerified=true means real PubMed citation
  
  // Clinical context
  indicatedFor: text("indicatedFor"), // Conditions this treats
  contraindications: json("contraindications").$type<string[]>(),
  expectedOutcome: text("expectedOutcome"),
  alternativeTreatments: json("alternativeTreatments").$type<string[]>(),
  
  // Dosing (for medications)
  suggestedDosage: varchar("suggestedDosage", { length: 255 }),
  suggestedFrequency: varchar("suggestedFrequency", { length: 128 }),
  suggestedDuration: varchar("suggestedDuration", { length: 128 }),
  
  // Status tracking
  status: mysqlEnum("status", ["pending", "accepted", "rejected", "modified"]).default("pending").notNull(),
  physicianFeedback: text("physicianFeedback"),
  modifiedBy: int("modifiedBy").references(() => users.id),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TreatmentRecommendation = typeof treatmentRecommendations.$inferSelect;
export type InsertTreatmentRecommendation = typeof treatmentRecommendations.$inferInsert;

/**
 * Causal Analyses - Causal inference results for treatment effectiveness
 */
export const causalAnalyses = mysqlTable("causal_analyses", {
  id: int("id").autoincrement().primaryKey(),
  
  // Analysis scope
  diagnosisCode: varchar("diagnosisCode", { length: 16 }).notNull(), // ICD-10 code
  treatmentCode: varchar("treatmentCode", { length: 16 }).notNull(), // CPT or treatment identifier
  
  // Causal inference results
  effectSize: decimal("effectSize", { precision: 10, scale: 4 }), // Measured effect
  confidenceInterval: varchar("confidenceInterval", { length: 64 }), // e.g., "95% CI: 0.2-0.8"
  pValue: decimal("pValue", { precision: 10, scale: 8 }),
  sampleSize: int("sampleSize"), // Number of cases analyzed
  
  // Analysis details
  methodology: varchar("methodology", { length: 128 }), // e.g., "propensity score matching"
  confounders: json("confounders").$type<string[]>(), // Controlled variables
  analysisNotes: text("analysisNotes"),
  
  // Outcome metrics
  outcomeType: varchar("outcomeType", { length: 128 }), // symptom reduction, cure rate, etc.
  outcomeValue: decimal("outcomeValue", { precision: 10, scale: 4 }),
  
  // Metadata
  analyzedAt: timestamp("analyzedAt").defaultNow().notNull(),
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type CausalAnalysis = typeof causalAnalyses.$inferSelect;
export type InsertCausalAnalysis = typeof causalAnalyses.$inferInsert;

/**
 * Patient Outcomes - Track actual clinical outcomes for policy learning
 */
export const patientOutcomes = mysqlTable("patient_outcomes", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  sessionId: int("sessionId").references(() => clinicalSessions.id),
  recommendationId: int("recommendationId").references(() => treatmentRecommendations.id),
  
  // Outcome details
  outcomeType: varchar("outcomeType", { length: 128 }).notNull(), // symptom_improvement, adverse_event, etc.
  outcomeDescription: text("outcomeDescription").notNull(),
  severity: mysqlEnum("severity", ["mild", "moderate", "severe", "critical"]),
  
  // Measurement
  measurementType: varchar("measurementType", { length: 128 }), // subjective, objective, lab_value
  measurementValue: varchar("measurementValue", { length: 255 }),
  measurementUnit: varchar("measurementUnit", { length: 64 }),
  
  // Timing
  timeFromTreatment: int("timeFromTreatment"), // Days since treatment started
  isExpected: boolean("isExpected").default(true), // Was this outcome expected?
  
  // Causal attribution
  likelyRelatedToTreatment: boolean("likelyRelatedToTreatment"),
  attributionConfidence: decimal("attributionConfidence", { precision: 5, scale: 2 }), // 0-100
  
  // Follow-up
  requiresIntervention: boolean("requiresIntervention").default(false),
  interventionTaken: text("interventionTaken"),
  
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  recordedBy: int("recordedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PatientOutcome = typeof patientOutcomes.$inferSelect;
export type InsertPatientOutcome = typeof patientOutcomes.$inferInsert;

/**
 * Evidence Cache - Store retrieved medical literature references
 */
export const evidenceCache = mysqlTable("evidence_cache", {
  id: int("id").autoincrement().primaryKey(),
  
  // Query details
  queryHash: varchar("queryHash", { length: 64 }).notNull().unique(), // Hash of search query
  queryText: text("queryText").notNull(),
  
  // Evidence details
  evidenceType: varchar("evidenceType", { length: 64 }).notNull(), // clinical_trial, meta_analysis, guideline
  title: text("title").notNull(),
  authors: text("authors"),
  publicationDate: timestamp("publicationDate"),
  source: varchar("source", { length: 255 }), // Journal name or database
  doi: varchar("doi", { length: 255 }),
  pmid: varchar("pmid", { length: 32 }), // PubMed ID
  
  // Content
  abstract: text("abstract"),
  keyFindings: text("keyFindings"),
  relevanceScore: decimal("relevanceScore", { precision: 5, scale: 2 }), // 0-100
  
  // Usage tracking
  timesReferenced: int("timesReferenced").default(0),
  lastReferenced: timestamp("lastReferenced"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt"), // Cache expiration
});

export type EvidenceCache = typeof evidenceCache.$inferSelect;
export type InsertEvidenceCache = typeof evidenceCache.$inferInsert;


/**
 * Session Participants - Track physicians collaborating on clinical sessions
 */
export const sessionParticipants = mysqlTable("session_participants", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => clinicalSessions.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  role: mysqlEnum("role", ["owner", "consultant", "observer"]).default("consultant").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
  leftAt: timestamp("leftAt"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
});

export type SessionParticipant = typeof sessionParticipants.$inferSelect;
export type InsertSessionParticipant = typeof sessionParticipants.$inferInsert;

/**
 * Session Comments - Collaborative discussion threads
 */
export const sessionComments = mysqlTable("session_comments", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => clinicalSessions.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  commentText: text("commentText").notNull(),
  commentType: mysqlEnum("commentType", ["general", "diagnosis", "treatment", "recommendation"]).default("general").notNull(),
  replyToId: int("replyToId"), // For threaded comments
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  isEdited: boolean("isEdited").default(false).notNull(),
});

export type SessionComment = typeof sessionComments.$inferSelect;
export type InsertSessionComment = typeof sessionComments.$inferInsert;

/**
 * Session Activity - Track all changes for real-time updates
 */
export const sessionActivity = mysqlTable("session_activity", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => clinicalSessions.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  activityType: varchar("activityType", { length: 64 }).notNull(), // joined, left, added_diagnosis, added_treatment, commented, etc.
  activityData: json("activityData"), // Flexible storage for activity-specific data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SessionActivity = typeof sessionActivity.$inferSelect;
export type InsertSessionActivity = typeof sessionActivity.$inferInsert;


/**
 * Delphi Simulator - Treatment Scenario Exploration
 */

/**
 * Simulation Scenarios - Treatment scenarios for exploration
 */
export const simulationScenarios = mysqlTable("simulation_scenarios", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => clinicalSessions.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  patientId: int("patientId").notNull().references(() => patients.id),
  
  // Scenario definition
  scenarioName: varchar("scenarioName", { length: 255 }).notNull(),
  diagnosisCode: varchar("diagnosisCode", { length: 16 }).notNull(), // ICD-10
  treatmentCode: varchar("treatmentCode", { length: 16 }).notNull(), // CPT or treatment ID
  treatmentDescription: text("treatmentDescription").notNull(),
  
  // Patient context for simulation
  patientAge: int("patientAge"),
  patientGender: varchar("patientGender", { length: 16 }),
  comorbidities: json("comorbidities").$type<string[]>(),
  currentMedications: json("currentMedications").$type<string[]>(),
  allergies: json("allergies").$type<string[]>(),
  
  // Simulation parameters
  timeHorizon: int("timeHorizon"), // Days to simulate
  simulationGoal: varchar("simulationGoal", { length: 255 }), // What we're testing
  
  // Status
  status: mysqlEnum("status", ["draft", "running", "completed", "archived"]).default("draft"),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type SimulationScenario = typeof simulationScenarios.$inferSelect;
export type InsertSimulationScenario = typeof simulationScenarios.$inferInsert;

/**
 * Scenario Interactions - Conversational role-play between physician and virtual patient
 */
export const scenarioInteractions = mysqlTable("scenario_interactions", {
  id: int("id").autoincrement().primaryKey(),
  scenarioId: int("scenarioId").notNull().references(() => simulationScenarios.id),
  
  // Interaction details
  role: mysqlEnum("role", ["physician", "patient", "system"]).notNull(),
  message: text("message").notNull(),
  
  // Context
  dayInSimulation: int("dayInSimulation"), // Which day of treatment
  interactionType: varchar("interactionType", { length: 64 }), // question, response, observation, etc.
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScenarioInteraction = typeof scenarioInteractions.$inferSelect;
export type InsertScenarioInteraction = typeof scenarioInteractions.$inferInsert;

/**
 * Scenario Outcomes - Predicted outcomes for each scenario
 */
export const scenarioOutcomes = mysqlTable("scenario_outcomes", {
  id: int("id").autoincrement().primaryKey(),
  scenarioId: int("scenarioId").notNull().references(() => simulationScenarios.id),
  
  // Outcome prediction
  outcomeType: varchar("outcomeType", { length: 128 }).notNull(), // symptom_improvement, adverse_event, etc.
  probability: decimal("probability", { precision: 5, scale: 2 }).notNull(), // 0-100%
  severity: mysqlEnum("severity", ["mild", "moderate", "severe", "critical"]),
  
  // Timing
  expectedDay: int("expectedDay"), // When this outcome is expected
  duration: int("duration"), // How long it lasts (days)
  
  // Evidence
  evidenceSource: varchar("evidenceSource", { length: 255 }), // Where this prediction comes from
  confidenceScore: decimal("confidenceScore", { precision: 5, scale: 2 }), // 0-100%
  
  // Details
  description: text("description"),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScenarioOutcome = typeof scenarioOutcomes.$inferSelect;
export type InsertScenarioOutcome = typeof scenarioOutcomes.$inferInsert;

/**
 * Scenario Comparisons - Side-by-side analysis of multiple scenarios
 */
export const scenarioComparisons = mysqlTable("scenario_comparisons", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull().references(() => clinicalSessions.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  
  // Scenarios being compared
  scenarioIds: json("scenarioIds").$type<number[]>().notNull(),
  
  // Comparison results
  ranking: json("ranking").$type<{scenarioId: number, score: number, reasoning: string}[]>(),
  selectedScenarioId: int("selectedScenarioId").references(() => simulationScenarios.id),
  
  // Physician feedback
  physicianNotes: text("physicianNotes"),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScenarioComparison = typeof scenarioComparisons.$inferSelect;
export type InsertScenarioComparison = typeof scenarioComparisons.$inferInsert;

/**
 * Interaction Feedback - Physician ratings of virtual patient realism
 */
export const interactionFeedback = mysqlTable("interaction_feedback", {
  id: int("id").autoincrement().primaryKey(),
  interactionId: int("interactionId").notNull().references(() => scenarioInteractions.id),
  scenarioId: int("scenarioId").notNull().references(() => simulationScenarios.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  
  // Realism ratings (1-5 scale)
  realismScore: int("realismScore").notNull(), // How realistic was the patient response?
  clinicalAccuracy: int("clinicalAccuracy").notNull(), // How clinically accurate was the response?
  conversationalQuality: int("conversationalQuality").notNull(), // How natural was the conversation?
  
  // Feedback details
  comments: text("comments"), // Optional detailed feedback
  issuesReported: json("issuesReported").$type<string[]>(), // Specific issues (e.g., "unrealistic symptoms", "wrong terminology")
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InteractionFeedback = typeof interactionFeedback.$inferSelect;
export type InsertInteractionFeedback = typeof interactionFeedback.$inferInsert;

/**
 * Outcome Feedback - Physician ratings of outcome prediction accuracy
 */
export const outcomeFeedback = mysqlTable("outcome_feedback", {
  id: int("id").autoincrement().primaryKey(),
  outcomeId: int("outcomeId").notNull().references(() => scenarioOutcomes.id),
  scenarioId: int("scenarioId").notNull().references(() => simulationScenarios.id),
  physicianId: int("physicianId").notNull().references(() => users.id),
  
  // Accuracy ratings (1-5 scale)
  accuracyScore: int("accuracyScore").notNull(), // How accurate was the outcome prediction?
  evidenceQuality: int("evidenceQuality").notNull(), // How strong was the supporting evidence?
  clinicalRelevance: int("clinicalRelevance").notNull(), // How relevant to actual practice?
  
  // Actual outcome (if known)
  actualOutcomeOccurred: mysqlEnum("actualOutcomeOccurred", ["yes", "no", "partially", "unknown"]),
  actualProbability: decimal("actualProbability", { precision: 5, scale: 2 }), // Actual probability if known
  actualSeverity: mysqlEnum("actualSeverity", ["mild", "moderate", "severe", "critical"]),
  
  // Feedback details
  comments: text("comments"),
  suggestedImprovements: text("suggestedImprovements"),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OutcomeFeedback = typeof outcomeFeedback.$inferSelect;
export type InsertOutcomeFeedback = typeof outcomeFeedback.$inferInsert;


/**
 * Disease Risk Predictions - Delphi-2M integration for prediction → exploration workflow
 */
export const diseaseRiskPredictions = mysqlTable("disease_risk_predictions", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id, { onDelete: 'cascade' }),
  physicianId: int("physicianId").notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Disease information
  diseaseCode: varchar("diseaseCode", { length: 50 }).notNull(), // ICD-10 code
  diseaseName: varchar("diseaseName", { length: 255 }).notNull(),
  diseaseCategory: varchar("diseaseCategory", { length: 100 }), // e.g., "Cardiovascular", "Cancer", "Metabolic"
  
  // Risk prediction data
  riskProbability: decimal("riskProbability", { precision: 5, scale: 4 }).notNull(), // 0.0000 to 1.0000
  riskLevel: mysqlEnum("riskLevel", ["low", "moderate", "high", "very_high"]).notNull(),
  timeHorizon: int("timeHorizon").notNull(), // Years ahead (e.g., 5, 10, 20)
  confidenceScore: decimal("confidenceScore", { precision: 5, scale: 4 }), // Model confidence
  
  // Source and context
  predictionSource: varchar("predictionSource", { length: 100 }).default("Delphi-2M"), // "Delphi-2M", "Manual", "Other Model"
  predictionDate: timestamp("predictionDate").defaultNow(),
  inputFeatures: json("inputFeatures").$type<{
    age?: number;
    gender?: string;
    bmi?: number;
    tobaccoUse?: boolean;
    alcoholConsumption?: string;
    medicalHistory?: string[];
    familyHistory?: string[];
    lifestyleFactors?: string[];
  }>(), // Medical history, lifestyle factors used for prediction
  
  // Clinical action tracking
  actionTaken: mysqlEnum("actionTaken", ["explored", "monitored", "dismissed", "pending"]).default("pending"),
  scenarioGenerated: boolean("scenarioGenerated").default(false).notNull(), // Whether Delphi Simulator scenario was created
  simulationId: int("simulationId").references(() => simulationScenarios.id), // Link to generated scenario
  
  // Notes and follow-up
  clinicalNotes: text("clinicalNotes"),
  reviewedAt: timestamp("reviewedAt"),
  nextReviewDate: date("nextReviewDate"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DiseaseRiskPrediction = typeof diseaseRiskPredictions.$inferSelect;
export type InsertDiseaseRiskPrediction = typeof diseaseRiskPredictions.$inferInsert;


/**
 * Lifestyle Assessment - captures behavioral and environmental risk factors for Delphi-2M
 */
export const lifestyleAssessments = mysqlTable("lifestyle_assessments", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  assessmentDate: timestamp("assessmentDate").notNull(),
  
  // Smoking
  smokingStatus: mysqlEnum("smokingStatus", ["never", "former", "current"]).notNull(),
  cigarettesPerDay: int("cigarettesPerDay"), // For current smokers
  yearsSmoked: int("yearsSmoked"), // Total years of smoking
  quitDate: date("quitDate"), // For former smokers
  
  // Alcohol
  alcoholConsumption: mysqlEnum("alcoholConsumption", ["none", "occasional", "moderate", "heavy"]).notNull(),
  drinksPerWeek: int("drinksPerWeek"),
  bingeDrinking: boolean("bingeDrinking").default(false),
  
  // Physical Activity
  exerciseFrequency: mysqlEnum("exerciseFrequency", ["sedentary", "light", "moderate", "vigorous"]).notNull(),
  minutesPerWeek: int("minutesPerWeek"), // Total exercise minutes per week
  exerciseTypes: json("exerciseTypes").$type<string[]>(), // ["walking", "running", "swimming", etc.]
  
  // Diet
  dietQuality: mysqlEnum("dietQuality", ["poor", "fair", "good", "excellent"]).notNull(),
  fruitsVegetablesPerDay: int("fruitsVegetablesPerDay"), // Servings
  fastFoodFrequency: mysqlEnum("fastFoodFrequency", ["never", "rarely", "weekly", "daily"]),
  sodaConsumption: mysqlEnum("sodaConsumption", ["none", "occasional", "daily", "multiple_daily"]),
  
  // Sleep
  sleepHoursPerNight: decimal("sleepHoursPerNight", { precision: 3, scale: 1 }),
  sleepQuality: mysqlEnum("sleepQuality", ["poor", "fair", "good", "excellent"]).notNull(),
  sleepDisorders: json("sleepDisorders").$type<string[]>(), // ["insomnia", "sleep_apnea", etc.]
  
  // Stress & Mental Health
  stressLevel: mysqlEnum("stressLevel", ["low", "moderate", "high", "severe"]).notNull(),
  mentalHealthConditions: json("mentalHealthConditions").$type<string[]>(), // ["anxiety", "depression", etc.]
  
  // Environmental Exposures
  occupationalHazards: json("occupationalHazards").$type<string[]>(), // ["asbestos", "chemicals", etc.]
  environmentalExposures: json("environmentalExposures").$type<string[]>(), // ["air_pollution", "secondhand_smoke", etc.]
  
  // Notes
  additionalNotes: text("additionalNotes"),
  assessedBy: int("assessedBy").references(() => users.id), // Physician who conducted assessment
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LifestyleAssessment = typeof lifestyleAssessments.$inferSelect;
export type InsertLifestyleAssessment = typeof lifestyleAssessments.$inferInsert;

/**
 * Family History - tracks hereditary disease patterns for genetic risk assessment
 */
export const familyHistories = mysqlTable("family_histories", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  
  // Relationship
  relationship: mysqlEnum("relationship", [
    "mother", "father", "sister", "brother", 
    "maternal_grandmother", "maternal_grandfather",
    "paternal_grandmother", "paternal_grandfather",
    "maternal_aunt", "maternal_uncle",
    "paternal_aunt", "paternal_uncle",
    "daughter", "son", "other"
  ]).notNull(),
  relationshipOther: varchar("relationshipOther", { length: 128 }), // If "other" selected
  
  // Condition Information
  condition: varchar("condition", { length: 255 }).notNull(), // Disease name
  icdCode: varchar("icdCode", { length: 16 }), // ICD-10 code if available
  ageAtDiagnosis: int("ageAtDiagnosis"), // Age when relative was diagnosed
  currentAge: int("currentAge"), // Current age of relative (if alive)
  ageAtDeath: int("ageAtDeath"), // Age at death (if deceased)
  causeOfDeath: varchar("causeOfDeath", { length: 255 }), // If deceased
  
  // Status
  isAlive: boolean("isAlive").default(true).notNull(),
  isConfirmed: boolean("isConfirmed").default(false), // Medical records confirmed vs. patient report
  
  // Additional Context
  notes: text("notes"),
  recordedBy: int("recordedBy").references(() => users.id), // Physician who recorded this entry
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FamilyHistory = typeof familyHistories.$inferSelect;
export type InsertFamilyHistory = typeof familyHistories.$inferInsert;

/**
 * Biomarkers - tracks lab results and vital signs over time for trend analysis
 */
export const biomarkers = mysqlTable("biomarkers", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull().references(() => patients.id),
  measurementDate: timestamp("measurementDate").notNull(),
  
  // Biomarker Type
  biomarkerType: mysqlEnum("biomarkerType", [
    // Vital Signs
    "blood_pressure_systolic", "blood_pressure_diastolic", "heart_rate", "temperature", "respiratory_rate",
    "oxygen_saturation", "weight", "height", "bmi", "waist_circumference",
    
    // Lipid Panel
    "total_cholesterol", "ldl_cholesterol", "hdl_cholesterol", "triglycerides",
    
    // Metabolic Panel
    "glucose_fasting", "glucose_random", "hba1c", "insulin",
    
    // Kidney Function
    "creatinine", "bun", "egfr",
    
    // Liver Function
    "alt", "ast", "alkaline_phosphatase", "bilirubin",
    
    // Thyroid
    "tsh", "t3", "t4",
    
    // Inflammation
    "crp", "esr",
    
    // Blood Count
    "wbc", "rbc", "hemoglobin", "hematocrit", "platelets",
    
    // Other
    "vitamin_d", "b12", "psa", "other"
  ]).notNull(),
  biomarkerName: varchar("biomarkerName", { length: 255 }), // If "other" selected
  
  // Measurement Value
  value: decimal("value", { precision: 10, scale: 3 }).notNull(),
  unit: varchar("unit", { length: 32 }).notNull(), // "mg/dL", "mmol/L", "mmHg", etc.
  
  // Reference Range
  referenceRangeLow: decimal("referenceRangeLow", { precision: 10, scale: 3 }),
  referenceRangeHigh: decimal("referenceRangeHigh", { precision: 10, scale: 3 }),
  isAbnormal: boolean("isAbnormal").default(false),
  
  // Source & Context
  source: mysqlEnum("source", ["lab_test", "vital_signs", "home_monitoring", "wearable_device"]).notNull(),
  labOrderId: varchar("labOrderId", { length: 128 }), // External lab order reference
  notes: text("notes"),
  
  // Data Entry
  enteredBy: int("enteredBy").references(() => users.id), // Who entered this data
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Biomarker = typeof biomarkers.$inferSelect;
export type InsertBiomarker = typeof biomarkers.$inferInsert;

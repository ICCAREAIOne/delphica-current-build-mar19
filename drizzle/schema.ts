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

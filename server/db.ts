import { eq, desc, asc, and, gte, lte, lt, gt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  patients,
  InsertPatient,
  daoProtocolEntries,
  InsertDaoProtocolEntry,
  delphiSimulations,
  InsertDelphiSimulation,
  causalInsights,
  InsertCausalInsight,
  precisionCarePlans,
  InsertPrecisionCarePlan,
  safetyReviews,
  InsertSafetyReview,
  clinicalOutcomes,
  InsertClinicalOutcome,
  codingQualityMetrics,
  InsertCodingQualityMetric,
  physicianPerformanceAnalytics,
  InsertPhysicianPerformanceAnalytic,
  knowledgeBase,
  InsertKnowledgeBase,
  knowledgeBaseReferences,
  InsertKnowledgeBaseReference,
  knowledgeBaseUsage,
  InsertKnowledgeBaseUsage,
  intakeSessions,
  InsertIntakeSession,
  intakeMessages,
  InsertIntakeMessage,
  patientLabResults,
  patientCarePlans,
  patientCheckIns,
  patientConversations,
  physicianAlerts,
  labRequestForms,
  patientProgressMetrics,
  providerProfiles,
  InsertProviderProfile,
  billingClaims,
  InsertBillingClaim,
  clinicalSessions,
  InsertClinicalSession,
  diagnosisEntries,
  InsertDiagnosisEntry,
  treatmentEntries,
  InsertTreatmentEntry,
  sessionParticipants,
  InsertSessionParticipant,
  sessionComments,
  InsertSessionComment,
  sessionActivity,
  InsertSessionActivity,
  treatmentRecommendations,
  InsertTreatmentRecommendation,
  causalAnalyses,
  InsertCausalAnalysis,
  patientOutcomes,
  InsertPatientOutcome,
  evidenceCache,
  InsertEvidenceCache,
  clinicalObservations,
  InsertClinicalObservation,
  simulationScenarios,
  InsertSimulationScenario,
  scenarioInteractions,
  InsertScenarioInteraction,
  scenarioOutcomes,
  InsertScenarioOutcome,
  scenarioComparisons,
  InsertScenarioComparison
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Management ============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Patient Management ============

export async function getAllPatients(physicianId?: number) {
  const db = await getDb();
  if (!db) return [];

  if (physicianId) {
    return await db.select().from(patients)
      .where(eq(patients.assignedPhysicianId, physicianId))
      .orderBy(desc(patients.updatedAt));
  }
  
  return await db.select().from(patients).orderBy(desc(patients.updatedAt));
}

export async function getPatientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPatientByMRN(mrn: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(patients).where(eq(patients.mrn, mrn)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPatient(patient: InsertPatient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(patients).values(patient) as any;
  return Number(result[0].insertId);
}

export async function updatePatient(id: number, updates: Partial<InsertPatient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(patients).set(updates).where(eq(patients.id, id));
}

export async function searchPatients(query: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(patients)
    .where(
      sql`CONCAT(${patients.firstName}, ' ', ${patients.lastName}) LIKE ${`%${query}%`} OR ${patients.mrn} LIKE ${`%${query}%`}`
    )
    .orderBy(desc(patients.updatedAt))
    .limit(50);
}

// ============ DAO Protocol Entries ============

export async function getDAOEntriesByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(daoProtocolEntries)
    .where(eq(daoProtocolEntries.patientId, patientId))
    .orderBy(desc(daoProtocolEntries.createdAt));
}

export async function getDAOEntryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(daoProtocolEntries).where(eq(daoProtocolEntries.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDAOEntry(entry: InsertDaoProtocolEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(daoProtocolEntries).values(entry) as any;
  return Number(result.insertId);
}

export async function updateDAOEntry(id: number, updates: Partial<InsertDaoProtocolEntry>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(daoProtocolEntries).set(updates).where(eq(daoProtocolEntries.id, id));
}

// ============ Delphi Simulations ============

export async function getDelphiSimulationsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(delphiSimulations)
    .where(eq(delphiSimulations.patientId, patientId))
    .orderBy(desc(delphiSimulations.createdAt));
}

export async function getDelphiSimulationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(delphiSimulations).where(eq(delphiSimulations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDelphiSimulation(simulation: InsertDelphiSimulation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(delphiSimulations).values(simulation) as any;
  return Number(result.insertId);
}

export async function updateDelphiSimulation(id: number, updates: Partial<InsertDelphiSimulation>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(delphiSimulations).set(updates).where(eq(delphiSimulations.id, id));
}

// ============ Causal Insights ============

export async function getCausalInsightsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(causalInsights)
    .where(eq(causalInsights.patientId, patientId))
    .orderBy(desc(causalInsights.confidenceScore), desc(causalInsights.aiGeneratedAt));
}

export async function getCausalInsightById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(causalInsights).where(eq(causalInsights.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCausalInsight(insight: InsertCausalInsight) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(causalInsights).values(insight) as any;
  return Number(result.insertId);
}

export async function markInsightReviewed(id: number, reviewedAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(causalInsights)
    .set({ reviewedByPhysician: true, reviewedAt })
    .where(eq(causalInsights.id, id));
}

// ============ Precision Care Plans ============

export async function getCarePlansByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(precisionCarePlans)
    .where(eq(precisionCarePlans.patientId, patientId))
    .orderBy(desc(precisionCarePlans.createdAt));
}

export async function getCarePlanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(precisionCarePlans).where(eq(precisionCarePlans.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCarePlan(plan: InsertPrecisionCarePlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(precisionCarePlans).values(plan) as any;
  return Number(result.insertId);
}

export async function updateCarePlan(id: number, updates: Partial<InsertPrecisionCarePlan>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(precisionCarePlans).set(updates).where(eq(precisionCarePlans.id, id));
}

export async function approveCarePlan(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(precisionCarePlans)
    .set({ status: "approved", approvedAt: new Date() })
    .where(eq(precisionCarePlans.id, id));
}

// ============ Safety Reviews ============

export async function getSafetyReviewByCarePlan(carePlanId: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(safetyReviews)
    .where(eq(safetyReviews.carePlanId, carePlanId))
    .orderBy(desc(safetyReviews.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSafetyReview(review: InsertSafetyReview) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(safetyReviews).values(review) as any;
  return Number(result.insertId);
}

export async function updateSafetyReview(id: number, updates: Partial<InsertSafetyReview>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(safetyReviews).set(updates).where(eq(safetyReviews.id, id));
}

// ============ Clinical Outcomes ============

export async function getOutcomesByPatient(patientId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(clinicalOutcomes)
    .where(eq(clinicalOutcomes.patientId, patientId))
    .orderBy(desc(clinicalOutcomes.outcomeDate));
}

export async function getOutcomesByCarePlan(carePlanId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(clinicalOutcomes)
    .where(eq(clinicalOutcomes.carePlanId, carePlanId))
    .orderBy(desc(clinicalOutcomes.outcomeDate));
}

export async function createClinicalOutcome(outcome: InsertClinicalOutcome) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(clinicalOutcomes).values(outcome) as any;
  return Number(result.insertId);
}

export async function updateClinicalOutcome(id: number, updates: Partial<InsertClinicalOutcome>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(clinicalOutcomes).set(updates).where(eq(clinicalOutcomes.id, id));
}

// ============ Analytics & Dashboard ============

export async function getPatientStats(physicianId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, active: 0, inactive: 0 };

  const baseQuery = physicianId 
    ? db.select().from(patients).where(eq(patients.assignedPhysicianId, physicianId))
    : db.select().from(patients);

  const allPatients = await baseQuery;
  
  return {
    total: allPatients.length,
    active: allPatients.filter(p => p.status === 'active').length,
    inactive: allPatients.filter(p => p.status === 'inactive').length,
    discharged: allPatients.filter(p => p.status === 'discharged').length,
  };
}


// ============ Quality Assurance Metrics ============

export async function saveCodingQualityMetric(metric: InsertCodingQualityMetric) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(codingQualityMetrics).values(metric);
  return { id: Number(result[0].insertId) };
}

export async function getPhysicianQualityMetrics(physicianId: number, limit: number = 30) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(codingQualityMetrics)
    .where(eq(codingQualityMetrics.physicianId, physicianId))
    .orderBy(desc(codingQualityMetrics.createdAt))
    .limit(limit);
}

export async function getQualityMetricsByDateRange(
  physicianId: number,
  startDate: Date,
  endDate: Date
) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(codingQualityMetrics)
    .where(
      and(
        eq(codingQualityMetrics.physicianId, physicianId),
        gte(codingQualityMetrics.createdAt, startDate),
        lte(codingQualityMetrics.createdAt, endDate)
      )
    )
    .orderBy(desc(codingQualityMetrics.createdAt));
}

export async function savePhysicianPerformanceAnalytics(analytics: InsertPhysicianPerformanceAnalytic) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(physicianPerformanceAnalytics).values(analytics);
  return { id: Number(result[0].insertId) };
}

export async function getLatestPhysicianPerformance(physicianId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db
    .select()
    .from(physicianPerformanceAnalytics)
    .where(eq(physicianPerformanceAnalytics.physicianId, physicianId))
    .orderBy(desc(physicianPerformanceAnalytics.createdAt))
    .limit(1);
  
  return results.length > 0 ? results[0] : null;
}

export async function getPhysicianPerformanceHistory(physicianId: number, limit: number = 12) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(physicianPerformanceAnalytics)
    .where(eq(physicianPerformanceAnalytics.physicianId, physicianId))
    .orderBy(desc(physicianPerformanceAnalytics.periodEnd))
    .limit(limit);
}


// ============ Patient Detail Queries ============

export async function getPatientWithHistory(patientId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const patientResults = await db
    .select()
    .from(patients)
    .where(eq(patients.id, patientId))
    .limit(1);
  
  if (patientResults.length === 0) return null;
  
  return patientResults[0];
}

export async function getPatientEncounters(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all DAO protocol entries (encounters) for this patient
  const encounters = await db
    .select()
    .from(daoProtocolEntries)
    .where(eq(daoProtocolEntries.patientId, patientId))
    .orderBy(desc(daoProtocolEntries.createdAt));
  
  return encounters;
}

export async function getEncounterWithAnalysis(encounterId: number) {
  const db = await getDb();
  if (!db) return null;
  
  // Get the encounter
  const encounterResults = await db
    .select()
    .from(daoProtocolEntries)
    .where(eq(daoProtocolEntries.id, encounterId))
    .limit(1);
  
  if (encounterResults.length === 0) return null;
  
  const encounter = encounterResults[0];
  
  // Get related analysis data
  const [simulations, insights, carePlans, reviews, outcomes, qualityMetrics] = await Promise.all([
    db.select().from(delphiSimulations).where(eq(delphiSimulations.daoEntryId, encounterId)),
    db.select().from(causalInsights).where(eq(causalInsights.daoEntryId, encounterId)),
    db.select().from(precisionCarePlans).where(eq(precisionCarePlans.daoEntryId, encounterId)),
    db.select().from(safetyReviews).where(eq(safetyReviews.daoEntryId, encounterId)),
    db.select().from(clinicalOutcomes).where(eq(clinicalOutcomes.daoEntryId, encounterId)),
    db.select().from(codingQualityMetrics).where(eq(codingQualityMetrics.daoEntryId, encounterId))
  ]);
  
  return {
    encounter,
    simulations,
    insights,
    carePlans,
    reviews,
    outcomes,
    qualityMetrics: qualityMetrics.length > 0 ? qualityMetrics[0] : null
  };
}

export async function getPatientVitalSignsHistory(patientId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  
  const encounters = await db
    .select({
      id: daoProtocolEntries.id,
      vitalSigns: daoProtocolEntries.vitalSigns,
      createdAt: daoProtocolEntries.createdAt
    })
    .from(daoProtocolEntries)
    .where(eq(daoProtocolEntries.patientId, patientId))
    .orderBy(desc(daoProtocolEntries.createdAt))
    .limit(limit);
  
  return encounters.filter(e => e.vitalSigns !== null);
}

export async function getPatientDiagnosisHistory(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const encounters = await db
    .select({
      id: daoProtocolEntries.id,
      diagnosis: daoProtocolEntries.diagnosis,
      differentialDiagnosis: daoProtocolEntries.differentialDiagnosis,
      createdAt: daoProtocolEntries.createdAt
    })
    .from(daoProtocolEntries)
    .where(eq(daoProtocolEntries.patientId, patientId))
    .orderBy(desc(daoProtocolEntries.createdAt));
  
  return encounters;
}

// ============ Protocol System ============

export async function getLabTemplatesByProtocol(protocolId: string) {
  const db = await getDb();
  if (!db) return [];
  
  const { labOrderTemplates } = await import("../drizzle/schema");
  const templates = await db.select().from(labOrderTemplates).where(eq(labOrderTemplates.protocolId, protocolId));
  return templates;
}

export async function createProtocolApplication(data: {
  protocolId: string;
  protocolName: string;
  daoEntryId: number;
  patientId: number;
  physicianId: number;
  sectionsUsed?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { protocolApplications } = await import("../drizzle/schema");
  const [result] = await db.insert(protocolApplications).values({
    protocolId: data.protocolId,
    protocolName: data.protocolName,
    daoEntryId: data.daoEntryId,
    patientId: data.patientId,
    physicianId: data.physicianId,
    sectionsUsed: data.sectionsUsed,
    feedbackSubmitted: false,
  });
  
  return { id: result.insertId, success: true };
}

export async function getProtocolApplicationsByProtocol(protocolId: string) {
  const db = await getDb();
  if (!db) return [];
  
  const { protocolApplications } = await import("../drizzle/schema");
  const applications = await db.select().from(protocolApplications).where(eq(protocolApplications.protocolId, protocolId));
  return applications;
}

export async function submitProtocolFeedback(applicationId: number, rating: number, comment?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { protocolApplications } = await import("../drizzle/schema");
  await db.update(protocolApplications)
    .set({
      feedbackSubmitted: true,
      feedbackRating: rating,
      feedbackComment: comment,
      feedbackSubmittedAt: new Date(),
    })
    .where(eq(protocolApplications.id, applicationId));
  
  return { success: true };
}

export async function createProtocolOutcome(data: {
  protocolApplicationId: number;
  patientId: number;
  daoEntryId: number;
  outcomeType: "diagnosis_confirmed" | "diagnosis_changed" | "treatment_successful" | "treatment_modified" | "referred" | "ongoing";
  finalDiagnosis?: string;
  diagnosisMatchedProtocol?: boolean;
  timeToResolution?: number;
  labsOrdered?: number;
  labsAbnormal?: number;
  followUpVisits?: number;
  protocolAdherence?: number;
  patientSatisfaction?: number;
  notes?: string;
  documentedById: number;
  outcomeDate: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const { protocolOutcomes } = await import("../drizzle/schema");
  const [result] = await db.insert(protocolOutcomes).values(data);
  
  return { id: result.insertId, success: true };
}

export async function getProtocolOutcomesByProtocol(protocolId: string) {
  const db = await getDb();
  if (!db) return [];
  
  const { protocolOutcomes, protocolApplications } = await import("../drizzle/schema");
  
  const outcomes = await db
    .select()
    .from(protocolOutcomes)
    .innerJoin(protocolApplications, eq(protocolOutcomes.protocolApplicationId, protocolApplications.id))
    .where(eq(protocolApplications.protocolId, protocolId));
  
  return outcomes.map(row => row.protocol_outcomes);
}

export async function getProtocolAnalytics() {
  const db = await getDb();
  if (!db) return {
    totalProtocols: 0,
    totalApplications: 0,
    averageFeedbackRate: 0,
    averageRating: 0,
    protocolStats: []
  };
  
  const { protocolApplications, protocolOutcomes } = await import("../drizzle/schema");
  
  // Get all applications
  const applications = await db.select().from(protocolApplications);
  
  // Group by protocol
  const protocolMap = new Map<string, any>();
  
  for (const app of applications) {
    if (!protocolMap.has(app.protocolId)) {
      protocolMap.set(app.protocolId, {
        protocolId: app.protocolId,
        protocolName: app.protocolName,
        usageCount: 0,
        feedbackCount: 0,
        feedbackRatings: [],
        outcomesCount: 0,
        outcomes: [],
        qualityMetrics: {
          averageAdherence: null,
          averageTimeToResolution: null,
          diagnosisMatchRate: null,
          averagePatientSatisfaction: null,
        }
      });
    }
    
    const stats = protocolMap.get(app.protocolId);
    stats.usageCount++;
    
    if (app.feedbackSubmitted && app.feedbackRating) {
      stats.feedbackCount++;
      stats.feedbackRatings.push(app.feedbackRating);
    }
  }
  
  // Get outcomes for each protocol
  for (const [protocolId, stats] of Array.from(protocolMap.entries())) {
    const outcomes = await db
      .select()
      .from(protocolOutcomes)
      .innerJoin(protocolApplications, eq(protocolOutcomes.protocolApplicationId, protocolApplications.id))
      .where(eq(protocolApplications.protocolId, protocolId));
    
    stats.outcomesCount = outcomes.length;
    
    // Group outcomes by type
    const outcomeTypes = new Map<string, number>();
    let totalAdherence = 0;
    let adherenceCount = 0;
    let totalTimeToResolution = 0;
    let timeCount = 0;
    let diagnosisMatches = 0;
    let diagnosisTotal = 0;
    let totalPatientSatisfaction = 0;
    let satisfactionCount = 0;
    
    for (const row of outcomes) {
      const outcome = row.protocol_outcomes;
      
      // Count outcome types
      const type = outcome.outcomeType;
      outcomeTypes.set(type, (outcomeTypes.get(type) || 0) + 1);
      
      // Calculate quality metrics
      if (outcome.protocolAdherence !== null) {
        totalAdherence += outcome.protocolAdherence;
        adherenceCount++;
      }
      
      if (outcome.timeToResolution !== null) {
        totalTimeToResolution += outcome.timeToResolution;
        timeCount++;
      }
      
      if (outcome.diagnosisMatchedProtocol !== null) {
        diagnosisTotal++;
        if (outcome.diagnosisMatchedProtocol) {
          diagnosisMatches++;
        }
      }
      
      if (outcome.patientSatisfaction !== null) {
        totalPatientSatisfaction += outcome.patientSatisfaction;
        satisfactionCount++;
      }
    }
    
    stats.outcomes = Array.from(outcomeTypes.entries()).map(([type, count]) => ({
      type,
      count
    }));
    
    stats.qualityMetrics = {
      averageAdherence: adherenceCount > 0 ? totalAdherence / adherenceCount : null,
      averageTimeToResolution: timeCount > 0 ? totalTimeToResolution / timeCount : null,
      diagnosisMatchRate: diagnosisTotal > 0 ? (diagnosisMatches / diagnosisTotal) * 100 : null,
      averagePatientSatisfaction: satisfactionCount > 0 ? totalPatientSatisfaction / satisfactionCount : null,
    };
  }
  
  // Calculate protocol stats
  const protocolStats = Array.from(protocolMap.values()).map(stats => ({
    ...stats,
    feedbackRate: stats.usageCount > 0 ? (stats.feedbackCount / stats.usageCount) * 100 : 0,
    averageRating: stats.feedbackRatings.length > 0
      ? stats.feedbackRatings.reduce((a: number, b: number) => a + b, 0) / stats.feedbackRatings.length
      : null,
  }));
  
  // Calculate overall stats
  const totalApplications = applications.length;
  const totalFeedback = applications.filter(app => app.feedbackSubmitted).length;
  const allRatings = applications
    .filter(app => app.feedbackRating !== null)
    .map(app => app.feedbackRating!);
  
  return {
    totalProtocols: protocolMap.size,
    totalApplications,
    averageFeedbackRate: totalApplications > 0 ? (totalFeedback / totalApplications) * 100 : 0,
    averageRating: allRatings.length > 0
      ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
      : null,
    protocolStats,
  };
}

// ============ Clinical Knowledge Base Functions ============

export async function getAllKnowledgeBaseEntries() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.createdAt));
}

export async function getKnowledgeBaseEntry(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const [entry] = await db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id));
  if (!entry) return null;
  
  // Also fetch references
  const references = await db
    .select()
    .from(knowledgeBaseReferences)
    .where(eq(knowledgeBaseReferences.knowledgeBaseId, id));
  
  return { ...entry, references };
}

export async function createKnowledgeBaseEntry(data: {
  compoundName: string;
  category: string;
  summary: string;
  mechanisms: Array<{name: string, description: string}>;
  clinicalEvidence: Array<{finding: string, source: string}>;
  dosing?: {typical: string, range: string, notes: string};
  contraindications?: string[];
  interactions?: string[];
  sources: string[];
  tags: string[];
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(knowledgeBase).values(data);
  return result.insertId;
}

export async function searchKnowledgeBase(params: {
  query?: string;
  category?: string;
  tags?: string[];
}) {
  const db = await getDb();
  if (!db) return [];
  
  let queryBuilder = db.select().from(knowledgeBase);
  
  if (params.category) {
    queryBuilder = queryBuilder.where(eq(knowledgeBase.category, params.category)) as any;
  }
  
  // Note: Full-text search on JSON fields and text would require more complex SQL
  // For now, returning all results and filtering on frontend
  const results = await queryBuilder.orderBy(desc(knowledgeBase.createdAt));
  
  if (params.query) {
    const searchLower = params.query.toLowerCase();
    return results.filter((entry: any) => 
      entry.compoundName.toLowerCase().includes(searchLower) ||
      entry.summary.toLowerCase().includes(searchLower) ||
      entry.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
    );
  }
  
  if (params.tags && params.tags.length > 0) {
    return results.filter((entry: any) =>
      params.tags!.some(tag => entry.tags.includes(tag))
    );
  }
  
  return results;
}

export async function getRelevantKnowledgeForCondition(condition: string, symptoms?: string[]) {
  // Get all knowledge entries and filter by relevance
  const allEntries = await getAllKnowledgeBaseEntries();
  
  const conditionLower = condition.toLowerCase();
  const symptomTerms = symptoms?.map(s => s.toLowerCase()) || [];
  
  return allEntries.filter((entry: any) => {
    const matchesCondition = 
      entry.compoundName.toLowerCase().includes(conditionLower) ||
      entry.summary.toLowerCase().includes(conditionLower) ||
      entry.tags.some((tag: string) => tag.toLowerCase().includes(conditionLower));
    
    const matchesSymptoms = symptomTerms.length === 0 || 
      symptomTerms.some(symptom =>
        entry.summary.toLowerCase().includes(symptom) ||
        entry.tags.some((tag: string) => tag.toLowerCase().includes(symptom))
      );
    
    return matchesCondition || matchesSymptoms;
  });
}

export async function recordKnowledgeBaseUsage(data: {
  knowledgeBaseId: number;
  encounterId?: number;
  physicianId: number;
  context: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(knowledgeBaseUsage).values(data);
  return result.insertId;
}

// ============ Patient Intake Functions ============

export async function createIntakeSession(data: { patientId?: number; sessionToken: string }) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const [result] = await database.insert(intakeSessions).values({
    patientId: data.patientId,
    sessionToken: data.sessionToken,
    status: "in_progress",
    collectedData: {},
  });
  return result.insertId;
}

export async function getIntakeSession(sessionToken: string) {
  const database = await getDb();
  if (!database) return null;

  const [session] = await database
    .select()
    .from(intakeSessions)
    .where(eq(intakeSessions.sessionToken, sessionToken))
    .limit(1);
  
  if (!session) return null;

  // Get messages for this session
  const messages = await database
    .select()
    .from(intakeMessages)
    .where(eq(intakeMessages.sessionId, session.id))
    .orderBy(intakeMessages.createdAt);

  return {
    ...session,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  };
}

export async function addIntakeMessage(sessionId: number, role: "assistant" | "user", content: string) {
  const database = await getDb();
  if (!database) return;

  await database.insert(intakeMessages).values({
    sessionId,
    role,
    content,
  });
}

export async function updateIntakeSessionData(sessionId: number, newData: any) {
  const database = await getDb();
  if (!database) return;

  const [session] = await database
    .select()
    .from(intakeSessions)
    .where(eq(intakeSessions.id, sessionId))
    .limit(1);

  if (!session) return;

  const updatedData = {
    ...session.collectedData,
    ...newData,
  };

  await database
    .update(intakeSessions)
    .set({ collectedData: updatedData })
    .where(eq(intakeSessions.id, sessionId));
}

export async function completeIntakeSession(sessionId: number) {
  const database = await getDb();
  if (!database) return;

  await database
    .update(intakeSessions)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(intakeSessions.id, sessionId));
}

export async function listIntakeSessions(status?: 'in_progress' | 'completed') {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(intakeSessions);
  
  if (status) {
    query = query.where(eq(intakeSessions.status, status)) as any;
  }

  const sessions = await query;
  
  // Fetch messages for each session
  const sessionsWithMessages = await Promise.all(
    sessions.map(async (session) => {
      const messages = await db
        .select()
        .from(intakeMessages)
        .where(eq(intakeMessages.sessionId, session.id))
        .orderBy(intakeMessages.createdAt);
      
      return {
        ...session,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      };
    })
  );

  return sessionsWithMessages;
}

export async function createIntakeSessionWithDetails(data: {
  sessionToken: string;
  patientName: string;
  patientEmail: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(intakeSessions).values({
    sessionToken: data.sessionToken,
    patientName: data.patientName,
    patientEmail: data.patientEmail,
    status: "in_progress",
    collectedData: {},
  });

  return Number(result.insertId);
}

// ============ Patient Portal - Lab Results ============

export async function createPatientLabResult(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(patientLabResults).values(data);
  return result;
}

export async function getPatientLabResults(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(patientLabResults)
    .where(eq(patientLabResults.patientId, patientId))
    .orderBy(desc(patientLabResults.testDate));
}

export async function updateLabResultReview(labId: number, physicianId: number, notes: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(patientLabResults)
    .set({
      reviewedByPhysician: true,
      reviewedAt: new Date(),
      reviewedById: physicianId,
      physicianNotes: notes
    })
    .where(eq(patientLabResults.id, labId));
}

export async function getPendingLabReviews(physicianId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const baseQuery = db.select({
    labResult: patientLabResults,
    patient: patients
  })
  .from(patientLabResults)
  .leftJoin(patients, eq(patientLabResults.patientId, patients.id));
  
  if (physicianId) {
    return baseQuery
      .where(and(
        eq(patientLabResults.reviewedByPhysician, false),
        eq(patients.assignedPhysicianId, physicianId)
      ))
      .orderBy(desc(patientLabResults.createdAt));
  }
  
  return baseQuery
    .where(eq(patientLabResults.reviewedByPhysician, false))
    .orderBy(desc(patientLabResults.createdAt));
}

export async function getReviewedLabResults(physicianId?: number, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  const baseQuery = db.select({
    labResult: patientLabResults,
    patient: patients,
    reviewer: users
  })
  .from(patientLabResults)
  .leftJoin(patients, eq(patientLabResults.patientId, patients.id))
  .leftJoin(users, eq(patientLabResults.reviewedById, users.id));
  
  if (physicianId) {
    return baseQuery
      .where(and(
        eq(patientLabResults.reviewedByPhysician, true),
        eq(patientLabResults.reviewedById, physicianId)
      ))
      .orderBy(desc(patientLabResults.reviewedAt))
      .limit(limit);
  }
  
  return baseQuery
    .where(eq(patientLabResults.reviewedByPhysician, true))
    .orderBy(desc(patientLabResults.reviewedAt))
    .limit(limit);
}

export async function getLabResultById(labId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const results = await db.select({
    labResult: patientLabResults,
    patient: patients
  })
  .from(patientLabResults)
  .leftJoin(patients, eq(patientLabResults.patientId, patients.id))
  .where(eq(patientLabResults.id, labId))
  .limit(1);
  
  return results[0] || null;
}

// ============ Patient Portal - Care Plans ============

export async function createPatientCarePlan(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(patientCarePlans).values(data);
  return result;
}

export async function getPatientCarePlans(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(patientCarePlans)
    .where(eq(patientCarePlans.patientId, patientId))
    .orderBy(desc(patientCarePlans.createdAt));
}

export async function getActivePatientCarePlan(patientId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const plans = await db.select().from(patientCarePlans)
    .where(and(
      eq(patientCarePlans.patientId, patientId),
      eq(patientCarePlans.status, "active")
    ))
    .orderBy(desc(patientCarePlans.createdAt))
    .limit(1);
    
  return plans[0] || null;
}

export async function updateCarePlanStatus(planId: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(patientCarePlans)
    .set({ status: status as any })
    .where(eq(patientCarePlans.id, planId));
}

export async function shareCarePlanWithPatient(planId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(patientCarePlans)
    .set({
      sharedWithPatient: true,
      sharedAt: new Date()
    })
    .where(eq(patientCarePlans.id, planId));
}

// ============ Patient Portal - Check-ins ============

export async function createPatientCheckIn(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(patientCheckIns).values(data);
  return result;
}

export async function getPatientCheckIns(patientId: number, limit = 30) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(patientCheckIns)
    .where(eq(patientCheckIns.patientId, patientId))
    .orderBy(desc(patientCheckIns.checkInDate))
    .limit(limit);
}

export async function getCarePlanCheckIns(carePlanId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(patientCheckIns)
    .where(eq(patientCheckIns.carePlanId, carePlanId))
    .orderBy(desc(patientCheckIns.checkInDate));
}

export async function markCheckInReviewed(checkInId: number, response: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(patientCheckIns)
    .set({
      reviewedByPhysician: true,
      reviewedAt: new Date(),
      physicianResponse: response
    })
    .where(eq(patientCheckIns.id, checkInId));
}

// ============ Patient Portal - Conversations ============

export async function createPatientConversation(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(patientConversations).values(data);
  return result;
}

export async function updatePatientConversation(conversationId: number, messages: any[], summary?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { messages };
  if (summary) updateData.contextSummary = summary;
  
  await db.update(patientConversations)
    .set(updateData)
    .where(eq(patientConversations.id, conversationId));
}

export async function getPatientConversations(patientId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(patientConversations)
    .where(eq(patientConversations.patientId, patientId))
    .orderBy(desc(patientConversations.createdAt))
    .limit(limit);
}

// ============ Patient Portal - Physician Alerts ============

export async function createPhysicianAlert(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(physicianAlerts).values(data);
  return result;
}

export async function getPhysicianAlerts(physicianId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(physicianAlerts.physicianId, physicianId)];
  if (status) {
    conditions.push(eq(physicianAlerts.status, status as any));
  }
  
  return db.select().from(physicianAlerts)
    .where(and(...conditions))
    .orderBy(desc(physicianAlerts.createdAt));
}

export async function updateAlertStatus(alertId: number, status: string, resolution?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { status: status as any };
  
  if (status === "acknowledged") {
    updateData.acknowledgedAt = new Date();
  } else if (status === "resolved") {
    updateData.resolvedAt = new Date();
    if (resolution) updateData.resolution = resolution;
  }
  
  await db.update(physicianAlerts)
    .set(updateData)
    .where(eq(physicianAlerts.id, alertId));
}

// ============ Patient Portal - Lab Request Forms ============

export async function createLabRequestForm(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(labRequestForms).values(data);
  return result;
}

export async function getPatientLabRequests(patientId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(labRequestForms)
    .where(eq(labRequestForms.patientId, patientId))
    .orderBy(desc(labRequestForms.createdAt));
}

export async function updateLabRequestStatus(requestId: number, status: string, pdfUrl?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { status: status as any };
  
  if (pdfUrl) {
    updateData.formPdfUrl = pdfUrl;
    updateData.generatedAt = new Date();
  }
  
  if (status === "sent_to_patient") {
    updateData.sentToPatientAt = new Date();
  } else if (status === "completed") {
    updateData.completedAt = new Date();
  }
  
  await db.update(labRequestForms)
    .set(updateData)
    .where(eq(labRequestForms.id, requestId));
}

// ============ Patient Portal - Progress Metrics ============

export async function createProgressMetrics(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const [result] = await db.insert(patientProgressMetrics).values(data);
  return result;
}

export async function getPatientProgressMetrics(patientId: number, carePlanId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(patientProgressMetrics.patientId, patientId)];
  if (carePlanId) {
    conditions.push(eq(patientProgressMetrics.carePlanId, carePlanId));
  }
  
  return db.select().from(patientProgressMetrics)
    .where(and(...conditions))
    .orderBy(desc(patientProgressMetrics.periodStart));
}

// ============ Subscription Management ============

export async function updateUserSubscription(
  userId: number,
  data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: "active" | "canceled" | "past_due" | "trialing" | "inactive";
    subscriptionEndDate?: Date;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(users)
    .set(data as any)
    .where(eq(users.id, userId));
}

export async function getUserBySubscriptionId(subscriptionId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const [user] = await db.select().from(users)
    .where(eq(users.stripeSubscriptionId, subscriptionId))
    .limit(1);
  
  return user || null;
}

// ============ Protocol Delivery Tracking ============

export async function createProtocolDelivery(data: {
  userId: number;
  carePlanId?: number | null;
  protocolName: string;
  deliveryType: 'enrollment' | 'manual' | 'update';
  emailSent: boolean;
  emailMessageId?: string;
  pdfGenerated: boolean;
  errorMessage?: string;
  sentAt?: Date | null;
}) {
  const database = await getDb();
  if (!database) return null;

  const { protocolDeliveries } = await import("../drizzle/schema");

  const [delivery] = await database.insert(protocolDeliveries).values({
    userId: data.userId,
    carePlanId: data.carePlanId,
    protocolName: data.protocolName,
    deliveryType: data.deliveryType,
    emailSent: data.emailSent,
    emailMessageId: data.emailMessageId,
    pdfGenerated: data.pdfGenerated,
    errorMessage: data.errorMessage,
    sentAt: data.sentAt,
  });

  return delivery;
}

export async function getProtocolDeliveriesByUser(userId: number) {
  const database = await getDb();
  if (!database) return [];

  const { protocolDeliveries } = await import("../drizzle/schema");

  return database.select().from(protocolDeliveries).where(eq(protocolDeliveries.userId, userId));
}

export async function getAllUsers() {
  const database = await getDb();
  if (!database) return [];

  return database.select().from(users);
}

export async function getUserById(userId: number) {
  const database = await getDb();
  if (!database) return null;

  const [user] = await database.select().from(users).where(eq(users.id, userId));
  return user || null;
}

// ============ Protocol Customization Audit ============

export async function createProtocolAudit(data: {
  protocolDeliveryId: number;
  carePlanId: number;
  physicianId: number;
  patientId: number;
  originalProtocol: any;
  customizedProtocol: any;
  changesSummary?: any[];
  customizationReason?: string;
  allergenConflictsResolved?: string[];
}) {
  const database = await getDb();
  if (!database) return null;

  const { protocolCustomizationAudit } = await import("../drizzle/schema");

  const [audit] = await database.insert(protocolCustomizationAudit).values({
    protocolDeliveryId: data.protocolDeliveryId,
    carePlanId: data.carePlanId,
    physicianId: data.physicianId,
    patientId: data.patientId,
    originalProtocol: data.originalProtocol,
    customizedProtocol: data.customizedProtocol,
    changesSummary: data.changesSummary,
    customizationReason: data.customizationReason,
    allergenConflictsResolved: data.allergenConflictsResolved,
  });

  return audit;
}

export async function getProtocolAuditByDeliveryId(deliveryId: number) {
  const database = await getDb();
  if (!database) return null;

  const { protocolCustomizationAudit } = await import("../drizzle/schema");

  const [audit] = await database
    .select()
    .from(protocolCustomizationAudit)
    .where(eq(protocolCustomizationAudit.protocolDeliveryId, deliveryId));

  return audit || null;
}

export async function getProtocolAuditsByPatient(patientId: number) {
  const database = await getDb();
  if (!database) return [];

  const { protocolCustomizationAudit } = await import("../drizzle/schema");

  return database
    .select()
    .from(protocolCustomizationAudit)
    .where(eq(protocolCustomizationAudit.patientId, patientId))
    .orderBy(desc(protocolCustomizationAudit.createdAt));
}

// ============ Protocol Templates ============

export async function createProtocolTemplate(data: {
  createdBy: number;
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  templateData: any;
  isPublic?: boolean;
  isDefault?: boolean;
}) {
  const database = await getDb();
  if (!database) return null;

  const { protocolTemplates } = await import("../drizzle/schema");

  const [template] = await database.insert(protocolTemplates).values({
    createdBy: data.createdBy,
    name: data.name,
    description: data.description,
    category: data.category,
    tags: data.tags,
    templateData: data.templateData,
    isPublic: data.isPublic || false,
    isDefault: data.isDefault || false,
    usageCount: 0,
  });

  return template;
}

export async function getAllProtocolTemplates(physicianId?: number) {
  const database = await getDb();
  if (!database) return [];

  const { protocolTemplates } = await import("../drizzle/schema");

  // Get public templates + physician's own templates
  if (physicianId) {
    const allTemplates = await database
      .select()
      .from(protocolTemplates);
    
    return allTemplates.filter(
      t => t.isPublic || t.createdBy === physicianId
    ).sort((a, b) => b.usageCount - a.usageCount);
  }

  // Get all public templates
  return database
    .select()
    .from(protocolTemplates)
    .where(eq(protocolTemplates.isPublic, true))
    .orderBy(desc(protocolTemplates.usageCount), desc(protocolTemplates.createdAt));
}

export async function getProtocolTemplateById(id: number) {
  const database = await getDb();
  if (!database) return null;

  const { protocolTemplates } = await import("../drizzle/schema");

  const [template] = await database
    .select()
    .from(protocolTemplates)
    .where(eq(protocolTemplates.id, id));

  return template || null;
}

export async function incrementTemplateUsage(id: number) {
  const database = await getDb();
  if (!database) return;

  const { protocolTemplates } = await import("../drizzle/schema");

  await database
    .update(protocolTemplates)
    .set({
      usageCount: sql`${protocolTemplates.usageCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(protocolTemplates.id, id));
}

export async function searchProtocolTemplates(searchTerm: string, category?: string) {
  const database = await getDb();
  if (!database) return [];

  const { protocolTemplates } = await import("../drizzle/schema");

  const results = await database
    .select()
    .from(protocolTemplates)
    .where(eq(protocolTemplates.status, 'active'));

  // Filter by category if provided
  let filtered = category
    ? results.filter(t => t.category === category)
    : results;

  // Filter by search term (name or description)
  if (searchTerm) {
    return results.filter(
      (t) =>
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  return results;
}


// ============================================================================
// Template Versioning Functions
// ============================================================================

export async function createTemplateVersion(data: {
  templateId: number;
  versionNumber: number;
  changeSummary: string;
  changedBy: number;
  templateData: any;
}) {
  const database = await getDb();
  if (!database) return null;

  const { protocolTemplateVersions } = await import("../drizzle/schema");

  const [version] = await database.insert(protocolTemplateVersions).values({
    templateId: data.templateId,
    versionNumber: data.versionNumber,
    changeSummary: data.changeSummary,
    changedBy: data.changedBy,
    templateData: data.templateData,
  });

  return version;
}

export async function getTemplateVersionHistory(templateId: number) {
  const database = await getDb();
  if (!database) return [];

  const { protocolTemplateVersions } = await import("../drizzle/schema");

  return database
    .select()
    .from(protocolTemplateVersions)
    .where(eq(protocolTemplateVersions.templateId, templateId))
    .orderBy(desc(protocolTemplateVersions.versionNumber));
}

export async function getTemplateVersion(versionId: number) {
  const database = await getDb();
  if (!database) return null;

  const { protocolTemplateVersions } = await import("../drizzle/schema");

  const [version] = await database
    .select()
    .from(protocolTemplateVersions)
    .where(eq(protocolTemplateVersions.id, versionId));

  return version || null;
}

export async function getLatestVersionNumber(templateId: number): Promise<number> {
  const database = await getDb();
  if (!database) return 0;

  const { protocolTemplateVersions } = await import("../drizzle/schema");

  const versions = await database
    .select()
    .from(protocolTemplateVersions)
    .where(eq(protocolTemplateVersions.templateId, templateId))
    .orderBy(desc(protocolTemplateVersions.versionNumber))
    .limit(1);

  return versions.length > 0 ? versions[0].versionNumber : 0;
}

// ============================================================================
// Template Preset Functions
// ============================================================================

export async function createTemplatePreset(data: {
  physicianId: number;
  baseTemplateId?: number;
  name: string;
  description?: string;
  category: string;
  tags?: string[];
  templateData: any;
}) {
  const database = await getDb();
  if (!database) return null;

  const { physicianTemplatePresets } = await import("../drizzle/schema");

  const [preset] = await database.insert(physicianTemplatePresets).values({
    physicianId: data.physicianId,
    baseTemplateId: data.baseTemplateId,
    name: data.name,
    description: data.description,
    category: data.category,
    tags: data.tags,
    templateData: data.templateData,
    usageCount: 0,
  });

  return preset;
}

export async function getPhysicianPresets(physicianId: number, category?: string) {
  const database = await getDb();
  if (!database) return [];

  const { physicianTemplatePresets } = await import("../drizzle/schema");

  let query = database
    .select()
    .from(physicianTemplatePresets)
    .where(eq(physicianTemplatePresets.physicianId, physicianId));

  const results = await query;

  if (category) {
    return results.filter(p => p.category === category);
  }

  return results.sort((a, b) => b.usageCount - a.usageCount);
}

export async function getPresetById(id: number) {
  const database = await getDb();
  if (!database) return null;

  const { physicianTemplatePresets } = await import("../drizzle/schema");

  const [preset] = await database
    .select()
    .from(physicianTemplatePresets)
    .where(eq(physicianTemplatePresets.id, id));

  return preset || null;
}

export async function updatePreset(id: number, data: Partial<{
  name: string;
  description: string;
  category: string;
  tags: string[];
  templateData: any;
}>) {
  const database = await getDb();
  if (!database) return null;

  const { physicianTemplatePresets } = await import("../drizzle/schema");

  await database
    .update(physicianTemplatePresets)
    .set(data)
    .where(eq(physicianTemplatePresets.id, id));

  return getPresetById(id);
}

export async function deletePreset(id: number) {
  const database = await getDb();
  if (!database) return;

  const { physicianTemplatePresets } = await import("../drizzle/schema");

  await database
    .delete(physicianTemplatePresets)
    .where(eq(physicianTemplatePresets.id, id));
}

export async function incrementPresetUsage(id: number) {
  const database = await getDb();
  if (!database) return;

  const { physicianTemplatePresets } = await import("../drizzle/schema");

  await database
    .update(physicianTemplatePresets)
    .set({
      usageCount: sql`${physicianTemplatePresets.usageCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(physicianTemplatePresets.id, id));
}

// ============================================================================
// Template Usage Analytics Functions
// ============================================================================

export async function logTemplateUsage(data: {
  templateId?: number;
  presetId?: number;
  physicianId: number;
  patientId?: number;
  wasCustomized: boolean;
  customizationCount?: number;
}) {
  const database = await getDb();
  if (!database) return null;

  const { templateUsageLogs } = await import("../drizzle/schema");

  const [log] = await database.insert(templateUsageLogs).values({
    templateId: data.templateId,
    presetId: data.presetId,
    physicianId: data.physicianId,
    patientId: data.patientId,
    wasCustomized: data.wasCustomized,
    customizationCount: data.customizationCount || 0,
    outcomeRecorded: false,
  });

  return log;
}

export async function recordTemplateOutcome(logId: number, data: {
  outcomeSuccess: boolean;
  outcomeNotes?: string;
}) {
  const database = await getDb();
  if (!database) return;

  const { templateUsageLogs } = await import("../drizzle/schema");

  await database
    .update(templateUsageLogs)
    .set({
      outcomeRecorded: true,
      outcomeSuccess: data.outcomeSuccess,
      outcomeNotes: data.outcomeNotes,
      outcomeRecordedAt: new Date(),
    })
    .where(eq(templateUsageLogs.id, logId));
}

export async function getTemplateUsageLogs(templateId: number, limit: number = 50) {
  const database = await getDb();
  if (!database) return [];

  const { templateUsageLogs } = await import("../drizzle/schema");

  return database
    .select()
    .from(templateUsageLogs)
    .where(eq(templateUsageLogs.templateId, templateId))
    .orderBy(desc(templateUsageLogs.createdAt))
    .limit(limit);
}

export async function getTemplateAnalytics(templateId: number) {
  const database = await getDb();
  if (!database) return null;

  const { templateUsageLogs, templateOutcomeCorrelations } = await import("../drizzle/schema");

  // Get usage logs
  const logs = await database
    .select()
    .from(templateUsageLogs)
    .where(eq(templateUsageLogs.templateId, templateId));

  // Calculate metrics
  const totalUsages = logs.length;
  const customizedUsages = logs.filter(l => l.wasCustomized).length;
  const recordedOutcomes = logs.filter(l => l.outcomeRecorded);
  const successfulOutcomes = recordedOutcomes.filter(l => l.outcomeSuccess).length;
  const unsuccessfulOutcomes = recordedOutcomes.filter(l => !l.outcomeSuccess).length;
  
  const successRate = recordedOutcomes.length > 0
    ? (successfulOutcomes / recordedOutcomes.length) * 100
    : null;

  const avgCustomizationCount = logs.length > 0
    ? logs.reduce((sum, l) => sum + (l.customizationCount || 0), 0) / logs.length
    : 0;

  return {
    templateId,
    totalUsages,
    customizedUsages,
    customizationRate: totalUsages > 0 ? (customizedUsages / totalUsages) * 100 : 0,
    recordedOutcomes: recordedOutcomes.length,
    successfulOutcomes,
    unsuccessfulOutcomes,
    successRate,
    avgCustomizationCount,
  };
}

export async function updateTemplateOutcomeCorrelation(templateId: number) {
  const database = await getDb();
  if (!database) return;

  const analytics = await getTemplateAnalytics(templateId);
  if (!analytics) return;

  const { templateOutcomeCorrelations } = await import("../drizzle/schema");

  // Check if correlation record exists
  const existing = await database
    .select()
    .from(templateOutcomeCorrelations)
    .where(eq(templateOutcomeCorrelations.templateId, templateId));

  if (existing.length > 0) {
    // Update existing
    await database
      .update(templateOutcomeCorrelations)
      .set({
        totalUsages: analytics.totalUsages,
        successfulOutcomes: analytics.successfulOutcomes,
        unsuccessfulOutcomes: analytics.unsuccessfulOutcomes,
        successRate: analytics.successRate?.toString(),
        avgCustomizationCount: analytics.avgCustomizationCount.toString(),
        lastCalculatedAt: new Date(),
      })
      .where(eq(templateOutcomeCorrelations.templateId, templateId));
  } else {
    // Create new
    await database.insert(templateOutcomeCorrelations).values({
      templateId,
      totalUsages: analytics.totalUsages,
      successfulOutcomes: analytics.successfulOutcomes,
      unsuccessfulOutcomes: analytics.unsuccessfulOutcomes,
      successRate: analytics.successRate?.toString(),
      avgCustomizationCount: analytics.avgCustomizationCount.toString(),
      mostCustomizedFields: [],
    });
  }
}

export async function getAllTemplateAnalytics() {
  const database = await getDb();
  if (!database) return [];

  const { templateOutcomeCorrelations, protocolTemplates } = await import("../drizzle/schema");

  const correlations = await database
    .select()
    .from(templateOutcomeCorrelations)
    .orderBy(desc(templateOutcomeCorrelations.totalUsages));

  // Enrich with template names
  const enriched = await Promise.all(
    correlations.map(async (corr) => {
      const template = await getProtocolTemplateById(corr.templateId);
      return {
        ...corr,
        templateName: template?.name,
        templateCategory: template?.category,
      };
    })
  );

  return enriched;
}


// ============================================================================
// Medical Codes (Semantic Processor)
// ============================================================================

export async function createMedicalCode(data: {
  codeType: "ICD10" | "CPT" | "SNOMED";
  code: string;
  description: string;
  category?: string;
  searchTerms?: string;
}) {
  const database = await getDb();
  if (!database) return null;

  const { medicalCodes } = await import("../drizzle/schema");

  const [result] = await database.insert(medicalCodes).values(data);
  return result.insertId;
}

export async function getMedicalCodeById(id: number) {
  const database = await getDb();
  if (!database) return null;

  const { medicalCodes } = await import("../drizzle/schema");

  const [code] = await database.select().from(medicalCodes).where(eq(medicalCodes.id, id));
  return code;
}

export async function searchMedicalCodes(params: {
  searchTerm: string;
  codeType?: "ICD10" | "CPT" | "SNOMED";
  limit?: number;
}) {
  const database = await getDb();
  if (!database) return [];

  const { medicalCodes } = await import("../drizzle/schema");
  const { like, or } = await import("drizzle-orm");

  let query = database.select().from(medicalCodes);

  // Filter by code type if specified
  if (params.codeType) {
    query = query.where(eq(medicalCodes.codeType, params.codeType)) as any;
  }

  // Search in code, description, or search terms
  const searchPattern = `%${params.searchTerm}%`;
  query = query.where(
    or(
      like(medicalCodes.code, searchPattern),
      like(medicalCodes.description, searchPattern),
      like(medicalCodes.searchTerms, searchPattern)
    )
  ) as any;

  // Limit results
  query = query.limit(params.limit || 10) as any;

  return await query;
}

export async function assignMedicalCodeToProtocol(data: {
  protocolDeliveryId?: number;
  carePlanId?: number;
  medicalCodeId: number;
  codeType: "ICD10" | "CPT" | "SNOMED";
  isPrimary?: boolean;
  assignmentMethod?: "automatic" | "manual" | "verified";
  verifiedBy?: number;
  verificationNotes?: string;
}) {
  const database = await getDb();
  if (!database) return null;

  const { protocolMedicalCodes } = await import("../drizzle/schema");

  const [result] = await database.insert(protocolMedicalCodes).values({
    ...data,
    verifiedAt: data.verifiedBy ? new Date() : undefined,
  });
  return result.insertId;
}

export async function getProtocolMedicalCodes(protocolDeliveryId: number) {
  const database = await getDb();
  if (!database) return [];

  const { protocolMedicalCodes, medicalCodes } = await import("../drizzle/schema");

  const codes = await database
    .select({
      id: protocolMedicalCodes.id,
      codeType: protocolMedicalCodes.codeType,
      isPrimary: protocolMedicalCodes.isPrimary,
      assignmentMethod: protocolMedicalCodes.assignmentMethod,
      verifiedBy: protocolMedicalCodes.verifiedBy,
      verifiedAt: protocolMedicalCodes.verifiedAt,
      verificationNotes: protocolMedicalCodes.verificationNotes,
      code: medicalCodes.code,
      description: medicalCodes.description,
      category: medicalCodes.category,
    })
    .from(protocolMedicalCodes)
    .leftJoin(medicalCodes, eq(protocolMedicalCodes.medicalCodeId, medicalCodes.id))
    .where(eq(protocolMedicalCodes.protocolDeliveryId, protocolDeliveryId));

  return codes;
}

export async function createMedicalCodeMapping(data: {
  clinicalTerm: string;
  medicalCodeId: number;
  confidence?: number;
  mappingSource?: "AI" | "manual" | "verified";
}) {
  const database = await getDb();
  if (!database) return null;

  const { medicalCodeMappings } = await import("../drizzle/schema");

  const [result] = await database.insert(medicalCodeMappings).values({
    ...data,
    confidence: data.confidence?.toString(),
  });
  return result.insertId;
}

export async function findMedicalCodeMapping(clinicalTerm: string) {
  const database = await getDb();
  if (!database) return null;

  const { medicalCodeMappings, medicalCodes } = await import("../drizzle/schema");

  const [mapping] = await database
    .select({
      mappingId: medicalCodeMappings.id,
      clinicalTerm: medicalCodeMappings.clinicalTerm,
      confidence: medicalCodeMappings.confidence,
      mappingSource: medicalCodeMappings.mappingSource,
      usageCount: medicalCodeMappings.usageCount,
      codeId: medicalCodes.id,
      codeType: medicalCodes.codeType,
      code: medicalCodes.code,
      description: medicalCodes.description,
    })
    .from(medicalCodeMappings)
    .leftJoin(medicalCodes, eq(medicalCodeMappings.medicalCodeId, medicalCodes.id))
    .where(eq(medicalCodeMappings.clinicalTerm, clinicalTerm))
    .orderBy(desc(medicalCodeMappings.usageCount));

  return mapping;
}

export async function incrementMappingUsage(mappingId: number) {
  const database = await getDb();
  if (!database) return;

  const { medicalCodeMappings } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");

  await database
    .update(medicalCodeMappings)
    .set({
      usageCount: sql`${medicalCodeMappings.usageCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(medicalCodeMappings.id, mappingId));
}

export async function removeCodeAssignment(assignmentId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const { protocolMedicalCodes } = await import("../drizzle/schema");

  await database.delete(protocolMedicalCodes).where(eq(protocolMedicalCodes.id, assignmentId));
  return true;
}

export async function updateCodeAssignment(assignmentId: number, updates: {
  description?: string;
  isPrimary?: boolean;
  verificationNotes?: string;
}) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const { protocolMedicalCodes, medicalCodes } = await import("../drizzle/schema");

  // If description is being updated, update the medical code itself
  if (updates.description !== undefined) {
    const [assignment] = await database
      .select({ medicalCodeId: protocolMedicalCodes.medicalCodeId })
      .from(protocolMedicalCodes)
      .where(eq(protocolMedicalCodes.id, assignmentId));

    if (assignment?.medicalCodeId) {
      await database
        .update(medicalCodes)
        .set({ description: updates.description })
        .where(eq(medicalCodes.id, assignment.medicalCodeId));
    }
  }

  // Update the assignment itself
  const assignmentUpdates: any = {};
  if (updates.isPrimary !== undefined) assignmentUpdates.isPrimary = updates.isPrimary;
  if (updates.verificationNotes !== undefined) assignmentUpdates.verificationNotes = updates.verificationNotes;

  if (Object.keys(assignmentUpdates).length > 0) {
    await database
      .update(protocolMedicalCodes)
      .set(assignmentUpdates)
      .where(eq(protocolMedicalCodes.id, assignmentId));
  }

  return true;
}

// Batch verify multiple code assignments
export async function batchVerifyCodes(assignmentIds: number[], userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const { protocolMedicalCodes } = await import("../drizzle/schema");
  const { inArray } = await import("drizzle-orm");

  if (assignmentIds.length === 0) {
    return { count: 0 };
  }

  await database
    .update(protocolMedicalCodes)
    .set({
      verifiedBy: userId,
      verifiedAt: new Date(),
    })
    .where(inArray(protocolMedicalCodes.id, assignmentIds));

  return { count: assignmentIds.length };
}

// Batch remove multiple code assignments
export async function batchRemoveCodes(assignmentIds: number[]) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const { protocolMedicalCodes } = await import("../drizzle/schema");
  const { inArray } = await import("drizzle-orm");

  if (assignmentIds.length === 0) {
    return { count: 0 };
  }

  await database
    .delete(protocolMedicalCodes)
    .where(inArray(protocolMedicalCodes.id, assignmentIds));

  return { count: assignmentIds.length };
}

// Verify all codes for a protocol delivery
export async function verifyAllProtocolCodes(protocolDeliveryId: number, userId: number) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const { protocolMedicalCodes } = await import("../drizzle/schema");

  const result = await database
    .update(protocolMedicalCodes)
    .set({
      verifiedBy: userId,
      verifiedAt: new Date(),
    })
    .where(eq(protocolMedicalCodes.protocolDeliveryId, protocolDeliveryId));

  return { count: result[0]?.affectedRows || 0 };
}


// ============================================================================
// Provider Profile Helpers
// ============================================================================

export async function createProviderProfile(data: InsertProviderProfile) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.insert(providerProfiles).values(data);
  return result;
}

export async function getProviderProfileById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(providerProfiles).where(eq(providerProfiles.id, id));
  return result[0] || null;
}

export async function getProviderProfilesByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, userId));
  return result;
}

export async function getPrimaryProviderProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(providerProfiles)
    .where(and(eq(providerProfiles.userId, userId), eq(providerProfiles.isPrimary, true)));
  return result[0] || null;
}

export async function updateProviderProfile(id: number, data: Partial<InsertProviderProfile>) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.update(providerProfiles).set(data).where(eq(providerProfiles.id, id));
  return result;
}

export async function setPrimaryProviderProfile(userId: number, profileId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  // First, unset all primary flags for this user
  await db.update(providerProfiles)
    .set({ isPrimary: false })
    .where(eq(providerProfiles.userId, userId));
  
  // Then set the specified profile as primary
  const result = await db.update(providerProfiles)
    .set({ isPrimary: true })
    .where(eq(providerProfiles.id, profileId));
  
  return result;
}

// ============================================================================
// Billing Claims Helpers
// ============================================================================

export async function createBillingClaim(data: InsertBillingClaim) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.insert(billingClaims).values(data);
  return result;
}

export async function getBillingClaimById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(billingClaims).where(eq(billingClaims.id, id));
  return result[0] || null;
}

export async function getBillingClaimByClaimNumber(claimNumber: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(billingClaims).where(eq(billingClaims.claimNumber, claimNumber));
  return result[0] || null;
}

export async function getBillingClaimsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(billingClaims)
    .where(eq(billingClaims.patientId, patientId))
    .orderBy(desc(billingClaims.createdAt));
  return result;
}

export async function getBillingClaimsByProvider(providerProfileId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(billingClaims)
    .where(eq(billingClaims.providerProfileId, providerProfileId))
    .orderBy(desc(billingClaims.createdAt));
  return result;
}

export async function getBillingClaimsByProtocolDelivery(protocolDeliveryId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(billingClaims)
    .where(eq(billingClaims.protocolDeliveryId, protocolDeliveryId))
    .orderBy(desc(billingClaims.createdAt));
  return result;
}

export async function updateBillingClaim(id: number, data: Partial<InsertBillingClaim>) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.update(billingClaims).set(data).where(eq(billingClaims.id, id));
  return result;
}

export async function updateBillingClaimStatus(
  id: number, 
  status: "draft" | "submitted" | "pending" | "paid" | "denied" | "appealed",
  additionalData?: { paidAmount?: string; paidDate?: Date; denialReason?: string }
) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const updateData: any = { status };
  
  if (additionalData) {
    if (additionalData.paidAmount) updateData.paidAmount = additionalData.paidAmount;
    if (additionalData.paidDate) updateData.paidDate = additionalData.paidDate;
    if (additionalData.denialReason) updateData.denialReason = additionalData.denialReason;
  }
  
  if (status === "submitted") {
    updateData.submittedDate = new Date();
  }
  
  const result = await db.update(billingClaims).set(updateData).where(eq(billingClaims.id, id));
  return result;
}

export async function generateClaimNumber(): Promise<string> {
  // Generate claim number in format: CLM-YYYYMMDD-XXXXX
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Get count of claims today to generate unique sequential number
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayClaims = await db.select().from(billingClaims)
    .where(and(
      gte(billingClaims.createdAt, today),
      lt(billingClaims.createdAt, tomorrow)
    ));
  
  const sequenceNumber = String(todayClaims.length + 1).padStart(5, '0');
  
  return `CLM-${year}${month}${day}-${sequenceNumber}`;
}


// ============================================================================
// DAO Protocol Interface - Clinical Sessions
// ============================================================================

export async function createClinicalSession(data: InsertClinicalSession) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.insert(clinicalSessions).values(data);
  return result;
}

export async function getClinicalSessionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(clinicalSessions).where(eq(clinicalSessions.id, id));
  return result[0] || null;
}

export async function getClinicalSessionsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(clinicalSessions)
    .where(eq(clinicalSessions.patientId, patientId))
    .orderBy(desc(clinicalSessions.sessionDate));
  return result;
}

export async function getClinicalSessionsByPhysician(physicianId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(clinicalSessions)
    .where(eq(clinicalSessions.physicianId, physicianId))
    .orderBy(desc(clinicalSessions.sessionDate));
  return result;
}

export async function updateClinicalSession(id: number, data: Partial<InsertClinicalSession>) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.update(clinicalSessions)
    .set(data)
    .where(eq(clinicalSessions.id, id));
  return result;
}

export async function completeClinicalSession(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.update(clinicalSessions)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(clinicalSessions.id, id));
  return result;
}

// ============================================================================
// DAO Protocol Interface - Diagnosis Entries
// ============================================================================

export async function createDiagnosisEntry(data: InsertDiagnosisEntry) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.insert(diagnosisEntries).values(data);
  return result;
}

export async function getDiagnosisEntryById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(diagnosisEntries).where(eq(diagnosisEntries.id, id));
  return result[0] || null;
}

export async function getDiagnosisEntriesBySession(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(diagnosisEntries)
    .where(eq(diagnosisEntries.sessionId, sessionId))
    .orderBy(desc(diagnosisEntries.createdAt));
  return result;
}

export async function updateDiagnosisEntry(id: number, data: Partial<InsertDiagnosisEntry>) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.update(diagnosisEntries)
    .set(data)
    .where(eq(diagnosisEntries.id, id));
  return result;
}

export async function deleteDiagnosisEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.delete(diagnosisEntries).where(eq(diagnosisEntries.id, id));
  return result;
}

// ============================================================================
// DAO Protocol Interface - Treatment Entries
// ============================================================================

export async function createTreatmentEntry(data: InsertTreatmentEntry) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.insert(treatmentEntries).values(data);
  return result;
}

export async function getTreatmentEntryById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(treatmentEntries).where(eq(treatmentEntries.id, id));
  return result[0] || null;
}

export async function getTreatmentEntriesBySession(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(treatmentEntries)
    .where(eq(treatmentEntries.sessionId, sessionId))
    .orderBy(desc(treatmentEntries.createdAt));
  return result;
}

export async function getTreatmentEntriesByDiagnosis(diagnosisId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(treatmentEntries)
    .where(eq(treatmentEntries.diagnosisId, diagnosisId))
    .orderBy(desc(treatmentEntries.createdAt));
  return result;
}

export async function updateTreatmentEntry(id: number, data: Partial<InsertTreatmentEntry>) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.update(treatmentEntries)
    .set(data)
    .where(eq(treatmentEntries.id, id));
  return result;
}

export async function deleteTreatmentEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.delete(treatmentEntries).where(eq(treatmentEntries.id, id));
  return result;
}

// ============================================================================
// DAO Protocol Interface - Clinical Observations
// ============================================================================

export async function createClinicalObservation(data: InsertClinicalObservation) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.insert(clinicalObservations).values(data);
  return result;
}

export async function getClinicalObservationById(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(clinicalObservations).where(eq(clinicalObservations.id, id));
  return result[0] || null;
}

export async function getClinicalObservationsBySession(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(clinicalObservations)
    .where(eq(clinicalObservations.sessionId, sessionId))
    .orderBy(desc(clinicalObservations.observedAt));
  return result;
}

export async function deleteClinicalObservation(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.delete(clinicalObservations).where(eq(clinicalObservations.id, id));
  return result;
}


// ========================================
// CAUSAL BRAIN INTELLIGENCE HUB
// ========================================

/**
 * Create a treatment recommendation
 */
export async function createTreatmentRecommendation(data: InsertTreatmentRecommendation) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.insert(treatmentRecommendations).values(data);
  return result;
}

/**
 * Get treatment recommendations by session ID
 */
export async function getTreatmentRecommendationsBySession(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(treatmentRecommendations).where(eq(treatmentRecommendations.sessionId, sessionId));
  return result;
}

/**
 * Get treatment recommendations by patient ID
 */
export async function getTreatmentRecommendationsByPatient(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.select().from(treatmentRecommendations).where(eq(treatmentRecommendations.patientId, patientId));
  return result;
}

/**
 * Update treatment recommendation status
 */
export async function updateTreatmentRecommendationStatus(
  id: number,
  status: 'pending' | 'accepted' | 'rejected' | 'modified',
  feedback?: string,
  modifiedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db
    .update(treatmentRecommendations)
    .set({ 
      status, 
      physicianFeedback: feedback,
      modifiedBy 
    })
    .where(eq(treatmentRecommendations.id, id));
  return result;
}

/**
 * Create a causal analysis
 */
export async function createCausalAnalysis(data: InsertCausalAnalysis) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.insert(causalAnalyses).values(data);
  return result;
}

/**
 * Get causal analyses by diagnosis and treatment codes
 */
export async function getCausalAnalysis(diagnosisCode: string, treatmentCode: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db
    .select()
    .from(causalAnalyses)
    .where(
      and(
        eq(causalAnalyses.diagnosisCode, diagnosisCode),
        eq(causalAnalyses.treatmentCode, treatmentCode)
      )
    )
    .orderBy(desc(causalAnalyses.analyzedAt))
    .limit(1);
  return result[0] || null;
}

/**
 * Record a patient outcome
 */
export async function recordPatientOutcome(data: InsertPatientOutcome) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.insert(patientOutcomes).values(data);
  return result;
}

/**
 * Get patient outcomes by patient ID
 */
export async function getPatientOutcomes(patientId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db
    .select()
    .from(patientOutcomes)
    .where(eq(patientOutcomes.patientId, patientId))
    .orderBy(desc(patientOutcomes.recordedAt));
  return result;
}

/**
 * Get outcomes by recommendation ID
 */
export async function getOutcomesByRecommendation(recommendationId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db
    .select()
    .from(patientOutcomes)
    .where(eq(patientOutcomes.recommendationId, recommendationId))
    .orderBy(desc(patientOutcomes.recordedAt));
  return result;
}

/**
 * Cache evidence from medical literature
 */
export async function cacheEvidence(data: InsertEvidenceCache) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db.insert(evidenceCache).values(data);
  return result;
}

/**
 * Get cached evidence by query hash
 */
export async function getCachedEvidence(queryHash: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db
    .select()
    .from(evidenceCache)
    .where(eq(evidenceCache.queryHash, queryHash))
    .limit(1);
  return result[0] || null;
}

/**
 * Update evidence cache usage
 */
export async function updateEvidenceCacheUsage(queryHash: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not initialized');
  const result = await db
    .update(evidenceCache)
    .set({ 
      timesReferenced: sql`${evidenceCache.timesReferenced} + 1`,
      lastReferenced: new Date()
    })
    .where(eq(evidenceCache.queryHash, queryHash));
  return result;
}


// ============================================================================
// COLLABORATION HELPERS
// ============================================================================

/**
 * Add a physician to a clinical session as a participant
 */
export async function addSessionParticipant(data: InsertSessionParticipant) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error('Database not available');
  const result = await dbConn.insert(sessionParticipants).values(data);
  return result;
}

/**
 * Get all active participants for a session
 */
export async function getSessionParticipants(sessionId: number) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error('Database not available');
  const participants = await dbConn
    .select({
      id: sessionParticipants.id,
      sessionId: sessionParticipants.sessionId,
      physicianId: sessionParticipants.physicianId,
      physicianName: users.name,
      physicianEmail: users.email,
      role: sessionParticipants.role,
      joinedAt: sessionParticipants.joinedAt,
      lastActiveAt: sessionParticipants.lastActiveAt,
      leftAt: sessionParticipants.leftAt,
      status: sessionParticipants.status,
    })
    .from(sessionParticipants)
    .leftJoin(users, eq(sessionParticipants.physicianId, users.id))
    .where(eq(sessionParticipants.sessionId, sessionId))
    .orderBy(desc(sessionParticipants.joinedAt));
  
  return participants;
}

/**
 * Update participant's last active timestamp (for presence tracking)
 */
export async function updateParticipantActivity(participantId: number) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error('Database not available');
  const result = await dbConn
    .update(sessionParticipants)
    .set({ lastActiveAt: new Date() })
    .where(eq(sessionParticipants.id, participantId));
  
  return result;
}

/**
 * Mark a participant as having left the session
 */
export async function removeSessionParticipant(participantId: number) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error('Database not available');
  const result = await dbConn
    .update(sessionParticipants)
    .set({ 
      leftAt: new Date(),
      status: 'inactive'
    })
    .where(eq(sessionParticipants.id, participantId));
  
  return result;
}

/**
 * Add a comment to a clinical session
 */
export async function addSessionComment(data: InsertSessionComment) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error('Database not available');
  const result = await dbConn.insert(sessionComments).values(data);
  return result;
}

/**
 * Get all comments for a session with physician details
 */
export async function getSessionComments(sessionId: number) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error('Database not available');
  const comments = await dbConn
    .select({
      id: sessionComments.id,
      sessionId: sessionComments.sessionId,
      physicianId: sessionComments.physicianId,
      physicianName: users.name,
      commentText: sessionComments.commentText,
      commentType: sessionComments.commentType,
      replyToId: sessionComments.replyToId,
      createdAt: sessionComments.createdAt,
      updatedAt: sessionComments.updatedAt,
      isEdited: sessionComments.isEdited,
    })
    .from(sessionComments)
    .leftJoin(users, eq(sessionComments.physicianId, users.id))
    .where(eq(sessionComments.sessionId, sessionId))
    .orderBy(asc(sessionComments.createdAt));
  
  return comments;
}

/**
 * Update a comment
 */
export async function updateSessionComment(commentId: number, commentText: string) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error('Database not available');
  const result = await dbConn
    .update(sessionComments)
    .set({ 
      commentText,
      isEdited: true,
      updatedAt: new Date()
    })
    .where(eq(sessionComments.id, commentId));
  
  return result;
}

/**
 * Delete a comment
 */
export async function deleteSessionComment(commentId: number) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error('Database not available');
  const result = await dbConn
    .delete(sessionComments)
    .where(eq(sessionComments.id, commentId));
  
  return result;
}

/**
 * Log an activity event for a session
 */
export async function logSessionActivity(data: InsertSessionActivity) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error('Database not available');
  const result = await dbConn.insert(sessionActivity).values(data);
  return result;
}

/**
 * Get recent activity for a session
 */
export async function getSessionActivity(sessionId: number, limit: number = 50) {
  const dbConn = await getDb();
  if (!dbConn) throw new Error('Database not available');
  const activities = await dbConn
    .select({
      id: sessionActivity.id,
      sessionId: sessionActivity.sessionId,
      physicianId: sessionActivity.physicianId,
      physicianName: users.name,
      activityType: sessionActivity.activityType,
      activityData: sessionActivity.activityData,
      createdAt: sessionActivity.createdAt,
    })
    .from(sessionActivity)
    .leftJoin(users, eq(sessionActivity.physicianId, users.id))
    .where(eq(sessionActivity.sessionId, sessionId))
    .orderBy(desc(sessionActivity.createdAt))
    .limit(limit);
  
  return activities;
}

/**
 * Get active participants (last active within 5 minutes)
 */
export async function getActiveParticipants(sessionId: number) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const dbConn = await getDb();
  if (!dbConn) throw new Error('Database not available');
  
  const participants = await dbConn
    .select({
      id: sessionParticipants.id,
      physicianId: sessionParticipants.physicianId,
      physicianName: users.name,
      role: sessionParticipants.role,
      lastActiveAt: sessionParticipants.lastActiveAt,
    })
    .from(sessionParticipants)
    .leftJoin(users, eq(sessionParticipants.physicianId, users.id))
    .where(
      and(
        eq(sessionParticipants.sessionId, sessionId),
        eq(sessionParticipants.status, 'active'),
        gt(sessionParticipants.lastActiveAt, fiveMinutesAgo)
      )
    )
    .orderBy(desc(sessionParticipants.lastActiveAt));
  
  return participants;
}


// ============================================================================
// Analytics & Dashboard Helpers
// ============================================================================

/**
 * Get recommendation accuracy metrics
 */
export async function getRecommendationAccuracyMetrics(params: {
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const conditions = [];
  if (params.startDate) {
    conditions.push(gte(treatmentRecommendations.createdAt, params.startDate));
  }
  if (params.endDate) {
    conditions.push(lte(treatmentRecommendations.createdAt, params.endDate));
  }
  
  const recommendations = await db
    .select()
    .from(treatmentRecommendations)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  const total = recommendations.length;
  const accepted = recommendations.filter(r => r.status === 'accepted').length;
  const rejected = recommendations.filter(r => r.status === 'rejected').length;
  const modified = recommendations.filter(r => r.status === 'modified').length;
  const pending = recommendations.filter(r => r.status === 'pending').length;
  
  return {
    total,
    accepted,
    rejected,
    modified,
    pending,
    acceptanceRate: total > 0 ? (accepted / total) * 100 : 0,
    modificationRate: total > 0 ? (modified / total) * 100 : 0,
    rejectionRate: total > 0 ? (rejected / total) * 100 : 0,
  };
}

/**
 * Get collaboration metrics
 */
export async function getCollaborationMetrics(params: {
  physicianId?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  // Get session participation
  const participantConditions = [];
  if (params.physicianId) {
    participantConditions.push(eq(sessionParticipants.physicianId, params.physicianId));
  }
  if (params.startDate) {
    participantConditions.push(gte(sessionParticipants.joinedAt, params.startDate));
  }
  if (params.endDate) {
    participantConditions.push(lte(sessionParticipants.joinedAt, params.endDate));
  }
  
  const participants = await db
    .select()
    .from(sessionParticipants)
    .where(participantConditions.length > 0 ? and(...participantConditions) : undefined);
  
  // Get comments
  const commentConditions = [];
  if (params.physicianId) {
    commentConditions.push(eq(sessionComments.physicianId, params.physicianId));
  }
  if (params.startDate) {
    commentConditions.push(gte(sessionComments.createdAt, params.startDate));
  }
  if (params.endDate) {
    commentConditions.push(lte(sessionComments.createdAt, params.endDate));
  }
  
  const comments = await db
    .select()
    .from(sessionComments)
    .where(commentConditions.length > 0 ? and(...commentConditions) : undefined);
  
  // Get unique sessions
  const uniqueSessions = new Set(participants.map(p => p.sessionId)).size;
  
  return {
    totalSessions: uniqueSessions,
    totalParticipations: participants.length,
    totalComments: comments.length,
    averageCommentsPerSession: uniqueSessions > 0 ? comments.length / uniqueSessions : 0,
    averageParticipantsPerSession: uniqueSessions > 0 ? participants.length / uniqueSessions : 0,
  };
}

/**
 * Get policy learning metrics
 */
export async function getPolicyLearningMetrics(params: {
  diagnosisCode?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const conditions = [];
  if (params.diagnosisCode) {
    conditions.push(eq(causalAnalyses.diagnosisCode, params.diagnosisCode));
  }
  if (params.startDate) {
    conditions.push(gte(causalAnalyses.analyzedAt, params.startDate));
  }
  if (params.endDate) {
    conditions.push(lte(causalAnalyses.analyzedAt, params.endDate));
  }
  
  const analyses = await db
    .select()
    .from(causalAnalyses)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(causalAnalyses.analyzedAt));
  
  // Calculate effect size trend (as proxy for confidence)
  const effectTrend = analyses.map(a => ({
    date: a.analyzedAt,
    effectSize: a.effectSize ? parseFloat(a.effectSize) : 0,
    diagnosisCode: a.diagnosisCode,
    pValue: a.pValue ? parseFloat(a.pValue) : null,
  }));
  
  const avgEffectSize = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + (a.effectSize ? parseFloat(a.effectSize) : 0), 0) / analyses.length
    : 0;
  
  return {
    totalAnalyses: analyses.length,
    averageEffectSize: avgEffectSize,
    effectTrend,
    uniqueDiagnoses: new Set(analyses.map(a => a.diagnosisCode)).size,
  };
}

/**
 * Get outcome tracking metrics
 */
export async function getOutcomeMetrics(params: {
  physicianId?: number;
  startDate?: Date;
  endDate?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const conditions = [];
  if (params.startDate) {
    conditions.push(gte(patientOutcomes.recordedAt, params.startDate));
  }
  if (params.endDate) {
    conditions.push(lte(patientOutcomes.recordedAt, params.endDate));
  }
  
  const outcomes = await db
    .select()
    .from(patientOutcomes)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  const successful = outcomes.filter(o => o.outcomeType.includes('improvement')).length;
  const adverse = outcomes.filter(o => o.outcomeType === 'adverse_event').length;
  const noChange = outcomes.filter(o => o.outcomeType === 'no_change').length;
  
  return {
    totalOutcomes: outcomes.length,
    successful,
    adverse,
    noChange,
    successRate: outcomes.length > 0 ? (successful / outcomes.length) * 100 : 0,
    adverseRate: outcomes.length > 0 ? (adverse / outcomes.length) * 100 : 0,
  };
}

/**
 * Get recommendation trends over time
 */
export async function getRecommendationTrends(params: {
  startDate: Date;
  endDate: Date;
  interval: 'day' | 'week' | 'month';
}) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const conditions = [];
  conditions.push(gte(treatmentRecommendations.createdAt, params.startDate));
  conditions.push(lte(treatmentRecommendations.createdAt, params.endDate));
  
  const recommendations = await db
    .select()
    .from(treatmentRecommendations)
    .where(and(...conditions))
    .orderBy(asc(treatmentRecommendations.createdAt));
  
  // Group by interval
  const grouped = new Map<string, { accepted: number; rejected: number; modified: number; total: number }>();
  
  recommendations.forEach(rec => {
    let key: string;
    const date = new Date(rec.createdAt);
    
    if (params.interval === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (params.interval === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!grouped.has(key)) {
      grouped.set(key, { accepted: 0, rejected: 0, modified: 0, total: 0 });
    }
    
    const stats = grouped.get(key)!;
    stats.total++;
    if (rec.status === 'accepted') stats.accepted++;
    if (rec.status === 'rejected') stats.rejected++;
    if (rec.status === 'modified') stats.modified++;
  });
  
  return Array.from(grouped.entries()).map(([date, stats]) => ({
    date,
    ...stats,
    acceptanceRate: stats.total > 0 ? (stats.accepted / stats.total) * 100 : 0,
  }));
}

/**
 * Get collaboration activity over time
 */
export async function getCollaborationTrends(params: {
  startDate: Date;
  endDate: Date;
  interval: 'day' | 'week' | 'month';
}) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const comments = await db
    .select()
    .from(sessionComments)
    .where(
      and(
        gte(sessionComments.createdAt, params.startDate),
        lte(sessionComments.createdAt, params.endDate)
      )
    )
    .orderBy(asc(sessionComments.createdAt));
  
  const participants = await db
    .select()
    .from(sessionParticipants)
    .where(
      and(
        gte(sessionParticipants.joinedAt, params.startDate),
        lte(sessionParticipants.joinedAt, params.endDate)
      )
    )
    .orderBy(asc(sessionParticipants.joinedAt));
  
  // Group by interval
  const grouped = new Map<string, { comments: number; participants: number; sessions: Set<number> }>();
  
  comments.forEach(comment => {
    const date = new Date(comment.createdAt);
    let key: string;
    
    if (params.interval === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (params.interval === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!grouped.has(key)) {
      grouped.set(key, { comments: 0, participants: 0, sessions: new Set() });
    }
    
    const stats = grouped.get(key)!;
    stats.comments++;
    stats.sessions.add(comment.sessionId);
  });
  
  participants.forEach(participant => {
    const date = new Date(participant.joinedAt);
    let key: string;
    
    if (params.interval === 'day') {
      key = date.toISOString().split('T')[0];
    } else if (params.interval === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!grouped.has(key)) {
      grouped.set(key, { comments: 0, participants: 0, sessions: new Set() });
    }
    
    const stats = grouped.get(key)!;
    stats.participants++;
    stats.sessions.add(participant.sessionId);
  });
  
  return Array.from(grouped.entries()).map(([date, stats]) => ({
    date,
    comments: stats.comments,
    participants: stats.participants,
    activeSessions: stats.sessions.size,
  }));
}

// ============ Delphi Simulator ============

/**
 * Create a new simulation scenario
 */
export async function createSimulationScenario(scenario: InsertSimulationScenario) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const result = await db.insert(simulationScenarios).values(scenario);
  return result[0].insertId;
}

/**
 * Get simulation scenarios for a clinical session
 */
export async function getScenariosBySession(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  return await db
    .select()
    .from(simulationScenarios)
    .where(eq(simulationScenarios.sessionId, sessionId))
    .orderBy(desc(simulationScenarios.createdAt));
}

/**
 * Get a single scenario by ID
 */
export async function getScenarioById(scenarioId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const results = await db
    .select()
    .from(simulationScenarios)
    .where(eq(simulationScenarios.id, scenarioId))
    .limit(1);
  
  return results[0] || null;
}

/**
 * Update scenario status
 */
export async function updateScenarioStatus(scenarioId: number, status: 'draft' | 'running' | 'completed' | 'archived') {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  await db
    .update(simulationScenarios)
    .set({ 
      status,
      completedAt: status === 'completed' ? new Date() : undefined
    })
    .where(eq(simulationScenarios.id, scenarioId));
}

/**
 * Add an interaction to a scenario
 */
export async function addScenarioInteraction(interaction: InsertScenarioInteraction) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const result = await db.insert(scenarioInteractions).values(interaction);
  return result[0].insertId;
}

/**
 * Get all interactions for a scenario
 */
export async function getScenarioInteractions(scenarioId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  return await db
    .select()
    .from(scenarioInteractions)
    .where(eq(scenarioInteractions.scenarioId, scenarioId))
    .orderBy(asc(scenarioInteractions.createdAt));
}

/**
 * Add predicted outcomes for a scenario
 */
export async function addScenarioOutcome(outcome: InsertScenarioOutcome) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const result = await db.insert(scenarioOutcomes).values(outcome);
  return result[0].insertId;
}

/**
 * Get all outcomes for a scenario
 */
export async function getScenarioOutcomes(scenarioId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  return await db
    .select()
    .from(scenarioOutcomes)
    .where(eq(scenarioOutcomes.scenarioId, scenarioId))
    .orderBy(desc(scenarioOutcomes.probability));
}

/**
 * Create a scenario comparison
 */
export async function createScenarioComparison(comparison: InsertScenarioComparison) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  const result = await db.insert(scenarioComparisons).values(comparison);
  return result[0].insertId;
}

/**
 * Get scenario comparisons for a session
 */
export async function getScenarioComparisons(sessionId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  return await db
    .select()
    .from(scenarioComparisons)
    .where(eq(scenarioComparisons.sessionId, sessionId))
    .orderBy(desc(scenarioComparisons.createdAt));
}

/**
 * Update scenario comparison with selection
 */
export async function updateScenarioComparison(
  comparisonId: number,
  updates: {
    selectedScenarioId?: number;
    physicianNotes?: string;
  }
) {
  const db = await getDb();
  if (!db) throw new Error('Database connection failed');
  
  await db
    .update(scenarioComparisons)
    .set(updates)
    .where(eq(scenarioComparisons.id, comparisonId));
}

import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
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
  patientProgressMetrics
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
  return Number(result.insertId);
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

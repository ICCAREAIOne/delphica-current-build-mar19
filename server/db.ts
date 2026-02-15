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
  InsertPhysicianPerformanceAnalytic
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

import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as aiService from "./aiService";
import * as semanticProcessor from "./semanticProcessor";
import * as qaAnalytics from "./qaAnalytics";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============ Quality Assurance Dashboard ============
  qa: router({    
    analyzeQuality: protectedProcedure
      .input(z.object({
        clinicalNote: z.object({
          chiefComplaint: z.string(),
          historyOfPresentIllness: z.string().optional(),
          physicalExam: z.string().optional(),
          assessment: z.string().optional(),
          plan: z.string().optional(),
          procedures: z.array(z.string()).optional(),
        }),
        codingResult: z.object({
          icd10Codes: z.array(z.any()),
          cptCodes: z.array(z.any()),
          snomedConcepts: z.array(z.any()),
          extractedEntities: z.any(),
          codingNotes: z.string(),
          confidenceScore: z.number(),
        }),
      }))
      .mutation(async ({ input }) => {
        const metrics = await qaAnalytics.analyzeQualityMetrics(
          input.clinicalNote,
          input.codingResult
        );
        return metrics;
      }),

    getPhysicianMetrics: protectedProcedure
      .input(z.object({ physicianId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getPhysicianQualityMetrics(input.physicianId, input.limit);
      }),

    getPerformanceAnalytics: protectedProcedure
      .input(z.object({ physicianId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLatestPhysicianPerformance(input.physicianId);
      }),

    getPerformanceHistory: protectedProcedure
      .input(z.object({ physicianId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getPhysicianPerformanceHistory(input.physicianId, input.limit);
      }),
  }),

  // ============ Semantic Processor (Medical Coding Bridge) ============
  semanticProcessor: router({
    processClinicalNote: protectedProcedure
      .input(z.object({
        chiefComplaint: z.string(),
        historyOfPresentIllness: z.string().optional(),
        physicalExam: z.string().optional(),
        assessment: z.string().optional(),
        plan: z.string().optional(),
        procedures: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await semanticProcessor.processClinicalNote(input);
        return result;
      }),

    generateICD10: protectedProcedure
      .input(z.object({
        chiefComplaint: z.string(),
        historyOfPresentIllness: z.string().optional(),
        physicalExam: z.string().optional(),
        assessment: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const codes = await semanticProcessor.generateICD10Codes(input);
        return codes;
      }),

    generateCPT: protectedProcedure
      .input(z.object({
        chiefComplaint: z.string(),
        procedures: z.array(z.string()).optional(),
        plan: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const codes = await semanticProcessor.generateCPTCodes(input);
        return codes;
      }),

    extractEntities: protectedProcedure
      .input(z.object({
        chiefComplaint: z.string(),
        historyOfPresentIllness: z.string().optional(),
        physicalExam: z.string().optional(),
        assessment: z.string().optional(),
        plan: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const entities = await semanticProcessor.extractClinicalEntities(input);
        return entities;
      }),
  }),

  // ============ Patient Management ============
  patients: router({
    list: protectedProcedure
      .input(z.object({ physicianId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getAllPatients(input?.physicianId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPatientById(input.id);
      }),

    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await db.searchPatients(input.query);
      }),

    create: protectedProcedure
      .input(z.object({
        mrn: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        dateOfBirth: z.date(),
        gender: z.enum(["male", "female", "other", "unknown"]),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        allergies: z.array(z.string()).optional(),
        chronicConditions: z.array(z.string()).optional(),
        currentMedications: z.array(z.string()).optional(),
        assignedPhysicianId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createPatient(input);
        return { id, success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        updates: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          allergies: z.array(z.string()).optional(),
          chronicConditions: z.array(z.string()).optional(),
          currentMedications: z.array(z.string()).optional(),
          status: z.enum(["active", "inactive", "discharged"]).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updatePatient(input.id, input.updates);
        return { success: true };
      }),

    stats: protectedProcedure
      .input(z.object({ physicianId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        return await db.getPatientStats(input?.physicianId);
      }),

    getWithHistory: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPatientWithHistory(input.patientId);
      }),

    getEncounters: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPatientEncounters(input.patientId);
      }),

    getEncounterWithAnalysis: protectedProcedure
      .input(z.object({ encounterId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEncounterWithAnalysis(input.encounterId);
      }),

    getVitalSignsHistory: protectedProcedure
      .input(z.object({ patientId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getPatientVitalSignsHistory(input.patientId, input.limit);
      }),

    getDiagnosisHistory: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPatientDiagnosisHistory(input.patientId);
      }),
  }),

  // ============ DAO Protocol ============
  dao: router({
    listByPatient: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDAOEntriesByPatient(input.patientId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDAOEntryById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        chiefComplaint: z.string(),
        symptoms: z.array(z.string()),
        vitalSigns: z.object({
          temperature: z.number().optional(),
          bloodPressure: z.string().optional(),
          heartRate: z.number().optional(),
          respiratoryRate: z.number().optional(),
          oxygenSaturation: z.number().optional(),
        }).optional(),
        physicalExamFindings: z.string().optional(),
        labResults: z.array(z.object({
          testName: z.string(),
          value: z.string(),
          unit: z.string(),
          normalRange: z.string(),
          date: z.string(),
        })).optional(),
        imagingResults: z.array(z.object({
          type: z.string(),
          findings: z.string(),
          date: z.string(),
        })).optional(),
        diagnosis: z.string(),
        differentialDiagnosis: z.array(z.string()).optional(),
        treatmentPlan: z.string(),
        status: z.enum(["draft", "completed", "revised"]).default("draft"),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createDAOEntry({
          ...input,
          physicianId: ctx.user.id,
        });
        return { id, success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        updates: z.object({
          chiefComplaint: z.string().optional(),
          symptoms: z.array(z.string()).optional(),
          vitalSigns: z.object({
            temperature: z.number().optional(),
            bloodPressure: z.string().optional(),
            heartRate: z.number().optional(),
            respiratoryRate: z.number().optional(),
            oxygenSaturation: z.number().optional(),
          }).optional(),
          physicalExamFindings: z.string().optional(),
          diagnosis: z.string().optional(),
          treatmentPlan: z.string().optional(),
          status: z.enum(["draft", "completed", "revised"]).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateDAOEntry(input.id, input.updates);
        return { success: true };
      }),
  }),

  // ============ Delphi Simulator ============
  delphi: router({
    listByPatient: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDelphiSimulationsByPatient(input.patientId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDelphiSimulationById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        daoEntryId: z.number().optional(),
        scenarioDescription: z.string(),
        treatmentOptions: z.array(z.object({
          option: z.string(),
          description: z.string(),
          predictedOutcome: z.string(),
          confidence: z.number(),
          risks: z.array(z.string()),
          benefits: z.array(z.string()),
        })),
        aiAnalysis: z.string(),
        conversationHistory: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
          timestamp: z.number(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createDelphiSimulation({
          ...input,
          physicianId: ctx.user.id,
        });
        return { id, success: true };
      }),

    updateSelection: protectedProcedure
      .input(z.object({
        id: z.number(),
        selectedOption: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.updateDelphiSimulation(input.id, {
          selectedOption: input.selectedOption,
        });
        return { success: true };
      }),
  }),

  // ============ Causal Brain Insights ============
  causal: router({
    listByPatient: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCausalInsightsByPatient(input.patientId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCausalInsightById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        daoEntryId: z.number().optional(),
        insightType: z.enum(["risk_prediction", "treatment_efficacy", "pattern_analysis", "causal_relationship"]),
        title: z.string(),
        description: z.string(),
        causalFactors: z.array(z.object({
          factor: z.string(),
          impact: z.string(),
          confidence: z.number(),
        })),
        evidenceSources: z.array(z.object({
          source: z.string(),
          citation: z.string(),
          relevance: z.number(),
        })).optional(),
        recommendations: z.array(z.string()),
        confidenceScore: z.number().min(0).max(100),
      }))
      .mutation(async ({ input }) => {
        const id = await db.createCausalInsight(input);
        return { id, success: true };
      }),

    markReviewed: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markInsightReviewed(input.id, new Date());
        return { success: true };
      }),
  }),

  // ============ Precision Care Plans ============
  carePlans: router({
    listByPatient: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCarePlansByPatient(input.patientId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCarePlanById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        daoEntryId: z.number().optional(),
        delphiSimulationId: z.number().optional(),
        planTitle: z.string(),
        diagnosis: z.string(),
        goals: z.array(z.string()),
        interventions: z.array(z.object({
          intervention: z.string(),
          frequency: z.string(),
          duration: z.string(),
          rationale: z.string(),
        })),
        medications: z.array(z.object({
          name: z.string(),
          dosage: z.string(),
          frequency: z.string(),
          duration: z.string(),
          purpose: z.string(),
        })).optional(),
        lifestyle: z.array(z.object({
          recommendation: z.string(),
          rationale: z.string(),
        })).optional(),
        followUp: z.array(z.object({
          action: z.string(),
          timeframe: z.string(),
        })),
        aiRationale: z.string(),
        status: z.enum(["draft", "pending_review", "approved", "active", "completed", "revised"]).default("draft"),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createCarePlan({
          ...input,
          physicianId: ctx.user.id,
        });
        return { id, success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        updates: z.object({
          planTitle: z.string().optional(),
          goals: z.array(z.string()).optional(),
          interventions: z.array(z.object({
            intervention: z.string(),
            frequency: z.string(),
            duration: z.string(),
            rationale: z.string(),
          })).optional(),
          status: z.enum(["draft", "pending_review", "approved", "active", "completed", "revised"]).optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateCarePlan(input.id, input.updates);
        return { success: true };
      }),

    approve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.approveCarePlan(input.id);
        return { success: true };
      }),
  }),

  // ============ Safety Reviews (Digital Review Board) ============
  safety: router({
    getByCarePlan: protectedProcedure
      .input(z.object({ carePlanId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSafetyReviewByCarePlan(input.carePlanId);
      }),

    create: protectedProcedure
      .input(z.object({
        carePlanId: z.number().optional(),
        daoEntryId: z.number().optional(),
        reviewType: z.enum(["automated", "physician_override", "compliance_check"]),
        safetyAlerts: z.array(z.object({
          severity: z.enum(["critical", "warning", "info"]),
          category: z.string(),
          message: z.string(),
          recommendation: z.string(),
        })).optional(),
        complianceChecks: z.array(z.object({
          guideline: z.string(),
          status: z.enum(["pass", "fail", "warning"]),
          details: z.string(),
        })).optional(),
        overallStatus: z.enum(["approved", "flagged", "rejected"]),
        reviewerNotes: z.string().optional(),
        overrideJustification: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createSafetyReview({
          ...input,
          reviewedById: ctx.user.id,
        });
        return { id, success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        updates: z.object({
          overallStatus: z.enum(["approved", "flagged", "rejected"]).optional(),
          reviewerNotes: z.string().optional(),
          overrideJustification: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateSafetyReview(input.id, input.updates);
        return { success: true };
      }),
  }),

  // ============ AI-Powered Features ============
  ai: router({    
    delphiSimulation: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        daoEntryId: z.number().optional(),
        scenarioDescription: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get patient data
        const patient = await db.getPatientById(input.patientId);
        if (!patient) throw new Error("Patient not found");

        // Get DAO entry if provided
        let diagnosis = "";
        let symptoms: string[] = [];
        if (input.daoEntryId) {
          const daoEntry = await db.getDAOEntryById(input.daoEntryId);
          if (daoEntry) {
            diagnosis = daoEntry.diagnosis;
            symptoms = daoEntry.symptoms as string[];
          }
        }

        // Calculate age
        const age = Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

        // Step 1: Perform Causal Analysis first
        const causalAnalysis = await aiService.performCausalAnalysis({
          patientContext: {
            age,
            gender: patient.gender,
            chiefComplaint: symptoms[0] || "General assessment",
            symptoms,
            chronicConditions: patient.chronicConditions as string[] || [],
            currentMedications: patient.currentMedications as string[] || [],
            allergies: patient.allergies as string[] || [],
          },
          clinicalQuestion: input.scenarioDescription,
          dataSource: "physician_guided",
        });

        // Step 2: Run Delphi simulation with causal guidance
        const result = await aiService.runDelphiSimulation({
          causalAnalysis,
          scenarioToExplore: input.scenarioDescription,
          iterationNumber: 1,
        });

        // Save simulation to database
        const simulationId = await db.createDelphiSimulation({
          patientId: input.patientId,
          physicianId: ctx.user.id,
          daoEntryId: input.daoEntryId,
          scenarioDescription: input.scenarioDescription,
          treatmentOptions: result.treatmentOptions,
          aiAnalysis: result.outcomeAnalysis,
        });

        return { id: simulationId, ...result, causalAnalysis };
      }),

    // Causal Brain Analysis - Central Intelligence Hub
    performCausalAnalysis: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        clinicalQuestion: z.string(),
        dataSource: z.enum(["physician_guided", "patient_initiated"]),
      }))
      .mutation(async ({ input }) => {
        const patient = await db.getPatientById(input.patientId);
        if (!patient) throw new Error("Patient not found");

        const age = Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

        const result = await aiService.performCausalAnalysis({
          patientContext: {
            age,
            gender: patient.gender,
            chiefComplaint: "Clinical assessment",
            symptoms: [],
            chronicConditions: patient.chronicConditions as string[] || [],
            currentMedications: patient.currentMedications as string[] || [],
            allergies: patient.allergies as string[] || [],
          },
          clinicalQuestion: input.clinicalQuestion,
          dataSource: input.dataSource,
        });

        return result;
      }),

    generateCarePlan: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        daoEntryId: z.number().optional(),
        delphiSimulationId: z.number().optional(),
        diagnosis: z.string(),
        treatmentGoals: z.array(z.string()),
        selectedTreatmentOption: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get patient data
        const patient = await db.getPatientById(input.patientId);
        if (!patient) throw new Error("Patient not found");

        // Calculate age
        const age = Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

        // Note: In production, this would use actual causal analysis and validation results
        // For now, returning a placeholder
        const result = {
          planTitle: `Treatment Plan for ${patient.firstName} ${patient.lastName}`,
          executiveSummary: "Comprehensive care plan based on clinical assessment",
          goals: input.treatmentGoals,
          interventions: [],
          medications: [],
          lifestyle: [],
          followUp: [],
          causalRationale: "Based on clinical assessment and patient history",
          evidenceBasis: [],
        };

        // Save care plan to database
        const carePlanId = await db.createCarePlan({
          patientId: input.patientId,
          physicianId: ctx.user.id,
          daoEntryId: input.daoEntryId,
          delphiSimulationId: input.delphiSimulationId,
          planTitle: result.planTitle,
          diagnosis: input.diagnosis,
          goals: result.goals,
          interventions: result.interventions,
          medications: result.medications,
          lifestyle: result.lifestyle,
          followUp: result.followUp,
          aiRationale: result.causalRationale,
          status: "draft",
        });

        // Automatically run safety review
        const safetyResult = await aiService.performSafetyReview({
          carePlan: result,
          patientContext: {
            age,
            gender: patient.gender,
            chiefComplaint: "",
            symptoms: [],
            allergies: patient.allergies as string[] || [],
            chronicConditions: patient.chronicConditions as string[] || [],
            currentMedications: patient.currentMedications as string[] || [],
          },
        });

        // Save safety review
        await db.createSafetyReview({
          carePlanId,
          reviewType: "automated",
          safetyAlerts: safetyResult.safetyAlerts,
          complianceChecks: safetyResult.complianceChecks,
          overallStatus: safetyResult.overallStatus,
          reviewedById: ctx.user.id,
        });

        return { id: carePlanId, ...result, safetyReview: safetyResult };
      }),
  }),

  // ============ Clinical Protocols ============
  protocols: router({
    list: protectedProcedure
      .query(async () => {
        // Return list of available protocols
        return [
          {
            id: "fatigue",
            title: "Fatigue: Diagnostic Evaluation and Management",
            specialty: "Internal Medicine",
            category: "Diagnostic Evaluation",
            lastUpdated: new Date("2026-02-15"),
            evidenceLevel: "A",
            description: "Comprehensive protocol for evaluating and managing patients presenting with fatigue, including differential diagnosis, laboratory workup, and treatment strategies."
          }
        ];
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        // For now, only fatigue protocol is available
        if (input.id !== "fatigue") {
          throw new Error("Protocol not found");
        }
        
        return {
          id: "fatigue",
          title: "Fatigue: Diagnostic Evaluation and Management",
          specialty: "Internal Medicine",
          category: "Diagnostic Evaluation",
          lastUpdated: new Date("2026-02-15"),
          evidenceLevel: "A",
          // Protocol content will be rendered from the frontend page
        };
      }),

    applyToPatient: protectedProcedure
      .input(z.object({
        protocolId: z.string(),
        patientId: z.number(),
        clinicalContext: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get patient data
        const patient = await db.getPatientById(input.patientId);
        if (!patient) throw new Error("Patient not found");

        const age = Math.floor((Date.now() - patient.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

        // Use Causal Brain to analyze patient in context of protocol
        const causalAnalysis = await aiService.performCausalAnalysis({
          patientContext: {
            age,
            gender: patient.gender,
            chiefComplaint: input.clinicalContext || "Fatigue evaluation",
            symptoms: ["fatigue"],
            chronicConditions: patient.chronicConditions as string[] || [],
            currentMedications: patient.currentMedications as string[] || [],
            allergies: patient.allergies as string[] || [],
          },
          clinicalQuestion: `Apply the ${input.protocolId} protocol to this patient. ${input.clinicalContext || ""}`,
          dataSource: "physician_guided",
        });

        return {
          success: true,
          causalAnalysis,
          recommendedSteps: causalAnalysis.recommendedSimulationScenarios,
        };
      }),
  }),

  // ============ Clinical Outcomes (Marketplace Feedback) ============
  outcomes: router({
    listByPatient: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOutcomesByPatient(input.patientId);
      }),

    listByCarePlan: protectedProcedure
      .input(z.object({ carePlanId: z.number() }))
      .query(async ({ input }) => {
        return await db.getOutcomesByCarePlan(input.carePlanId);
      }),

    create: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        carePlanId: z.number().optional(),
        daoEntryId: z.number().optional(),
        outcomeType: z.enum(["treatment_success", "partial_success", "no_improvement", "adverse_event", "followup"]),
        description: z.string(),
        metrics: z.array(z.object({
          metric: z.string(),
          baseline: z.string(),
          current: z.string(),
          improvement: z.string(),
        })).optional(),
        patientSatisfaction: z.number().min(1).max(10).optional(),
        adverseEvents: z.array(z.object({
          event: z.string(),
          severity: z.string(),
          resolution: z.string(),
        })).optional(),
        lessonsLearned: z.string().optional(),
        feedbackForAI: z.string().optional(),
        outcomeDate: z.date(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createClinicalOutcome({
          ...input,
          documentedById: ctx.user.id,
        });
        return { id, success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;

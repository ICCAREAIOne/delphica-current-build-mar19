import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { inArray } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { runIcd10Refresh } from "./icd10Refresh";
import * as aiService from "./aiService";
import * as semanticProcessor from "./semanticProcessor";
import * as qaAnalytics from "./qaAnalytics";
import { patientAvatarService } from "./patientAvatarService";
import { labParsingService } from "./labParsingService";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";

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

    getLabTemplates: protectedProcedure
      .input(z.object({ protocolId: z.string() }))
      .query(async ({ input }) => {
        return await db.getLabTemplatesByProtocol(input.protocolId);
      }),

    applyProtocol: protectedProcedure
      .input(z.object({
        protocolId: z.string(),
        protocolName: z.string(),
        daoEntryId: z.number(),
        patientId: z.number(),
        sectionsUsed: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await db.createProtocolApplication({
          protocolId: input.protocolId,
          protocolName: input.protocolName,
          daoEntryId: input.daoEntryId,
          patientId: input.patientId,
          physicianId: ctx.user.id,
          sectionsUsed: input.sectionsUsed,
        });
      }),

    getAnalytics: protectedProcedure
      .query(async () => {
        return await db.getProtocolAnalytics();
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

  // ============ Clinical Knowledge Base ============
  knowledgeBase: router({
    list: protectedProcedure
      .query(async () => {
        return await db.getAllKnowledgeBaseEntries();
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getKnowledgeBaseEntry(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        compoundName: z.string(),
        category: z.string(),
        summary: z.string(),
        mechanisms: z.array(z.object({
          name: z.string(),
          description: z.string(),
        })),
        clinicalEvidence: z.array(z.object({
          finding: z.string(),
          source: z.string(),
        })),
        dosing: z.object({
          typical: z.string(),
          range: z.string(),
          notes: z.string(),
        }).optional(),
        contraindications: z.array(z.string()).optional(),
        interactions: z.array(z.string()).optional(),
        sources: z.array(z.string()),
        tags: z.array(z.string()),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.createKnowledgeBaseEntry({
          ...input,
          createdBy: ctx.user.id,
        });
        return { id, success: true };
      }),

    search: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .query(async ({ input }) => {
        return await db.searchKnowledgeBase(input);
      }),

    getRelevantForCondition: protectedProcedure
      .input(z.object({
        condition: z.string(),
        symptoms: z.array(z.string()).optional(),
      }))
      .query(async ({ input }) => {
        // This will be used by Causal Brain to retrieve relevant knowledge
        return await db.getRelevantKnowledgeForCondition(input.condition, input.symptoms);
      }),

    recordUsage: protectedProcedure
      .input(z.object({
        knowledgeBaseId: z.number(),
        encounterId: z.number().optional(),
        context: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const id = await db.recordKnowledgeBaseUsage({
          ...input,
          physicianId: ctx.user.id,
        });
        return { id, success: true };
      }),
  }),

  // ============ Patient Intake Agent ============
  intake: router({    
    listSessions: protectedProcedure
      .input(z.object({
        status: z.enum(['in_progress', 'completed']).optional(),
      }))
      .query(async ({ input }) => {
        return await db.listIntakeSessions(input.status);
      }),

    generateLink: protectedProcedure
      .input(z.object({
        patientName: z.string(),
        patientEmail: z.string(),
      }))
      .mutation(async ({ input }) => {
        const sessionToken = `intake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sessionId = await db.createIntakeSessionWithDetails({
          sessionToken,
          patientName: input.patientName,
          patientEmail: input.patientEmail,
        });
        return { sessionId, sessionToken };
      }),

    sendIntakeEmail: protectedProcedure
      .input(z.object({
        patientEmail: z.string().email(),
        patientName: z.string(),
        sessionToken: z.string(),
        template: z.enum(['intakeInvitation', 'intakeReminder']),
        appointmentDate: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { sendIntakeEmail } = await import('./emailService');
        const intakeLink = `${process.env.VITE_APP_URL || 'http://localhost:3000'}/intake?token=${input.sessionToken}`;
        
        const result = await sendIntakeEmail({
          to: input.patientEmail,
          patientName: input.patientName,
          intakeLink,
          physicianName: ctx.user?.name || 'Your Physician',
          template: input.template,
          appointmentDate: input.appointmentDate,
        });

        return result;
      }),

    startSession: publicProcedure
      .input(z.object({
        patientId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const sessionToken = `intake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sessionId = await db.createIntakeSession({
          patientId: input.patientId,
          sessionToken,
        });
        return { sessionId, sessionToken };
      }),

    getSession: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getIntakeSession(input.sessionToken);
      }),

    sendMessage: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        message: z.string(),
      }))
      .mutation(async ({ input }) => {
        const session = await db.getIntakeSession(input.sessionToken);
        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
        }

        // Save user message
        await db.addIntakeMessage(session.id, 'user', input.message);

        // Process message with AI
        const { processIntakeMessage } = await import('./intakeAgent');
        const response = await processIntakeMessage(input.message, {
          collectedData: session.collectedData || {},
          conversationHistory: session.messages || [],
        }, session.language || 'en');

        // Save assistant response
        await db.addIntakeMessage(session.id, 'assistant', response.message);

        // Update collected data
        if (response.extractedData) {
          await db.updateIntakeSessionData(session.id, response.extractedData);
        }

        // Mark as complete if done
        if (response.isComplete) {
          await db.completeIntakeSession(session.id);
        }

        return {
          response: response.message,
          isComplete: response.isComplete,
        };
      }),
  }),

  // ============ Patient Portal ============
  patientPortal: router({
    // Lab Results Management
    uploadLabResults: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        testDate: z.string(),
        labName: z.string().optional(),
        pdfUrl: z.string().optional(),
        pdfText: z.string().optional(),
        manualResults: z.array(z.object({
          testName: z.string(),
          value: z.string(),
          unit: z.string().optional(),
          referenceRange: z.string().optional(),
          flag: z.enum(['normal', 'high', 'low', 'critical']).optional(),
        })).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        let testResults = input.manualResults || [];
        
        // Parse PDF if provided
        if (input.pdfText) {
          const parsed = await labParsingService.parsePDFLabReport(input.pdfText);
          testResults = parsed.results;
        }
        
        const labResult = await db.createPatientLabResult({
          patientId: input.patientId,
          uploadedBy: 'patient',
          uploadMethod: input.pdfText ? 'pdf_upload' : 'manual_entry',
          testDate: new Date(input.testDate),
          labName: input.labName,
          testResults: JSON.stringify(testResults),
          pdfUrl: input.pdfUrl,
          pdfText: input.pdfText,
          reviewedByPhysician: false,
        });
        
        return labResult;
      }),

    // New endpoint for unstructured lab upload (supports PDF, images, text)
    uploadUnstructuredLab: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        fileContent: z.string(), // Base64 encoded file content
        mimeType: z.string(),
        filename: z.string(),
        fileUrl: z.string().optional(), // S3 URL after upload
      }))
      .mutation(async ({ input, ctx }) => {
        // Parse the unstructured lab report
        const parsed = await labParsingService.parseUnstructuredLabReport(
          input.fileContent,
          input.mimeType,
          input.filename
        );
        
        // Create lab result with parsed data
        const uploadMethod = labParsingService.detectFileFormat(input.mimeType, input.filename) === 'pdf' 
          ? 'pdf_upload' 
          : labParsingService.detectFileFormat(input.mimeType, input.filename) === 'image'
          ? 'pdf_upload' // Using pdf_upload for images too (could add image_upload to enum)
          : 'manual_entry';
        
        const labResult = await db.createPatientLabResult({
          patientId: input.patientId,
          uploadedBy: 'patient',
          uploadMethod,
          testDate: parsed.testDate ? new Date(parsed.testDate) : new Date(),
          labName: parsed.labName || 'Uploaded Lab Report',
          testResults: JSON.stringify(parsed.results),
          pdfUrl: input.fileUrl,
          pdfText: `Parsed from ${parsed.sourceFormat} with ${Math.round((parsed.confidence || 0.9) * 100)}% confidence`,
          reviewedByPhysician: false,
        });
        
        return {
          labResult,
          parsed,
          confidence: parsed.confidence || 0.9,
        };
      }),

    getPatientLabResults: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPatientLabResults(input.patientId);
      }),

    reviewLabResult: protectedProcedure
      .input(z.object({
        labId: z.number(),
        notes: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        await db.updateLabResultReview(input.labId, ctx.user.id, input.notes);
        return { success: true };
      }),

    // Care Plan Management
    createCarePlan: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        precisionCarePlanId: z.number().optional(),
        title: z.string(),
        diagnosis: z.string(),
        goals: z.array(z.string()),
        medications: z.array(z.any()).optional(),
        lifestyle: z.array(z.any()).optional(),
        monitoring: z.array(z.any()),
        checkInFrequency: z.enum(['daily', 'every_other_day', 'weekly', 'biweekly', 'monthly']),
        startDate: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const nextCheckIn = new Date(input.startDate);
        const frequencyDays = {
          'daily': 1,
          'every_other_day': 2,
          'weekly': 7,
          'biweekly': 14,
          'monthly': 30,
        };
        nextCheckIn.setDate(nextCheckIn.getDate() + frequencyDays[input.checkInFrequency]);
        
        const carePlan = await db.createPatientCarePlan({
          patientId: input.patientId,
          physicianId: ctx.user.id,
          precisionCarePlanId: input.precisionCarePlanId,
          title: input.title,
          diagnosis: input.diagnosis,
          goals: JSON.stringify(input.goals),
          medications: input.medications ? JSON.stringify(input.medications) : null,
          lifestyle: input.lifestyle ? JSON.stringify(input.lifestyle) : null,
          monitoring: JSON.stringify(input.monitoring),
          checkInFrequency: input.checkInFrequency,
          nextCheckInDate: nextCheckIn,
          status: 'active',
          startDate: new Date(input.startDate),
          sharedWithPatient: false,
        });
        
        return carePlan;
      }),

    getPatientCarePlans: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPatientCarePlans(input.patientId);
      }),

    getPatientById: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPatientById(input.patientId);
      }),

    getActiveCarePlan: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getActivePatientCarePlan(input.patientId);
      }),

    shareCarePlan: protectedProcedure
      .input(z.object({ carePlanId: z.number() }))
      .mutation(async ({ input }) => {
        await db.shareCarePlanWithPatient(input.carePlanId);
        return { success: true };
      }),

    // AI Avatar Check-ins
    startCheckIn: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .mutation(async ({ input }) => {
        const carePlan = await db.getActivePatientCarePlan(input.patientId);
        if (!carePlan) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No active care plan found' });
        }
        
        const patient = await db.getPatientById(input.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Patient not found' });
        }
        
        const previousCheckIns = await db.getCarePlanCheckIns(carePlan.id);
        
        const greeting = await patientAvatarService.startCheckIn(
          `${patient.firstName} ${patient.lastName}`,
          {
            ...carePlan,
            goals: carePlan.goals || [],
            medications: carePlan.medications || [],
            lifestyle: carePlan.lifestyle || [],
            monitoring: carePlan.monitoring || [],
          },
          previousCheckIns
        );
        
        // Create conversation
        const conversation = await db.createPatientConversation({
          patientId: input.patientId,
          carePlanId: carePlan.id,
          conversationType: 'check_in',
          language: 'en',
          messages: JSON.stringify([{ role: 'assistant', content: greeting }]),
        });
        
        return {
          conversationId: conversation.insertId,
          message: greeting,
        };
      }),

    continueCheckIn: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        userMessage: z.string(),
      }))
      .mutation(async ({ input }) => {
        const conversations = await db.getPatientConversations(0, 1);
        // In production, fetch by conversationId
        
        const conversation = conversations[0];
        if (!conversation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
        }
        
        const carePlan = await db.getActivePatientCarePlan(conversation.patientId);
        if (!carePlan) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Care plan not found' });
        }
        
        const messages = (conversation.messages || []) as Array<{role: 'user' | 'assistant', content: string}>;
        messages.push({ role: 'user', content: input.userMessage });
        
        const response = await patientAvatarService.continueCheckIn(
          messages,
          {
            ...carePlan,
            goals: carePlan.goals || [],
            medications: carePlan.medications || [],
            lifestyle: carePlan.lifestyle || [],
            monitoring: carePlan.monitoring || [],
          }
        );
        
        messages.push({ role: 'assistant', content: response });
        await db.updatePatientConversation(input.conversationId, messages);
        
        return { message: response };
      }),

    completeCheckIn: protectedProcedure
      .input(z.object({ conversationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const conversations = await db.getPatientConversations(0, 1);
        const conversation = conversations[0];
        
        if (!conversation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
        }
        
        const carePlan = await db.getActivePatientCarePlan(conversation.patientId);
        if (!carePlan) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Care plan not found' });
        }
        
        const messages = (conversation.messages || []) as Array<{role: 'user' | 'assistant', content: string}>;
        
        // Extract structured data
        const checkInData = await patientAvatarService.extractCheckInData(
          messages,
          {
            ...carePlan,
            goals: carePlan.goals || [],
            medications: carePlan.medications || [],
            lifestyle: carePlan.lifestyle || [],
            monitoring: carePlan.monitoring || [],
          }
        );
        
        // Analyze for concerns
        const analysis = await patientAvatarService.analyzeCheckIn(
          messages,
          {
            ...carePlan,
            goals: carePlan.goals || [],
            medications: carePlan.medications || [],
            lifestyle: carePlan.lifestyle || [],
            monitoring: carePlan.monitoring || [],
          }
        );
        
        // Generate summary
        const summary = await patientAvatarService.generateSummary(messages);
        
        // Save check-in
        const checkIn = await db.createPatientCheckIn({
          patientId: conversation.patientId,
          carePlanId: carePlan.id,
          checkInDate: new Date(),
          overallFeeling: checkInData.overallFeeling,
          symptoms: JSON.stringify(checkInData.symptoms),
          metrics: JSON.stringify(checkInData.metrics),
          medicationsTaken: JSON.stringify(checkInData.medicationsTaken),
          lifestyleAdherence: JSON.stringify(checkInData.lifestyleAdherence),
          conversationSummary: summary,
          aiConcerns: JSON.stringify(analysis.concerns),
          alertGenerated: analysis.alertLevel !== 'none',
          alertSeverity: analysis.alertLevel !== 'none' ? analysis.alertLevel : null,
          alertReason: analysis.alertReason,
          reviewedByPhysician: false,
        });
        
        // Create physician alert if needed
        if (analysis.alertLevel !== 'none' && carePlan.physicianId) {
          await db.createPhysicianAlert({
            physicianId: carePlan.physicianId,
            patientId: conversation.patientId,
            carePlanId: carePlan.id,
            checkInId: checkIn.insertId,
            alertType: 'worsening_symptoms',
            severity: analysis.alertLevel,
            title: `Patient Check-in Alert: ${analysis.alertLevel.toUpperCase()}`,
            description: analysis.alertReason || 'Concerns identified during check-in',
            aiAnalysis: analysis.overallAssessment,
            suggestedActions: JSON.stringify(analysis.suggestedActions),
            status: 'pending',
          });
        }
        
        return {
          checkInId: checkIn.insertId,
          analysis,
          summary,
        };
      }),

    getPatientCheckIns: protectedProcedure
      .input(z.object({ patientId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getPatientCheckIns(input.patientId, input.limit);
      }),

    // Physician Alerts
    getPhysicianAlerts: protectedProcedure
      .input(z.object({ status: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        return await db.getPhysicianAlerts(ctx.user.id, input.status);
      }),

    acknowledgeAlert: protectedProcedure
      .input(z.object({ alertId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateAlertStatus(input.alertId, 'acknowledged');
        return { success: true };
      }),

    resolveAlert: protectedProcedure
      .input(z.object({
        alertId: z.number(),
        resolution: z.string(),
      }))
      .mutation(async ({ input }) => {
        await db.updateAlertStatus(input.alertId, 'resolved', input.resolution);
        return { success: true };
      }),

    // Progress Metrics
    getProgressMetrics: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        carePlanId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getPatientProgressMetrics(input.patientId, input.carePlanId);
      }),
  }),

  // ============ Physician Review Dashboard ============
  physicianReview: router({
    getPendingReviews: protectedProcedure
      .input(z.object({
        physicianId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getPendingLabReviews(input.physicianId);
      }),

    getReviewedLabs: protectedProcedure
      .input(z.object({
        physicianId: z.number().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getReviewedLabResults(input.physicianId, input.limit);
      }),

    getLabDetail: protectedProcedure
      .input(z.object({
        labId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getLabResultById(input.labId);
      }),

    reviewLab: protectedProcedure
      .input(z.object({
        labId: z.number(),
        notes: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        await db.updateLabResultReview(input.labId, ctx.user.id, input.notes);
        return { success: true };
       }),
  }),

  // ============ Subscription Management ============
  subscription: router({
    createCheckout: protectedProcedure
      .input(z.object({
        successUrl: z.string(),
        cancelUrl: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const { createSubscriptionCheckout } = await import('./stripeService');
        const result = await createSubscriptionCheckout({
          userId: ctx.user.id,
          userEmail: ctx.user.email || '',
          userName: ctx.user.name || 'Patient',
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
        });
        
        return result;
      }),
    
    createBillingPortal: protectedProcedure
      .input(z.object({
        returnUrl: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (!ctx.user.stripeCustomerId) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST',
            message: 'No active subscription found'
          });
        }
        
        const { createBillingPortalSession } = await import('./stripeService');
        const result = await createBillingPortalSession({
          stripeCustomerId: ctx.user.stripeCustomerId,
          returnUrl: input.returnUrl,
        });
        
        return result;
      }),
    
    getStatus: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        return {
          status: ctx.user.subscriptionStatus || 'inactive',
          stripeCustomerId: ctx.user.stripeCustomerId,
          stripeSubscriptionId: ctx.user.stripeSubscriptionId,
          subscriptionEndDate: ctx.user.subscriptionEndDate,
        };
      }),
    
    cancel: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (!ctx.user.stripeSubscriptionId) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST',
            message: 'No active subscription found'
          });
        }
        
        const { cancelSubscription } = await import('./stripeService');
        const result = await cancelSubscription(ctx.user.stripeSubscriptionId);
        
        return result;
      }),
    
    reactivate: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        if (!ctx.user.stripeSubscriptionId) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST',
            message: 'No subscription found'
          });
        }
        
        const { reactivateSubscription } = await import('./stripeService');
        const result = await reactivateSubscription(ctx.user.stripeSubscriptionId);
        
        return result;
      }),
  }),

  // ============ Protocol Management ============
  protocol: router({
    generateAndSend: protectedProcedure
      .input(z.object({
        userId: z.number(),
        carePlanId: z.number(),
        customProtocol: z.object({
          title: z.string(),
          diagnosis: z.string(),
          duration: z.string(),
          goals: z.array(z.string()),
          interventions: z.array(z.object({
            category: z.string(),
            items: z.array(z.string()),
          })),
          medications: z.array(z.object({
            name: z.string(),
            dosage: z.string(),
            frequency: z.string(),
            instructions: z.string().optional(),
          })).optional(),
          lifestyle: z.array(z.string()).optional(),
          followUp: z.object({
            frequency: z.string(),
            metrics: z.array(z.string()),
          }).optional(),
          warnings: z.array(z.string()).optional(),
        }).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const { generateProtocolFromCarePlan } = await import('./pdfService');
        const { sendProtocolEmail } = await import('./emailService');
        
        try {
          // Get user and care plan
          const user = await db.getUserById(input.userId);
          if (!user) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
          }
          
          const carePlans = await db.getPatientCarePlans(input.userId);
          const carePlan = carePlans.find(p => p.id === input.carePlanId);
          if (!carePlan) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Care plan not found' });
          }
          
          // Generate PDF with custom protocol data if provided
          let pdfBuffer: Buffer;
          if (input.customProtocol) {
            const { generateProtocolPDF } = await import('./pdfService');
            pdfBuffer = await generateProtocolPDF({
              patientName: user.name || 'Patient',
              patientEmail: user.email || '',
              protocolName: input.customProtocol.title,
              diagnosis: input.customProtocol.diagnosis,
              startDate: carePlan.createdAt || new Date(),
              duration: input.customProtocol.duration,
              goals: input.customProtocol.goals,
              interventions: input.customProtocol.interventions,
              medications: input.customProtocol.medications,
              lifestyle: input.customProtocol.lifestyle,
              followUp: input.customProtocol.followUp,
              warnings: input.customProtocol.warnings,
              physicianName: ctx.user.name || 'Dr. Physician',
              physicianContact: ctx.user.email || undefined,
            });
          } else {
            pdfBuffer = await generateProtocolFromCarePlan(
              carePlan,
              user,
              ctx.user
            );
          }
          
          // Send email
          const portalLink = `${process.env.VITE_FRONTEND_FORGE_API_URL || 'https://physician-portal.manus.space'}/patient-portal`;
          const emailResult = await sendProtocolEmail({
            to: user.email || '',
            patientName: user.name || 'Patient',
            physicianName: ctx.user.name || 'Dr. Physician',
            protocolName: carePlan.title || 'Care Protocol',
            portalLink,
            pdfBuffer,
            template: 'protocolDelivery',
          });
          
          // Track delivery
          const delivery = await db.createProtocolDelivery({
            userId: input.userId,
            carePlanId: input.carePlanId,
            protocolName: input.customProtocol?.title || carePlan.title || 'Care Protocol',
            deliveryType: 'manual',
            emailSent: emailResult.success,
            emailMessageId: emailResult.messageId,
            pdfGenerated: true,
            errorMessage: emailResult.error,
            sentAt: emailResult.success ? new Date() : null,
          });

          // Generate medical codes using Semantic Processor
          try {
            const { processClinicalNote } = await import('./semanticProcessor');
            
            // Extract clinical data from protocol
            const clinicalNote = {
              chiefComplaint: input.customProtocol?.diagnosis || carePlan.diagnosis || 'Care protocol',
              historyOfPresentIllness: input.customProtocol?.goals?.join('. ') || '',
              assessment: input.customProtocol?.diagnosis || carePlan.diagnosis || '',
              plan: [
                ...(input.customProtocol?.interventions?.flatMap(i => i.items) || []),
                ...(input.customProtocol?.medications?.map(m => `${m.name} ${m.dosage} ${m.frequency}`) || []),
                ...(input.customProtocol?.lifestyle || [])
              ].join('. '),
              procedures: input.customProtocol?.interventions?.flatMap(i => i.items) || [],
            };
            
            // Process clinical note to generate codes
            const codingResult = await processClinicalNote(clinicalNote);
            
            // Store ICD-10 codes
            for (const icd10 of codingResult.icd10Codes) {
              // Check if code exists in database
              const existingCodes = await db.searchMedicalCodes({
                searchTerm: icd10.code,
                codeType: 'ICD10',
                limit: 1,
              });
              
              let codeId: number;
              if (existingCodes.length > 0) {
                codeId = existingCodes[0].id!;
              } else {
                // Create new code entry
                codeId = await db.createMedicalCode({
                  codeType: 'ICD10',
                  code: icd10.code,
                  description: icd10.description,
                  category: icd10.category,
                  searchTerms: icd10.description.toLowerCase(),
                }) as number;
              }
              
              // Assign code to protocol
              if (delivery?.id) {
                await db.assignMedicalCodeToProtocol({
                  protocolDeliveryId: delivery.id as number,
                  carePlanId: input.carePlanId,
                  medicalCodeId: codeId,
                  codeType: 'ICD10',
                  isPrimary: icd10.category === 'primary',
                  assignmentMethod: 'automatic',
                });
              }
            }
            
            // Store CPT codes
            for (const cpt of codingResult.cptCodes) {
              const existingCodes = await db.searchMedicalCodes({
                searchTerm: cpt.code,
                codeType: 'CPT',
                limit: 1,
              });
              
              let codeId: number;
              if (existingCodes.length > 0) {
                codeId = existingCodes[0].id!;
              } else {
                codeId = await db.createMedicalCode({
                  codeType: 'CPT',
                  code: cpt.code,
                  description: cpt.description,
                  category: cpt.modifiers?.join(', ') || '',
                  searchTerms: cpt.description.toLowerCase(),
                }) as number;
              }
              
              if (delivery?.id) {
                await db.assignMedicalCodeToProtocol({
                  protocolDeliveryId: delivery.id as number,
                  carePlanId: input.carePlanId,
                  medicalCodeId: codeId,
                  codeType: 'CPT',
                  assignmentMethod: 'automatic',
                });
              }
            }
            
            // Store SNOMED codes
            for (const snomed of codingResult.snomedConcepts) {
              const existingCodes = await db.searchMedicalCodes({
                searchTerm: snomed.conceptId,
                codeType: 'SNOMED',
                limit: 1,
              });
              
              let codeId: number;
              if (existingCodes.length > 0) {
                codeId = existingCodes[0].id!;
              } else {
                codeId = await db.createMedicalCode({
                  codeType: 'SNOMED',
                  code: snomed.conceptId,
                  description: snomed.term,
                  category: snomed.semanticTag,
                  searchTerms: snomed.term.toLowerCase(),
                }) as number;
              }
              
              if (delivery?.id) {
                await db.assignMedicalCodeToProtocol({
                  protocolDeliveryId: delivery.id as number,
                  carePlanId: input.carePlanId,
                  medicalCodeId: codeId,
                  codeType: 'SNOMED',
                  assignmentMethod: 'automatic',
                });
              }
            }
            
            console.log(`[Protocol] Generated ${codingResult.icd10Codes.length} ICD-10, ${codingResult.cptCodes.length} CPT, ${codingResult.snomedConcepts.length} SNOMED codes`);
          } catch (codingError) {
            // Log error but don't block protocol delivery
            console.error('[Protocol] Medical coding failed:', codingError);
          }

          // Create audit trail if protocol was customized
          if (input.customProtocol && delivery) {
            const originalProtocol = {
              title: carePlan.title || 'Care Protocol',
              diagnosis: carePlan.diagnosis || '',
              duration: '12 weeks',
              goals: carePlan.goals || [],
              interventions: (carePlan as any).interventions || [],
              medications: carePlan.medications || [],
              lifestyle: (carePlan as any).lifestyle || [],
              followUp: (carePlan as any).followUp || { frequency: 'Every 2 weeks', metrics: [] },
              warnings: (carePlan as any).warnings || [],
            };

            // Calculate changes
            const changes: Array<{
              field: string;
              changeType: 'added' | 'removed' | 'modified';
              oldValue?: string;
              newValue?: string;
            }> = [];

            // Compare fields
            if (originalProtocol.title !== input.customProtocol.title) {
              changes.push({
                field: 'title',
                changeType: 'modified',
                oldValue: originalProtocol.title,
                newValue: input.customProtocol.title,
              });
            }

            if (originalProtocol.diagnosis !== input.customProtocol.diagnosis) {
              changes.push({
                field: 'diagnosis',
                changeType: 'modified',
                oldValue: originalProtocol.diagnosis,
                newValue: input.customProtocol.diagnosis,
              });
            }

            if (originalProtocol.duration !== input.customProtocol.duration) {
              changes.push({
                field: 'duration',
                changeType: 'modified',
                oldValue: originalProtocol.duration,
                newValue: input.customProtocol.duration,
              });
            }

            // Track medication changes
            const origMedNames = (originalProtocol.medications || []).map((m: any) => m.name);
            const custMedNames = (input.customProtocol.medications || []).map((m: any) => m.name);
            
            custMedNames.forEach((name: string) => {
              if (!origMedNames.includes(name)) {
                changes.push({
                  field: 'medications',
                  changeType: 'added',
                  newValue: name,
                });
              }
            });

            origMedNames.forEach((name: string) => {
              if (!custMedNames.includes(name)) {
                changes.push({
                  field: 'medications',
                  changeType: 'removed',
                  oldValue: name,
                });
              }
            });

            await db.createProtocolAudit({
              protocolDeliveryId: delivery.id as number,
              carePlanId: input.carePlanId,
              physicianId: ctx.user.id,
              patientId: input.userId,
              originalProtocol,
              customizedProtocol: input.customProtocol,
              changesSummary: changes,
            });
          }
          
          return {
            success: emailResult.success,
            error: emailResult.error,
          };
        } catch (error: any) {
          console.error('[Protocol] Failed to generate and send:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message || 'Failed to generate and send protocol',
          });
        }
      }),
    
    getDeliveries: protectedProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getProtocolDeliveriesByUser(input.userId);
      }),

    getAuditTrail: protectedProcedure
      .input(z.object({
        patientId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getProtocolAuditsByPatient(input.patientId);
      }),
  }),

  // ============ Protocol Templates ============
  templates: router({
    getAll: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        return await db.getAllProtocolTemplates(ctx.user.id);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getProtocolTemplateById(input.id);
      }),

    search: protectedProcedure
      .input(z.object({
        searchTerm: z.string(),
        category: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.searchProtocolTemplates(input.searchTerm, input.category);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        category: z.string(),
        tags: z.array(z.string()).optional(),
        templateData: z.object({
          diagnosis: z.string(),
          duration: z.string(),
          goals: z.array(z.string()),
          interventions: z.array(z.object({
            category: z.string(),
            items: z.array(z.string()),
          })),
          medications: z.array(z.object({
            name: z.string(),
            dosage: z.string(),
            frequency: z.string(),
            instructions: z.string().optional(),
          })).optional(),
          lifestyle: z.array(z.string()).optional(),
          followUp: z.object({
            frequency: z.string(),
            metrics: z.array(z.string()),
          }).optional(),
          warnings: z.array(z.string()).optional(),
        }),
        isPublic: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        return await db.createProtocolTemplate({
          createdBy: ctx.user.id,
          name: input.name,
          description: input.description,
          category: input.category,
          tags: input.tags,
          templateData: input.templateData,
          isPublic: input.isPublic,
        });
      }),

    use: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .mutation(async ({ input }) => {
        await db.incrementTemplateUsage(input.templateId);
        return { success: true };
      }),

    // ===== Template Versioning =====
    createVersion: protectedProcedure
      .input(z.object({
        templateId: z.number(),
        changeSummary: z.string(),
        templateData: z.any(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const latestVersion = await db.getLatestVersionNumber(input.templateId);
        
        return await db.createTemplateVersion({
          templateId: input.templateId,
          versionNumber: latestVersion + 1,
          changeSummary: input.changeSummary,
          changedBy: ctx.user.id,
          templateData: input.templateData,
        });
      }),

    getVersionHistory: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTemplateVersionHistory(input.templateId);
      }),

    getVersion: protectedProcedure
      .input(z.object({ versionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTemplateVersion(input.versionId);
      }),

    // ===== Template Presets =====
    createPreset: protectedProcedure
      .input(z.object({
        baseTemplateId: z.number().optional(),
        name: z.string(),
        description: z.string().optional(),
        category: z.string(),
        tags: z.array(z.string()).optional(),
        templateData: z.any(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        return await db.createTemplatePreset({
          physicianId: ctx.user.id,
          baseTemplateId: input.baseTemplateId,
          name: input.name,
          description: input.description,
          category: input.category,
          tags: input.tags,
          templateData: input.templateData,
        });
      }),

    getPresets: protectedProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        return await db.getPhysicianPresets(ctx.user.id, input?.category);
      }),

    getPresetById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPresetById(input.id);
      }),

    updatePreset: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        templateData: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updatePreset(id, data);
      }),

    deletePreset: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deletePreset(input.id);
        return { success: true };
      }),

    usePreset: protectedProcedure
      .input(z.object({ presetId: z.number() }))
      .mutation(async ({ input }) => {
        await db.incrementPresetUsage(input.presetId);
        return { success: true };
      }),

    // ===== Template Analytics =====
    logUsage: protectedProcedure
      .input(z.object({
        templateId: z.number().optional(),
        presetId: z.number().optional(),
        patientId: z.number().optional(),
        wasCustomized: z.boolean(),
        customizationCount: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        return await db.logTemplateUsage({
          templateId: input.templateId,
          presetId: input.presetId,
          physicianId: ctx.user.id,
          patientId: input.patientId,
          wasCustomized: input.wasCustomized,
          customizationCount: input.customizationCount,
        });
      }),

    recordOutcome: protectedProcedure
      .input(z.object({
        logId: z.number(),
        outcomeSuccess: z.boolean(),
        outcomeNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.recordTemplateOutcome(input.logId, {
          outcomeSuccess: input.outcomeSuccess,
          outcomeNotes: input.outcomeNotes,
        });
        return { success: true };
      }),

    getAnalytics: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTemplateAnalytics(input.templateId);
      }),

    getAllAnalytics: protectedProcedure
      .query(async () => {
        return await db.getAllTemplateAnalytics();
      }),
  }),

  // ============ Medical Coding (Semantic Processor) ============
  medicalCoding: router({
    // Process clinical note and generate all codes
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
        const { processClinicalNote } = await import('./semanticProcessor');
        return await processClinicalNote(input);
      }),

    // Generate ICD-10 codes only
    generateICD10: protectedProcedure
      .input(z.object({
        chiefComplaint: z.string(),
        historyOfPresentIllness: z.string().optional(),
        physicalExam: z.string().optional(),
        assessment: z.string().optional(),
        plan: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { generateICD10Codes } = await import('./semanticProcessor');
        return await generateICD10Codes(input);
      }),

    // Generate CPT codes only
    generateCPT: protectedProcedure
      .input(z.object({
        chiefComplaint: z.string(),
        plan: z.string().optional(),
        procedures: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { generateCPTCodes } = await import('./semanticProcessor');
        return await generateCPTCodes(input);
      }),

    // Extract clinical entities
    extractEntities: protectedProcedure
      .input(z.object({
        chiefComplaint: z.string(),
        historyOfPresentIllness: z.string().optional(),
        physicalExam: z.string().optional(),
        assessment: z.string().optional(),
        plan: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { extractClinicalEntities } = await import('./semanticProcessor');
        return await extractClinicalEntities(input);
      }),

    // Search medical codes
    searchCodes: protectedProcedure
      .input(z.object({
        searchTerm: z.string(),
        codeType: z.enum(['ICD10', 'CPT', 'SNOMED']).optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.searchMedicalCodes(input);
      }),

    // Get codes for a protocol
    getProtocolCodes: protectedProcedure
      .input(z.object({ protocolDeliveryId: z.number() }))
      .query(async ({ input }) => {
        return await db.getProtocolMedicalCodes(input.protocolDeliveryId);
      }),

    // Assign code to protocol
    assignCode: protectedProcedure
      .input(z.object({
        protocolDeliveryId: z.number().optional(),
        carePlanId: z.number().optional(),
        medicalCodeId: z.number(),
        codeType: z.enum(['ICD10', 'CPT', 'SNOMED']),
        isPrimary: z.boolean().optional(),
        assignmentMethod: z.enum(['automatic', 'manual', 'verified']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        return await db.assignMedicalCodeToProtocol({
          ...input,
          verifiedBy: input.assignmentMethod === 'verified' ? ctx.user.id : undefined,
        });
      }),

    // Verify code assignment
    verifyCode: protectedProcedure
      .input(z.object({
        assignmentId: z.number(),
        verificationNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const { protocolMedicalCodes } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        await database
          .update(protocolMedicalCodes)
          .set({
            assignmentMethod: 'verified',
            verifiedBy: ctx.user.id,
            verifiedAt: new Date(),
            verificationNotes: input.verificationNotes,
          })
          .where(eq(protocolMedicalCodes.id, input.assignmentId));
        
        return { success: true };
      }),

    // Remove code assignment
    removeCode: protectedProcedure
      .input(z.object({
        assignmentId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        await db.removeCodeAssignment(input.assignmentId);
        
        return { success: true };
      }),

    // Verify all unverified codes for a protocol
    verifyAllCodes: protectedProcedure
      .input(z.object({
        protocolDeliveryId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
        
        const { protocolMedicalCodes } = await import('../drizzle/schema');
        const { eq, and, isNull } = await import('drizzle-orm');
        
        // Update all unverified codes
        const result = await database
          .update(protocolMedicalCodes)
          .set({
            assignmentMethod: 'verified',
            verifiedBy: ctx.user.id,
            verifiedAt: new Date(),
          })
          .where(
            and(
              eq(protocolMedicalCodes.protocolDeliveryId, input.protocolDeliveryId),
              isNull(protocolMedicalCodes.verifiedBy)
            )
          );
        
        return { success: true, count: (result as any).affectedRows || 0 };
      }),

    // Update code assignment
    updateCode: protectedProcedure
      .input(z.object({
        assignmentId: z.number(),
        description: z.string().optional(),
        isPrimary: z.boolean().optional(),
        verificationNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const { assignmentId, ...updates } = input;
        await db.updateCodeAssignment(assignmentId, updates);
        
        return { success: true };
      }),

    // Batch verify multiple codes
    batchVerifyCodes: protectedProcedure
      .input(z.object({
        assignmentIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { protocolMedicalCodes } = await import('../drizzle/schema');
        
        const result = await database
          .update(protocolMedicalCodes)
          .set({ 
            assignmentMethod: 'verified',
            verifiedBy: ctx.user.id,
            verifiedAt: new Date(),
          })
          .where(inArray(protocolMedicalCodes.id, input.assignmentIds));
        
        return { 
          success: true,
          count: input.assignmentIds.length,
        };
      }),

    // Batch remove multiple codes
    batchRemoveCodes: protectedProcedure
      .input(z.object({
        assignmentIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
        
        const database = await db.getDb();
        if (!database) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { protocolMedicalCodes } = await import('../drizzle/schema');
        
        await database
          .delete(protocolMedicalCodes)
          .where(inArray(protocolMedicalCodes.id, input.assignmentIds));
        
        return { 
          success: true,
          count: input.assignmentIds.length,
        };
      }),
  }),

  // ============ Billing & Claims Management ============
  billing: router({
    // Provider Profile Management
    createProviderProfile: protectedProcedure
      .input(z.object({
        npi: z.string().length(10),
        taxId: z.string(),
        licenseNumber: z.string().optional(),
        licenseState: z.string().length(2).optional(),
        practiceName: z.string(),
        practiceAddress: z.string(),
        practiceCity: z.string(),
        practiceState: z.string().length(2),
        practiceZip: z.string(),
        practicePhone: z.string(),
        practiceFax: z.string().optional(),
        taxonomyCode: z.string().optional(),
        specialty: z.string().optional(),
        billingContactName: z.string().optional(),
        billingContactPhone: z.string().optional(),
        billingContactEmail: z.string().email().optional(),
        isPrimary: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const profile = await db.createProviderProfile({
          userId: ctx.user.id,
          ...input,
          isActive: true,
        });
        return { success: true, profileId: Number((profile as any).insertId) };
      }),

    getProviderProfiles: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getProviderProfilesByUserId(ctx.user.id);
      }),

    getPrimaryProfile: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getPrimaryProviderProfile(ctx.user.id);
      }),

    updateProviderProfile: protectedProcedure
      .input(z.object({
        profileId: z.number(),
        data: z.object({
          npi: z.string().length(10).optional(),
          taxId: z.string().optional(),
          practiceName: z.string().optional(),
          practiceAddress: z.string().optional(),
          practiceCity: z.string().optional(),
          practiceState: z.string().length(2).optional(),
          practiceZip: z.string().optional(),
          practicePhone: z.string().optional(),
          specialty: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateProviderProfile(input.profileId, input.data);
        return { success: true };
      }),

    setPrimaryProfile: protectedProcedure
      .input(z.object({ profileId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.setPrimaryProviderProfile(ctx.user.id, input.profileId);
        return { success: true };
      }),

    // CMS-1500 Generation
    generateCMS1500: protectedProcedure
      .input(z.object({
        protocolDeliveryId: z.number(),
        providerProfileId: z.number().optional(),
        insuranceInfo: z.object({
          insuranceCompany: z.string(),
          insurancePolicyNumber: z.string(),
          insuranceGroupNumber: z.string().optional(),
          subscriberName: z.string(),
          subscriberDob: z.string(),
          relationshipToSubscriber: z.enum(["self", "spouse", "child", "other"]),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get protocol delivery
        const deliveries = await db.getProtocolDeliveriesByUser(ctx.user.id);
        const delivery = deliveries.find(d => d.id === input.protocolDeliveryId);
        if (!delivery) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Protocol delivery not found' });
        }

        // Get patient - delivery doesn't have patientId, need to get from carePlanId
        if (!delivery.carePlanId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Protocol delivery must be associated with a care plan' });
        }
        // Get all patients and find the one with this care plan
        const allPatients = await db.getAllPatients();
        let patient = null;
        for (const p of allPatients) {
          const carePlans = await db.getPatientCarePlans(p.id);
          if (carePlans.some(cp => cp.id === delivery.carePlanId)) {
            patient = p;
            break;
          }
        }
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Patient not found for this care plan' });
        }

        // Get provider profile
        let providerProfile;
        if (input.providerProfileId) {
          providerProfile = await db.getProviderProfileById(input.providerProfileId);
        } else {
          providerProfile = await db.getPrimaryProviderProfile(ctx.user.id);
        }

        if (!providerProfile) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Provider profile not found. Please create a provider profile first.' 
          });
        }

        // Get medical codes for this protocol delivery
        const codes = await db.getProtocolMedicalCodes(input.protocolDeliveryId);
        
        // Filter for ICD-10 and CPT codes only
        const icd10Codes = codes.filter((c: any) => c.codeType === 'ICD10').map((c: any) => ({
          code: c.code,
          description: c.description,
        }));
        
        const cptCodes = codes.filter((c: any) => c.codeType === 'CPT').map((c: any) => ({
          code: c.code,
          description: c.description,
          charge: 150.00, // Default charge, should be configurable
          units: 1,
          date: delivery.sentAt || new Date(),
        }));

        if (icd10Codes.length === 0) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'No ICD-10 diagnosis codes found. Please add diagnosis codes before generating claim.' 
          });
        }

        if (cptCodes.length === 0) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'No CPT procedure codes found. Please add procedure codes before generating claim.' 
          });
        }

        // Calculate total charges
        const totalCharges = cptCodes.reduce((sum: number, code: any) => sum + (code.charge * code.units), 0);

        // Generate claim number
        const claimNumber = await db.generateClaimNumber();

        // Create billing claim record
        const claimData = {
          claimNumber,
          protocolDeliveryId: input.protocolDeliveryId,
          patientId: patient.id,
          providerProfileId: providerProfile.id,
          createdByUserId: ctx.user.id,
          ...input.insuranceInfo,
          subscriberDob: new Date(input.insuranceInfo.subscriberDob),
          serviceDate: delivery.sentAt || new Date(),
          diagnosisCodes: icd10Codes.map(c => c.code),
          procedureCodes: cptCodes.map(c => ({
            code: c.code,
            description: c.description,
            charge: c.charge,
            units: c.units,
          })),
          totalCharges: totalCharges.toString(),
          status: 'draft' as const,
        };

        const claimResult = await db.createBillingClaim(claimData);
        const claimId = Number((claimResult as any).insertId);

        // Generate PDF
        const { generateCMS1500PDF } = await import('./cms1500');
        const claim = await db.getBillingClaimById(claimId);
        
        if (!claim) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to retrieve created claim' });
        }

        const pdfBuffer = await generateCMS1500PDF({
          claim,
          patient,
          provider: providerProfile,
          diagnosisCodes: icd10Codes,
          procedureCodes: cptCodes,
        });

        // Upload PDF to S3
        const pdfKey = `billing-claims/${claimNumber}.pdf`;
        const { url: pdfUrl } = await storagePut(pdfKey, pdfBuffer, 'application/pdf');

        // Update claim with PDF URL
        await db.updateBillingClaim(claimId, { pdfUrl });

        return {
          success: true,
          claimId,
          claimNumber,
          pdfUrl,
          totalCharges,
        };
      }),

    // Get claims
    getClaimsByPatient: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getBillingClaimsByPatient(input.patientId);
      }),

    getClaimsByProtocolDelivery: protectedProcedure
      .input(z.object({ protocolDeliveryId: z.number() }))
      .query(async ({ input }) => {
        return await db.getBillingClaimsByProtocolDelivery(input.protocolDeliveryId);
      }),

    getClaim: protectedProcedure
      .input(z.object({ claimId: z.number() }))
      .query(async ({ input }) => {
        const claim = await db.getBillingClaimById(input.claimId);
        if (!claim) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Claim not found' });
        }
        return claim;
      }),

    updateClaimStatus: protectedProcedure
      .input(z.object({
        claimId: z.number(),
        status: z.enum(["draft", "submitted", "pending", "paid", "denied", "appealed"]),
        paidAmount: z.string().optional(),
        denialReason: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateBillingClaimStatus(
          input.claimId,
          input.status,
          {
            paidAmount: input.paidAmount,
            paidDate: input.status === 'paid' ? new Date() : undefined,
            denialReason: input.denialReason,
          }
        );
        return { success: true };
      }),
  }),

  // ============ Drug Interaction Checking ============
  drugSafety: router({
    checkInteractions: protectedProcedure
      .input(z.object({
        medications: z.array(z.object({
          name: z.string(),
          dosage: z.string(),
          frequency: z.string(),
        })),
        allergies: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { comprehensiveDrugSafetyCheck } = await import('./drugInteractionService');
        
        return await comprehensiveDrugSafetyCheck(
          input.medications,
          input.allergies || []
        );
      }),
  }),

  // DAO Protocol Interface - Clinical Data Entry
  daoProtocol: router({
    // Clinical Sessions
    createSession: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        sessionType: z.enum(['initial_consultation', 'follow_up', 'emergency', 'routine_checkup']),
        sessionDate: z.string().transform(str => new Date(str)),
        chiefComplaint: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.createClinicalSession({
          ...input,
          physicianId: ctx.user.id,
          status: 'in_progress',
        });
        
        // Query back the created session
        const sessions = await db.getClinicalSessionsByPhysician(ctx.user.id);
        const newSession = sessions[0];
        
        return { success: true, sessionId: newSession.id };
      }),

    getSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        const session = await db.getClinicalSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
        }
        return session;
      }),

    getPatientSessions: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getClinicalSessionsByPatient(input.patientId);
      }),

    getPhysicianSessions: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getClinicalSessionsByPhysician(ctx.user.id);
      }),

    updateSession: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        chiefComplaint: z.string().optional(),
        historyOfPresentIllness: z.string().optional(),
        reviewOfSystems: z.record(z.string(), z.string()).optional(),
        physicalExamFindings: z.string().optional(),
        assessmentAndPlan: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { sessionId, ...updateData } = input;
        await db.updateClinicalSession(sessionId, updateData);
        return { success: true };
      }),

    completeSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        await db.completeClinicalSession(input.sessionId);
        return { success: true };
      }),

    // Diagnosis Entries
    addDiagnosis: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        diagnosisCode: z.string().optional(),
        diagnosisName: z.string(),
        diagnosisType: z.enum(['primary', 'secondary', 'differential']),
        severity: z.enum(['mild', 'moderate', 'severe', 'critical']).optional(),
        onset: z.string().optional(),
        duration: z.string().optional(),
        symptoms: z.array(z.string()).optional(),
        clinicalNotes: z.string().optional(),
        confidence: z.enum(['low', 'medium', 'high']).optional(),
      }))
      .mutation(async ({ input }) => {
        // Auto-generate ICD-10 code if not provided
        let diagnosisCode = input.diagnosisCode;
        if (!diagnosisCode) {
          const { generateICD10Codes } = await import('./semanticProcessor');
          const session = await db.getClinicalSessionById(input.sessionId);
          const icd10Codes = await generateICD10Codes({
            chiefComplaint: session?.chiefComplaint || input.diagnosisName,
            assessment: input.diagnosisName,
          });
          // Use the primary diagnosis code with highest confidence
          const primaryCode = icd10Codes
            .filter(c => c.category === 'primary')
            .sort((a, b) => b.confidence - a.confidence)[0];
          diagnosisCode = primaryCode?.code;
        }

        await db.createDiagnosisEntry({
          ...input,
          diagnosisCode,
          status: 'active',
        });
        return { success: true, generatedCode: diagnosisCode };
      }),

    getDiagnosesBySession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDiagnosisEntriesBySession(input.sessionId);
      }),

    updateDiagnosis: protectedProcedure
      .input(z.object({
        diagnosisId: z.number(),
        diagnosisCode: z.string().optional(),
        diagnosisName: z.string().optional(),
        severity: z.enum(['mild', 'moderate', 'severe', 'critical']).optional(),
        symptoms: z.array(z.string()).optional(),
        clinicalNotes: z.string().optional(),
        status: z.enum(['active', 'resolved', 'chronic', 'ruled_out']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { diagnosisId, ...updateData } = input;
        await db.updateDiagnosisEntry(diagnosisId, updateData);
        return { success: true };
      }),

    deleteDiagnosis: protectedProcedure
      .input(z.object({ diagnosisId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDiagnosisEntry(input.diagnosisId);
        return { success: true };
      }),

    // Treatment Entries
    addTreatment: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        diagnosisId: z.number().optional(),
        treatmentType: z.enum(['medication', 'procedure', 'therapy', 'lifestyle', 'referral']),
        treatmentName: z.string(),
        treatmentCode: z.string().optional(),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        route: z.string().optional(),
        duration: z.string().optional(),
        instructions: z.string().optional(),
        rationale: z.string().optional(),
        expectedOutcome: z.string().optional(),
        sideEffects: z.array(z.string()).optional(),
        contraindications: z.array(z.string()).optional(),
        monitoringParameters: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Auto-generate CPT code if not provided
        let treatmentCode = input.treatmentCode;
        if (!treatmentCode && input.treatmentType === 'procedure') {
          const { generateCPTCodes } = await import('./semanticProcessor');
          const cptCodes = await generateCPTCodes({
            chiefComplaint: input.treatmentName,
            plan: `${input.treatmentName}${input.dosage ? ` ${input.dosage}` : ''}`,
            procedures: [input.treatmentName],
          });
          // Use the code with highest confidence
          const topCode = cptCodes.sort((a, b) => b.confidence - a.confidence)[0];
          treatmentCode = topCode?.code;
        }

        await db.createTreatmentEntry({
          ...input,
          treatmentCode,
          status: 'proposed',
        });
        return { success: true, generatedCode: treatmentCode };
      }),

    getTreatmentsBySession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTreatmentEntriesBySession(input.sessionId);
      }),

    getTreatmentsByDiagnosis: protectedProcedure
      .input(z.object({ diagnosisId: z.number() }))
      .query(async ({ input }) => {
        return await db.getTreatmentEntriesByDiagnosis(input.diagnosisId);
      }),

    updateTreatment: protectedProcedure
      .input(z.object({
        treatmentId: z.number(),
        treatmentName: z.string().optional(),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        instructions: z.string().optional(),
        status: z.enum(['proposed', 'active', 'completed', 'discontinued']).optional(),
        startDate: z.string().transform(str => new Date(str)).optional(),
        endDate: z.string().transform(str => new Date(str)).optional(),
      }))
      .mutation(async ({ input }) => {
        const { treatmentId, ...updateData } = input;
        await db.updateTreatmentEntry(treatmentId, updateData);
        return { success: true };
      }),

    deleteTreatment: protectedProcedure
      .input(z.object({ treatmentId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteTreatmentEntry(input.treatmentId);
        return { success: true };
      }),

    // Clinical Observations
    addObservation: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        observationType: z.string(),
        observationValue: z.string(),
        unit: z.string().optional(),
        notes: z.string().optional(),
        isAbnormal: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createClinicalObservation(input);
        return { success: true };
      }),

    getObservationsBySession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getClinicalObservationsBySession(input.sessionId);
      }),

    deleteObservation: protectedProcedure
      .input(z.object({ observationId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteClinicalObservation(input.observationId);
        return { success: true };
      }),

    // Semantic Processor Integration
    suggestDiagnosisCodes: protectedProcedure
      .input(z.object({
        diagnosisName: z.string(),
        symptoms: z.array(z.string()).optional(),
        severity: z.string().optional(),
        onset: z.string().optional(),
        duration: z.string().optional(),
        clinicalNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { generateICD10Codes } = await import('./semanticProcessor');
        const codes = await generateICD10Codes({
          chiefComplaint: input.diagnosisName,
          assessment: input.diagnosisName,
        });
        return { codes };
      }),

    suggestTreatmentCodes: protectedProcedure
      .input(z.object({
        treatmentName: z.string(),
        treatmentType: z.string(),
        dosage: z.string().optional(),
        frequency: z.string().optional(),
        instructions: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { generateCPTCodes } = await import('./semanticProcessor');
        const codes = await generateCPTCodes({
          chiefComplaint: input.treatmentName,
          plan: `${input.treatmentName}${input.dosage ? ` ${input.dosage}` : ''}${input.frequency ? ` ${input.frequency}` : ''}`,
          procedures: [input.treatmentName],
        });
        return { codes };
      }),

    generateSessionCodes: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { processClinicalNote } = await import('./semanticProcessor');
        
        // Get session data
        const session = await db.getClinicalSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
        }

        // Get diagnoses and treatments
        const diagnoses = await db.getDiagnosisEntriesBySession(input.sessionId);
        const treatments = await db.getTreatmentEntriesBySession(input.sessionId);

        // Build clinical note
        const clinicalNote = {
          chiefComplaint: session.chiefComplaint || '',
          historyOfPresentIllness: session.historyOfPresentIllness || undefined,
          physicalExam: session.physicalExamFindings || undefined,
          assessment: diagnoses.map(d => d.diagnosisName).join('; '),
          plan: treatments.map(t => t.treatmentName).join('; '),
          procedures: treatments.filter(t => t.treatmentType === 'procedure').map(t => t.treatmentName),
        };

        // Generate comprehensive codes
        const result = await processClinicalNote(clinicalNote);

        return {
          icd10Codes: result.icd10Codes,
          cptCodes: result.cptCodes,
          confidenceScore: result.confidenceScore,
          codingNotes: result.codingNotes,
        };
      }),
  }),

  // ========================================
  // CAUSAL BRAIN INTELLIGENCE HUB
  // ========================================
  causalBrain: router({
    /**
     * Generate treatment recommendations for a clinical session
     */
    generateRecommendations: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Get session and patient data
        const session = await db.getClinicalSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
        }

        const patient = await db.getPatientById(session.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Patient not found' });
        }

        // Get diagnoses
        const diagnoses = await db.getDiagnosisEntriesBySession(input.sessionId);
        if (diagnoses.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No diagnoses found for session' });
        }

        // Calculate patient age
        const age = Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

        // Build patient context
        const patientContext = {
          age,
          gender: patient.gender,
          allergies: patient.allergies as string[] || [],
          chronicConditions: patient.chronicConditions as string[] || [],
          currentMedications: patient.currentMedications as string[] || [],
          symptoms: diagnoses.flatMap(d => d.symptoms as string[] || []),
          diagnosisCode: diagnoses[0].diagnosisCode || undefined,
          diagnosisDescription: diagnoses[0].diagnosisName,
        };

        // Retrieve real PubMed evidence via the causal module (isVerified:true)
        // Falls back to LLM-generated evidence if PubMed returns < 2 results
        const causalModule = await import('./causal');
        const pubmedEvidence = await causalModule.getEvidence({
          diagnosisCode: patientContext.diagnosisCode,
          diagnosisDescription: patientContext.diagnosisDescription,
          patientAge: patientContext.age,
          comorbidities: patientContext.chronicConditions,
          maxResults: 5,
        });

        // Generate LLM-based treatment recommendations
        const causalBrain = await import('./causalBrain');
        const recommendations = await causalBrain.generateTreatmentRecommendations(patientContext, 3);

        // Save recommendations to database with full EvidenceSource objects
        const savedRecommendations = [];
        for (const rec of recommendations) {
          const result = await db.createTreatmentRecommendation({
            sessionId: input.sessionId,
            patientId: session.patientId,
            treatmentName: rec.treatmentName,
            treatmentType: rec.treatmentType,
            confidenceScore: rec.confidenceScore.toString(),
            reasoning: rec.reasoning,
            // Store full EvidenceSource objects — UI uses isVerified to show PubMed badge
            evidenceSources: pubmedEvidence.map((e: import('./causal').EvidenceSource) => ({
              title: e.title,
              authors: e.authors,
              publicationDate: e.publicationDate,
              journal: e.journal,
              doi: e.doi,
              pmid: e.pmid,
              keyFindings: e.keyFindings,
              evidenceGrade: e.evidenceGrade,
              studyType: e.studyType,
              relevanceScore: e.relevanceScore,
              isVerified: e.isVerified,
            })),
            indicatedFor: rec.indicatedFor,
            contraindications: rec.contraindications,
            expectedOutcome: rec.expectedOutcome,
            alternativeTreatments: rec.alternativeTreatments,
            suggestedDosage: rec.suggestedDosage,
            suggestedFrequency: rec.suggestedFrequency,
            suggestedDuration: rec.suggestedDuration,
            status: 'pending',
          });
          savedRecommendations.push(result);
        }

        return {
          recommendations: savedRecommendations,
          patientContext,
        };
      }),

    /**
     * Get treatment recommendations for a session
     */
    getRecommendations: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
      }))
      .query(async ({ input }) => {
        const recommendations = await db.getTreatmentRecommendationsBySession(input.sessionId);
        return recommendations;
      }),

    /**
     * Get persisted Bayesian confidence scores (treatment_policy) for a diagnosis.
     * Used by the Treatment Recommendations UI to overlay real-world confidence
     * on top of the AI-generated scores.
     */
    getAllPolicies: protectedProcedure
      .query(async () => {
        const policies = await db.getAllTreatmentPolicies();
        return policies.map((p) => ({
          id: p.id,
          treatmentCode: p.treatmentCode,
          treatmentName: p.treatmentName,
          diagnosisCode: p.diagnosisCode,
          ageGroup: p.ageGroup,
          genderGroup: p.genderGroup,
          confidenceScore: Number(p.confidenceScore),
          alpha: Number(p.alpha),
          beta: Number(p.beta),
          totalObservations: p.totalObservations,
          successCount: p.successCount,
          failureCount: p.failureCount,
          updatedAt: p.updatedAt,
        }));
      }),

    getPoliciesForDiagnosis: protectedProcedure
      .input(z.object({
        diagnosisCode: z.string(),
      }))
      .query(async ({ input }) => {
        const policies = await db.getTreatmentPoliciesByDiagnosis(input.diagnosisCode);
        return policies.map((p) => ({
          treatmentCode: p.treatmentCode,
          treatmentName: p.treatmentName,
          confidenceScore: Number(p.confidenceScore),
          alpha: Number(p.alpha),
          beta: Number(p.beta),
          totalObservations: p.totalObservations,
          successCount: p.successCount,
          failureCount: p.failureCount,
          updatedAt: p.updatedAt,
        }));
      }),

    /**
     * Run Thompson Sampling to select the best treatment for a patient context.
     * Returns the recommended treatment code + full sample breakdown.
     */
    selectBestTreatment: protectedProcedure
      .input(z.object({
        diagnosisCode: z.string(),
        candidates: z.array(z.object({
          treatmentCode: z.string(),
          treatmentName: z.string(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { selectBestTreatmentByThompson } = await import('./causal/policy');
        const result = await selectBestTreatmentByThompson(
          input.diagnosisCode,
          input.candidates
        );
        return result;
      }),

    /**
     * Update recommendation status (accept/reject/modify)
     */
    updateRecommendationStatus: protectedProcedure
      .input(z.object({
        recommendationId: z.number(),
        status: z.enum(['pending', 'accepted', 'rejected', 'modified']),
        feedback: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.updateTreatmentRecommendationStatus(
          input.recommendationId,
          input.status,
          input.feedback,
          ctx.user.id
        );
        return result;
      }),

    /**
     * Perform causal analysis on treatment effectiveness
     */
    performCausalAnalysis: protectedProcedure
      .input(z.object({
        diagnosisCode: z.string(),
        treatmentCode: z.string(),
      }))
      .mutation(async ({ input }) => {
        // Query real patient outcomes from DB for this diagnosis + treatment pair
        let historicalData = await db.getOutcomesByDiagnosisAndTreatment(
          input.diagnosisCode,
          input.treatmentCode
        );

        // Minimum sample threshold: require at least 5 real outcomes for statistical validity.
        // Below threshold, supplement with a note but still run analysis on available data.
        const MIN_OUTCOMES = 5;
        const usingRealData = historicalData.length >= MIN_OUTCOMES;
        if (!usingRealData) {
          console.log(
            `[CausalAnalysis] Only ${historicalData.length} real outcomes found for ` +
            `${input.diagnosisCode}/${input.treatmentCode}. ` +
            `Analysis will use available data + LLM supplementation.`
          );
        }

        // Perform causal analysis
        const causalBrain = await import('./causalBrain');
        const analysis = await causalBrain.performCausalAnalysis(
          input.diagnosisCode,
          input.treatmentCode,
          historicalData
        );

        // Save analysis to database
        await db.createCausalAnalysis({
          diagnosisCode: analysis.diagnosisCode,
          treatmentCode: analysis.treatmentCode,
          effectSize: analysis.effectSize.toString(),
          confidenceInterval: analysis.confidenceInterval,
          pValue: analysis.pValue.toString(),
          sampleSize: analysis.sampleSize,
          methodology: analysis.methodology,
          confounders: analysis.confounders,
          analysisNotes: analysis.analysisNotes,
          outcomeType: analysis.outcomeType,
          outcomeValue: analysis.outcomeValue.toString(),
        });

        return analysis;
      }),

    /**
     * Record a patient outcome
     */
    recordOutcome: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        sessionId: z.number().optional(),
        recommendationId: z.number().optional(),
        diagnosisCode: z.string().optional(),
        outcomeType: z.string(),
        outcomeDescription: z.string(),
        severity: z.enum(['mild', 'moderate', 'severe', 'critical']).optional(),
        measurementType: z.string().optional(),
        measurementValue: z.string().optional(),
        measurementUnit: z.string().optional(),
        /** Numeric value of the primary outcome instrument (e.g., HbA1c = 6.8) */
        measuredValue: z.number().optional(),
        /** Baseline value before treatment started (for drop_by operator) */
        baselineValue: z.number().optional(),
        timeFromTreatment: z.number().optional(),
        isExpected: z.boolean().optional(),
        likelyRelatedToTreatment: z.boolean().optional(),
        attributionConfidence: z.number().optional(),
        requiresIntervention: z.boolean().optional(),
        interventionTaken: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const outcomeData = {
          patientId: input.patientId,
          sessionId: input.sessionId,
          recommendationId: input.recommendationId,
          outcomeType: input.outcomeType,
          outcomeDescription: input.outcomeDescription,
          severity: input.severity,
          measurementType: input.measurementType,
          measurementValue: input.measurementValue,
          measurementUnit: input.measurementUnit,
          timeFromTreatment: input.timeFromTreatment,
          isExpected: input.isExpected,
          likelyRelatedToTreatment: input.likelyRelatedToTreatment,
          attributionConfidence: input.attributionConfidence?.toString(),
          requiresIntervention: input.requiresIntervention,
          interventionTaken: input.interventionTaken,
          recordedBy: ctx.user.id,
        };
        const result = await db.recordPatientOutcome(outcomeData);

        // ── Subgroup-stratified policy update ──────────────────────────────
        // Attempt to update treatment_policy with demographic stratification.
        // Runs async after the outcome is saved — failures are logged, not thrown.
        try {
          // 1. Resolve patient demographics for subgroup assignment
          const patient = await db.getPatientById(input.patientId);
          let ageGroup: 'under_40' | '40_to_65' | 'over_65' | 'all' = 'all';
          let genderGroup: 'male' | 'female' | 'other' | 'all' = 'all';

          if (patient?.dateOfBirth) {
            const ageYears = Math.floor(
              (Date.now() - new Date(patient.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
            );
            ageGroup = ageYears < 40 ? 'under_40' : ageYears <= 65 ? '40_to_65' : 'over_65';
          }
          if (patient?.gender === 'male' || patient?.gender === 'female' || patient?.gender === 'other') {
            genderGroup = patient.gender;
          }

          // 2. Resolve treatment + diagnosis codes from the linked recommendation
          let treatmentCode = 'unknown';
          let treatmentName = input.outcomeType;
          let diagnosisCode = 'unknown';

          if (input.recommendationId) {
            const recs = await db.getTreatmentRecommendationsBySession(input.sessionId ?? 0);
            const rec = recs.find((r: any) => r.id === input.recommendationId);
            if (rec) {
              // treatmentCode is stored as treatmentName in the DB (no separate treatmentCode column)
              treatmentCode = (rec as any).treatmentName ?? treatmentCode;
              treatmentName = (rec as any).treatmentName ?? treatmentName;
            }
          }

          // 3. Build OutcomeRecord for policy update (matches causal/types.ts OutcomeRecord interface)
          const isAdverse = input.severity === 'severe' || input.severity === 'critical' ||
            input.requiresIntervention === true;

          // Fetch formal outcome definition to validate success classification
          const effectiveDiagnosis = input.diagnosisCode ?? diagnosisCode;
          const outcomeDef = await db.getOutcomeDefinitionByDiagnosis(effectiveDiagnosis);

          // Determine success: prefer measuredValue + threshold if available
          let isSuccess = input.outcomeType === 'improvement' ||
            (input.isExpected === true && input.likelyRelatedToTreatment === true);
          if (outcomeDef && input.measuredValue !== undefined) {
            const v = input.measuredValue;
            const t = Number(outcomeDef.successThreshold);
            switch (outcomeDef.successOperator) {
              case 'lt':      isSuccess = v < t;  break;
              case 'lte':     isSuccess = v <= t; break;
              case 'gt':      isSuccess = v > t;  break;
              case 'gte':     isSuccess = v >= t; break;
              case 'drop_by': isSuccess = input.baselineValue !== undefined
                ? (input.baselineValue - v) >= t : isSuccess; break;
              case 'reach':   isSuccess = v >= t; break;
            }
          }

          const outcomeRecord = {
            patientId: input.patientId,
            sessionId: input.sessionId ?? 0,
            treatmentCode,
            diagnosisCode: effectiveDiagnosis,
            success: isSuccess,
            adverseEvent: isAdverse,
            outcomeDescription: input.outcomeDescription,
            measuredValue: input.measuredValue,
            baselineValue: input.baselineValue,
            followUpDays: input.timeFromTreatment ?? 0,
            recordedAt: new Date(),
          };

          // 4. Fetch all outcomes for this treatment to check threshold
          const allOutcomes = await db.getOutcomesByDiagnosisAndTreatment(diagnosisCode, treatmentCode);
          const { recordOutcomeAndUpdatePolicy } = await import('./causal/policy');
          await recordOutcomeAndUpdatePolicy(
            outcomeRecord,
            allOutcomes.map((o: any) => ({
              patientId: o.patientId,
              sessionId: o.sessionId ?? 0,
              treatmentCode,
              diagnosisCode,
              success: o.outcomeType === 'improvement',
              adverseEvent: o.severity === 'severe' || o.severity === 'critical',
              outcomeDescription: o.outcomeDescription ?? '',
              followUpDays: o.timeFromTreatment ?? 0,
              recordedAt: o.createdAt ?? new Date(),
            })),
            treatmentName,
            diagnosisCode,
            ageGroup,
            genderGroup
          );
        } catch (policyErr) {
          // Non-fatal — outcome is already saved, policy update failure should not block the response
          console.error('[recordOutcome] Policy update failed (non-fatal):', policyErr);
        }

        return result;
      }),

    /**
     * Get the formal outcome definition for a diagnosis code.
     * Used by the outcome recording UI to show the physician what to measure.
     */
    getOutcomeDefinition: protectedProcedure
      .input(z.object({ diagnosisCode: z.string() }))
      .query(async ({ input }) => {
        return await db.getOutcomeDefinitionByDiagnosis(input.diagnosisCode);
      }),

    /**
     * Get all outcome definitions (for policy dashboard).
     */
    getAllOutcomeDefinitions: protectedProcedure
      .query(async () => {
        return await db.getAllOutcomeDefinitions();
      }),

    /**
     * Get confidence score history for a treatment arm (for sparkline charts).
     */
    getPolicyHistory: protectedProcedure
      .input(z.object({
        treatmentCode: z.string(),
        diagnosisCode: z.string(),
        ageGroup: z.string().optional(),
        genderGroup: z.string().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const rows = await db.getPolicyConfidenceHistory(
          input.treatmentCode,
          input.diagnosisCode,
          input.ageGroup ?? 'all',
          input.genderGroup ?? 'all',
          input.limit ?? 10
        );
        // Return in chronological order for sparkline rendering
        return rows.reverse().map((r) => ({
          confidenceScore: Number(r.confidenceScore),
          alpha: Number(r.alpha),
          beta: Number(r.beta),
          totalObservations: r.totalObservations,
          recordedAt: r.recordedAt,
        }));
      }),

    /**
     * Audit all active outcome_definitions codes against the ICD-10-CM reference table.
     * Returns per-row status: valid | not_found | encounter_code | not_billable | external_cause
     */
    auditOutcomeDefinitionCodes: protectedProcedure
      .query(async () => {
        return await db.auditOutcomeDefinitionCodes();
      }),
    /**
     * Trigger the annual ICD-10-CM refresh job manually.
     * Downloads the latest CMS flat file, upserts codes, audits outcome_definitions,
     * and notifies the owner if any codes are now invalid.
     * Set force=true to bypass the 11-month staleness check.
     */
    triggerIcd10Refresh: protectedProcedure
      .input(z.object({ force: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        return await runIcd10Refresh(input.force ?? false);
      }),

    /**
     * Validate a single ICD-10-CM diagnosis code before inserting an outcome definition.
     * Returns { valid, icdShortDesc, icdLongDesc, codeType } or { valid: false, reason, suggestions }.
     */
    validateDiagnosisCode: protectedProcedure
      .input(z.object({ code: z.string().min(3).max(10) }))
      .query(async ({ input }) => {
        const result = await db.validateDiagnosisCode(input.code);
        if (result.valid) {
          return {
            valid: true as const,
            code: result.icd.code,
            shortDesc: result.icd.shortDesc,
            longDesc: result.icd.longDesc,
            codeType: result.icd.codeType,
            isBillable: result.icd.isBillable,
          };
        }
        return {
          valid: false as const,
          reason: result.reason,
          suggestions: result.suggestions,
        };
      }),

    /**
     * Create a new outcome definition — validates ICD-10-CM code before insert.
     * Rejects encounter codes, non-billable category codes, and codes not in CMS FY2025 tabular.
     */
    createOutcomeDefinition: protectedProcedure
      .input(z.object({
        diagnosisCode:          z.string().min(3).max(10),
        conditionName:          z.string().min(3).max(200),
        measurementInstrument:  z.string().min(2).max(200),
        measurementUnit:        z.string().max(50).optional(),
        successOperator:        z.enum(['lt', 'lte', 'gt', 'gte', 'drop_by', 'reach']),
        successThreshold:       z.number(),
        timeHorizonDays:        z.number().int().positive(),
        guidelineSource:        z.string().min(3).max(200),
        evidenceGrade:          z.enum(['A', 'B', 'C', 'D']).optional(),
        successCriteriaSummary: z.string().optional(),
        isComposite:            z.boolean().optional(),
        compositeGroupId:       z.string().max(50).optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          return await db.createOutcomeDefinition(input);
        } catch (err: any) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: err.message });
        }
      }),
    /**
     * Deactivate (soft-delete) an outcome definition.
     */
    deactivateOutcomeDefinition: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        await db.deactivateOutcomeDefinition(input.id);
        return { success: true };
      }),
    /**
     * Get patient outcomes
     */
    getPatientOutcomes: protectedProcedure
      .input(z.object({
        patientId: z.number(),
      }))
      .query(async ({ input }) => {
        const outcomes = await db.getPatientOutcomes(input.patientId);
        return outcomes;
      }),
  }),

  /**
   * COLLABORATION ROUTER
   * Real-time collaboration for multi-physician case consultations
   */
  collaboration: router({
    /**
     * Join a clinical session as a participant
     */
    joinSession: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        role: z.enum(['owner', 'consultant', 'observer']).default('consultant'),
      }))
      .mutation(async ({ input, ctx }) => {
        const participantData = {
          sessionId: input.sessionId,
          physicianId: ctx.user.id,
          role: input.role,
          joinedAt: new Date(),
          lastActiveAt: new Date(),
          status: 'active' as const,
        };
        const result = await db.addSessionParticipant(participantData);
        
        // Log activity
        await db.logSessionActivity({
          sessionId: input.sessionId,
          physicianId: ctx.user.id,
          activityType: 'joined',
          activityData: { role: input.role },
          createdAt: new Date(),
        });
        
        return result;
      }),

    /**
     * Leave a clinical session
     */
    leaveSession: protectedProcedure
      .input(z.object({
        participantId: z.number(),
        sessionId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.removeSessionParticipant(input.participantId);
        
        // Log activity
        await db.logSessionActivity({
          sessionId: input.sessionId,
          physicianId: ctx.user.id,
          activityType: 'left',
          activityData: {},
          createdAt: new Date(),
        });
        
        return result;
      }),

    /**
     * Update participant activity (heartbeat for presence)
     */
    updatePresence: protectedProcedure
      .input(z.object({
        participantId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.updateParticipantActivity(input.participantId);
        return result;
      }),

    /**
     * Get all participants for a session
     */
    getParticipants: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
      }))
      .query(async ({ input }) => {
        const participants = await db.getSessionParticipants(input.sessionId);
        return participants;
      }),

    /**
     * Get active participants (online now)
     */
    getActiveParticipants: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
      }))
      .query(async ({ input }) => {
        const participants = await db.getActiveParticipants(input.sessionId);
        return participants;
      }),

    /**
     * Add a comment to a session
     */
    addComment: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        commentText: z.string(),
        commentType: z.enum(['general', 'diagnosis', 'treatment', 'recommendation']).default('general'),
        replyToId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const commentData = {
          sessionId: input.sessionId,
          physicianId: ctx.user.id,
          commentText: input.commentText,
          commentType: input.commentType,
          replyToId: input.replyToId,
          createdAt: new Date(),
          updatedAt: new Date(),
          isEdited: false,
        };
        const result = await db.addSessionComment(commentData);
        
        // Log activity
        await db.logSessionActivity({
          sessionId: input.sessionId,
          physicianId: ctx.user.id,
          activityType: 'commented',
          activityData: { commentType: input.commentType },
          createdAt: new Date(),
        });
        
        return result;
      }),

    /**
     * Get all comments for a session
     */
    getComments: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
      }))
      .query(async ({ input }) => {
        const comments = await db.getSessionComments(input.sessionId);
        return comments;
      }),

    /**
     * Update a comment
     */
    updateComment: protectedProcedure
      .input(z.object({
        commentId: z.number(),
        commentText: z.string(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.updateSessionComment(input.commentId, input.commentText);
        return result;
      }),

    /**
     * Delete a comment
     */
    deleteComment: protectedProcedure
      .input(z.object({
        commentId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const result = await db.deleteSessionComment(input.commentId);
        return result;
      }),

    /**
     * Get activity feed for a session
     */
    getActivity: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        limit: z.number().default(50),
      }))
      .query(async ({ input }) => {
        const activities = await db.getSessionActivity(input.sessionId, input.limit);
        return activities;
      }),
  }),

  /**
   * Delphi Simulator - Treatment scenario exploration with LLM-powered patient simulation
   */
  delphiSimulator: router({    
    /**
     * Generate treatment scenarios for a clinical session
     */
    generateScenarios: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        diagnosisCode: z.string(),
        numScenarios: z.number().default(3),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get session and patient data
        const session = await db.getClinicalSessionById(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
        }

        const patient = await db.getPatientById(session.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Patient not found' });
        }

        // Get diagnoses for context
        const diagnoses = await db.getDiagnosisEntriesBySession(input.sessionId);
        const primaryDiagnosis = diagnoses.find(d => d.diagnosisCode === input.diagnosisCode);
        if (!primaryDiagnosis) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Diagnosis not found' });
        }

        // Get treatment recommendations from Causal Brain
        const recommendations = await db.getTreatmentRecommendationsBySession(input.sessionId);

        const patientAge = Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));

        // ── Template-first strategy ──────────────────────────────────────────
        // Check delphi_scenario_templates before calling LLM.
        // If verified templates exist for this diagnosis + age, use them directly.
        // This eliminates cold-start LLM generation for common archetypes.
        const matchingTemplates = await db.getDelphiTemplatesByDiagnosis(
          input.diagnosisCode,
          patientAge
        );
        const verifiedTemplates = matchingTemplates.filter((t: any) => t.isVerified);

        if (verifiedTemplates.length >= input.numScenarios) {
          // Enough verified templates — skip LLM entirely
          const selectedTemplates = verifiedTemplates.slice(0, input.numScenarios);
          const scenarioIds: number[] = [];
          const scenariosFromTemplates: any[] = [];

          for (const template of selectedTemplates) {
            const firstOption = (template.treatmentOptions as any[])[0];
            const scenarioId = await db.createSimulationScenario({
              sessionId: input.sessionId,
              physicianId: ctx.user.id,
              patientId: patient.id,
              scenarioName: template.templateName,
              diagnosisCode: input.diagnosisCode,
              treatmentCode: firstOption?.treatmentCode ?? 'TEMPLATE',
              treatmentDescription: template.description,
              patientAge,
              patientGender: patient.gender,
              comorbidities: patient.chronicConditions || [],
              currentMedications: patient.currentMedications || [],
              allergies: patient.allergies || [],
              timeHorizon: 30,
              simulationGoal: template.clinicalContext ?? template.description,
              status: 'draft',
            });
            scenarioIds.push(scenarioId);
            scenariosFromTemplates.push({
              name: template.templateName,
              treatmentCode: firstOption?.treatmentCode ?? 'TEMPLATE',
              treatmentDescription: template.description,
              timeHorizon: 30,
              goal: template.clinicalContext ?? template.description,
              fromTemplate: true,
              templateId: template.id,
            });
            // Increment usage count (fire-and-forget)
            db.updateDelphiTemplateUsage(template.id, true).catch(() => {});
          }

          return { scenarioIds, scenarios: scenariosFromTemplates, source: 'template' };
        }
        // ── End template-first strategy ──────────────────────────────────────

        // Generate scenarios using LLM
        const scenarioPrompt = `You are a medical AI assistant helping physicians explore treatment scenarios.

Patient Context:
- Age: ${Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} years
- Gender: ${patient.gender}
- Allergies: ${patient.allergies?.join(', ') || 'None'}
- Chronic Conditions: ${patient.chronicConditions?.join(', ') || 'None'}
- Current Medications: ${patient.currentMedications?.join(', ') || 'None'}

Diagnosis:
- Code: ${primaryDiagnosis.diagnosisCode}
- Description: ${primaryDiagnosis.diagnosisName}
- Severity: ${primaryDiagnosis.severity}
- Symptoms: ${primaryDiagnosis.symptoms?.join(', ')}

Generate ${input.numScenarios} distinct treatment scenarios for this diagnosis. Each scenario should:
1. Use a different treatment approach (medication, procedure, lifestyle intervention, combination)
2. Include specific treatment details (drug names, dosages, procedures)
3. Consider patient-specific factors (age, comorbidities, allergies)
4. Provide realistic time horizons (7-90 days)

Return scenarios as a JSON array.`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'You are a medical AI assistant specializing in treatment planning.' },
            { role: 'user', content: scenarioPrompt }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'treatment_scenarios',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  scenarios: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        treatmentCode: { type: 'string' },
                        treatmentDescription: { type: 'string' },
                        timeHorizon: { type: 'number' },
                        goal: { type: 'string' },
                      },
                      required: ['name', 'treatmentCode', 'treatmentDescription', 'timeHorizon', 'goal'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['scenarios'],
                additionalProperties: false
              }
            }
          }
        });

        const content = response.choices[0].message.content;
        const result = JSON.parse(typeof content === 'string' ? content : '{}');
        const scenarios = result.scenarios || [];

        // Create scenario records in database
        const scenarioIds = [];
        for (const scenario of scenarios) {
          const scenarioId = await db.createSimulationScenario({
            sessionId: input.sessionId,
            physicianId: ctx.user.id,
            patientId: patient.id,
            scenarioName: scenario.name,
            diagnosisCode: input.diagnosisCode,
            treatmentCode: scenario.treatmentCode,
            treatmentDescription: scenario.treatmentDescription,
            patientAge: Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)),
            patientGender: patient.gender,
            comorbidities: patient.chronicConditions || [],
            currentMedications: patient.currentMedications || [],
            allergies: patient.allergies || [],
            timeHorizon: scenario.timeHorizon,
            simulationGoal: scenario.goal,
            status: 'draft',
          });
          scenarioIds.push(scenarioId);
        }

        return { scenarioIds, scenarios };
      }),

    /**
     * Get scenarios for a session
     */
    getScenarios: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
      }))
      .query(async ({ input }) => {
        const scenarios = await db.getScenariosBySession(input.sessionId);
        return scenarios;
      }),

    /**
     * Simulate patient response to physician's question/action
     */
    simulatePatientResponse: protectedProcedure
      .input(z.object({
        scenarioId: z.number(),
        physicianMessage: z.string(),
        dayInSimulation: z.number().default(1),
      }))
      .mutation(async ({ input }) => {
        // Get scenario details
        const scenario = await db.getScenarioById(input.scenarioId);
        if (!scenario) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Scenario not found' });
        }

        // Get patient details
        const patient = await db.getPatientById(scenario.patientId);
        if (!patient) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Patient not found' });
        }

        // Get conversation history
        const interactions = await db.getScenarioInteractions(input.scenarioId);
        const conversationHistory = interactions.map(i => ({
          role: i.role === 'physician' ? ('user' as const) : ('assistant' as const),
          content: i.message
        }));

        // Generate patient response using LLM
        const systemPrompt = `You are simulating a virtual patient in a medical scenario exploration.

Patient Profile:
- Age: ${scenario.patientAge} years
- Gender: ${scenario.patientGender}
- Diagnosis: ${scenario.diagnosisCode}
- Treatment: ${scenario.treatmentDescription}
- Allergies: ${scenario.allergies?.join(', ') || 'None'}
- Chronic Conditions: ${scenario.comorbidities?.join(', ') || 'None'}
- Current Medications: ${scenario.currentMedications?.join(', ') || 'None'}

Simulation Context:
- Day ${input.dayInSimulation} of treatment (out of ${scenario.timeHorizon} days)
- Goal: ${scenario.simulationGoal}

You are role-playing as this patient. Respond naturally to the physician's questions and actions.
Be realistic about symptoms, side effects, and treatment adherence.
If the physician asks about symptoms, describe them based on typical progression for this treatment.
If asked about medication adherence, be honest (patients sometimes forget or skip doses).
Show appropriate emotional responses (concern, relief, frustration) based on the situation.`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory,
            { role: 'user', content: input.physicianMessage }
          ]
        });

        const responseContent = response.choices[0].message.content;
        const patientResponse = typeof responseContent === 'string' ? responseContent : '';

        // Save interactions
        await db.addScenarioInteraction({
          scenarioId: input.scenarioId,
          role: 'physician',
          message: input.physicianMessage,
          dayInSimulation: input.dayInSimulation,
          interactionType: 'question',
        });

        await db.addScenarioInteraction({
          scenarioId: input.scenarioId,
          role: 'patient',
          message: patientResponse,
          dayInSimulation: input.dayInSimulation,
          interactionType: 'response',
        });

        // Update scenario status
        await db.updateScenarioStatus(input.scenarioId, 'running');

        return { patientResponse };
      }),

    /**
     * Get conversation history for a scenario
     */
    getConversation: protectedProcedure
      .input(z.object({
        scenarioId: z.number(),
      }))
      .query(async ({ input }) => {
        const interactions = await db.getScenarioInteractions(input.scenarioId);
        return interactions;
      }),

    /**
     * Predict outcomes for a scenario
     */
    predictOutcomes: protectedProcedure
      .input(z.object({
        scenarioId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Get scenario details
        const scenario = await db.getScenarioById(input.scenarioId);
        if (!scenario) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Scenario not found' });
        }

        // Get conversation history for context
        const interactions = await db.getScenarioInteractions(input.scenarioId);

        // Generate outcome predictions using LLM
        const outcomePrompt = `Based on this treatment scenario, predict likely outcomes:

Treatment: ${scenario.treatmentDescription}
Patient Age: ${scenario.patientAge}
Gender: ${scenario.patientGender}
Comorbidities: ${scenario.comorbidities?.join(', ') || 'None'}
Time Horizon: ${scenario.timeHorizon} days

Conversation Summary:
${interactions.slice(-5).map(i => `${i.role}: ${i.message}`).join('\n')}

Predict 3-5 possible outcomes with:
1. Outcome type (symptom_improvement, adverse_event, treatment_success, etc.)
2. Probability (0-100%)
3. Severity (mild, moderate, severe, critical)
4. Expected day when this might occur
5. Evidence source or reasoning
6. Confidence score (0-100%)`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'You are a medical AI assistant predicting treatment outcomes based on evidence.' },
            { role: 'user', content: outcomePrompt }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'outcome_predictions',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  outcomes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        outcomeType: { type: 'string' },
                        probability: { type: 'number' },
                        severity: { type: 'string', enum: ['mild', 'moderate', 'severe', 'critical'] },
                        expectedDay: { type: 'number' },
                        evidenceSource: { type: 'string' },
                        confidenceScore: { type: 'number' },
                        description: { type: 'string' },
                      },
                      required: ['outcomeType', 'probability', 'severity', 'expectedDay', 'evidenceSource', 'confidenceScore', 'description'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['outcomes'],
                additionalProperties: false
              }
            }
          }
        });

        const outcomeContent = response.choices[0].message.content;
        const result = JSON.parse(typeof outcomeContent === 'string' ? outcomeContent : '{}');
        const outcomes = result.outcomes || [];

        // Save outcomes to database
        for (const outcome of outcomes) {
          await db.addScenarioOutcome({
            scenarioId: input.scenarioId,
            outcomeType: outcome.outcomeType,
            probability: outcome.probability.toString(),
            severity: outcome.severity as 'mild' | 'moderate' | 'severe' | 'critical',
            expectedDay: outcome.expectedDay,
            evidenceSource: outcome.evidenceSource,
            confidenceScore: outcome.confidenceScore.toString(),
            description: outcome.description,
          });
        }

        return { outcomes };
      }),

    /**
     * Get predicted outcomes for a scenario
     */
    getOutcomes: protectedProcedure
      .input(z.object({
        scenarioId: z.number(),
      }))
      .query(async ({ input }) => {
        const outcomes = await db.getScenarioOutcomes(input.scenarioId);
        return outcomes;
      }),

    /**
     * Compare multiple scenarios side-by-side
     */
    compareScenarios: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        scenarioIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get all scenarios
        const scenarios = await Promise.all(
          input.scenarioIds.map(id => db.getScenarioById(id))
        );

        // Get outcomes for each scenario
        const scenarioOutcomes = await Promise.all(
          input.scenarioIds.map(id => db.getScenarioOutcomes(id))
        );

        // Build comparison prompt
        const comparisonData = scenarios.map((scenario, idx) => {
          if (!scenario) return null;
          const outcomes = scenarioOutcomes[idx];
          return {
            id: scenario.id,
            name: scenario.scenarioName,
            treatment: scenario.treatmentDescription,
            outcomes: outcomes.map(o => ({
              type: o.outcomeType,
              probability: parseFloat(o.probability),
              severity: o.severity,
            }))
          };
        }).filter(Boolean);

        const comparisonPrompt = `Compare these treatment scenarios and rank them:

${comparisonData.map((s, i) => `
Scenario ${i + 1}: ${s?.name}
Treatment: ${s?.treatment}
Outcomes:
${s?.outcomes.map(o => `- ${o.type} (${o.probability}% probability, ${o.severity} severity)`).join('\n')}`).join('\n')}

Rank these scenarios from best to worst, considering:
1. Efficacy (likelihood of symptom improvement)
2. Safety (risk of adverse events)
3. Patient-specific factors
4. Evidence quality

Provide a score (0-100) and reasoning for each scenario.`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'You are a medical AI assistant comparing treatment scenarios.' },
            { role: 'user', content: comparisonPrompt }
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'scenario_comparison',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  ranking: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        scenarioId: { type: 'number' },
                        score: { type: 'number' },
                        reasoning: { type: 'string' },
                      },
                      required: ['scenarioId', 'score', 'reasoning'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['ranking'],
                additionalProperties: false
              }
            }
          }
        });

        const comparisonContent = response.choices[0].message.content;
        const result = JSON.parse(typeof comparisonContent === 'string' ? comparisonContent : '{}');

        // Save comparison
        const comparisonId = await db.createScenarioComparison({
          sessionId: input.sessionId,
          physicianId: ctx.user.id,
          scenarioIds: input.scenarioIds,
          ranking: result.ranking,
        });

        return { comparisonId, ranking: result.ranking };
      }),

    /**
     * Select a scenario as the chosen treatment plan
     */
    selectScenario: protectedProcedure
      .input(z.object({
        comparisonId: z.number(),
        scenarioId: z.number(),
        physicianNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateScenarioComparison(input.comparisonId, {
          selectedScenarioId: input.scenarioId,
          physicianNotes: input.physicianNotes,
        });

        // Mark scenario as completed
        await db.updateScenarioStatus(input.scenarioId, 'completed');

        return { success: true };
      }),

    /**
     * Get scenario comparisons for a session
     */
    getComparisons: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
      }))
      .query(async ({ input }) => {
        const comparisons = await db.getScenarioComparisons(input.sessionId);
        return comparisons;
      }),

    /**
     * Submit feedback for a virtual patient interaction
     */
    submitInteractionFeedback: protectedProcedure
      .input(z.object({
        interactionId: z.number(),
        scenarioId: z.number(),
        realismScore: z.number().min(1).max(5),
        clinicalAccuracy: z.number().min(1).max(5),
        conversationalQuality: z.number().min(1).max(5),
        comments: z.string().optional(),
        issuesReported: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const feedbackId = await db.submitInteractionFeedback({
          ...input,
          physicianId: ctx.user.id,
        });
        return { success: true, feedbackId };
      }),

    /**
     * Submit feedback for an outcome prediction
     */
    submitOutcomeFeedback: protectedProcedure
      .input(z.object({
        outcomeId: z.number(),
        scenarioId: z.number(),
        accuracyScore: z.number().min(1).max(5),
        evidenceQuality: z.number().min(1).max(5),
        clinicalRelevance: z.number().min(1).max(5),
        actualOutcomeOccurred: z.enum(['yes', 'no', 'partially', 'unknown']).optional(),
        actualProbability: z.string().optional(),
        actualSeverity: z.enum(['mild', 'moderate', 'severe', 'critical']).optional(),
        comments: z.string().optional(),
        suggestedImprovements: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const feedbackId = await db.submitOutcomeFeedback({
          ...input,
          physicianId: ctx.user.id,
        });
        return { success: true, feedbackId };
      }),

    /**
     * Get interaction feedback for a scenario
     */
    getInteractionFeedback: protectedProcedure
      .input(z.object({
        scenarioId: z.number(),
      }))
      .query(async ({ input }) => {
        const feedback = await db.getScenarioInteractionFeedback(input.scenarioId);
        return feedback;
      }),

    /**
     * Get outcome feedback for a scenario
     */
    getOutcomeFeedback: protectedProcedure
      .input(z.object({
        scenarioId: z.number(),
      }))
      .query(async ({ input }) => {
        const feedback = await db.getScenarioOutcomeFeedback(input.scenarioId);
        return feedback;
      }),

    /**
     * Get feedback analytics for continuous improvement
     */
    getFeedbackAnalytics: protectedProcedure
      .input(z.object({
        physicianId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const analytics = await db.getFeedbackAnalytics(input.physicianId);
        return analytics;
      }),

    /**
     * Get peer comparison analytics
     */
    getPeerComparison: protectedProcedure
      .query(async ({ ctx }) => {
        const comparison = await db.getPeerComparisonAnalytics(ctx.user.id);
        return comparison;
      }),

    /**
     * Get feedback distribution across all physicians
     */
    getFeedbackDistribution: protectedProcedure
      .query(async () => {
        const distribution = await db.getFeedbackDistribution();
        return distribution;
      }),
  }),

  /**
   * Risk Predictions - Delphi-2M integration for prediction → exploration workflow
   */
  riskPredictions: router({
    /**
     * Aggregate patient data for Delphi-2M risk prediction
     * Compiles lifestyle, family history, biomarkers, and clinical data
     */
    aggregatePatientData: protectedProcedure
      .input(z.object({
        patientId: z.number(),
      }))
      .query(async ({ input }) => {
        // Get lifestyle assessment
        const lifestyleData = await db.getLatestLifestyleAssessment(input.patientId);
        
        // Get family history
        const familyHistory = await db.getFamilyHistoriesByPatient(input.patientId);
        
        // Get biomarkers
        const biomarkers = await db.getBiomarkersByPatient(input.patientId);
        
        // Get clinical sessions for medical history
        const clinicalSessions = await db.getClinicalSessionsByPatient(input.patientId);
        
        // Calculate risk factors from data
        const riskFactors = {
          // Lifestyle risk factors
          smoking: lifestyleData?.smokingStatus === 'current',
          heavyAlcohol: lifestyleData?.alcoholConsumption === 'heavy',
          sedentary: lifestyleData?.exerciseFrequency === 'sedentary',
          poorDiet: lifestyleData?.dietQuality === 'poor',
          inadequateSleep: lifestyleData?.sleepHoursPerNight ? parseFloat(lifestyleData.sleepHoursPerNight) < 6 : false,
          highStress: lifestyleData?.stressLevel === 'high' || lifestyleData?.stressLevel === 'severe',
          
          // Family history risk factors
          familyHistoryDiabetes: familyHistory?.some((h: any) => h.condition.toLowerCase().includes('diabetes')),
          familyHistoryHeartDisease: familyHistory?.some((h: any) => 
            h.condition.toLowerCase().includes('heart') || 
            h.condition.toLowerCase().includes('cardiac') ||
            h.condition.toLowerCase().includes('coronary')
          ),
          familyHistoryCancer: familyHistory?.some((h: any) => h.condition.toLowerCase().includes('cancer')),
          familyHistoryStroke: familyHistory?.some((h: any) => h.condition.toLowerCase().includes('stroke')),
          
          // Biomarker risk factors
          highCholesterol: biomarkers?.some((b: any) => 
            b.biomarkerType === 'total_cholesterol' && parseFloat(b.value) > 200
          ),
          highBloodPressure: biomarkers?.some((b: any) => 
            b.biomarkerType === 'blood_pressure_systolic' && parseFloat(b.value) > 130
          ),
          highGlucose: biomarkers?.some((b: any) => 
            (b.biomarkerType === 'glucose_fasting' && parseFloat(b.value) > 100) ||
            (b.biomarkerType === 'hba1c' && parseFloat(b.value) > 5.7)
          ),
          obesity: biomarkers?.some((b: any) => 
            b.biomarkerType === 'bmi' && parseFloat(b.value) > 30
          ),
        };
        
        // Calculate overall risk score (0-100)
        const riskScore = Object.values(riskFactors).filter(Boolean).length * 5;
        
        return {
          patientId: input.patientId,
          lifestyleData,
          familyHistory,
          biomarkers: biomarkers?.slice(0, 50), // Latest 50 biomarkers
          clinicalHistory: clinicalSessions?.slice(0, 20), // Latest 20 sessions
          riskFactors,
          riskScore,
          dataCompleteness: {
            hasLifestyleData: !!lifestyleData,
            hasFamilyHistory: (familyHistory?.length || 0) > 0,
            hasBiomarkers: (biomarkers?.length || 0) > 0,
            hasClinicalHistory: (clinicalSessions?.length || 0) > 0,
          },
        };
      }),

    /**
     * Import risk predictions (simulated Delphi-2M data)
     */
    importPredictions: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        predictions: z.array(z.object({
          diseaseCode: z.string(),
          diseaseName: z.string(),
          diseaseCategory: z.string().optional(),
          riskProbability: z.number().min(0).max(1),
          riskLevel: z.enum(['low', 'moderate', 'high', 'very_high']),
          timeHorizon: z.number(),
          confidenceScore: z.number().optional(),
          inputFeatures: z.any().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const predictionIds = [];
        
        for (const pred of input.predictions) {
          const predictionId = await db.createRiskPrediction({
            patientId: input.patientId,
            physicianId: ctx.user.id,
            diseaseCode: pred.diseaseCode,
            diseaseName: pred.diseaseName,
            diseaseCategory: pred.diseaseCategory,
            riskProbability: pred.riskProbability.toString(),
            riskLevel: pred.riskLevel,
            timeHorizon: pred.timeHorizon,
            confidenceScore: pred.confidenceScore?.toString(),
            predictionSource: 'Delphi-2M',
            inputFeatures: pred.inputFeatures,
            actionTaken: 'pending',
          });
          
          predictionIds.push(predictionId);
        }
        
        return { success: true, predictionIds };
      }),

    /**
     * Get risk predictions for a patient
     */
    getPatientPredictions: protectedProcedure
      .input(z.object({
        patientId: z.number(),
      }))
      .query(async ({ input }) => {
        const predictions = await db.getRiskPredictionsByPatient(input.patientId);
        return predictions;
      }),

    /**
     * Get high-risk predictions for a patient
     */
    getHighRiskPredictions: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        riskThreshold: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const predictions = await db.getHighRiskPredictions(
          input.patientId,
          input.riskThreshold
        );
        return predictions;
      }),

    /**
     * Get pending risk predictions for physician
     */
    getPendingPredictions: protectedProcedure
      .query(async ({ ctx }) => {
        const predictions = await db.getPendingRiskPredictions(ctx.user.id);
        return predictions;
      }),

    /**
     * Generate Delphi Simulator scenario from risk prediction
     */
    exploreRiskPrediction: protectedProcedure
      .input(z.object({
        predictionId: z.number(),
        sessionId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Get risk prediction
        const prediction = await db.getRiskPredictionById(input.predictionId);
        if (!prediction) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Risk prediction not found',
          });
        }
        
        // Get patient data
        const patient = await db.getPatientById(prediction.patientId);
        if (!patient) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Patient not found',
          });
        }
        
        // Generate preventive treatment scenarios using LLM
        const prompt = `You are a clinical AI assistant helping physicians explore preventive treatment options.

Patient Context:
- Age: ${patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'}
- Gender: ${patient.gender}
- Medical History: ${patient.chronicConditions?.join(', ') || 'None documented'}
- Current Medications: ${patient.currentMedications?.join(', ') || 'None'}

Risk Prediction:
- Disease: ${prediction.diseaseName} (${prediction.diseaseCode})
- Risk Level: ${prediction.riskLevel}
- Risk Probability: ${(Number(prediction.riskProbability) * 100).toFixed(1)}%
- Time Horizon: ${prediction.timeHorizon} years
- Category: ${prediction.diseaseCategory || 'Unknown'}

Task: Generate 3-5 evidence-based preventive treatment scenarios to reduce the risk of developing ${prediction.diseaseName}. For each scenario, provide:
1. Scenario name (brief, descriptive)
2. Treatment approach (lifestyle, medication, monitoring, or combination)
3. Description of interventions
4. Expected risk reduction
5. Implementation timeline
6. Potential barriers

Return ONLY valid JSON in this exact format:
{
  "scenarios": [
    {
      "name": "string",
      "treatmentCode": "string (CPT or intervention code)",
      "description": "string",
      "expectedRiskReduction": "string (e.g., '20-30% reduction')",
      "timeline": "string",
      "barriers": "string"
    }
  ]
}`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'You are a clinical AI assistant. Always respond with valid JSON only.' },
            { role: 'user', content: prompt },
          ],
        });
        
        const content = response.choices[0]?.message?.content;
        if (!content || typeof content !== 'string') {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Invalid LLM response format',
          });
        }
        
        let scenarios;
        try {
          scenarios = JSON.parse(content).scenarios || [];
        } catch (e) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to parse LLM response',
          });
        }
        
        // Create simulation scenarios
        const scenarioIds = [];
        for (const scenario of scenarios.slice(0, 5)) {
          const scenarioId = await db.createSimulationScenario({
            sessionId: input.sessionId,
            physicianId: ctx.user.id,
            patientId: prediction.patientId,
            scenarioName: scenario.name,
            diagnosisCode: prediction.diseaseCode,
            treatmentCode: scenario.treatmentCode || 'PREV-001',
            treatmentDescription: scenario.description,
            patientAge: patient.dateOfBirth ? Math.floor((Date.now() - new Date(patient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
            patientGender: patient.gender,
            timeHorizon: prediction.timeHorizon * 365, // Convert years to days
            simulationGoal: `Prevent ${prediction.diseaseName} through ${scenario.name}`,
            status: 'draft',
          });
          
          scenarioIds.push(scenarioId);
        }
        
        // Update risk prediction with first scenario ID
        if (scenarioIds.length > 0) {
          await db.updateRiskPredictionAction(
            input.predictionId,
            'explored',
            scenarioIds[0]
          );
        }
        
        return {
          success: true,
          scenarioIds,
          scenarioCount: scenarioIds.length,
        };
      }),

    /**
     * Update risk prediction action status
     */
    updateAction: protectedProcedure
      .input(z.object({
        predictionId: z.number(),
        actionTaken: z.enum(['explored', 'monitored', 'dismissed', 'pending']),
        clinicalNotes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateRiskPredictionAction(input.predictionId, input.actionTaken);
        
        // Update clinical notes if provided
        if (input.clinicalNotes) {
          // Note: Would need to add updateRiskPredictionNotes helper
          // For now, this is a placeholder
        }
        
        return { success: true };
      }),

    /**
     * Get risk prediction statistics
     */
    getStats: protectedProcedure
      .query(async ({ ctx }) => {
        const stats = await db.getRiskPredictionStats(ctx.user.id);
        return stats;
      }),
  }),

  /**
   * Analytics router for dashboard metrics
   */
  analytics: router({
    /**
     * Get recommendation accuracy metrics
     */
    getRecommendationAccuracy: protectedProcedure
      .input(z.object({
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        const metrics = await db.getRecommendationAccuracyMetrics(input);
        return metrics;
      }),

    /**
     * Get collaboration metrics
     */
    getCollaborationMetrics: protectedProcedure
      .input(z.object({
        physicianId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        const metrics = await db.getCollaborationMetrics(input);
        return metrics;
      }),

    /**
     * Get policy learning metrics
     */
    getPolicyLearningMetrics: protectedProcedure
      .input(z.object({
        diagnosisCode: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        const metrics = await db.getPolicyLearningMetrics(input);
        return metrics;
      }),

    /**
     * Get outcome metrics
     */
    getOutcomeMetrics: protectedProcedure
      .input(z.object({
        physicianId: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        const metrics = await db.getOutcomeMetrics(input);
        return metrics;
      }),

    /**
     * Get recommendation trends over time
     */
    getRecommendationTrends: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        interval: z.enum(['day', 'week', 'month']),
      }))
      .query(async ({ input }) => {
        const trends = await db.getRecommendationTrends(input);
        return trends;
      }),

    /**
     * Get collaboration trends over time
     */
    getCollaborationTrends: protectedProcedure
      .input(z.object({
        startDate: z.date(),
        endDate: z.date(),
        interval: z.enum(['day', 'week', 'month']),
      }))
      .query(async ({ input }) => {
        const trends = await db.getCollaborationTrends(input);
        return trends;
      }),
  }),

  /**
   * Enhanced DAO Protocol - Lifestyle, Family History, Biomarkers
   */
  enhancedDAO: router({    
    // ============ Lifestyle Assessment ============
    createLifestyleAssessment: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        assessmentDate: z.date(),
        smokingStatus: z.enum(['never', 'former', 'current']),
        cigarettesPerDay: z.number().optional(),
        yearsSmoked: z.number().optional(),
        quitDate: z.date().optional(),
        alcoholConsumption: z.enum(['none', 'occasional', 'moderate', 'heavy']),
        drinksPerWeek: z.number().optional(),
        bingeDrinking: z.boolean().optional(),
        exerciseFrequency: z.enum(['sedentary', 'light', 'moderate', 'vigorous']),
        minutesPerWeek: z.number().optional(),
        exerciseTypes: z.array(z.string()).optional(),
        dietQuality: z.enum(['poor', 'fair', 'good', 'excellent']),
        fruitsVegetablesPerDay: z.number().optional(),
        fastFoodFrequency: z.enum(['never', 'rarely', 'weekly', 'daily']).optional(),
        sodaConsumption: z.enum(['none', 'occasional', 'daily', 'multiple_daily']).optional(),
        sleepHoursPerNight: z.string().optional(),
        sleepQuality: z.enum(['poor', 'fair', 'good', 'excellent']),
        sleepDisorders: z.array(z.string()).optional(),
        stressLevel: z.enum(['low', 'moderate', 'high', 'severe']),
        mentalHealthConditions: z.array(z.string()).optional(),
        occupationalHazards: z.array(z.string()).optional(),
        environmentalExposures: z.array(z.string()).optional(),
        additionalNotes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const assessmentId = await db.createLifestyleAssessment({
          ...input,
          assessedBy: ctx.user.id,
        });
        return { assessmentId };
      }),

    getLifestyleAssessments: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLifestyleAssessmentsByPatient(input.patientId);
      }),

    getLatestLifestyleAssessment: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getLatestLifestyleAssessment(input.patientId);
      }),

    updateLifestyleAssessment: protectedProcedure
      .input(z.object({
        assessmentId: z.number(),
        data: z.object({
          smokingStatus: z.enum(['never', 'former', 'current']).optional(),
          cigarettesPerDay: z.number().optional(),
          alcoholConsumption: z.enum(['none', 'occasional', 'moderate', 'heavy']).optional(),
          exerciseFrequency: z.enum(['sedentary', 'light', 'moderate', 'vigorous']).optional(),
          dietQuality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
          sleepQuality: z.enum(['poor', 'fair', 'good', 'excellent']).optional(),
          stressLevel: z.enum(['low', 'moderate', 'high', 'severe']).optional(),
          additionalNotes: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateLifestyleAssessment(input.assessmentId, input.data);
        return { success: true };
      }),

    deleteLifestyleAssessment: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteLifestyleAssessment(input.assessmentId);
        return { success: true };
      }),

    // ============ Family History ============
    createFamilyHistory: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        relationship: z.enum([
          'mother', 'father', 'sister', 'brother',
          'maternal_grandmother', 'maternal_grandfather',
          'paternal_grandmother', 'paternal_grandfather',
          'maternal_aunt', 'maternal_uncle',
          'paternal_aunt', 'paternal_uncle',
          'daughter', 'son', 'other'
        ]),
        relationshipOther: z.string().optional(),
        condition: z.string(),
        icdCode: z.string().optional(),
        ageAtDiagnosis: z.number().optional(),
        currentAge: z.number().optional(),
        ageAtDeath: z.number().optional(),
        causeOfDeath: z.string().optional(),
        isAlive: z.boolean().optional(),
        isConfirmed: z.boolean().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const historyId = await db.createFamilyHistory({
          ...input,
          recordedBy: ctx.user.id,
          recordedAt: new Date(),
        });
        return { historyId };
      }),

    getFamilyHistories: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFamilyHistoriesByPatient(input.patientId);
      }),

    getFamilyHistoriesByCondition: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        condition: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getFamilyHistoriesByCondition(input.patientId, input.condition);
      }),

    updateFamilyHistory: protectedProcedure
      .input(z.object({
        historyId: z.number(),
        data: z.object({
          condition: z.string().optional(),
          ageAtDiagnosis: z.number().optional(),
          currentAge: z.number().optional(),
          isAlive: z.boolean().optional(),
          isConfirmed: z.boolean().optional(),
          notes: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateFamilyHistory(input.historyId, input.data);
        return { success: true };
      }),

    deleteFamilyHistory: protectedProcedure
      .input(z.object({ historyId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFamilyHistory(input.historyId);
        return { success: true };
      }),

    // ============ Biomarkers ============
    createBiomarker: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        measurementDate: z.date(),
        biomarkerType: z.enum(['blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate', 'temperature', 'respiratory_rate', 'oxygen_saturation', 'weight', 'height', 'bmi', 'waist_circumference', 'total_cholesterol', 'ldl_cholesterol', 'hdl_cholesterol', 'triglycerides', 'glucose_fasting', 'glucose_random', 'hba1c', 'insulin', 'creatinine', 'bun', 'egfr', 'alt', 'ast', 'alkaline_phosphatase', 'bilirubin', 'tsh', 't3', 't4', 'crp', 'esr', 'wbc', 'rbc', 'hemoglobin', 'hematocrit', 'platelets', 'vitamin_d', 'b12', 'psa', 'other']),
        biomarkerName: z.string().optional(),
        value: z.string(),
        unit: z.string(),
        referenceRangeLow: z.string().optional(),
        referenceRangeHigh: z.string().optional(),
        isAbnormal: z.boolean().optional(),
        source: z.enum(['lab_test', 'vital_signs', 'home_monitoring', 'wearable_device']),
        labOrderId: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const biomarkerId = await db.createBiomarker({
          ...input,
          enteredBy: ctx.user.id,
        });
        return { biomarkerId };
      }),

    getBiomarkers: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getBiomarkersByPatient(input.patientId);
      }),

    getBiomarkersByType: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        biomarkerType: z.string(),
      }))
      .query(async ({ input }) => {
        return await db.getBiomarkersByType(input.patientId, input.biomarkerType);
      }),

    getAbnormalBiomarkers: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAbnormalBiomarkers(input.patientId);
      }),

    getBiomarkerTrends: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        biomarkerType: z.string(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getBiomarkerTrends(
          input.patientId,
          input.biomarkerType,
          input.limit
        );
      }),

    updateBiomarker: protectedProcedure
      .input(z.object({
        biomarkerId: z.number(),
        data: z.object({
          value: z.string().optional(),
          isAbnormal: z.boolean().optional(),
          notes: z.string().optional(),
        }),
      }))
      .mutation(async ({ input }) => {
        await db.updateBiomarker(input.biomarkerId, input.data);
        return { success: true };
      }),

    deleteBiomarker: protectedProcedure
      .input(z.object({ biomarkerId: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteBiomarker(input.biomarkerId);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;

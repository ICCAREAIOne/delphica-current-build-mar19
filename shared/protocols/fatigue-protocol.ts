/**
 * Fatigue Evaluation and Management Protocol
 * Evidence-based protocol for comprehensive fatigue assessment and treatment
 * Source: American Family Physician, Deutsches Arzteblatt International
 */

export const fatigueProtocol = {
  id: "fatigue-eval-mgmt",
  title: "Fatigue Evaluation and Management Protocol",
  category: "diagnostic",
  condition: "Fatigue",
  specialty: "Primary Care",
  summary: "Comprehensive evidence-based protocol for evaluating and managing patients presenting with persistent fatigue, including systematic assessment, differential diagnosis, and treatment strategies.",
  evidenceLevel: "A" as const,
  lastReviewed: "2023-12-01",
  viewCount: 0,
  isFavorite: false,
  
  sections: {
    initialAssessment: {
      title: "Initial Assessment",
      content: `
## History

### Key Clinical Questions

- **Onset, pattern, duration** of fatigue and changes over time
- **Associated or alleviating factors** and interference with daily function
- **Sleep quality and quantity** - Use validated screening tools:
  - STOP-BANG questionnaire for sleep apnea
  - Epworth Sleepiness Scale for daytime sleepiness
- **Mood assessment** using validated tools:
  - PHQ-9 for depression screening
  - GAD-7 for anxiety assessment
- **Substance use screening** (alcohol, medications, illicit drugs)
- **Complete medication review** to identify iatrogenic causes
- **Review of systems** targeting common causes:
  - Cardiopulmonary symptoms
  - Endocrine symptoms
  - Pain and weight changes
  - Neurologic symptoms
- **Psychosocial stressors** and occupational factors

### Physical Examination

- Comprehensive cardiopulmonary examination
- Neurologic examination
- Skin examination
- Thyroid palpation
- Lymph node examination
      `,
      evidenceLevel: "A",
      references: ["Latimer KM et al. AFP 2023", "Maisel P et al. Dtsch Arztebl Int 2021"]
    },
    
    laboratoryWorkup: {
      title: "Initial Laboratory Workup",
      content: `
## Guided Testing Approach

**Important:** The initial laboratory evaluation should be **guided by history and physical examination findings**. Indiscriminate testing is low-yield and changes management in only 5% of patients.

### Basic Screening Labs

Consider the following based on clinical presentation:

- **Complete blood count with differential** - Evaluate for anemia, infection
- **Comprehensive metabolic panel** - Renal function, electrolytes, liver function, glucose
- **Thyroid-stimulating hormone (TSH)** - Screen for thyroid dysfunction
- **Hemoglobin A1C** - If diabetes risk factors present
- **Urinalysis** - Screen for infection, kidney disease

### Additional Testing Based on Clinical Suspicion

- **Vitamin B12 and vitamin D levels** - If deficiency suspected
- **Erythrocyte sedimentation rate (ESR) or C-reactive protein (CRP)** - If inflammatory condition suspected
- **Creatine kinase** - If muscle symptoms present
- **Ferritin** - If anemia or iron deficiency suspected
- **HIV testing** - If risk factors present
- **Pregnancy test** - In women of childbearing age
      `,
      evidenceLevel: "A",
      references: ["Latimer KM et al. AFP 2023"]
    },
    
    differentialDiagnosis: {
      title: "Differential Diagnosis",
      content: `
## Most Common Causes (Primary Care)

The following account for the majority of persistent fatigue cases:

1. **Sleep disorders** (sleep apnea, insomnia, restless legs syndrome)
2. **Depression** (18.5% of cases)
3. **Psychosocial stress**
4. **Medication adverse effects**
5. **Anemia and other hematologic disorders**
6. **Thyroid dysfunction** (particularly in women)
7. **Chronic infections** (including post-viral syndromes)

## Less Common But Important Causes

### Cardiovascular
- Heart failure
- Arrhythmias

### Pulmonary
- COPD
- Interstitial lung disease

### Endocrine
- Diabetes mellitus
- Adrenal insufficiency
- Hypogonadism

### Other Systemic Conditions
- Chronic kidney disease
- **Malignancy** (0.6% of cases; higher risk in men ≥70 years)
- Autoimmune/rheumatologic conditions (fibromyalgia, rheumatoid arthritis, lupus)
- Celiac disease
- Chronic fatigue syndrome/myalgic encephalomyelitis
      `,
      evidenceLevel: "A",
      references: ["Maisel P et al. Dtsch Arztebl Int 2021", "White B et al. Br J Gen Pract 2024"]
    },
    
    treatmentPlan: {
      title: "Treatment Plan",
      content: `
## Address Identified Causes

Treat any specific conditions identified during evaluation (e.g., anemia, hypothyroidism, depression, sleep apnea).

## Non-Pharmacologic Interventions

**Recommended regardless of specific diagnosis:**

- **Psychoeducation** about fatigue and realistic expectations for recovery
- **Graded exercise therapy** or individually adapted physical activity program
- **Sleep hygiene counseling**
- **Cognitive behavioral therapy (CBT)** for persistent fatigue
- **Energy conservation strategies** and pacing techniques
- **Nutritional counseling** and adequate hydration
- **Stress management techniques**

## Pharmacologic Management

- Treat underlying conditions as appropriate:
  - Levothyroxine for hypothyroidism
  - Iron supplementation for iron deficiency anemia
  - Antidepressants for depression
- **Avoid prescribing stimulants** or other medications solely for fatigue without a specific diagnosis
      `,
      evidenceLevel: "A",
      references: ["Latimer KM et al. AFP 2023", "Maisel P et al. Dtsch Arztebl Int 2021"]
    },
    
    followUpStrategy: {
      title: "Follow-Up Strategy",
      content: `
## If Diagnosis Remains Unclear

- Schedule **regular follow-up visits** (e.g., 2-4 weeks initially)
- Practice **watchful waiting** to avoid overdiagnosis
- **Reassess for new symptoms** or findings at each visit
- **Avoid excessive testing** without new clinical indications
- Consider **referral to specialists** if red flags develop or symptoms persist despite treatment

## Red Flags Requiring Further Investigation

- Unintentional weight loss
- Fever or night sweats
- Lymphadenopathy
- Focal neurologic deficits
- Severe or progressive symptoms
- **Age ≥70 years** (particularly men, given higher cancer risk)
- Abnormal initial laboratory findings
      `,
      evidenceLevel: "A",
      references: ["Latimer KM et al. AFP 2023", "White B et al. Br J Gen Pract 2024"]
    },
    
    expectedOutcomes: {
      title: "Expected Outcomes",
      content: `
## Prognosis and Realistic Expectations

- Only **27% of patients** receive a specific diagnosis explaining fatigue after comprehensive workup
- Only **8% receive a clear condition-based diagnosis** one year after presentation
- This underscores the importance of:
  - Avoiding an exclusively somatic focus
  - Incorporating psychoeducational and behavioral interventions early in management
  - Setting realistic expectations with patients about diagnostic uncertainty
  - Focusing on symptom management and functional improvement rather than finding a single cause
      `,
      evidenceLevel: "A",
      references: ["Latimer KM et al. AFP 2023", "Maisel P et al. Dtsch Arztebl Int 2021"]
    }
  },
  
  references: [
    {
      title: "Fatigue in Adults: Evaluation and Management",
      journal: "American Family Physician",
      year: 2023,
      authors: "Latimer KM, Gunther A, Kopec M",
      type: "Guideline"
    },
    {
      title: "Fatigue as the Chief Complaint—Epidemiology, Causes, Diagnosis, and Treatment",
      journal: "Deutsches Arzteblatt International",
      year: 2021,
      authors: "Maisel P, Baum E, Donner-Banzhoff N"
    },
    {
      title: "Multidisciplinary Collaborative Consensus Guidance Statement on the Assessment and Treatment of Fatigue in Postacute Sequelae of SARS-CoV-2 Infection (PASC) Patients",
      journal: "PM & R: The Journal of Injury, Function, and Rehabilitation",
      year: 2021,
      authors: "Herrera JE, Niehaus WN, Whiteson J, et al",
      type: "Guideline"
    },
    {
      title: "Underlying Disease Risk Among Patients With Fatigue: A Population-Based Cohort Study in Primary Care",
      journal: "The British Journal of General Practice",
      year: 2024,
      authors: "White B, Zakkak N, Renzi C, et al"
    }
  ],
  
  icdCodes: [
    { code: "R53.83", description: "Other fatigue" },
    { code: "R53.81", description: "Other malaise" },
    { code: "R53.82", description: "Chronic fatigue, unspecified" },
    { code: "G93.3", description: "Postviral fatigue syndrome" },
    { code: "F48.0", description: "Neurasthenia (chronic fatigue syndrome)" }
  ],
  
  cptCodes: [
    { code: "99213", description: "Office visit, established patient, 20-29 minutes" },
    { code: "99214", description: "Office visit, established patient, 30-39 minutes" },
    { code: "99204", description: "Office visit, new patient, 45-59 minutes" },
    { code: "96127", description: "Brief emotional/behavioral assessment (PHQ-9, GAD-7)" }
  ]
};

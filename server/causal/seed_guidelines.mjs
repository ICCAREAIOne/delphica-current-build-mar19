/**
 * seed_guidelines.mjs
 *
 * One-time seeding script for causal_knowledge_base.
 * Sources: ADA 2024, ACC/AHA 2023, USPSTF, JNC 8, GOLD 2024, ACR 2021
 *
 * Run: node server/causal/seed_guidelines.mjs
 */

import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const guidelines = [

  // ============================================================
  // ADA 2024 — TYPE 2 DIABETES (E11)
  // Source: American Diabetes Association Standards of Care 2024
  // ============================================================
  {
    conditionCode: 'E11',
    conditionName: 'Type 2 Diabetes Mellitus',
    treatmentCode: 'A10BA02',
    treatmentName: 'Metformin monotherapy',
    guidelineSource: 'ADA 2024',
    evidenceGrade: 'A',
    summary: 'Metformin is the preferred initial pharmacologic agent for T2DM unless contraindicated. Reduces HbA1c by 1.0–2.0%. Weight-neutral to modest weight loss. Cardiovascular neutral. First-line per ADA, AACE, and EASD guidelines.',
    mechanismOfAction: 'Decreases hepatic glucose production (gluconeogenesis), improves insulin sensitivity in peripheral tissues, mild reduction in intestinal glucose absorption.',
    indicationsText: 'T2DM with eGFR ≥ 30 mL/min/1.73m². First-line unless GI intolerance or contraindication.',
    contraindicationsText: 'eGFR < 30 mL/min/1.73m² (absolute). eGFR 30–45 (use with caution, reduce dose). Iodinated contrast dye — hold 48h before/after. Active hepatic disease. Excessive alcohol use.',
    keyFindings: 'UKPDS: Metformin reduced all-cause mortality 36% vs. conventional therapy in overweight T2DM. No hypoglycemia risk as monotherapy. GI side effects (nausea, diarrhea) in 20–30%; take with food or use extended-release formulation.',
    priorEfficacyMean: '0.7500',
    priorEfficacyVariance: '0.0200',
    betaAlpha: '15.0000',
    betaBeta: '5.0000',
    observationCount: 0,
    pmids: JSON.stringify(['34964738', '36507635', '10249840']),
    dois: JSON.stringify(['10.2337/dci24-0001']),
    guidelineUrl: 'https://diabetesjournals.org/care/issue/47/Supplement_1',
    isActive: true,
  },
  {
    conditionCode: 'E11',
    conditionName: 'Type 2 Diabetes Mellitus',
    treatmentCode: 'A10BK',
    treatmentName: 'SGLT2 inhibitor (empagliflozin/dapagliflozin/canagliflozin)',
    guidelineSource: 'ADA 2024',
    evidenceGrade: 'A',
    summary: 'SGLT2 inhibitors are preferred add-on therapy for T2DM with established ASCVD, heart failure with reduced ejection fraction (HFrEF), or CKD (eGFR ≥ 20). Reduce HbA1c 0.5–1.0%, body weight 2–3 kg, systolic BP 3–5 mmHg. Cardiorenal protective.',
    mechanismOfAction: 'Inhibits sodium-glucose cotransporter 2 in proximal tubule → glucosuria → caloric loss. Also reduces preload/afterload, decreases intraglomerular pressure, and has anti-inflammatory effects.',
    indicationsText: 'T2DM + ASCVD, T2DM + HFrEF, T2DM + CKD (eGFR ≥ 20). Add to metformin or as monotherapy if metformin intolerant.',
    contraindicationsText: 'eGFR < 20 (glucose-lowering effect lost; dapagliflozin approved for HF/CKD down to eGFR 25). Type 1 DM (DKA risk). Recurrent UTI or genital mycotic infections. Withhold before surgery (euglycemic DKA risk).',
    keyFindings: 'EMPA-REG OUTCOME: Empagliflozin reduced CV death 38%, HF hospitalization 35%. DAPA-HF: Dapagliflozin reduced HF hospitalization/CV death 26% in HFrEF regardless of diabetes status. CREDENCE: Canagliflozin reduced ESRD/doubling of creatinine 34% in T2DM + CKD.',
    priorEfficacyMean: '0.7200',
    priorEfficacyVariance: '0.0250',
    betaAlpha: '14.4000',
    betaBeta: '5.6000',
    observationCount: 0,
    pmids: JSON.stringify(['26378978', '31535829', '30990260']),
    dois: JSON.stringify(['10.1056/NEJMoa1504720', '10.1056/NEJMoa1911303']),
    guidelineUrl: 'https://diabetesjournals.org/care/issue/47/Supplement_1',
    isActive: true,
  },
  {
    conditionCode: 'E11',
    conditionName: 'Type 2 Diabetes Mellitus',
    treatmentCode: 'A10BJ',
    treatmentName: 'GLP-1 receptor agonist (semaglutide/liraglutide/dulaglutide)',
    guidelineSource: 'ADA 2024',
    evidenceGrade: 'A',
    summary: 'GLP-1 RAs are preferred add-on for T2DM with ASCVD or high CV risk, or when weight loss is a priority. Reduce HbA1c 1.0–1.5%, body weight 3–5 kg (semaglutide up to 15% with high-dose). Weekly injectable or daily options.',
    mechanismOfAction: 'Incretin mimetic — stimulates glucose-dependent insulin secretion, suppresses glucagon, slows gastric emptying, reduces appetite via central hypothalamic signaling.',
    indicationsText: 'T2DM + ASCVD or high CV risk. T2DM + obesity (BMI ≥ 30 or ≥ 27 with comorbidity). Add to metformin ± SGLT2i.',
    contraindicationsText: 'Personal/family history of medullary thyroid carcinoma or MEN2 (boxed warning). Pancreatitis history (relative). Severe GI dysmotility. Not for T1DM.',
    keyFindings: 'LEADER: Liraglutide reduced MACE 13%, CV death 22%. SUSTAIN-6: Semaglutide reduced MACE 26%. REWIND: Dulaglutide reduced MACE 12% in primary + secondary prevention. SELECT (2023): Semaglutide 2.4mg reduced MACE 20% in obese patients without T2DM.',
    priorEfficacyMean: '0.7000',
    priorEfficacyVariance: '0.0300',
    betaAlpha: '14.0000',
    betaBeta: '6.0000',
    observationCount: 0,
    pmids: JSON.stringify(['27295427', '28605608', '31189511']),
    dois: JSON.stringify(['10.1056/NEJMoa1603827', '10.1056/NEJMoa1615692']),
    guidelineUrl: 'https://diabetesjournals.org/care/issue/47/Supplement_1',
    isActive: true,
  },

  // ============================================================
  // ACC/AHA 2023 — HYPERTENSION (I10)
  // Source: ACC/AHA 2017 Hypertension Guidelines + 2023 Updates
  // ============================================================
  {
    conditionCode: 'I10',
    conditionName: 'Essential (Primary) Hypertension',
    treatmentCode: 'C09AA',
    treatmentName: 'ACE inhibitor (lisinopril/ramipril/enalapril)',
    guidelineSource: 'ACC/AHA 2017',
    evidenceGrade: 'A',
    summary: 'ACE inhibitors are first-line antihypertensive therapy, especially in patients with diabetes, CKD, or post-MI. Reduce BP by 10–15/6–8 mmHg. Renoprotective in diabetic nephropathy. Reduce mortality in HFrEF.',
    mechanismOfAction: 'Inhibits angiotensin-converting enzyme → reduces angiotensin II → vasodilation, reduced aldosterone → natriuresis. Reduces intraglomerular pressure via efferent arteriole dilation.',
    indicationsText: 'Hypertension with CKD, diabetes, post-MI, HFrEF, proteinuria. First-line in Black patients only when combined with thiazide or CCB (per JNC 8).',
    contraindicationsText: 'Pregnancy (teratogenic — category D/X). Bilateral renal artery stenosis. Hyperkalemia (K+ > 5.5 mEq/L). History of ACE inhibitor-induced angioedema. Concurrent use with aliskiren in diabetes.',
    keyFindings: 'HOPE trial: Ramipril reduced MI/stroke/CV death 22% in high-risk patients. MICRO-HOPE: Ramipril reduced overt nephropathy 24% in T2DM. ACE inhibitor cough in 10–15% (higher in Asian patients) — switch to ARB.',
    priorEfficacyMean: '0.7500',
    priorEfficacyVariance: '0.0200',
    betaAlpha: '15.0000',
    betaBeta: '5.0000',
    observationCount: 0,
    pmids: JSON.stringify(['10639539', '10639540', '11519503']),
    dois: JSON.stringify(['10.1056/NEJM200001203420301']),
    guidelineUrl: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065',
    isActive: true,
  },
  {
    conditionCode: 'I10',
    conditionName: 'Essential (Primary) Hypertension',
    treatmentCode: 'C09CA',
    treatmentName: 'ARB (losartan/valsartan/olmesartan/irbesartan)',
    guidelineSource: 'ACC/AHA 2017',
    evidenceGrade: 'A',
    summary: 'ARBs are equivalent to ACE inhibitors for BP reduction and cardiorenal protection. Preferred over ACE inhibitors when ACE inhibitor cough occurs. First-line in CKD with proteinuria, diabetic nephropathy, and HFrEF (when ACE inhibitor intolerant).',
    mechanismOfAction: 'Blocks angiotensin II type 1 (AT1) receptor → vasodilation, reduced aldosterone, natriuresis. Does not affect bradykinin (no cough).',
    indicationsText: 'Hypertension + CKD/proteinuria, diabetes, HFrEF (ACE inhibitor intolerant), post-MI. Do not combine with ACE inhibitor (dual RAAS blockade increases AKI/hyperkalemia risk).',
    contraindicationsText: 'Pregnancy. Bilateral renal artery stenosis. Hyperkalemia. Do not combine with ACE inhibitor (ONTARGET trial showed harm).',
    keyFindings: 'RENAAL: Losartan reduced ESRD 28% in T2DM + nephropathy. IDNT: Irbesartan reduced ESRD 23%. LIFE: Losartan reduced CV events 13% vs. atenolol in HTN + LVH. Cough rate < 1% vs. 10–15% for ACE inhibitors.',
    priorEfficacyMean: '0.7200',
    priorEfficacyVariance: '0.0220',
    betaAlpha: '14.4000',
    betaBeta: '5.6000',
    observationCount: 0,
    pmids: JSON.stringify(['11565518', '11565519', '12242560']),
    dois: JSON.stringify(['10.1056/NEJMoa011161']),
    guidelineUrl: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065',
    isActive: true,
  },
  {
    conditionCode: 'I10',
    conditionName: 'Essential (Primary) Hypertension',
    treatmentCode: 'C08CA',
    treatmentName: 'Calcium channel blocker (amlodipine/nifedipine/diltiazem)',
    guidelineSource: 'ACC/AHA 2017',
    evidenceGrade: 'A',
    summary: 'Dihydropyridine CCBs (amlodipine) are first-line antihypertensives, especially in Black patients and elderly. Reduce BP 10–15/6–8 mmHg. No metabolic side effects. Amlodipine has proven CV outcome data.',
    mechanismOfAction: 'Blocks L-type voltage-gated calcium channels in vascular smooth muscle → vasodilation. Dihydropyridines are vascular-selective (amlodipine, nifedipine). Non-dihydropyridines (diltiazem, verapamil) also reduce HR.',
    indicationsText: 'First-line HTN, especially Black patients (superior to ACE inhibitor monotherapy per ALLHAT). Elderly with isolated systolic HTN. Angina (amlodipine, diltiazem). Raynaud phenomenon.',
    contraindicationsText: 'Non-dihydropyridines (diltiazem, verapamil): avoid in HFrEF, second/third-degree AV block, sick sinus syndrome. Peripheral edema common with amlodipine (10–15%).',
    keyFindings: 'ALLHAT: Amlodipine equivalent to lisinopril and chlorthalidone for primary CV outcomes. ASCOT-BPLA: Amlodipine-based regimen reduced fatal/nonfatal stroke 23% vs. atenolol-based. VALUE: Amlodipine reduced MI more than valsartan in early treatment period.',
    priorEfficacyMean: '0.7000',
    priorEfficacyVariance: '0.0250',
    betaAlpha: '14.0000',
    betaBeta: '6.0000',
    observationCount: 0,
    pmids: JSON.stringify(['12479763', '15652604', '15449185']),
    dois: JSON.stringify(['10.1001/jama.288.23.2981']),
    guidelineUrl: 'https://www.ahajournals.org/doi/10.1161/HYP.0000000000000065',
    isActive: true,
  },

  // ============================================================
  // ACC/AHA 2019 — ATRIAL FIBRILLATION (I48)
  // ============================================================
  {
    conditionCode: 'I48',
    conditionName: 'Atrial Fibrillation',
    treatmentCode: 'B01AF',
    treatmentName: 'DOAC (apixaban/rivaroxaban/dabigatran/edoxaban)',
    guidelineSource: 'ACC/AHA 2019',
    evidenceGrade: 'A',
    summary: 'DOACs are preferred over warfarin for stroke prevention in non-valvular AF with CHA2DS2-VASc ≥ 2 (men) or ≥ 3 (women). Superior efficacy and safety profile vs. warfarin. No routine INR monitoring required.',
    mechanismOfAction: 'Apixaban/rivaroxaban/edoxaban: direct factor Xa inhibitors. Dabigatran: direct thrombin (factor IIa) inhibitor. All reduce thrombin generation and clot formation.',
    indicationsText: 'Non-valvular AF with CHA2DS2-VASc ≥ 2 (men) or ≥ 3 (women). CHA2DS2-VASc 1 (men) or 2 (women): consider anticoagulation. Preferred over warfarin unless mechanical heart valve or moderate-severe mitral stenosis.',
    contraindicationsText: 'Mechanical heart valve (use warfarin). Moderate-severe mitral stenosis. Severe renal impairment (dabigatran: avoid if CrCl < 15; apixaban preferred in CKD). Active major bleeding. Pregnancy.',
    keyFindings: 'ARISTOTLE: Apixaban reduced stroke/SE 21%, major bleeding 31%, mortality 11% vs. warfarin. RE-LY: Dabigatran 150mg reduced stroke 34% vs. warfarin. ROCKET-AF: Rivaroxaban non-inferior to warfarin. ENGAGE AF: Edoxaban reduced major bleeding 20% vs. warfarin.',
    priorEfficacyMean: '0.8000',
    priorEfficacyVariance: '0.0150',
    betaAlpha: '16.0000',
    betaBeta: '4.0000',
    observationCount: 0,
    pmids: JSON.stringify(['21870978', '19717844', '20876411', '23991861']),
    dois: JSON.stringify(['10.1056/NEJMoa1107039']),
    guidelineUrl: 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000000665',
    isActive: true,
  },
  {
    conditionCode: 'I48',
    conditionName: 'Atrial Fibrillation',
    treatmentCode: 'C07AB',
    treatmentName: 'Beta-blocker rate control (metoprolol/bisoprolol/carvedilol)',
    guidelineSource: 'ACC/AHA 2019',
    evidenceGrade: 'B',
    summary: 'Beta-blockers are first-line rate control agents in AF, especially with concurrent HFrEF or CAD. Target resting HR < 80 bpm (lenient < 110 bpm acceptable if asymptomatic). Metoprolol succinate preferred for HFrEF.',
    mechanismOfAction: 'Blocks beta-1 adrenergic receptors in AV node → slows AV conduction → reduces ventricular rate. Negative chronotropy and inotropy.',
    indicationsText: 'AF with rapid ventricular response. First-line rate control in AF + HFrEF (metoprolol succinate, bisoprolol, carvedilol). AF + CAD. Preferred over digoxin for active patients.',
    contraindicationsText: 'Decompensated HF (relative — use with caution). Severe bradycardia or high-degree AV block without pacemaker. Severe reactive airway disease (relative — use cardioselective beta-1 blocker with caution). Cocaine-induced AF (paradoxical vasoconstriction).',
    keyFindings: 'AFFIRM trial: Rate control non-inferior to rhythm control for mortality. RACE II: Lenient rate control (< 110 bpm) non-inferior to strict (< 80 bpm) for composite outcome. Beta-blockers superior to digoxin for rate control during exercise.',
    priorEfficacyMean: '0.6500',
    priorEfficacyVariance: '0.0300',
    betaAlpha: '13.0000',
    betaBeta: '7.0000',
    observationCount: 0,
    pmids: JSON.stringify(['12466506', '20231232']),
    dois: JSON.stringify(['10.1056/NEJMoa010307', '10.1056/NEJMoa1001337']),
    guidelineUrl: 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000000665',
    isActive: true,
  },

  // ============================================================
  // ACC/AHA 2022 — HEART FAILURE (I50)
  // ============================================================
  {
    conditionCode: 'I50',
    conditionName: 'Heart Failure with Reduced Ejection Fraction (HFrEF)',
    treatmentCode: 'C09AA_HF',
    treatmentName: 'ACE inhibitor or ARB (HFrEF foundational therapy)',
    guidelineSource: 'ACC/AHA 2022',
    evidenceGrade: 'A',
    summary: 'ACE inhibitors (or ARBs if ACE inhibitor intolerant) are foundational therapy for HFrEF (EF ≤ 40%). Reduce mortality 20–25%, HF hospitalization 25–30%. Titrate to maximum tolerated dose. Superseded by ARNI (sacubitril/valsartan) in eligible patients.',
    mechanismOfAction: 'RAAS blockade → reduces preload/afterload, reverses cardiac remodeling, reduces aldosterone-mediated fibrosis.',
    indicationsText: 'All patients with HFrEF (EF ≤ 40%) unless contraindicated. Titrate to target dose (e.g., lisinopril 40mg, ramipril 10mg, enalapril 20mg BID).',
    contraindicationsText: 'Pregnancy. Bilateral RAS. Hyperkalemia (K+ > 5.5). Angioedema history. Concurrent ARNI (sacubitril/valsartan) — 36h washout required before switching.',
    keyFindings: 'CONSENSUS: Enalapril reduced mortality 40% in severe HF. SOLVD: Enalapril reduced mortality 16%, HF hospitalization 26%. SAVE: Captopril post-MI reduced HF development 37%.',
    priorEfficacyMean: '0.7500',
    priorEfficacyVariance: '0.0200',
    betaAlpha: '15.0000',
    betaBeta: '5.0000',
    observationCount: 0,
    pmids: JSON.stringify(['2057034', '1463530', '1386652']),
    dois: JSON.stringify(['10.1056/NEJM199109123251101']),
    guidelineUrl: 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000001063',
    isActive: true,
  },
  {
    conditionCode: 'I50',
    conditionName: 'Heart Failure with Reduced Ejection Fraction (HFrEF)',
    treatmentCode: 'C09DX04',
    treatmentName: 'ARNI — sacubitril/valsartan (Entresto)',
    guidelineSource: 'ACC/AHA 2022',
    evidenceGrade: 'A',
    summary: 'Sacubitril/valsartan (ARNI) is preferred over ACE inhibitor/ARB in HFrEF patients who remain symptomatic on ACE inhibitor/ARB. Reduces CV death/HF hospitalization 20% vs. enalapril. Class I recommendation.',
    mechanismOfAction: 'Sacubitril inhibits neprilysin → increases natriuretic peptides (ANP, BNP) → vasodilation, natriuresis, anti-fibrotic. Valsartan blocks AT1 receptor. Dual mechanism superior to RAAS blockade alone.',
    indicationsText: 'HFrEF (EF ≤ 40%) symptomatic on ACE inhibitor/ARB, eGFR ≥ 30, K+ ≤ 5.2 mEq/L. Requires 36h washout from ACE inhibitor before initiation (angioedema risk). Start at 24/26mg BID, titrate to 97/103mg BID.',
    contraindicationsText: 'Concurrent ACE inhibitor (36h washout required). History of angioedema with ACE inhibitor or ARB. Pregnancy. eGFR < 30 (relative). Severe hepatic impairment.',
    keyFindings: 'PARADIGM-HF: Sacubitril/valsartan reduced CV death/HF hospitalization 20%, all-cause mortality 16% vs. enalapril. NNT = 21 to prevent one primary event over 27 months. PIONEER-HF: Safe initiation in acute decompensated HF.',
    priorEfficacyMean: '0.8000',
    priorEfficacyVariance: '0.0150',
    betaAlpha: '16.0000',
    betaBeta: '4.0000',
    observationCount: 0,
    pmids: JSON.stringify(['25176015', '30415613']),
    dois: JSON.stringify(['10.1056/NEJMoa1409077']),
    guidelineUrl: 'https://www.ahajournals.org/doi/10.1161/CIR.0000000000001063',
    isActive: true,
  },

  // ============================================================
  // USPSTF — PREVENTIVE CARE
  // ============================================================
  {
    conditionCode: 'Z13.6',
    conditionName: 'Lipid disorder screening / Cardiovascular risk reduction',
    treatmentCode: 'C10AA',
    treatmentName: 'Statin therapy (atorvastatin/rosuvastatin/simvastatin)',
    guidelineSource: 'ACC/AHA 2019 + USPSTF 2022',
    evidenceGrade: 'A',
    summary: 'Statins are first-line therapy for primary and secondary prevention of ASCVD. Reduce LDL-C 30–55% depending on intensity. High-intensity statin (atorvastatin 40–80mg, rosuvastatin 20–40mg) for ASCVD or 10-year risk ≥ 20%.',
    mechanismOfAction: 'Inhibits HMG-CoA reductase → reduces hepatic cholesterol synthesis → upregulates LDL receptors → increased LDL clearance. Also anti-inflammatory (plaque stabilization).',
    indicationsText: 'Secondary prevention: all patients with ASCVD. Primary prevention: LDL ≥ 190 mg/dL, diabetes age 40–75, 10-year ASCVD risk ≥ 7.5% (moderate-intensity) or ≥ 20% (high-intensity). USPSTF: preventive statin for adults 40–75 with ≥ 1 CVD risk factor and 10-year risk ≥ 10%.',
    contraindicationsText: 'Active liver disease. Pregnancy/breastfeeding. Myopathy/rhabdomyolysis history. Drug interactions: fibrates (myopathy risk), cyclosporine, certain antibiotics (increase statin levels).',
    keyFindings: '4S: Simvastatin reduced all-cause mortality 30% in CAD. JUPITER: Rosuvastatin reduced MACE 44% in low-LDL, elevated CRP patients. CTT meta-analysis: Each 1 mmol/L LDL reduction → 22% relative risk reduction in major vascular events.',
    priorEfficacyMean: '0.7800',
    priorEfficacyVariance: '0.0180',
    betaAlpha: '15.6000',
    betaBeta: '4.4000',
    observationCount: 0,
    pmids: JSON.stringify(['8613172', '18997196', '22007207']),
    dois: JSON.stringify(['10.1016/S0140-6736(08)61345-8']),
    guidelineUrl: 'https://www.uspreventiveservicestaskforce.org/uspstf/recommendation/statin-use-in-adults-preventive-medication',
    isActive: true,
  },
  {
    conditionCode: 'J44',
    conditionName: 'Chronic Obstructive Pulmonary Disease (COPD)',
    treatmentCode: 'R03BB',
    treatmentName: 'Long-acting muscarinic antagonist — LAMA (tiotropium/umeclidinium/glycopyrronium)',
    guidelineSource: 'GOLD 2024',
    evidenceGrade: 'A',
    summary: 'LAMAs are preferred bronchodilator monotherapy for stable COPD (GOLD Group B and above). Reduce exacerbations, improve FEV1, and improve quality of life. Tiotropium is the most studied.',
    mechanismOfAction: 'Blocks M3 muscarinic receptors in airway smooth muscle → bronchodilation. Long-acting (24h duration) allows once-daily dosing.',
    indicationsText: 'Stable COPD GOLD Group B (symptomatic, low exacerbation risk). Preferred over LABA monotherapy for exacerbation prevention. Combine with LABA (LAMA+LABA) for Group C/D or persistent symptoms.',
    contraindicationsText: 'Narrow-angle glaucoma (use with caution — avoid direct eye contact with inhaler). Urinary retention/BPH (use with caution). Severe hypersensitivity to tiotropium or ipratropium.',
    keyFindings: 'UPLIFT: Tiotropium reduced exacerbations 14%, improved FEV1, improved QoL vs. placebo. INSPIRE: Tiotropium non-inferior to salmeterol/fluticasone for exacerbations. FLAME: LAMA+LABA (indacaterol/glycopyrronium) superior to ICS+LABA for exacerbation prevention.',
    priorEfficacyMean: '0.6800',
    priorEfficacyVariance: '0.0280',
    betaAlpha: '13.6000',
    betaBeta: '6.4000',
    observationCount: 0,
    pmids: JSON.stringify(['18836213', '27181606']),
    dois: JSON.stringify(['10.1056/NEJMoa0805800']),
    guidelineUrl: 'https://goldcopd.org/2024-gold-report/',
    isActive: true,
  },
  {
    conditionCode: 'M05',
    conditionName: 'Rheumatoid Arthritis',
    treatmentCode: 'L04AX03',
    treatmentName: 'Methotrexate (conventional DMARD)',
    guidelineSource: 'ACR 2021',
    evidenceGrade: 'A',
    summary: 'Methotrexate is the anchor DMARD for RA and first-line therapy for moderate-to-severe disease. Reduces joint damage, improves function, and is the preferred background therapy when adding biologics.',
    mechanismOfAction: 'Inhibits dihydrofolate reductase → reduces purine synthesis → anti-proliferative and anti-inflammatory. At low doses used in RA: primarily adenosine-mediated anti-inflammatory effect.',
    indicationsText: 'Moderate-to-severe RA. First-line DMARD unless contraindicated. Combine with folic acid 1mg/day to reduce side effects. Target dose 15–25mg/week (oral or subcutaneous).',
    contraindicationsText: 'Pregnancy (teratogenic — category X). Significant hepatic disease or alcohol use. eGFR < 30. Active infection. Pulmonary fibrosis (relative). Avoid live vaccines.',
    keyFindings: 'TEAR trial: Methotrexate monotherapy comparable to combination therapy at 2 years in early RA. Methotrexate + biologic superior to biologic monotherapy in most trials. Subcutaneous MTX has better bioavailability and tolerability than oral at doses > 15mg.',
    priorEfficacyMean: '0.6500',
    priorEfficacyVariance: '0.0300',
    betaAlpha: '13.0000',
    betaBeta: '7.0000',
    observationCount: 0,
    pmids: JSON.stringify(['22147661', '19950287']),
    dois: JSON.stringify(['10.1002/art.33498']),
    guidelineUrl: 'https://www.rheumatology.org/Practice-Quality/Clinical-Support/Clinical-Practice-Guidelines/Rheumatoid-Arthritis',
    isActive: true,
  },
  {
    conditionCode: 'N18',
    conditionName: 'Chronic Kidney Disease',
    treatmentCode: 'V03AX_finerenone',
    treatmentName: 'Finerenone (non-steroidal MRA)',
    guidelineSource: 'KDIGO 2022',
    evidenceGrade: 'A',
    summary: 'Finerenone is indicated for CKD with T2DM (eGFR ≥ 25, K+ ≤ 4.8 mEq/L) to reduce CKD progression and CV events. Added on top of maximum tolerated RAAS blockade. Reduces composite kidney/CV endpoint 18–23%.',
    mechanismOfAction: 'Non-steroidal selective mineralocorticoid receptor antagonist → blocks aldosterone-mediated inflammation and fibrosis in kidney and heart. Less hyperkalemia and gynecomastia than steroidal MRAs (spironolactone).',
    indicationsText: 'T2DM + CKD (eGFR ≥ 25, UACR ≥ 30 mg/g) already on maximum tolerated ACE inhibitor or ARB. K+ ≤ 4.8 mEq/L at initiation.',
    contraindicationsText: 'K+ > 4.8 mEq/L at initiation. eGFR < 25. Adrenal insufficiency. Concurrent strong CYP3A4 inhibitors (ketoconazole, itraconazole). Pregnancy.',
    keyFindings: 'FIDELIO-DKD: Finerenone reduced kidney failure/eGFR decline/renal death 18%, CV death/MI/stroke/HF hospitalization 14% vs. placebo. FIGARO-DKD: Reduced CV death/HF hospitalization/MI/stroke 13%. FIDELITY pooled analysis confirmed consistent benefit.',
    priorEfficacyMean: '0.6800',
    priorEfficacyVariance: '0.0280',
    betaAlpha: '13.6000',
    betaBeta: '6.4000',
    observationCount: 0,
    pmids: JSON.stringify(['32972751', '34449181']),
    dois: JSON.stringify(['10.1056/NEJMoa2025845']),
    guidelineUrl: 'https://kdigo.org/guidelines/ckd-mbd/',
    isActive: true,
  },
];

let inserted = 0;
let skipped = 0;

for (const g of guidelines) {
  try {
    // Check if entry already exists
    const [existing] = await conn.execute(
      'SELECT id FROM causal_knowledge_base WHERE conditionCode = ? AND treatmentName = ? LIMIT 1',
      [g.conditionCode, g.treatmentName]
    );
    if (existing.length > 0) {
      console.log(`  SKIP (exists): ${g.conditionCode} — ${g.treatmentName}`);
      skipped++;
      continue;
    }

    await conn.execute(
      `INSERT INTO causal_knowledge_base
        (conditionCode, conditionName, treatmentCode, treatmentName, guidelineSource,
         evidenceGrade, summary, mechanismOfAction, indicationsText, contraindicationsText,
         keyFindings, priorEfficacyMean, priorEfficacyVariance, betaAlpha, betaBeta,
         observationCount, pmids, dois, guidelineUrl, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        g.conditionCode, g.conditionName, g.treatmentCode, g.treatmentName,
        g.guidelineSource, g.evidenceGrade, g.summary, g.mechanismOfAction,
        g.indicationsText, g.contraindicationsText, g.keyFindings,
        g.priorEfficacyMean, g.priorEfficacyVariance, g.betaAlpha, g.betaBeta,
        g.observationCount, g.pmids, g.dois, g.guidelineUrl, g.isActive ? 1 : 0
      ]
    );
    console.log(`  ✓ Inserted: ${g.conditionCode} — ${g.treatmentName} [${g.guidelineSource}, Grade ${g.evidenceGrade}]`);
    inserted++;
  } catch (err) {
    console.error(`  ✗ Failed: ${g.conditionCode} — ${g.treatmentName}:`, err.message);
  }
}

await conn.end();
console.log(`\nDone. Inserted: ${inserted} | Skipped (already exists): ${skipped} | Total: ${guidelines.length}`);

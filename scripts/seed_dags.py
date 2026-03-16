"""
Seed starter causal DAGs for the three highest-volume conditions.
Each DAG encodes the core causal structure per clinical guidelines.
"""
import os, re
import mysql.connector

raw_url = os.environ["DATABASE_URL"]
clean   = re.sub(r'\?.*$', '', raw_url.replace("mysql://", ""))
userpass, hostdb = clean.split("@", 1)
user, password   = userpass.split(":", 1)
host_port, db    = hostdb.rsplit("/", 1)
host, port       = (host_port.split(":") + ["3306"])[:2]

conn = mysql.connector.connect(
    host=host, port=int(port), user=user, password=password,
    database=db, ssl_disabled=False
)
cur = conn.cursor()

def create_graph(diag_code, condition_name, description, guideline):
    cur.execute("""
        INSERT INTO causal_graphs (diagnosis_code, condition_name, version, status, description, guideline_source)
        VALUES (%s, %s, 1, 'active', %s, %s)
        ON DUPLICATE KEY UPDATE status='active'
    """, (diag_code, condition_name, description, guideline))
    conn.commit()
    cur.execute("SELECT id FROM causal_graphs WHERE diagnosis_code=%s AND status='active' ORDER BY version DESC LIMIT 1", (diag_code,))
    return cur.fetchone()[0]

def add_node(graph_id, node_type, label, description, code_system=None, code=None, obs=True, latent=False, x=None, y=None):
    cur.execute("""
        INSERT INTO causal_nodes (graph_id, node_type, label, description, code_system, code, is_observable, is_latent, position_x, position_y)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (graph_id, node_type, label, description, code_system, code, 1 if obs else 0, 1 if latent else 0, x, y))
    conn.commit()
    return cur.lastrowid

def add_edge(graph_id, from_id, to_id, edge_type, ace=None, ace_unit=None, grade=None, guideline=None, backdoor=False, desc=None):
    cur.execute("""
        INSERT INTO causal_edges (graph_id, from_node_id, to_node_id, edge_type, estimated_ace, ace_unit, evidence_grade, guideline_source, is_backdoor, description)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, (graph_id, from_id, to_id, edge_type, ace, ace_unit, grade, guideline, 1 if backdoor else 0, desc))
    conn.commit()
    return cur.lastrowid

# ─────────────────────────────────────────────────────────────────────────────
# DAG 1: Type 2 Diabetes Mellitus (E11.9)
# Core structure: Metformin → HbA1c; Age/BMI confound treatment selection
# ─────────────────────────────────────────────────────────────────────────────
g1 = create_graph("E11.9", "Type 2 Diabetes Mellitus",
    "Causal DAG for T2DM glycaemic control. Primary outcome: HbA1c < 7%. "
    "Confounders: age, BMI, renal function. Mediator: insulin resistance.",
    "ADA Standards of Care 2024")

n_age      = add_node(g1, "confounder", "Age",                "Patient age in years; affects treatment selection and outcome",       x=100, y=50)
n_bmi      = add_node(g1, "confounder", "BMI",                "Body mass index; confounder for both treatment choice and HbA1c",     x=200, y=50)
n_egfr     = add_node(g1, "confounder", "eGFR",               "Renal function; gates metformin eligibility (contraindicated <30)",   code_system="LOINC", code="33914-3", x=300, y=50)
n_met      = add_node(g1, "treatment",  "Metformin",          "First-line biguanide; reduces hepatic glucose production",            code_system="RxNorm", code="860975", x=100, y=200)
n_glp1     = add_node(g1, "treatment",  "GLP-1 RA",           "Glucagon-like peptide-1 receptor agonist (e.g. semaglutide)",         code_system="RxNorm", code="2200644", x=200, y=200)
n_ins_res  = add_node(g1, "mediator",   "Insulin Resistance", "Latent mediator between BMI and HbA1c",                              latent=True, x=300, y=200)
n_hba1c    = add_node(g1, "outcome",    "HbA1c",              "Primary outcome: target < 7% (ADA). Measured every 3 months.",        code_system="LOINC", code="4548-4", x=200, y=350)
n_cv_risk  = add_node(g1, "outcome",    "CV Risk",            "Secondary outcome: MACE reduction with GLP-1 RA (LEADER, SUSTAIN-6)", x=350, y=350)

add_edge(g1, n_age,     n_met,     "direct",   desc="Age >75 → prefer lower dose or avoid if frailty")
add_edge(g1, n_egfr,    n_met,     "direct",   ace=-0.5, ace_unit="eligibility", grade="A", guideline="ADA 2024 §9.3")
add_edge(g1, n_bmi,     n_ins_res, "direct",   ace=0.12, ace_unit="HOMA-IR per BMI unit", grade="A")
add_edge(g1, n_met,     n_hba1c,   "direct",   ace=-1.1, ace_unit="% HbA1c", grade="A", guideline="ADA 2024 §9.4")
add_edge(g1, n_glp1,    n_hba1c,   "direct",   ace=-1.5, ace_unit="% HbA1c", grade="A", guideline="LEADER trial")
add_edge(g1, n_glp1,    n_cv_risk, "direct",   ace=-0.13, ace_unit="HR MACE", grade="A", guideline="LEADER 2016")
add_edge(g1, n_ins_res, n_hba1c,   "direct",   ace=0.8,  ace_unit="% HbA1c per HOMA-IR unit", grade="B")
add_edge(g1, n_bmi,     n_hba1c,   "backdoor", backdoor=True, desc="BMI → HbA1c via insulin resistance (backdoor path)")
add_edge(g1, n_age,     n_hba1c,   "backdoor", backdoor=True, desc="Age confounds both treatment selection and HbA1c trajectory")

print(f"T2DM DAG created: graph_id={g1}, nodes=8, edges=9")

# ─────────────────────────────────────────────────────────────────────────────
# DAG 2: Essential Hypertension (I10)
# Core structure: ACEi/ARB/CCB → SBP; CKD/DM as confounders
# ─────────────────────────────────────────────────────────────────────────────
g2 = create_graph("I10", "Essential Hypertension",
    "Causal DAG for hypertension management. Primary outcome: SBP < 130 mmHg. "
    "Confounders: CKD, DM, age, sodium intake. Mediator: RAAS activation.",
    "ACC/AHA 2023 Hypertension Guidelines")

n2_age     = add_node(g2, "confounder", "Age",              "Age; older patients have higher baseline SBP and more comorbidities", x=100, y=50)
n2_ckd     = add_node(g2, "confounder", "CKD",              "Chronic kidney disease; favours ACEi/ARB selection",                  code_system="ICD10", code="N18.3", x=200, y=50)
n2_dm      = add_node(g2, "confounder", "Diabetes",         "T2DM; favours ACEi/ARB for renoprotection",                           code_system="ICD10", code="E11.9", x=300, y=50)
n2_na      = add_node(g2, "confounder", "Sodium Intake",    "Dietary sodium; direct effect on SBP independent of medication",      x=400, y=50)
n2_acei    = add_node(g2, "treatment",  "ACEi/ARB",         "ACE inhibitor or angiotensin receptor blocker",                       code_system="RxNorm", code="18867", x=100, y=200)
n2_ccb     = add_node(g2, "treatment",  "CCB",              "Calcium channel blocker (amlodipine)",                                code_system="RxNorm", code="17767", x=250, y=200)
n2_thiaz   = add_node(g2, "treatment",  "Thiazide",         "Thiazide diuretic (chlorthalidone preferred)",                        code_system="RxNorm", code="2409", x=400, y=200)
n2_raas    = add_node(g2, "mediator",   "RAAS Activation",  "Renin-angiotensin-aldosterone system; latent mediator",               latent=True, x=200, y=300)
n2_sbp     = add_node(g2, "outcome",    "SBP",              "Systolic blood pressure. Target < 130 mmHg (ACC/AHA 2023).",          code_system="LOINC", code="8480-6", x=250, y=400)
n2_stroke  = add_node(g2, "outcome",    "Stroke Risk",      "Secondary outcome: stroke risk reduction",                            x=400, y=400)

add_edge(g2, n2_ckd,   n2_acei,  "direct",   ace=0.9,   ace_unit="preference score", grade="A", guideline="ACC/AHA 2023 §7.2")
add_edge(g2, n2_dm,    n2_acei,  "direct",   ace=0.8,   ace_unit="preference score", grade="A")
add_edge(g2, n2_na,    n2_sbp,   "direct",   ace=1.2,   ace_unit="mmHg per 100mmol Na", grade="A")
add_edge(g2, n2_acei,  n2_raas,  "direct",   ace=-0.7,  ace_unit="RAAS index", grade="A")
add_edge(g2, n2_raas,  n2_sbp,   "direct",   ace=8.0,   ace_unit="mmHg per RAAS unit", grade="B")
add_edge(g2, n2_acei,  n2_sbp,   "direct",   ace=-10.0, ace_unit="mmHg SBP", grade="A", guideline="SPRINT 2015")
add_edge(g2, n2_ccb,   n2_sbp,   "direct",   ace=-8.0,  ace_unit="mmHg SBP", grade="A")
add_edge(g2, n2_thiaz, n2_sbp,   "direct",   ace=-7.0,  ace_unit="mmHg SBP", grade="A")
add_edge(g2, n2_sbp,   n2_stroke,"direct",   ace=-0.35, ace_unit="HR stroke per 10mmHg", grade="A", guideline="Lawes 2004 Lancet")
add_edge(g2, n2_age,   n2_sbp,   "backdoor", backdoor=True, desc="Age confounds both treatment selection and baseline SBP")

print(f"HTN DAG created: graph_id={g2}, nodes=10, edges=10")

# ─────────────────────────────────────────────────────────────────────────────
# DAG 3: CKD Stage 3 (N18.3)
# Core structure: ACEi/ARB → eGFR decline; proteinuria as mediator
# ─────────────────────────────────────────────────────────────────────────────
g3 = create_graph("N18.3", "Chronic Kidney Disease Stage 3",
    "Causal DAG for CKD Stage 3 progression. Primary outcome: eGFR stabilisation. "
    "Confounders: DM, HTN, proteinuria. Mediator: glomerular pressure.",
    "KDIGO 2024 CKD Guidelines")

n3_dm      = add_node(g3, "confounder", "Diabetes",          "DM accelerates CKD progression via AGE, oxidative stress",           code_system="ICD10", code="E11.9", x=100, y=50)
n3_htn     = add_node(g3, "confounder", "Hypertension",      "HTN is both cause and consequence of CKD",                           code_system="ICD10", code="I10",   x=250, y=50)
n3_prot    = add_node(g3, "mediator",   "Proteinuria",        "Urine ACR; mediates glomerular injury and treatment response",       code_system="LOINC", code="14959-1", x=400, y=50)
n3_acei    = add_node(g3, "treatment",  "ACEi/ARB",          "Reduces intraglomerular pressure and proteinuria",                   code_system="RxNorm", code="18867", x=100, y=200)
n3_sglt2   = add_node(g3, "treatment",  "SGLT2i",            "Empagliflozin/dapagliflozin; direct renoprotective effect",          code_system="RxNorm", code="2200644", x=250, y=200)
n3_diet    = add_node(g3, "treatment",  "Low-Protein Diet",  "Dietary protein restriction 0.6-0.8g/kg/day (KDIGO 2024)",           x=400, y=200)
n3_glom_p  = add_node(g3, "mediator",   "Glomerular Pressure","Latent mediator; elevated by HTN, reduced by ACEi/SGLT2i",          latent=True, x=250, y=300)
n3_egfr    = add_node(g3, "outcome",    "eGFR",              "Primary outcome: stabilise eGFR decline < 3 mL/min/1.73m²/yr",      code_system="LOINC", code="33914-3", x=200, y=420)
n3_esrd    = add_node(g3, "outcome",    "ESRD Risk",         "Secondary outcome: time to dialysis or transplant",                  x=380, y=420)

add_edge(g3, n3_dm,    n3_prot,   "direct",   ace=0.4,   ace_unit="g/g ACR increase", grade="A")
add_edge(g3, n3_htn,   n3_glom_p, "direct",   ace=0.6,   ace_unit="mmHg intraglomerular", grade="A")
add_edge(g3, n3_acei,  n3_prot,   "direct",   ace=-0.35, ace_unit="g/g ACR reduction", grade="A", guideline="KDIGO 2024 §3.1")
add_edge(g3, n3_acei,  n3_glom_p, "direct",   ace=-5.0,  ace_unit="mmHg", grade="A")
add_edge(g3, n3_sglt2, n3_egfr,   "direct",   ace=2.5,   ace_unit="mL/min/1.73m²/yr preserved", grade="A", guideline="CREDENCE 2019")
add_edge(g3, n3_sglt2, n3_prot,   "direct",   ace=-0.2,  ace_unit="g/g ACR reduction", grade="A")
add_edge(g3, n3_diet,  n3_prot,   "direct",   ace=-0.1,  ace_unit="g/g ACR reduction", grade="B")
add_edge(g3, n3_glom_p,n3_egfr,   "direct",   ace=-1.5,  ace_unit="mL/min/1.73m²/yr lost per mmHg", grade="B")
add_edge(g3, n3_prot,  n3_egfr,   "direct",   ace=-0.8,  ace_unit="mL/min/1.73m²/yr lost per g/g", grade="A")
add_edge(g3, n3_egfr,  n3_esrd,   "direct",   ace=-0.12, ace_unit="HR ESRD per 10 mL/min/1.73m² lower", grade="A", guideline="KDIGO 2024")
add_edge(g3, n3_dm,    n3_egfr,   "backdoor", backdoor=True, desc="DM confounds both treatment selection and eGFR trajectory")

print(f"CKD Stage 3 DAG created: graph_id={g3}, nodes=9, edges=11")

cur.close()
conn.close()
print("All 3 starter DAGs seeded successfully.")

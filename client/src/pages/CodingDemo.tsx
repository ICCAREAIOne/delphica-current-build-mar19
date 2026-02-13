import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2,
  Sparkles,
  FileText,
  Code,
  Target,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Info,
  ArrowRight,
  Copy,
  RotateCcw
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function CodingDemo() {
  const { user } = useAuth();
  
  // Form state
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [hpi, setHpi] = useState("");
  const [physicalExam, setPhysicalExam] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [procedures, setProcedures] = useState("");
  
  // Analysis results state
  const [codingResult, setCodingResult] = useState<any>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Sample clinical notes for quick testing
  const sampleNotes = {
    diabetes: {
      chiefComplaint: "Follow-up for diabetes management",
      hpi: "62-year-old male with type 2 diabetes mellitus presents for routine follow-up. Patient reports good compliance with metformin 1000mg BID. Blood glucose readings at home range 110-140 mg/dL fasting. Denies polyuria, polydipsia, or polyphagia. No episodes of hypoglycemia. Last HbA1c 3 months ago was 7.2%. Patient walks 30 minutes daily.",
      physicalExam: "Vital signs: BP 128/82, HR 76, BMI 29.3. General: Alert, well-appearing. HEENT: No diabetic retinopathy on fundoscopic exam. CV: RRR, no murmurs. Extremities: No edema, pedal pulses 2+ bilaterally, monofilament test intact bilaterally.",
      assessment: "Type 2 diabetes mellitus, currently well-controlled on metformin monotherapy. HbA1c goal <7.0%. No evidence of microvascular complications at this time.",
      plan: "Continue metformin 1000mg BID. Order HbA1c, comprehensive metabolic panel, lipid panel, and urine microalbumin today. Reinforce diet and exercise counseling. Schedule diabetic eye exam. Return in 3 months or sooner if concerns.",
      procedures: "Comprehensive metabolic panel, HbA1c, Lipid panel, Urine microalbumin"
    },
    hypertension: {
      chiefComplaint: "Uncontrolled hypertension",
      hpi: "58-year-old female with history of hypertension presents with persistently elevated blood pressure readings at home. Currently on lisinopril 20mg daily. Home BP readings average 150-160/90-95 over past 2 weeks. Denies headache, chest pain, or shortness of breath. Good medication compliance. Low-sodium diet adherence variable.",
      physicalExam: "Vital signs: BP 156/94 (repeated 158/92), HR 82, BMI 31.2. General: No acute distress. CV: RRR, S1 S2 normal, no murmurs or gallops. Lungs: Clear to auscultation bilaterally. Extremities: Trace bilateral ankle edema.",
      assessment: "Uncontrolled essential hypertension despite monotherapy. Stage 2 hypertension. Obesity class I contributing factor.",
      plan: "Increase lisinopril to 40mg daily. Add hydrochlorothiazide 12.5mg daily. Order basic metabolic panel, renal function tests. Reinforce DASH diet and weight loss counseling. Home BP monitoring twice daily. Recheck BP in 2 weeks.",
      procedures: "Basic metabolic panel, Renal function panel"
    },
    acute: {
      chiefComplaint: "Acute onset chest pain",
      hpi: "45-year-old male presents with sudden onset substernal chest pressure starting 2 hours ago while at rest. Pain described as 7/10 pressure-like sensation radiating to left arm. Associated with diaphoresis and nausea. No prior cardiac history. Risk factors include smoking 1 PPD x 20 years, family history of MI (father at age 52).",
      physicalExam: "Vital signs: BP 145/88, HR 98, RR 18, O2 sat 97% RA. General: Anxious, diaphoretic. CV: Tachycardic, regular rhythm, no murmurs. Lungs: Clear bilaterally. Extremities: No edema, pulses intact.",
      assessment: "Acute coronary syndrome suspected. High-risk presentation with typical anginal symptoms and cardiac risk factors.",
      plan: "STAT EKG obtained showing ST elevations in leads II, III, aVF. Aspirin 325mg chewed. Activate STEMI protocol. Cardiology consulted. Transfer to cath lab for emergent cardiac catheterization. Nitroglycerin, morphine, heparin initiated per protocol.",
      procedures: "EKG, Cardiac catheterization, Troponin levels"
    }
  };

  const loadSample = (sampleKey: keyof typeof sampleNotes) => {
    const sample = sampleNotes[sampleKey];
    setChiefComplaint(sample.chiefComplaint);
    setHpi(sample.hpi);
    setPhysicalExam(sample.physicalExam);
    setAssessment(sample.assessment);
    setPlan(sample.plan);
    setProcedures(sample.procedures);
    toast.success("Sample clinical note loaded");
  };

  const clearForm = () => {
    setChiefComplaint("");
    setHpi("");
    setPhysicalExam("");
    setAssessment("");
    setPlan("");
    setProcedures("");
    setCodingResult(null);
    setQualityMetrics(null);
    toast.success("Form cleared");
  };

  // Mutations
  const processCoding = trpc.semanticProcessor.processClinicalNote.useMutation();
  const analyzeQuality = trpc.qa.analyzeQuality.useMutation();

  const analyzeNote = async () => {
    if (!chiefComplaint.trim()) {
      toast.error("Please enter at least a chief complaint");
      return;
    }

    setIsAnalyzing(true);
    setCodingResult(null);
    setQualityMetrics(null);

    try {
      // Step 1: Process clinical note through semantic processor
      const coding = await processCoding.mutateAsync({
        chiefComplaint,
        historyOfPresentIllness: hpi || undefined,
        physicalExam: physicalExam || undefined,
        assessment: assessment || undefined,
        plan: plan || undefined,
        procedures: procedures ? procedures.split(',').map(p => p.trim()) : undefined,
      });

      setCodingResult(coding);

      // Step 2: Analyze quality metrics
      const quality = await analyzeQuality.mutateAsync({
        clinicalNote: {
          chiefComplaint,
          historyOfPresentIllness: hpi || undefined,
          physicalExam: physicalExam || undefined,
          assessment: assessment || undefined,
          plan: plan || undefined,
          procedures: procedures ? procedures.split(',').map(p => p.trim()) : undefined,
        },
        codingResult: coding,
      });

      setQualityMetrics(quality);
      toast.success("Analysis complete!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary" />
                Interactive Coding Demo
              </h1>
              <p className="text-muted-foreground mt-1">
                Real-time AI-powered quality analysis and medical coding
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">
                <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                Back to Portal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column: Input Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Clinical Documentation</CardTitle>
                <CardDescription>
                  Enter your clinical note or load a sample to see AI-powered analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sample Notes */}
                <div className="space-y-2">
                  <Label>Quick Load Sample Notes</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadSample("diabetes")}
                    >
                      Diabetes Follow-up
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadSample("hypertension")}
                    >
                      Hypertension
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadSample("acute")}
                    >
                      Acute Chest Pain
                    </Button>
                  </div>
                </div>

                {/* Chief Complaint */}
                <div className="space-y-2">
                  <Label htmlFor="cc">Chief Complaint *</Label>
                  <Textarea
                    id="cc"
                    placeholder="e.g., Follow-up for diabetes management"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* HPI */}
                <div className="space-y-2">
                  <Label htmlFor="hpi">History of Present Illness</Label>
                  <Textarea
                    id="hpi"
                    placeholder="Detailed history including onset, duration, character, aggravating/alleviating factors..."
                    value={hpi}
                    onChange={(e) => setHpi(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Physical Exam */}
                <div className="space-y-2">
                  <Label htmlFor="pe">Physical Examination</Label>
                  <Textarea
                    id="pe"
                    placeholder="Vital signs, general appearance, system-specific findings..."
                    value={physicalExam}
                    onChange={(e) => setPhysicalExam(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Assessment */}
                <div className="space-y-2">
                  <Label htmlFor="assessment">Assessment</Label>
                  <Textarea
                    id="assessment"
                    placeholder="Diagnosis, differential diagnoses, clinical impression..."
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Plan */}
                <div className="space-y-2">
                  <Label htmlFor="plan">Plan</Label>
                  <Textarea
                    id="plan"
                    placeholder="Treatment plan, medications, follow-up, patient education..."
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Procedures */}
                <div className="space-y-2">
                  <Label htmlFor="procedures">Procedures (comma-separated)</Label>
                  <Textarea
                    id="procedures"
                    placeholder="e.g., Blood glucose test, HbA1c, Lipid panel"
                    value={procedures}
                    onChange={(e) => setProcedures(e.target.value)}
                    rows={2}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={analyzeNote}
                    disabled={isAnalyzing || !chiefComplaint.trim()}
                    className="flex-1"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze Note
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={clearForm}
                    disabled={isAnalyzing}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Analysis Results */}
          <div className="space-y-6">
            {!codingResult && !qualityMetrics && !isAnalyzing && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Sparkles className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Enter clinical documentation or load a sample note, then click "Analyze Note" to see
                    real-time AI-powered coding suggestions and quality metrics.
                  </p>
                </CardContent>
              </Card>
            )}

            {isAnalyzing && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Analyzing Clinical Note</h3>
                  <p className="text-sm text-muted-foreground">
                    Processing through Semantic Processor and QA Analytics...
                  </p>
                </CardContent>
              </Card>
            )}

            {codingResult && qualityMetrics && (
              <Tabs defaultValue="codes" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="codes">
                    <Code className="h-4 w-4 mr-2" />
                    Codes
                  </TabsTrigger>
                  <TabsTrigger value="quality">
                    <Target className="h-4 w-4 mr-2" />
                    Quality
                  </TabsTrigger>
                  <TabsTrigger value="suggestions">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Optimize
                  </TabsTrigger>
                </TabsList>

                {/* Codes Tab */}
                <TabsContent value="codes" className="space-y-4">
                  {/* ICD-10 Codes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>ICD-10 Diagnosis Codes</span>
                        <Badge variant="secondary">{codingResult.icd10Codes.length} codes</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {codingResult.icd10Codes.map((code: any, index: number) => (
                        <div key={index} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="font-mono font-bold text-primary">{code.code}</code>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(code.confidence * 100)}% confidence
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{code.description}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(code.code, "ICD-10 code")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* CPT Codes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>CPT Procedure Codes</span>
                        <Badge variant="secondary">{codingResult.cptCodes.length} codes</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {codingResult.cptCodes.map((code: any, index: number) => (
                        <div key={index} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <code className="font-mono font-bold text-primary">{code.code}</code>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(code.confidence * 100)}% confidence
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{code.description}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(code.code, "CPT code")}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Overall Confidence */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Overall Coding Confidence</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Confidence Score</span>
                          <span className="font-bold">{Math.round(codingResult.confidenceScore * 100)}%</span>
                        </div>
                        <Progress value={codingResult.confidenceScore * 100} />
                        <p className="text-xs text-muted-foreground mt-2">
                          {codingResult.codingNotes}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Quality Tab */}
                <TabsContent value="quality" className="space-y-4">
                  {/* Overall Score */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Overall Quality Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center py-6">
                        <div className="text-center">
                          <div className="text-5xl font-bold text-primary mb-2">
                            {qualityMetrics.overallQualityScore}%
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Processed in {qualityMetrics.processingTimeMs}ms
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quality Metrics */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Documentation Quality Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Completeness
                          </span>
                          <span className="font-bold">{qualityMetrics.documentationQuality.completenessScore}%</span>
                        </div>
                        <Progress value={qualityMetrics.documentationQuality.completenessScore} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Specificity
                          </span>
                          <span className="font-bold">{qualityMetrics.documentationQuality.specificityScore}%</span>
                        </div>
                        <Progress value={qualityMetrics.documentationQuality.specificityScore} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Clarity
                          </span>
                          <span className="font-bold">{qualityMetrics.documentationQuality.clarityScore}%</span>
                        </div>
                        <Progress value={qualityMetrics.documentationQuality.clarityScore} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <Code className="h-4 w-4" />
                            Coding Accuracy
                          </span>
                          <span className="font-bold">{qualityMetrics.codingAccuracy.overallAccuracy}%</span>
                        </div>
                        <Progress value={qualityMetrics.codingAccuracy.overallAccuracy} />
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Reimbursement Optimization
                          </span>
                          <span className="font-bold">{qualityMetrics.reimbursementOptimizationScore}%</span>
                        </div>
                        <Progress value={qualityMetrics.reimbursementOptimizationScore} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Issues */}
                  {qualityMetrics.documentationQuality.missingElements.length > 0 && (
                    <Card className="border-amber-500">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-5 w-5" />
                          Missing Elements
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          {qualityMetrics.documentationQuality.missingElements.map((item: string, index: number) => (
                            <li key={index} className="text-sm flex items-start gap-2">
                              <span className="text-amber-500 mt-0.5">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Suggestions Tab */}
                <TabsContent value="suggestions" className="space-y-4">
                  {qualityMetrics.suggestions.map((suggestion: any, index: number) => (
                    <Card key={index} className="border-l-4" style={{
                      borderLeftColor: suggestion.priority === "high" ? "hsl(var(--destructive))" : 
                                      suggestion.priority === "medium" ? "hsl(var(--primary))" : 
                                      "hsl(var(--muted))"
                    }}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            {suggestion.category === "documentation" && <FileText className="h-4 w-4" />}
                            {suggestion.category === "coding" && <Code className="h-4 w-4" />}
                            {suggestion.category === "reimbursement" && <DollarSign className="h-4 w-4" />}
                            {suggestion.category === "specificity" && <Target className="h-4 w-4" />}
                            <CardTitle className="text-base capitalize">{suggestion.category}</CardTitle>
                          </div>
                          <Badge variant={suggestion.priority === "high" ? "destructive" : "default"}>
                            {suggestion.priority} priority
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Issue:</p>
                          <p className="text-sm">{suggestion.issue}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Recommendation:</p>
                          <p className="text-sm">{suggestion.recommendation}</p>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <Badge variant="outline" className="text-xs">
                            <Target className="h-3 w-3 mr-1" />
                            {suggestion.potentialImpact}
                          </Badge>
                        </div>
                        {suggestion.example && (
                          <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Example:</p>
                            <p className="text-xs">{suggestion.example}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {qualityMetrics.codingAccuracy.optimizationOpportunities.length > 0 && (
                    <Card className="border-green-500">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
                          <DollarSign className="h-5 w-5" />
                          Reimbursement Optimization Opportunities
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {qualityMetrics.codingAccuracy.optimizationOpportunities.map((opp: any, index: number) => (
                          <div key={index} className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-sm">{opp.area}</p>
                              <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                                {opp.reimbursementImpact}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                              <div>
                                <span className="text-muted-foreground">Current:</span>
                                <code className="ml-1 font-mono">{opp.currentCode}</code>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Suggested:</span>
                                <code className="ml-1 font-mono">{opp.suggestedCode}</code>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{opp.rationale}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

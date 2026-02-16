import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  BookOpen, 
  Star,
  Download,
  Share2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Activity
} from "lucide-react";
import { Link } from "wouter";
import { Streamdown } from "streamdown";
import { useState } from "react";

export default function FatigueProtocol() {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-between mb-4">
            <Link href="/library">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Library
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFavorite(!isFavorite)}
              >
                <Star className={`h-4 w-4 mr-2 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                {isFavorite ? "Favorited" : "Add to Favorites"}
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Fatigue Evaluation and Management Protocol
                </h1>
              </div>
              <p className="text-gray-600 text-lg mb-4">
                Comprehensive evidence-based protocol for evaluating and managing patients presenting with persistent fatigue
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  Evidence Level A
                </Badge>
                <Badge variant="outline">Primary Care</Badge>
                <Badge variant="outline">Diagnostic</Badge>
                <Badge variant="outline">Last Reviewed: Dec 2023</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="assessment" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="assessment">Assessment</TabsTrigger>
                <TabsTrigger value="labs">Labs</TabsTrigger>
                <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                <TabsTrigger value="treatment">Treatment</TabsTrigger>
                <TabsTrigger value="followup">Follow-Up</TabsTrigger>
                <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
              </TabsList>

              <TabsContent value="assessment">
                <Card>
                  <CardHeader>
                    <CardTitle>Initial Assessment</CardTitle>
                    <CardDescription>Comprehensive history and physical examination</CardDescription>
                  </CardHeader>
                  <CardContent className="prose max-w-none">
                    <Streamdown>{`
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
- **Hydration assessment**:
  - Daily water intake (target: 8-10 glasses or 2-3 liters)
  - Urine color and frequency
  - Signs of dehydration (dry mouth, dark urine, dizziness)
- **Caffeine and stimulant use**:
  - Coffee, tea, energy drinks (quantity, timing, frequency)
  - Caffeinated sodas and supplements
  - Prescription stimulants (amphetamines, methylphenidate)
  - Over-the-counter stimulants and weight-loss supplements
  - Pattern of use (chronic high intake vs recent cessation)
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
                    `}</Streamdown>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="labs">
                <Card>
                  <CardHeader>
                    <CardTitle>Initial Laboratory Workup</CardTitle>
                    <CardDescription>Guided testing approach based on clinical presentation</CardDescription>
                  </CardHeader>
                  <CardContent className="prose max-w-none">
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-400 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-yellow-800">Important</p>
                          <p className="text-yellow-700">
                            The initial laboratory evaluation should be guided by history and physical examination findings. 
                            Indiscriminate testing is low-yield and changes management in only 5% of patients.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Streamdown>{`
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
                    `}</Streamdown>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="diagnosis">
                <Card>
                  <CardHeader>
                    <CardTitle>Differential Diagnosis</CardTitle>
                    <CardDescription>Common and important causes of persistent fatigue</CardDescription>
                  </CardHeader>
                  <CardContent className="prose max-w-none">
                    <Streamdown>{`
## Most Common Causes (Primary Care)

The following account for the majority of persi## Most Common Causes

1. **Sleep disorders** (sleep apnea, insomnia, restless legs syndrome)
2. **Depression** (18.5% of cases)
3. **Psychosocial stress**
4. **Medication adverse effects**
5. **Anemia and other hematologic disorders**
6. **Thyroid dysfunction** (particularly in women)
7. **Chronic infections** (including post-viral syndromes)

## Lifestyle and Substance-Related Causes

### Hydration Issues
- **Dehydration** - Even mild dehydration (1-2% body weight loss) can cause fatigue, difficulty concentrating, and mood changes
- **Chronic inadequate fluid intake**

### Caffeine and Stimulant-Related
- **Excessive caffeine consumption** (>400mg/day or ~4 cups coffee)
  - Leads to tolerance, requiring increasing amounts for same effect
  - Disrupts sleep quality even when consumed 6+ hours before bedtime
  - Can cause "caffeine crash" as effects wear off
- **Caffeine withdrawal** - Occurs 12-24 hours after last dose in regular users
  - Symptoms: fatigue, headache, difficulty concentrating, irritability
  - Peaks at 20-51 hours, can last 2-9 days
- **Energy drink overuse** - High caffeine + sugar content causes energy crashes
- **Stimulant medication effects**:
  - Rebound fatigue from prescription stimulants (ADHD medications)
  - Withdrawal from weight-loss supplements or recreational stimulants
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
                    `}</Streamdown>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="treatment">
                <Card>
                  <CardHeader>
                    <CardTitle>Treatment Plan</CardTitle>
                    <CardDescription>Evidence-based management strategies</CardDescription>
                  </CardHeader>
                  <CardContent className="prose max-w-none">
                    <Streamdown>{`
## Address Identified Causes

Treat any specific conditions identified during evaluation (e.g., anemia, hypothyroidism, depression, sleep apnea).

## Lifestyle Modifications (First-Line for All Patients)

### Hydration Optimization
- **Target**: 8-10 glasses (2-3 liters) of water daily
- **Monitor**: Urine should be pale yellow; dark urine indicates dehydration
- **Timing**: Spread intake throughout day; increase with exercise, heat, illness
- **Avoid**: Excessive caffeine/alcohol which promote dehydration
- **Expected improvement**: 1-2 weeks with adequate hydration

### Caffeine Management
- **Assessment of current intake**:
  - Coffee: ~95mg per 8oz cup
  - Energy drinks: 80-300mg per serving
  - Tea: 25-50mg per cup
  - Soda: 30-40mg per 12oz
- **Recommendations**:
  - **Limit to <400mg/day** (about 4 cups coffee)
  - **Avoid after 2 PM** to prevent sleep disruption
  - **Gradual reduction** if excessive (decrease by 25% weekly to avoid withdrawal)
  - **Caffeine-free days** 1-2x/week to prevent tolerance
- **Caffeine withdrawal management**:
  - Taper slowly over 2-4 weeks rather than abrupt cessation
  - Temporary fatigue expected for 2-9 days
  - Adequate hydration and rest during withdrawal
  - Consider switching to half-caf or decaf gradually

### Other Lifestyle Interventions
- **Psychoeducation** about fatigue and realistic expectations for recovery
- **Graded exercise therapy** or individually adapted physical activity program
- **Sleep hygiene counseling** (consistent schedule, cool dark room, no screens 1hr before bed)
- **Cognitive behavioral therapy (CBT)** for persistent fatigue
- **Energy conservation strategies** and pacing techniques
- **Nutritional counseling** - balanced diet, regular meals, avoid high-sugar foods
- **Stress management techniques** (meditation, yoga, deep breathing)

## Pharmacologic Management

- Treat underlying conditions as appropriate:
  - Levothyroxine for hypothyroidism
  - Iron supplementation for iron deficiency anemia
  - Antidepressants for depression
- **Avoid prescribing stimulants** or other medications solely for fatigue without a specific diagnosis
                    `}</Streamdown>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="followup">
                <Card>
                  <CardHeader>
                    <CardTitle>Follow-Up Strategy</CardTitle>
                    <CardDescription>Ongoing management and red flags</CardDescription>
                  </CardHeader>
                  <CardContent className="prose max-w-none">
                    <Streamdown>{`
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
                    `}</Streamdown>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="outcomes">
                <Card>
                  <CardHeader>
                    <CardTitle>Expected Outcomes</CardTitle>
                    <CardDescription>Prognosis and realistic expectations</CardDescription>
                  </CardHeader>
                  <CardContent className="prose max-w-none">
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-blue-800">Clinical Reality</p>
                          <p className="text-blue-700">
                            Only 27% of patients receive a specific diagnosis explaining fatigue after comprehensive workup, 
                            and only 8% receive a clear condition-based diagnosis one year after presentation.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Streamdown>{`
## Key Takeaways

This underscores the importance of:

- **Avoiding an exclusively somatic focus** - Don't over-investigate
- **Incorporating psychoeducational and behavioral interventions early** in management
- **Setting realistic expectations** with patients about diagnostic uncertainty
- **Focusing on symptom management** and functional improvement rather than finding a single cause
- **Building a therapeutic alliance** through regular follow-up and supportive care
                    `}</Streamdown>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* ICD-10 Codes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ICD-10 Codes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <div className="font-mono font-semibold">R53.83</div>
                  <div className="text-gray-600">Other fatigue</div>
                </div>
                <div className="text-sm">
                  <div className="font-mono font-semibold">R53.82</div>
                  <div className="text-gray-600">Chronic fatigue, unspecified</div>
                </div>
                <div className="text-sm">
                  <div className="font-mono font-semibold">G93.3</div>
                  <div className="text-gray-600">Postviral fatigue syndrome</div>
                </div>
                <div className="text-sm">
                  <div className="font-mono font-semibold">F48.0</div>
                  <div className="text-gray-600">Neurasthenia (CFS)</div>
                </div>
                <div className="text-sm border-t pt-2 mt-2">
                  <div className="font-semibold text-xs text-gray-500 mb-1">Lifestyle-Related</div>
                </div>
                <div className="text-sm">
                  <div className="font-mono font-semibold">E86.0</div>
                  <div className="text-gray-600">Dehydration</div>
                </div>
                <div className="text-sm">
                  <div className="font-mono font-semibold">F15.90</div>
                  <div className="text-gray-600">Caffeine use disorder, uncomplicated</div>
                </div>
                <div className="text-sm">
                  <div className="font-mono font-semibold">F15.93</div>
                  <div className="text-gray-600">Caffeine withdrawal</div>
                </div>
                <div className="text-sm">
                  <div className="font-mono font-semibold">F15.20</div>
                  <div className="text-gray-600">Stimulant dependence, uncomplicated</div>
                </div>
                <div className="text-sm">
                  <div className="font-mono font-semibold">F15.23</div>
                  <div className="text-gray-600">Stimulant withdrawal</div>
                </div>
              </CardContent>
            </Card>

            {/* CPT Codes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CPT Codes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm">
                  <div className="font-mono font-semibold">99213</div>
                  <div className="text-gray-600">Office visit, 20-29 min</div>
                </div>
                <div className="text-sm">
                  <div className="font-mono font-semibold">99214</div>
                  <div className="text-gray-600">Office visit, 30-39 min</div>
                </div>
                <div className="text-sm">
                  <div className="font-mono font-semibold">96127</div>
                  <div className="text-gray-600">Brief behavioral assessment</div>
                </div>
              </CardContent>
            </Card>

            {/* References */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">References</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <div className="font-semibold">Latimer KM et al.</div>
                  <div className="text-gray-600">Fatigue in Adults: Evaluation and Management. Am Fam Physician. 2023.</div>
                  <Badge variant="outline" className="mt-1 text-xs">Guideline</Badge>
                </div>
                <div>
                  <div className="font-semibold">Maisel P et al.</div>
                  <div className="text-gray-600">Fatigue as the Chief Complaint. Dtsch Arztebl Int. 2021.</div>
                </div>
                <div>
                  <div className="font-semibold">White B et al.</div>
                  <div className="text-gray-600">Underlying Disease Risk Among Patients With Fatigue. Br J Gen Pract. 2024.</div>
                </div>
              </CardContent>
            </Card>

            {/* Patient Education */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Patient Education</CardTitle>
                <CardDescription className="text-xs">Downloadable handouts for patients</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <a href="/handouts/hydration-guidelines.md" download="Hydration-Guidelines.md" target="_blank">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Hydration Guidelines
                  </Button>
                </a>
                <a href="/handouts/caffeine-content-chart.md" download="Caffeine-Content-Chart.md" target="_blank">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Caffeine Content Chart
                  </Button>
                </a>
                <a href="/handouts/caffeine-tapering-schedule.md" download="Caffeine-Tapering-Schedule.md" target="_blank">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Caffeine Tapering Plan
                  </Button>
                </a>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/demo">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    Try Coding Demo
                  </Button>
                </Link>
                <Link href="/library/author">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Create Custom Protocol
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

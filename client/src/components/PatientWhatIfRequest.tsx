import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  Send,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  X,
  Info,
} from "lucide-react";
import { format } from "date-fns";

interface PatientWhatIfRequestProps {
  patientId: number;
}

const URGENCY_OPTIONS = [
  { value: "routine", label: "Routine", description: "No rush — at next appointment", color: "bg-green-100 text-green-800" },
  { value: "soon", label: "Soon", description: "Within the next few days", color: "bg-yellow-100 text-yellow-800" },
  { value: "urgent", label: "Urgent", description: "Need attention quickly", color: "bg-red-100 text-red-800" },
];

const COMMON_SYMPTOMS = [
  "Fatigue", "Pain", "Shortness of breath", "Dizziness", "Nausea",
  "Headache", "Sleep problems", "Weight changes", "Mood changes", "Swelling",
];

export default function PatientWhatIfRequest({ patientId }: PatientWhatIfRequestProps) {
  const [chiefConcern, setChiefConcern] = useState("");
  const [urgency, setUrgency] = useState<"routine" | "soon" | "urgent">("routine");
  const [additionalContext, setAdditionalContext] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: previousRequests, refetch } = trpc.patientPortal.getWhatIfRequests.useQuery(
    { patientId },
    { enabled: !!patientId }
  );

  const requestAnalysis = trpc.patientPortal.requestWhatIfAnalysis.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      refetch();
      setTimeout(() => {
        setSubmitted(false);
        setChiefConcern("");
        setAdditionalContext("");
        setSymptoms([]);
        setUrgency("routine");
      }, 3000);
    },
  });

  const toggleSymptom = (symptom: string) => {
    setSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const addCustomSymptom = () => {
    const trimmed = customSymptom.trim();
    if (trimmed && !symptoms.includes(trimmed)) {
      setSymptoms(prev => [...prev, trimmed]);
      setCustomSymptom("");
    }
  };

  const handleSubmit = () => {
    if (chiefConcern.trim().length < 10) return;
    requestAnalysis.mutate({
      patientId,
      chiefConcern: chiefConcern.trim(),
      symptoms: symptoms.length > 0 ? symptoms : undefined,
      urgency,
      additionalContext: additionalContext.trim() || undefined,
    });
  };

  const selectedUrgency = URGENCY_OPTIONS.find(o => o.value === urgency)!;

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex gap-3">
            <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground">What is a What-If Analysis?</p>
              <p className="text-muted-foreground mt-1">
                Your care team uses AI to simulate different treatment options and compare predicted outcomes for your specific situation.
                By requesting an analysis, you're asking your physician to run this simulation for a concern you have.
                Your physician reviews all results before any decisions are made.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4 text-primary" />
            Request a What-If Analysis
          </CardTitle>
          <CardDescription>
            Describe your concern and your physician will run an AI treatment comparison for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Chief Concern */}
          <div>
            <Label htmlFor="chief-concern" className="text-sm font-medium">
              What is your main concern? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="chief-concern"
              value={chiefConcern}
              onChange={e => setChiefConcern(e.target.value)}
              placeholder="e.g. I've been having persistent fatigue for 3 months and want to understand my treatment options..."
              rows={3}
              className="mt-1.5 resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {chiefConcern.length}/10 minimum characters
              {chiefConcern.length >= 10 && <span className="text-green-600 ml-1">✓</span>}
            </p>
          </div>

          {/* Symptoms */}
          <div>
            <Label className="text-sm font-medium">Related symptoms (optional)</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {COMMON_SYMPTOMS.map(symptom => (
                <button
                  key={symptom}
                  onClick={() => toggleSymptom(symptom)}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    symptoms.includes(symptom)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary hover:text-foreground"
                  }`}
                >
                  {symptom}
                </button>
              ))}
            </div>
            {/* Custom symptom */}
            <div className="flex gap-2 mt-2">
              <Input
                value={customSymptom}
                onChange={e => setCustomSymptom(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addCustomSymptom()}
                placeholder="Add another symptom..."
                className="h-8 text-sm"
              />
              <Button variant="outline" size="sm" onClick={addCustomSymptom} className="h-8 px-3">
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {symptoms.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {symptoms.map(s => (
                  <Badge key={s} variant="secondary" className="gap-1 text-xs">
                    {s}
                    <button onClick={() => toggleSymptom(s)} className="hover:text-destructive">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Urgency */}
          <div>
            <Label className="text-sm font-medium">How urgent is this?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              {URGENCY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setUrgency(opt.value as any)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    urgency === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{opt.label}</span>
                    {urgency === opt.value && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Context */}
          <div>
            <Label htmlFor="additional-context" className="text-sm font-medium">
              Additional context (optional)
            </Label>
            <Textarea
              id="additional-context"
              value={additionalContext}
              onChange={e => setAdditionalContext(e.target.value)}
              placeholder="Any recent changes in medications, diet, activity level, or other relevant information..."
              rows={2}
              className="mt-1.5 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              <span>Your physician will review before running the analysis</span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={chiefConcern.trim().length < 10 || requestAnalysis.isPending || submitted}
              className="gap-2 min-w-[120px]"
            >
              {submitted ? (
                <><CheckCircle2 className="h-4 w-4" /> Sent!</>
              ) : requestAnalysis.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4" /> Send Request</>
              )}
            </Button>
          </div>

          {requestAnalysis.error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {requestAnalysis.error.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous Requests */}
      {previousRequests && previousRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Previous Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {previousRequests.map((req: any, i: number) => (
              <div key={req.id || i} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">Patient Request</Badge>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {req.createdAt ? format(new Date(req.createdAt), "MMM d, yyyy h:mm a") : ""}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-3">
                  {req.content}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

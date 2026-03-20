import { useState, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Plus, X, Loader2, UserPlus, Phone, Shield, Upload, FileText, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function NewPatient() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Demographics
  const [mrn, setMrn] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other" | "unknown">("unknown");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  // Phone numbers
  const [phoneMobile, setPhoneMobile] = useState("");
  const [phoneHome, setPhoneHome] = useState("");
  const [phoneOffice, setPhoneOffice] = useState("");
  const [preferredPhone, setPreferredPhone] = useState<"mobile" | "home" | "office">("mobile");

  // Insurance – Primary
  const [insurancePrimary, setInsurancePrimary] = useState("");
  const [insurancePrimaryPolicyNumber, setInsurancePrimaryPolicyNumber] = useState("");
  const [insurancePrimaryGroupNumber, setInsurancePrimaryGroupNumber] = useState("");
  const [insurancePrimaryMemberId, setInsurancePrimaryMemberId] = useState("");
  const [insurancePrimaryPhone, setInsurancePrimaryPhone] = useState("");
  const [insurancePrimaryPlanType, setInsurancePrimaryPlanType] = useState("");

  // Insurance – Secondary
  const [showSecondary, setShowSecondary] = useState(false);
  const [insuranceSecondary, setInsuranceSecondary] = useState("");
  const [insuranceSecondaryPolicyNumber, setInsuranceSecondaryPolicyNumber] = useState("");
  const [insuranceSecondaryGroupNumber, setInsuranceSecondaryGroupNumber] = useState("");

  // Insurance PDF
  const [insurancePdfUrl, setInsurancePdfUrl] = useState("");
  const [insurancePdfName, setInsurancePdfName] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);
  const [benefitsParsing, setBenefitsParsing] = useState(false);
  const [benefitsParsed, setBenefitsParsed] = useState(false);
  const [benefitsSummary, setBenefitsSummary] = useState<Record<string, any> | null>(null);

  // Medical history
  const [allergyInput, setAllergyInput] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditionInput, setConditionInput] = useState("");
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [medicationInput, setMedicationInput] = useState("");
  const [currentMedications, setCurrentMedications] = useState<string[]>([]);

  const createPatient = trpc.patients.create.useMutation({
    onSuccess: (data) => {
      toast.success("Patient created successfully!");
      setLocation(`/patients/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create patient: ${error.message}`);
    },
  });

  const parseInsurancePdf = trpc.patients.parseInsurancePdf.useMutation({
    onSuccess: (data) => {
      setBenefitsSummary(data.benefits);
      setBenefitsParsed(true);
      setBenefitsParsing(false);
      if (data.benefits.insurerName) setInsurancePrimary(data.benefits.insurerName);
      if (data.benefits.policyNumber) setInsurancePrimaryPolicyNumber(data.benefits.policyNumber);
      if (data.benefits.groupNumber) setInsurancePrimaryGroupNumber(data.benefits.groupNumber);
      if (data.benefits.memberId) setInsurancePrimaryMemberId(data.benefits.memberId);
      if (data.benefits.planType) setInsurancePrimaryPlanType(data.benefits.planType);
      toast.success("Insurance benefits extracted!");
    },
    onError: (err) => {
      setBenefitsParsing(false);
      toast.error(`Extraction failed: ${err.message}`);
    },
  });

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) { toast.error("File too large — max 16 MB"); return; }
    setPdfUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload-insurance-pdf", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setInsurancePdfUrl(url);
      setInsurancePdfName(file.name);
      toast.success("PDF uploaded — click Extract Benefits to analyse");
    } catch { toast.error("Upload failed — please try again"); }
    finally { setPdfUploading(false); }
  };

  const handleParseBenefits = () => {
    if (!insurancePdfUrl) { toast.error("Upload an insurance PDF first"); return; }
    setBenefitsParsing(true);
    parseInsurancePdf.mutate({ patientId: 0, pdfUrl: insurancePdfUrl });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mrn || !firstName || !lastName || !dateOfBirth) {
      toast.error("Please fill in all required fields (MRN, name, DOB)");
      return;
    }
    const primaryPhone = phoneMobile || phoneHome || phoneOffice || undefined;
    createPatient.mutate({
      mrn, firstName, lastName,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      email: email || undefined,
      phone: primaryPhone,
      phoneMobile: phoneMobile || undefined,
      phoneHome: phoneHome || undefined,
      phoneOffice: phoneOffice || undefined,
      preferredPhone,
      address: address || undefined,
      allergies: allergies.length > 0 ? allergies : undefined,
      chronicConditions: chronicConditions.length > 0 ? chronicConditions : undefined,
      currentMedications: currentMedications.length > 0 ? currentMedications : undefined,
      assignedPhysicianId: user?.id,
      insurancePrimary: insurancePrimary || undefined,
      insurancePrimaryPolicyNumber: insurancePrimaryPolicyNumber || undefined,
      insurancePrimaryGroupNumber: insurancePrimaryGroupNumber || undefined,
      insurancePrimaryMemberId: insurancePrimaryMemberId || undefined,
      insurancePrimaryPhone: insurancePrimaryPhone || undefined,
      insurancePrimaryPlanType: insurancePrimaryPlanType || undefined,
      insuranceSecondary: insuranceSecondary || undefined,
      insuranceSecondaryPolicyNumber: insuranceSecondaryPolicyNumber || undefined,
      insuranceSecondaryGroupNumber: insuranceSecondaryGroupNumber || undefined,
      insurancePdfUrl: insurancePdfUrl || undefined,
      insuranceBenefitsSummary: benefitsSummary || undefined,
    });
  };

  const addAllergy = () => { if (allergyInput.trim()) { setAllergies([...allergies, allergyInput.trim()]); setAllergyInput(""); } };
  const removeAllergy = (i: number) => setAllergies(allergies.filter((_, idx) => idx !== i));
  const addCondition = () => { if (conditionInput.trim()) { setChronicConditions([...chronicConditions, conditionInput.trim()]); setConditionInput(""); } };
  const removeCondition = (i: number) => setChronicConditions(chronicConditions.filter((_, idx) => idx !== i));
  const addMedication = () => { if (medicationInput.trim()) { setCurrentMedications([...currentMedications, medicationInput.trim()]); setMedicationInput(""); } };
  const removeMedication = (i: number) => setCurrentMedications(currentMedications.filter((_, idx) => idx !== i));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">New Patient Registration</h1>
            <p className="text-sm text-muted-foreground">Required fields marked with *</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Demographics */}
          <Card>
            <CardHeader><CardTitle className="text-base">Demographics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="mrn">MRN *</Label>
                  <Input id="mrn" value={mrn} onChange={e => setMrn(e.target.value)} placeholder="e.g., MRN-001234" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={gender} onValueChange={v => setGender(v as any)}>
                    <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dob">Date of Birth *</Label>
                  <Input id="dob" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="patient@example.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" value={address} onChange={e => setAddress(e.target.value)} placeholder="Street, City, State, ZIP" rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Phone Numbers */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />Phone Numbers
              </CardTitle>
              <CardDescription>Check the box next to the preferred contact number</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["mobile", "home", "office"] as const).map(type => {
                const val = type === "mobile" ? phoneMobile : type === "home" ? phoneHome : phoneOffice;
                const setter = type === "mobile" ? setPhoneMobile : type === "home" ? setPhoneHome : setPhoneOffice;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-24 shrink-0">
                      <Checkbox id={`pref-${type}`} checked={preferredPhone === type} onCheckedChange={() => setPreferredPhone(type)} />
                      <Label htmlFor={`pref-${type}`} className="cursor-pointer font-medium capitalize">{type}</Label>
                    </div>
                    <Input value={val} onChange={e => setter(e.target.value)} placeholder="(555) 000-0000" className="flex-1" />
                    {preferredPhone === type && val && <Badge variant="secondary" className="shrink-0 text-xs">Preferred</Badge>}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Insurance */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />Medical Insurance
              </CardTitle>
              <CardDescription>Enter manually or upload a PDF for automatic benefit extraction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* PDF Upload */}
              <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
                <p className="text-sm font-medium">Import Insurance Card / Policy PDF</p>
                <div className="flex flex-wrap gap-2">
                  <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handlePdfUpload} />
                  <Button type="button" variant="outline" size="sm" disabled={pdfUploading} onClick={() => fileInputRef.current?.click()}>
                    {pdfUploading ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Uploading…</> : <><Upload className="h-3.5 w-3.5 mr-1.5" />Upload PDF / Image</>}
                  </Button>
                  {insurancePdfUrl && (
                    <Button type="button" variant="outline" size="sm" disabled={benefitsParsing} onClick={handleParseBenefits}>
                      {benefitsParsing ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Extracting…</> : <><FileText className="h-3.5 w-3.5 mr-1.5" />Extract Benefits with AI</>}
                    </Button>
                  )}
                </div>
                {insurancePdfName && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {benefitsParsed ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" /> : <FileText className="h-4 w-4 shrink-0" />}
                    <span className="truncate">{insurancePdfName}</span>
                    {benefitsParsed && <Badge variant="secondary" className="text-xs shrink-0">Benefits Extracted</Badge>}
                  </div>
                )}
                {benefitsSummary && (
                  <div className="rounded-md bg-muted/50 p-3 text-xs space-y-1 max-h-48 overflow-y-auto">
                    <p className="font-semibold text-foreground mb-2">Extracted Benefits Summary</p>
                    {([
                      ["Insurer", benefitsSummary.insurerName], ["Plan Type", benefitsSummary.planType],
                      ["Deductible (Ind.)", benefitsSummary.deductibleIndividual], ["Deductible (Fam.)", benefitsSummary.deductibleFamily],
                      ["OOP Max", benefitsSummary.outOfPocketMaxIndividual], ["PCP Copay", benefitsSummary.copayPCP],
                      ["Specialist Copay", benefitsSummary.copaySpecialist], ["ER Copay", benefitsSummary.copayER],
                      ["Coinsurance", benefitsSummary.coinsurance], ["Network", benefitsSummary.networkInfo],
                      ["Effective Date", benefitsSummary.effectiveDate],
                    ] as [string, any][]).filter(([, v]) => v).map(([label, value]) => (
                      <div key={label} className="flex gap-2">
                        <span className="text-muted-foreground w-32 shrink-0">{label}:</span>
                        <span className="text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />
              <p className="text-sm font-medium">Primary Insurance</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Insurance Company</Label>
                  <Input value={insurancePrimary} onChange={e => setInsurancePrimary(e.target.value)} placeholder="e.g., Blue Cross Blue Shield" />
                </div>
                <div className="space-y-1.5">
                  <Label>Plan Type</Label>
                  <Select value={insurancePrimaryPlanType} onValueChange={setInsurancePrimaryPlanType}>
                    <SelectTrigger><SelectValue placeholder="Select plan type" /></SelectTrigger>
                    <SelectContent>
                      {["HMO","PPO","EPO","POS","HDHP","Medicare","Medicaid","Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Member ID</Label>
                  <Input value={insurancePrimaryMemberId} onChange={e => setInsurancePrimaryMemberId(e.target.value)} placeholder="Member ID" />
                </div>
                <div className="space-y-1.5">
                  <Label>Policy Number</Label>
                  <Input value={insurancePrimaryPolicyNumber} onChange={e => setInsurancePrimaryPolicyNumber(e.target.value)} placeholder="Policy #" />
                </div>
                <div className="space-y-1.5">
                  <Label>Group Number</Label>
                  <Input value={insurancePrimaryGroupNumber} onChange={e => setInsurancePrimaryGroupNumber(e.target.value)} placeholder="Group #" />
                </div>
                <div className="space-y-1.5">
                  <Label>Insurance Phone</Label>
                  <Input value={insurancePrimaryPhone} onChange={e => setInsurancePrimaryPhone(e.target.value)} placeholder="Member services #" />
                </div>
              </div>

              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowSecondary(!showSecondary)}>
                {showSecondary ? <ChevronUp className="h-3.5 w-3.5 mr-1.5" /> : <ChevronDown className="h-3.5 w-3.5 mr-1.5" />}
                {showSecondary ? "Hide" : "Add"} Secondary Insurance
              </Button>

              {showSecondary && (
                <div className="space-y-3">
                  <Separator />
                  <p className="text-sm font-medium">Secondary Insurance</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label>Insurance Company</Label>
                      <Input value={insuranceSecondary} onChange={e => setInsuranceSecondary(e.target.value)} placeholder="Secondary insurer" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Policy Number</Label>
                      <Input value={insuranceSecondaryPolicyNumber} onChange={e => setInsuranceSecondaryPolicyNumber(e.target.value)} placeholder="Policy #" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Group Number</Label>
                      <Input value={insuranceSecondaryGroupNumber} onChange={e => setInsuranceSecondaryGroupNumber(e.target.value)} placeholder="Group #" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medical History */}
          <Card>
            <CardHeader><CardTitle className="text-base">Medical History</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Allergies</Label>
                <div className="flex gap-2">
                  <Input value={allergyInput} onChange={e => setAllergyInput(e.target.value)} placeholder="e.g., Penicillin, Peanuts"
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addAllergy())} />
                  <Button type="button" onClick={addAllergy} size="icon" variant="outline"><Plus className="h-4 w-4" /></Button>
                </div>
                {allergies.length > 0 && (
                  <div className="flex flex-wrap gap-2">{allergies.map((a, i) => (
                    <Badge key={i} variant="destructive" className="gap-1">{a}
                      <button type="button" onClick={() => removeAllergy(i)}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Chronic Conditions</Label>
                <div className="flex gap-2">
                  <Input value={conditionInput} onChange={e => setConditionInput(e.target.value)} placeholder="e.g., Type 2 Diabetes, Hypertension"
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCondition())} />
                  <Button type="button" onClick={addCondition} size="icon" variant="outline"><Plus className="h-4 w-4" /></Button>
                </div>
                {chronicConditions.length > 0 && (
                  <div className="flex flex-wrap gap-2">{chronicConditions.map((c, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">{c}
                      <button type="button" onClick={() => removeCondition(i)}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}</div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Current Medications</Label>
                <div className="flex gap-2">
                  <Input value={medicationInput} onChange={e => setMedicationInput(e.target.value)} placeholder="e.g., Metformin 500mg twice daily"
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addMedication())} />
                  <Button type="button" onClick={addMedication} size="icon" variant="outline"><Plus className="h-4 w-4" /></Button>
                </div>
                {currentMedications.length > 0 && (
                  <div className="flex flex-wrap gap-2">{currentMedications.map((m, i) => (
                    <Badge key={i} variant="outline" className="gap-1">{m}
                      <button type="button" onClick={() => removeMedication(i)}><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end pb-8">
            <Link href="/">
              <Button type="button" variant="outline" className="w-full sm:w-auto">Cancel</Button>
            </Link>
            <Button type="submit" disabled={createPatient.isPending} className="w-full sm:w-auto">
              {createPatient.isPending
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating Patient…</>
                : <><UserPlus className="h-4 w-4 mr-2" />Create Patient</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

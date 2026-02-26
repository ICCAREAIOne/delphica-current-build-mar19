import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface BiomarkerTrackingProps {
  patientId: number;
}

const BIOMARKER_CATEGORIES = {
  "Vital Signs": [
    { value: "blood_pressure_systolic", label: "Blood Pressure (Systolic)", unit: "mmHg" },
    { value: "blood_pressure_diastolic", label: "Blood Pressure (Diastolic)", unit: "mmHg" },
    { value: "heart_rate", label: "Heart Rate", unit: "bpm" },
    { value: "temperature", label: "Temperature", unit: "°F" },
    { value: "respiratory_rate", label: "Respiratory Rate", unit: "breaths/min" },
    { value: "oxygen_saturation", label: "Oxygen Saturation", unit: "%" },
    { value: "weight", label: "Weight", unit: "lbs" },
    { value: "height", label: "Height", unit: "in" },
    { value: "bmi", label: "BMI", unit: "kg/m²" },
    { value: "waist_circumference", label: "Waist Circumference", unit: "in" },
  ],
  "Lipid Panel": [
    { value: "total_cholesterol", label: "Total Cholesterol", unit: "mg/dL" },
    { value: "ldl_cholesterol", label: "LDL Cholesterol", unit: "mg/dL" },
    { value: "hdl_cholesterol", label: "HDL Cholesterol", unit: "mg/dL" },
    { value: "triglycerides", label: "Triglycerides", unit: "mg/dL" },
  ],
  "Metabolic Panel": [
    { value: "glucose_fasting", label: "Glucose (Fasting)", unit: "mg/dL" },
    { value: "glucose_random", label: "Glucose (Random)", unit: "mg/dL" },
    { value: "hba1c", label: "HbA1c", unit: "%" },
    { value: "insulin", label: "Insulin", unit: "μU/mL" },
  ],
  "Kidney Function": [
    { value: "creatinine", label: "Creatinine", unit: "mg/dL" },
    { value: "bun", label: "BUN", unit: "mg/dL" },
    { value: "egfr", label: "eGFR", unit: "mL/min/1.73m²" },
  ],
  "Liver Function": [
    { value: "alt", label: "ALT", unit: "U/L" },
    { value: "ast", label: "AST", unit: "U/L" },
    { value: "alkaline_phosphatase", label: "Alkaline Phosphatase", unit: "U/L" },
    { value: "bilirubin", label: "Bilirubin", unit: "mg/dL" },
  ],
};

export function BiomarkerTracking({ patientId }: BiomarkerTrackingProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("Vital Signs");
  const [formData, setFormData] = useState({
    biomarkerType: "",
    value: "",
    unit: "",
    measurementDate: new Date().toISOString().split('T')[0],
    referenceRangeLow: "",
    referenceRangeHigh: "",
    isAbnormal: false,
    source: "lab_test" as "lab_test" | "vital_signs" | "home_monitoring" | "wearable_device",
    labOrderId: "",
    notes: "",
  });

  const utils = trpc.useUtils();
  
  const { data: biomarkers, isLoading } = trpc.enhancedDAO.getBiomarkers.useQuery({ patientId });
  const { data: abnormalBiomarkers } = trpc.enhancedDAO.getAbnormalBiomarkers.useQuery({ patientId });

  const createBiomarker = trpc.enhancedDAO.createBiomarker.useMutation({
    onSuccess: () => {
      toast({
        title: "Biomarker recorded",
        description: "Biomarker measurement has been saved successfully.",
      });
      utils.enhancedDAO.getBiomarkers.invalidate({ patientId });
      utils.enhancedDAO.getAbnormalBiomarkers.invalidate({ patientId });
      setShowForm(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      biomarkerType: "",
      value: "",
      unit: "",
      measurementDate: new Date().toISOString().split('T')[0],
      referenceRangeLow: "",
      referenceRangeHigh: "",
      isAbnormal: false,
      source: "lab_test",
      labOrderId: "",
      notes: "",
    });
  };

  const handleBiomarkerTypeChange = (value: string) => {
    const allBiomarkers = Object.values(BIOMARKER_CATEGORIES).flat();
    const selected = allBiomarkers.find(b => b.value === value);
    
    setFormData({
      ...formData,
      biomarkerType: value,
      unit: selected?.unit || "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createBiomarker.mutate({
      patientId,
      ...formData,
      measurementDate: new Date(formData.measurementDate),
      biomarkerType: formData.biomarkerType as any,
    });
  };

  const getBiomarkerLabel = (type: string) => {
    const allBiomarkers = Object.values(BIOMARKER_CATEGORIES).flat();
    return allBiomarkers.find(b => b.value === type)?.label || type;
  };

  const getTrendIcon = (biomarkerType: string, currentValue: number) => {
    if (!biomarkers) return null;
    
    const history = biomarkers
      .filter((b: any) => b.biomarkerType === biomarkerType)
      .sort((a: any, b: any) => new Date(b.measurementDate).getTime() - new Date(a.measurementDate).getTime());
    
    if (history.length < 2) return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    const previousValue = parseFloat(history[1].value);
    if (currentValue > previousValue) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (currentValue < previousValue) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Biomarker Tracking</h3>
          <p className="text-sm text-muted-foreground">
            Monitor lab results and vital signs over time
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Measurement
        </Button>
      </div>

      {/* Abnormal Biomarkers Alert */}
      {abnormalBiomarkers && abnormalBiomarkers.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Abnormal Results ({abnormalBiomarkers.length})
            </CardTitle>
            <CardDescription className="text-orange-700">
              Recent measurements outside reference range
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {abnormalBiomarkers.slice(0, 5).map((biomarker: any) => (
                <div key={biomarker.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{getBiomarkerLabel(biomarker.biomarkerType)}</span>
                  <span className="text-orange-900">
                    {biomarker.value} {biomarker.unit}
                    {biomarker.referenceRangeLow && biomarker.referenceRangeHigh && (
                      <span className="text-muted-foreground ml-2">
                        (Normal: {biomarker.referenceRangeLow}-{biomarker.referenceRangeHigh})
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Biomarker Measurement</CardTitle>
            <CardDescription>Record a lab result or vital sign</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(BIOMARKER_CATEGORIES).map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Biomarker Type *</Label>
                  <Select
                    value={formData.biomarkerType}
                    onValueChange={handleBiomarkerTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select biomarker" />
                    </SelectTrigger>
                    <SelectContent>
                      {BIOMARKER_CATEGORIES[selectedCategory as keyof typeof BIOMARKER_CATEGORIES].map(biomarker => (
                        <SelectItem key={biomarker.value} value={biomarker.value}>
                          {biomarker.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Value *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    placeholder="e.g., 120"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit *</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g., mg/dL"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Measurement Date *</Label>
                  <Input
                    type="date"
                    value={formData.measurementDate}
                    onChange={(e) => setFormData({ ...formData, measurementDate: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value: any) => setFormData({ ...formData, source: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lab_test">Lab Test</SelectItem>
                      <SelectItem value="vital_signs">Vital Signs</SelectItem>
                      <SelectItem value="home_monitoring">Home Monitoring</SelectItem>
                      <SelectItem value="wearable_device">Wearable Device</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Reference Range Low</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.referenceRangeLow}
                    onChange={(e) => setFormData({ ...formData, referenceRangeLow: e.target.value })}
                    placeholder="e.g., 70"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reference Range High</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.referenceRangeHigh}
                    onChange={(e) => setFormData({ ...formData, referenceRangeHigh: e.target.value })}
                    placeholder="e.g., 100"
                  />
                </div>

                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox
                    checked={formData.isAbnormal}
                    onCheckedChange={(checked) => setFormData({ ...formData, isAbnormal: checked as boolean })}
                  />
                  <Label>Mark as abnormal (outside reference range)</Label>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Lab Order ID (optional)</Label>
                  <Input
                    value={formData.labOrderId}
                    onChange={(e) => setFormData({ ...formData, labOrderId: e.target.value })}
                    placeholder="e.g., LAB-2024-12345"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional information..."
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createBiomarker.isPending}>
                  {createBiomarker.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Measurement
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {biomarkers && biomarkers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recent Measurements</CardTitle>
            <CardDescription>{biomarkers.length} biomarker entries recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Biomarker</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Reference Range</TableHead>
                  <TableHead>Trend</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {biomarkers.slice(0, 20).map((biomarker: any) => (
                  <TableRow key={biomarker.id}>
                    <TableCell className="font-medium">
                      {new Date(biomarker.measurementDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getBiomarkerLabel(biomarker.biomarkerType)}</TableCell>
                    <TableCell>
                      {biomarker.value} {biomarker.unit}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {biomarker.referenceRangeLow && biomarker.referenceRangeHigh
                        ? `${biomarker.referenceRangeLow}-${biomarker.referenceRangeHigh}`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {getTrendIcon(biomarker.biomarkerType, parseFloat(biomarker.value))}
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {biomarker.source.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      {biomarker.isAbnormal ? (
                        <Badge variant="destructive">Abnormal</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">Normal</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        !showForm && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No biomarker data recorded yet</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Measurement
              </Button>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

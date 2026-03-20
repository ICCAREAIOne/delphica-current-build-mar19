import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2, CheckCircle2, Activity } from "lucide-react";

interface BiomarkerQuickEntryProps {
  patientId: number;
  onSuccess?: () => void;
}

const BIOMARKER_OPTIONS = [
  { value: "hba1c",                    label: "HbA1c",               unit: "%",       placeholder: "e.g. 6.2" },
  { value: "glucose_fasting",          label: "Glucose (Fasting)",   unit: "mg/dL",   placeholder: "e.g. 95" },
  { value: "glucose_random",           label: "Glucose (Random)",    unit: "mg/dL",   placeholder: "e.g. 120" },
  { value: "blood_pressure_systolic",  label: "BP Systolic",         unit: "mmHg",    placeholder: "e.g. 120" },
  { value: "blood_pressure_diastolic", label: "BP Diastolic",        unit: "mmHg",    placeholder: "e.g. 80" },
  { value: "heart_rate",               label: "Heart Rate",          unit: "bpm",     placeholder: "e.g. 72" },
  { value: "weight",                   label: "Weight",              unit: "lbs",     placeholder: "e.g. 180" },
  { value: "bmi",                      label: "BMI",                 unit: "kg/m²",   placeholder: "e.g. 24.5" },
  { value: "total_cholesterol",        label: "Total Cholesterol",   unit: "mg/dL",   placeholder: "e.g. 190" },
  { value: "ldl_cholesterol",          label: "LDL Cholesterol",     unit: "mg/dL",   placeholder: "e.g. 110" },
  { value: "hdl_cholesterol",          label: "HDL Cholesterol",     unit: "mg/dL",   placeholder: "e.g. 55" },
  { value: "triglycerides",            label: "Triglycerides",       unit: "mg/dL",   placeholder: "e.g. 140" },
  { value: "egfr",                     label: "eGFR",                unit: "mL/min",  placeholder: "e.g. 75" },
  { value: "creatinine",               label: "Creatinine",          unit: "mg/dL",   placeholder: "e.g. 0.9" },
  { value: "tsh",                      label: "TSH",                 unit: "mIU/L",   placeholder: "e.g. 2.1" },
  { value: "vitamin_d",                label: "Vitamin D",           unit: "ng/mL",   placeholder: "e.g. 42" },
  { value: "hemoglobin",               label: "Hemoglobin",          unit: "g/dL",    placeholder: "e.g. 14.2" },
  { value: "oxygen_saturation",        label: "O₂ Saturation",       unit: "%",       placeholder: "e.g. 98" },
  { value: "temperature",              label: "Temperature",         unit: "°F",      placeholder: "e.g. 98.6" },
  { value: "waist_circumference",      label: "Waist Circumference", unit: "inches",  placeholder: "e.g. 34" },
  { value: "crp",                      label: "CRP",                 unit: "mg/L",    placeholder: "e.g. 1.2" },
  { value: "psa",                      label: "PSA",                 unit: "ng/mL",   placeholder: "e.g. 1.5" },
  { value: "other",                    label: "Other",               unit: "",        placeholder: "value" },
];

// Quick-entry presets: common paired readings
const QUICK_PRESETS = [
  { label: "BP", types: ["blood_pressure_systolic", "blood_pressure_diastolic"] },
  { label: "Metabolic", types: ["hba1c", "glucose_fasting", "total_cholesterol"] },
  { label: "Vitals", types: ["weight", "heart_rate", "oxygen_saturation"] },
];

interface EntryRow {
  biomarkerType: string;
  value: string;
  unit: string;
  notes: string;
}

export default function BiomarkerQuickEntry({ patientId, onSuccess }: BiomarkerQuickEntryProps) {
  const [open, setOpen] = useState(false);
  const [measurementDate, setMeasurementDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState<EntryRow[]>([{ biomarkerType: "", value: "", unit: "", notes: "" }]);
  const [saved, setSaved] = useState(false);

  const utils = trpc.useUtils();

  const createBiomarker = trpc.enhancedDAO.createBiomarker.useMutation({
    onSuccess: () => {
      utils.enhancedDAO.getBiomarkersByType.invalidate();
      utils.enhancedDAO.getAbnormalBiomarkers.invalidate();
    },
  });

  const handleTypeChange = (index: number, type: string) => {
    const option = BIOMARKER_OPTIONS.find(o => o.value === type);
    setRows(prev => prev.map((r, i) => i === index ? { ...r, biomarkerType: type, unit: option?.unit || "" } : r));
  };

  const handleValueChange = (index: number, value: string) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, value } : r));
  };

  const handleNotesChange = (index: number, notes: string) => {
    setRows(prev => prev.map((r, i) => i === index ? { ...r, notes } : r));
  };

  const addRow = () => setRows(prev => [...prev, { biomarkerType: "", value: "", unit: "", notes: "" }]);

  const removeRow = (index: number) => setRows(prev => prev.filter((_, i) => i !== index));

  const applyPreset = (types: string[]) => {
    const newRows = types.map(type => {
      const option = BIOMARKER_OPTIONS.find(o => o.value === type)!;
      return { biomarkerType: type, value: "", unit: option.unit, notes: "" };
    });
    setRows(newRows);
  };

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.biomarkerType && r.value.trim());
    if (validRows.length === 0) return;

    setSaved(false);
    try {
      await Promise.all(
        validRows.map(row =>
          createBiomarker.mutateAsync({
            patientId,
            biomarkerType: row.biomarkerType as any,
            value: row.value,
            unit: row.unit,
            measurementDate: measurementDate,
            notes: row.notes || undefined,
            source: "vital_signs",
          })
        )
      );
      setSaved(true);
      setTimeout(() => {
        setOpen(false);
        setSaved(false);
        setRows([{ biomarkerType: "", value: "", unit: "", notes: "" }]);
        onSuccess?.();
      }, 1200);
    } catch (e) {
      // errors surfaced per-mutation
    }
  };

  const validCount = rows.filter(r => r.biomarkerType && r.value.trim()).length;
  const isLoading = createBiomarker.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Log Biomarkers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Quick Biomarker Entry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Quick Presets */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Quick presets</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_PRESETS.map(preset => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset.types)}
                  className="text-xs h-7"
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Measurement Date */}
          <div className="flex items-center gap-3">
            <Label className="text-sm whitespace-nowrap">Measurement Date</Label>
            <Input
              type="date"
              value={measurementDate}
              onChange={e => setMeasurementDate(e.target.value)}
              className="w-auto"
            />
          </div>

          {/* Entry Rows */}
          <div className="space-y-3">
            {rows.map((row, index) => {
              const option = BIOMARKER_OPTIONS.find(o => o.value === row.biomarkerType);
              return (
                <Card key={index} className="border border-border/60">
                  <CardContent className="pt-3 pb-3">
                    <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-2 items-end">
                      {/* Biomarker Type */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Biomarker</Label>
                        <Select value={row.biomarkerType} onValueChange={v => handleTypeChange(index, v)}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {BIOMARKER_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Value */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Value {row.unit && <span className="text-primary">({row.unit})</span>}
                        </Label>
                        <Input
                          type="text"
                          inputMode="decimal"
                          value={row.value}
                          onChange={e => handleValueChange(index, e.target.value)}
                          placeholder={option?.placeholder || "value"}
                          className="h-9"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</Label>
                        <Input
                          type="text"
                          value={row.notes}
                          onChange={e => handleNotesChange(index, e.target.value)}
                          placeholder="fasting, post-meal..."
                          className="h-9"
                        />
                      </div>

                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(index)}
                        disabled={rows.length === 1}
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Add Row */}
          <Button variant="outline" size="sm" onClick={addRow} className="gap-2 w-full">
            <Plus className="h-3 w-3" />
            Add another reading
          </Button>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              {validCount > 0 ? (
                <span>{validCount} reading{validCount > 1 ? "s" : ""} ready to save</span>
              ) : (
                <span>Select a biomarker type and enter a value</span>
              )}
            </div>
            <Button
              onClick={handleSubmit}
              disabled={validCount === 0 || isLoading || saved}
              className="gap-2 min-w-[120px]"
            >
              {saved ? (
                <><CheckCircle2 className="h-4 w-4" /> Saved!</>
              ) : isLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <>Save {validCount > 0 ? `(${validCount})` : ""}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

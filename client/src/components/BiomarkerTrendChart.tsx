import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Activity, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";

interface BiomarkerTrendChartProps {
  patientId: number;
}

// Reference ranges for key biomarkers
const REFERENCE_RANGES: Record<string, { low?: number; high: number; unit: string; label: string; color: string }> = {
  hba1c:                    { high: 5.7,  unit: "%",       label: "HbA1c",              color: "#6366f1" },
  glucose_fasting:          { low: 70, high: 99,   unit: "mg/dL",   label: "Glucose (Fasting)",  color: "#f59e0b" },
  blood_pressure_systolic:  { low: 90, high: 120,  unit: "mmHg",    label: "BP Systolic",        color: "#ef4444" },
  blood_pressure_diastolic: { low: 60, high: 80,   unit: "mmHg",    label: "BP Diastolic",       color: "#f97316" },
  weight:                   { high: 999, unit: "lbs",     label: "Weight",             color: "#10b981" },
  bmi:                      { low: 18.5, high: 24.9, unit: "kg/m²", label: "BMI",                color: "#8b5cf6" },
  total_cholesterol:        { high: 200, unit: "mg/dL",   label: "Total Cholesterol",  color: "#3b82f6" },
  ldl_cholesterol:          { high: 100, unit: "mg/dL",   label: "LDL Cholesterol",    color: "#ec4899" },
  hdl_cholesterol:          { low: 40,  high: 999, unit: "mg/dL",   label: "HDL Cholesterol",   color: "#14b8a6" },
  triglycerides:            { high: 150, unit: "mg/dL",   label: "Triglycerides",      color: "#a855f7" },
  creatinine:               { high: 1.2, unit: "mg/dL",   label: "Creatinine",         color: "#64748b" },
  egfr:                     { low: 60,  high: 999, unit: "mL/min",  label: "eGFR",               color: "#0ea5e9" },
  vitamin_d:                { low: 30,  high: 100, unit: "ng/mL",   label: "Vitamin D",          color: "#eab308" },
};

const PRIORITY_BIOMARKERS = [
  "hba1c", "blood_pressure_systolic", "blood_pressure_diastolic",
  "weight", "bmi", "total_cholesterol", "ldl_cholesterol",
  "glucose_fasting", "egfr", "vitamin_d",
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: <strong>{entry.value}</strong> {entry.payload.unit}
          </p>
        ))}
        {payload[0]?.payload?.notes && (
          <p className="text-muted-foreground mt-1 text-xs">{payload[0].payload.notes}</p>
        )}
      </div>
    );
  }
  return null;
};

function SingleBiomarkerChart({ patientId, biomarkerType }: { patientId: number; biomarkerType: string }) {
  const ref = REFERENCE_RANGES[biomarkerType];
  const { data: readings, isLoading } = trpc.enhancedDAO.getBiomarkersByType.useQuery(
    { patientId, biomarkerType },
    { enabled: !!patientId }
  );

  const chartData = useMemo(() => {
    if (!readings) return [];
    return [...readings]
      .sort((a: any, b: any) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime())
      .map((r: any) => ({
        date: new Date(r.measurementDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: parseFloat(r.value),
        unit: r.unit || ref?.unit || "",
        notes: r.notes,
      }));
  }, [readings, ref]);

  if (isLoading) return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  if (!chartData.length) return (
    <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
      No readings recorded yet
    </div>
  );

  const latest = chartData[chartData.length - 1];
  const prev = chartData.length > 1 ? chartData[chartData.length - 2] : null;
  const trend = prev ? (latest.value > prev.value ? "up" : latest.value < prev.value ? "down" : "flat") : "flat";
  const isAbnormal = ref ? (
    (ref.low !== undefined && latest.value < ref.low) ||
    (ref.high < 999 && latest.value > ref.high)
  ) : false;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold">{latest.value}</span>
          <span className="text-muted-foreground text-sm">{latest.unit}</span>
          {trend === "up" && <TrendingUp className={`h-4 w-4 ${isAbnormal ? "text-red-500" : "text-green-500"}`} />}
          {trend === "down" && <TrendingDown className={`h-4 w-4 ${isAbnormal ? "text-green-500" : "text-muted-foreground"}`} />}
          {trend === "flat" && <Minus className="h-4 w-4 text-muted-foreground" />}
        </div>
        {isAbnormal && (
          <Badge variant="destructive" className="text-xs flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Out of range
          </Badge>
        )}
        {!isAbnormal && chartData.length > 0 && (
          <Badge variant="outline" className="text-xs text-green-600 border-green-200">Normal</Badge>
        )}
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
          <Tooltip content={<CustomTooltip />} />
          {ref?.high && ref.high < 999 && (
            <ReferenceLine y={ref.high} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Max", position: "right", fontSize: 9, fill: "#ef4444" }} />
          )}
          {ref?.low !== undefined && (
            <ReferenceLine y={ref.low} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "Min", position: "right", fontSize: 9, fill: "#f59e0b" }} />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={ref?.color || "#6366f1"}
            strokeWidth={2}
            dot={{ r: 3, fill: ref?.color || "#6366f1" }}
            activeDot={{ r: 5 }}
            name={ref?.label || biomarkerType}
          />
        </LineChart>
      </ResponsiveContainer>
      {ref && (
        <p className="text-xs text-muted-foreground">
          Reference: {ref.low !== undefined ? `${ref.low}–` : "< "}{ref.high < 999 ? ref.high : "∞"} {ref.unit}
          {" · "}{chartData.length} reading{chartData.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

export default function BiomarkerTrendChart({ patientId }: BiomarkerTrendChartProps) {
  const [selectedType, setSelectedType] = useState<string>("hba1c");
  const [view, setView] = useState<"grid" | "detail">("grid");

  // Fetch all biomarkers to know which ones have data
  const { data: allBiomarkers } = trpc.enhancedDAO.getBiomarkers.useQuery(
    { patientId },
    { enabled: !!patientId }
  );

  const availableTypes = useMemo(() => {
    if (!allBiomarkers) return PRIORITY_BIOMARKERS.slice(0, 6);
    const typesWithData = new Set((allBiomarkers as any[]).map((b: any) => b.biomarkerType));
    // Prioritize types with data, then fill with priority list
    const withData = PRIORITY_BIOMARKERS.filter(t => typesWithData.has(t));
    const withoutData = PRIORITY_BIOMARKERS.filter(t => !typesWithData.has(t));
    return [...withData, ...withoutData].slice(0, 8);
  }, [allBiomarkers]);

  const typesWithData = useMemo(() => {
    if (!allBiomarkers) return new Set<string>();
    return new Set((allBiomarkers as any[]).map((b: any) => b.biomarkerType));
  }, [allBiomarkers]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              Biomarker Trends
            </CardTitle>
            <CardDescription>
              Key health markers over time · {allBiomarkers ? (allBiomarkers as any[]).length : 0} total readings
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={view === "grid" ? "default" : "outline"}
              onClick={() => setView("grid")}
            >
              Grid
            </Button>
            <Button
              size="sm"
              variant={view === "detail" ? "default" : "outline"}
              onClick={() => setView("detail")}
            >
              Detail
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {view === "grid" ? (
          <div className="grid md:grid-cols-2 gap-6">
            {availableTypes.map((type) => (
              <div
                key={type}
                className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                  typesWithData.has(type) ? "hover:border-blue-300" : "opacity-50"
                }`}
                onClick={() => { setSelectedType(type); setView("detail"); }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">
                    {REFERENCE_RANGES[type]?.label || type}
                  </h4>
                  {typesWithData.has(type) ? (
                    <Badge variant="outline" className="text-xs">Has data</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">No data</Badge>
                  )}
                </div>
                {typesWithData.has(type) ? (
                  <SingleBiomarkerChart patientId={patientId} biomarkerType={type} />
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground text-xs">
                    No readings recorded
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_BIOMARKERS.map((type) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        {REFERENCE_RANGES[type]?.label || type}
                        {typesWithData.has(type) && (
                          <span className="text-xs text-green-600">●</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => setView("grid")}>
                ← Back to Grid
              </Button>
            </div>
            <div className="border rounded-lg p-6">
              <h3 className="font-semibold mb-4">
                {REFERENCE_RANGES[selectedType]?.label || selectedType} — Full History
              </h3>
              <DetailChart patientId={patientId} biomarkerType={selectedType} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailChart({ patientId, biomarkerType }: { patientId: number; biomarkerType: string }) {
  const ref = REFERENCE_RANGES[biomarkerType];
  const { data: readings, isLoading } = trpc.enhancedDAO.getBiomarkersByType.useQuery(
    { patientId, biomarkerType },
    { enabled: !!patientId }
  );

  const chartData = useMemo(() => {
    if (!readings) return [];
    return [...readings]
      .sort((a: any, b: any) => new Date(a.measurementDate).getTime() - new Date(b.measurementDate).getTime())
      .map((r: any) => ({
        date: new Date(r.measurementDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
        value: parseFloat(r.value),
        unit: r.unit || ref?.unit || "",
        notes: r.notes,
      }));
  }, [readings, ref]);

  if (isLoading) return <div className="h-64 flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!chartData.length) return (
    <div className="h-64 flex items-center justify-center text-muted-foreground">
      No readings recorded for this biomarker yet.
    </div>
  );

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} unit={` ${ref?.unit || ""}`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {ref?.high && ref.high < 999 && (
            <ReferenceLine y={ref.high} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `Upper limit (${ref.high})`, position: "insideTopRight", fontSize: 10, fill: "#ef4444" }} />
          )}
          {ref?.low !== undefined && (
            <ReferenceLine y={ref.low} stroke="#f59e0b" strokeDasharray="5 5" label={{ value: `Lower limit (${ref.low})`, position: "insideBottomRight", fontSize: 10, fill: "#f59e0b" }} />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={ref?.color || "#6366f1"}
            strokeWidth={2.5}
            dot={{ r: 4, fill: ref?.color || "#6366f1" }}
            activeDot={{ r: 6 }}
            name={ref?.label || biomarkerType}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="border rounded p-3 text-center">
          <p className="text-muted-foreground text-xs">Latest</p>
          <p className="font-bold text-lg">{chartData[chartData.length - 1]?.value}</p>
          <p className="text-muted-foreground text-xs">{ref?.unit}</p>
        </div>
        <div className="border rounded p-3 text-center">
          <p className="text-muted-foreground text-xs">Average</p>
          <p className="font-bold text-lg">
            {(chartData.reduce((s, d) => s + d.value, 0) / chartData.length).toFixed(1)}
          </p>
          <p className="text-muted-foreground text-xs">{ref?.unit}</p>
        </div>
        <div className="border rounded p-3 text-center">
          <p className="text-muted-foreground text-xs">Readings</p>
          <p className="font-bold text-lg">{chartData.length}</p>
          <p className="text-muted-foreground text-xs">total</p>
        </div>
      </div>
    </div>
  );
}

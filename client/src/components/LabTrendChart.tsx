import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";

interface LabResult {
  id: number;
  testDate: Date | string;
  testResults: Array<{
    testName: string;
    value: string;
    unit: string;
    normalRange?: string;
    flag?: "high" | "low" | "critical" | "normal";
  }>;
}

interface LabTrendChartProps {
  labResults: LabResult[];
  testName: string;
}

// Simple anomaly detection using statistical methods
function detectAnomalies(values: number[]) {
  if (values.length < 3) return values.map(() => false);
  
  // Calculate mean and standard deviation
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  // Mark values outside 2 standard deviations as anomalies
  return values.map(val => Math.abs(val - mean) > 2 * stdDev);
}

// Extract normal range bounds
function parseNormalRange(range?: string): { min?: number; max?: number } {
  if (!range) return {};
  
  // Handle formats like "3.5-5.5", "<10", ">5", "3.5 - 5.5"
  const rangeMatch = range.match(/([\d.]+)\s*-\s*([\d.]+)/);
  if (rangeMatch) {
    return {
      min: parseFloat(rangeMatch[1]),
      max: parseFloat(rangeMatch[2])
    };
  }
  
  const lessThanMatch = range.match(/<\s*([\d.]+)/);
  if (lessThanMatch) {
    return { max: parseFloat(lessThanMatch[1]) };
  }
  
  const greaterThanMatch = range.match(/>\s*([\d.]+)/);
  if (greaterThanMatch) {
    return { min: parseFloat(greaterThanMatch[1]) };
  }
  
  return {};
}

export default function LabTrendChart({ labResults, testName }: LabTrendChartProps) {
  const chartData = useMemo(() => {
    // Filter and sort lab results by test name
    const filteredResults = labResults
      .map(lab => {
        const test = (Array.isArray(lab.testResults) ? lab.testResults : JSON.parse(lab.testResults as any))
          .find((t: any) => t.testName === testName);
        
        if (!test) return null;
        
        return {
          date: new Date(lab.testDate),
          value: parseFloat(test.value),
          unit: test.unit,
          flag: test.flag,
          normalRange: test.normalRange,
          id: lab.id
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (filteredResults.length === 0) return null;

    // Detect anomalies
    const values = filteredResults.map(r => r.value);
    const anomalies = detectAnomalies(values);

    // Get normal range from first result
    const normalRange = parseNormalRange(filteredResults[0].normalRange);

    // Format data for chart
    const data = filteredResults.map((result, idx) => ({
      date: result.date.toLocaleDateString(),
      value: result.value,
      isAnomaly: anomalies[idx],
      flag: result.flag,
      normalMin: normalRange.min,
      normalMax: normalRange.max,
    }));

    // Calculate trend
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const percentChange = ((lastValue - firstValue) / firstValue) * 100;

    return {
      data,
      unit: filteredResults[0].unit,
      normalRange,
      trend: {
        direction: percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'stable',
        percentChange: Math.abs(percentChange).toFixed(1)
      },
      anomalyCount: anomalies.filter(Boolean).length
    };
  }, [labResults, testName]);

  if (!chartData) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          No data available for {testName}
        </CardContent>
      </Card>
    );
  }

  const { data, unit, normalRange, trend, anomalyCount } = chartData;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{testName}</CardTitle>
            <CardDescription>
              Trend analysis over {data.length} measurements
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Trend Indicator */}
            {trend.direction === 'up' && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                +{trend.percentChange}%
              </Badge>
            )}
            {trend.direction === 'down' && (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <TrendingDown className="w-3 h-3 mr-1" />
                -{trend.percentChange}%
              </Badge>
            )}
            {trend.direction === 'stable' && (
              <Badge variant="outline" className="text-gray-600 border-gray-600">
                <Minus className="w-3 h-3 mr-1" />
                Stable
              </Badge>
            )}

            {/* Anomaly Alert */}
            {anomalyCount > 0 && (
              <Badge variant="outline" className="text-red-600 border-red-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                {anomalyCount} Anomal{anomalyCount > 1 ? 'ies' : 'y'}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              label={{ value: unit, angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <p className="font-semibold">{data.date}</p>
                    <p className="text-sm">
                      Value: <span className="font-semibold">{data.value} {unit}</span>
                    </p>
                    {data.flag && data.flag !== 'normal' && (
                      <Badge 
                        variant="outline" 
                        className={
                          data.flag === 'critical' ? 'text-red-600 border-red-600' :
                          data.flag === 'high' ? 'text-orange-600 border-orange-600' :
                          'text-blue-600 border-blue-600'
                        }
                      >
                        {data.flag}
                      </Badge>
                    )}
                    {data.isAnomaly && (
                      <p className="text-xs text-red-600 mt-1">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        Statistical anomaly detected
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Legend />

            {/* Normal Range Area */}
            {normalRange.min !== undefined && normalRange.max !== undefined && (
              <>
                <Area
                  type="monotone"
                  dataKey={() => normalRange.max}
                  fill="#10b981"
                  fillOpacity={0.1}
                  stroke="none"
                  name="Normal Range"
                />
                <Area
                  type="monotone"
                  dataKey={() => normalRange.min}
                  fill="#ffffff"
                  fillOpacity={1}
                  stroke="none"
                />
                <ReferenceLine 
                  y={normalRange.min} 
                  stroke="#10b981" 
                  strokeDasharray="3 3"
                  label={{ value: 'Min', position: 'right', fontSize: 10 }}
                />
                <ReferenceLine 
                  y={normalRange.max} 
                  stroke="#10b981" 
                  strokeDasharray="3 3"
                  label={{ value: 'Max', position: 'right', fontSize: 10 }}
                />
              </>
            )}

            {/* Trend Line */}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload.isAnomaly ? 6 : 4}
                    fill={payload.isAnomaly ? '#ef4444' : '#3b82f6'}
                    stroke={payload.isAnomaly ? '#dc2626' : '#2563eb'}
                    strokeWidth={2}
                  />
                );
              }}
              name={testName}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-gray-600 mb-1">Latest Value</p>
            <p className="font-semibold text-lg">
              {data[data.length - 1].value} {unit}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-gray-600 mb-1">Average</p>
            <p className="font-semibold text-lg">
              {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)} {unit}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded">
            <p className="text-gray-600 mb-1">Normal Range</p>
            <p className="font-semibold text-lg">
              {normalRange.min !== undefined && normalRange.max !== undefined
                ? `${normalRange.min} - ${normalRange.max}`
                : 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

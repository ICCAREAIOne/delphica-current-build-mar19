import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, TrendingUp, Users, Brain, Target } from "lucide-react";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Analytics() {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  const [interval, setInterval] = useState<"day" | "week" | "month">("week");

  // Fetch analytics data
  const { data: recommendationAccuracy, isLoading: loadingAccuracy } =
    trpc.analytics.getRecommendationAccuracy.useQuery({
      startDate: dateRange.from,
      endDate: dateRange.to,
    });

  const { data: collaborationMetrics, isLoading: loadingCollaboration } =
    trpc.analytics.getCollaborationMetrics.useQuery({
      startDate: dateRange.from,
      endDate: dateRange.to,
    });

  const { data: policyLearning, isLoading: loadingPolicy } =
    trpc.analytics.getPolicyLearningMetrics.useQuery({
      startDate: dateRange.from,
      endDate: dateRange.to,
    });

  const { data: outcomeMetrics, isLoading: loadingOutcomes } =
    trpc.analytics.getOutcomeMetrics.useQuery({
      startDate: dateRange.from,
      endDate: dateRange.to,
    });

  const { data: recommendationTrends, isLoading: loadingTrends } =
    trpc.analytics.getRecommendationTrends.useQuery({
      startDate: dateRange.from,
      endDate: dateRange.to,
      interval,
    });

  const { data: collaborationTrends, isLoading: loadingCollabTrends } =
    trpc.analytics.getCollaborationTrends.useQuery({
      startDate: dateRange.from,
      endDate: dateRange.to,
      interval,
    });

  const isLoading =
    loadingAccuracy ||
    loadingCollaboration ||
    loadingPolicy ||
    loadingOutcomes ||
    loadingTrends ||
    loadingCollabTrends;

  // Chart data
  const recommendationAccuracyData = {
    labels: ["Accepted", "Rejected", "Modified", "Pending"],
    datasets: [
      {
        data: [
          recommendationAccuracy?.accepted || 0,
          recommendationAccuracy?.rejected || 0,
          recommendationAccuracy?.modified || 0,
          recommendationAccuracy?.pending || 0,
        ],
        backgroundColor: [
          "rgba(34, 197, 94, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(156, 163, 175, 0.8)",
        ],
        borderColor: [
          "rgba(34, 197, 94, 1)",
          "rgba(239, 68, 68, 1)",
          "rgba(251, 191, 36, 1)",
          "rgba(156, 163, 175, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const recommendationTrendsData = {
    labels: recommendationTrends?.map((t) => t.date) || [],
    datasets: [
      {
        label: "Acceptance Rate (%)",
        data: recommendationTrends?.map((t) => t.acceptanceRate) || [],
        borderColor: "rgba(34, 197, 94, 1)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const collaborationTrendsData = {
    labels: collaborationTrends?.map((t) => t.date) || [],
    datasets: [
      {
        label: "Active Sessions",
        data: collaborationTrends?.map((t) => t.activeSessions) || [],
        backgroundColor: "rgba(59, 130, 246, 0.8)",
      },
      {
        label: "Comments",
        data: collaborationTrends?.map((t) => t.comments) || [],
        backgroundColor: "rgba(168, 85, 247, 0.8)",
      },
    ],
  };

  const outcomeDistributionData = {
    labels: ["Successful", "Adverse Events", "No Change"],
    datasets: [
      {
        data: [
          outcomeMetrics?.successful || 0,
          outcomeMetrics?.adverse || 0,
          outcomeMetrics?.noChange || 0,
        ],
        backgroundColor: [
          "rgba(34, 197, 94, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(156, 163, 175, 0.8)",
        ],
        borderColor: [
          "rgba(34, 197, 94, 1)",
          "rgba(239, 68, 68, 1)",
          "rgba(156, 163, 175, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Track treatment recommendations, collaboration, and outcomes
          </p>
        </div>

        <div className="flex gap-4">
          <Select value={interval} onValueChange={(v: any) => setInterval(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-sm font-medium">From</label>
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange({ ...dateRange, from: date })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">To</label>
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange({ ...dateRange, to: date })}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Recommendation Acceptance</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {recommendationAccuracy?.acceptanceRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {recommendationAccuracy?.accepted} of {recommendationAccuracy?.total} accepted
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Collaborations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{collaborationMetrics?.totalSessions}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {collaborationMetrics?.totalComments} comments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Policy Learning</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{policyLearning?.totalAnalyses}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {policyLearning?.uniqueDiagnoses} unique diagnoses
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Treatment Success</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {outcomeMetrics?.successRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {outcomeMetrics?.successful} of {outcomeMetrics?.totalOutcomes} successful
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recommendation Status Distribution</CardTitle>
                <CardDescription>
                  Breakdown of AI recommendation acceptance rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Pie
                    data={recommendationAccuracyData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "bottom",
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Treatment Outcome Distribution</CardTitle>
                <CardDescription>Patient outcomes from recommended treatments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Pie
                    data={outcomeDistributionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "bottom",
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recommendation Acceptance Trend</CardTitle>
                <CardDescription>
                  Track how recommendation acceptance changes over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Line
                    data={recommendationTrendsData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          ticks: {
                            callback: (value) => `${value}%`,
                          },
                        },
                      },
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Collaboration Activity</CardTitle>
                <CardDescription>
                  Multi-physician consultation sessions and engagement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <Bar
                    data={collaborationTrendsData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                        },
                      },
                      plugins: {
                        legend: {
                          position: "bottom",
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

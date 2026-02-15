import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Activity, 
  Users, 
  FileText, 
  Brain, 
  Target, 
  Shield, 
  TrendingUp,
  Search,
  Plus,
  ArrowRight,
  Loader2,
  Bell
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stats, isLoading: statsLoading } = trpc.patients.stats.useQuery(
    { physicianId: user?.id },
    { enabled: !!user }
  );

  const { data: patients, isLoading: patientsLoading } = trpc.patients.list.useQuery(
    { physicianId: user?.id },
    { enabled: !!user }
  );

  const { data: searchResults } = trpc.patients.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 2 }
  );

  const displayPatients = searchQuery.length > 2 ? searchResults : patients?.slice(0, 10);

  if (authLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">AI-Driven Physician Portal</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, Dr. {user?.name || "Physician"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/alerts">
                <Button variant="outline" className="relative">
                  <Bell className="h-4 w-4 mr-2" />
                  Alerts
                  <Badge variant="destructive" className="ml-2 px-1.5 py-0 text-xs">3</Badge>
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="default" className="bg-gradient-to-r from-primary to-blue-600">
                  <Brain className="h-4 w-4 mr-2" />
                  Try Demo
                </Button>
              </Link>
              <Link href="/patients/new">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Patient
                </Button>
              </Link>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-8">
        {/* Framework Overview */}
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Clinical Decision Support Framework - Bidirectional Workflow
            </CardTitle>
            <CardDescription>
              Causal Brain as central intelligence hub orchestrating bidirectional communication between all components for optimized precision care
            </CardDescription>
          </CardHeader>
          <CardContent>
            <img 
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663160662498/EKeXghyMCKQhzZaT.png" 
              alt="Clinical Workflow Framework with Semantic Processor" 
              className="w-full max-w-4xl mx-auto rounded-lg shadow-lg"
            />
            <div className="mt-6 p-4 bg-white/50 dark:bg-black/20 rounded-lg">
              <p className="text-sm text-foreground font-medium mb-2">Key Innovation: Bidirectional Causal Brain ↔ Delphi Communication</p>
              <p className="text-sm text-muted-foreground">
                The Causal Brain serves as the central intelligence hub, orchestrating iterative refinement with the Delphi Simulator to ensure treatment scenarios are both creative and causally valid before delivering optimized precision care.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.active || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">DAO Protocols</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground mt-1">
                Structured assessments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">AI Simulations</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground mt-1">
                Delphi scenarios run
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Care Plans</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground mt-1">
                Precision plans active
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Framework Components Quick Access */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="framework-dao hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <FileText className="h-5 w-5" />
                DAO Protocol
              </CardTitle>
              <CardDescription>Data Entry Layer</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Physician-guided or patient-initiated structured clinical data collection → Feeds Causal Brain
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Start Assessment
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="framework-semantic hover:shadow-lg transition-shadow cursor-pointer border-2 border-amber-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                🔗 Semantic Processor
              </CardTitle>
              <CardDescription>Medical Coding Bridge</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Converts clinical documentation into standardized coded data (ICD-10, CPT, SNOMED) for AI analysis
              </p>
              <div className="flex flex-wrap gap-1 mb-4">
                <Badge variant="secondary" className="text-xs">ICD-10</Badge>
                <Badge variant="secondary" className="text-xs">CPT</Badge>
                <Badge variant="secondary" className="text-xs">SNOMED</Badge>
                <Badge variant="secondary" className="text-xs">LOINC</Badge>
              </div>
              <Link href="/qa">
                <Button variant="outline" size="sm" className="w-full">
                  View QA Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="framework-delphi hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                <Brain className="h-5 w-5" />
                Delphi Simulator
              </CardTitle>
              <CardDescription>Scenario Exploration Engine</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Bidirectional communication with Causal Brain for iterative treatment scenario refinement
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Run Simulation
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="framework-causal hover:shadow-lg transition-shadow cursor-pointer border-2 border-cyan-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                <Activity className="h-5 w-5" />
                Causal Brain ⭐
              </CardTitle>
              <CardDescription className="font-semibold">Central Intelligence Hub</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Orchestrates all workflow: causal analysis, policy learning, bidirectional Delphi communication, and optimization
              </p>
              <Button variant="outline" size="sm" className="w-full">
                View Analysis
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="framework-precision hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Target className="h-5 w-5" />
                Precision Care
              </CardTitle>
              <CardDescription>Optimized Output Layer</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Receives optimized recommendations from Causal Brain and generates detailed personalized care plans
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Generate Plan
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="framework-safety hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                <Shield className="h-5 w-5" />
                Digital Review Board
              </CardTitle>
              <CardDescription>Safety verification</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Multi-layer safety checks and compliance verification system
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Review Safety
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <TrendingUp className="h-5 w-5" />
                Marketplace Entry
              </CardTitle>
              <CardDescription>Continuous Learning Loop</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Tracks real-world outcomes and feeds data back to Causal Brain for continuous model improvement
              </p>
              <Link href="/analytics">
                <Button variant="outline" size="sm" className="w-full">
                  View Analytics
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Patients */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Patients</CardTitle>
                <CardDescription>Quick access to your patient list</CardDescription>
              </div>
              <Link href="/patients">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patients by name or MRN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {patientsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : displayPatients && displayPatients.length > 0 ? (
              <div className="space-y-3">
                {displayPatients.map((patient) => (
                  <Link key={patient.id} href={`/patients/${patient.id}`}>
                    <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {patient.firstName[0]}{patient.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            MRN: {patient.mrn}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          className={
                            patient.status === "active" ? "status-active" :
                            patient.status === "inactive" ? "status-inactive" :
                            "bg-muted"
                          }
                        >
                          {patient.status}
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No patients found</p>
                <Link href="/patients/new">
                  <Button variant="link" className="mt-2">
                    Add your first patient
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Search, 
  Star, 
  ExternalLink,
  Filter,
  TrendingUp,
  Heart,
  Brain,
  Activity,
  Pill,
  Stethoscope,
  Shield,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Streamdown } from "streamdown";

interface Protocol {
  id: string;
  title: string;
  category: string;
  condition: string;
  specialty: string;
  summary: string;
  evidenceLevel: "A" | "B" | "C" | "D";
  lastReviewed: string;
  viewCount: number;
  isFavorite: boolean;
}

// Mock protocols data
const MOCK_PROTOCOLS: Protocol[] = [
  {
    id: "1",
    title: "Type 2 Diabetes Management Protocol",
    category: "chronic_care",
    condition: "Type 2 Diabetes",
    specialty: "Endocrinology",
    summary: "Comprehensive evidence-based protocol for managing Type 2 Diabetes Mellitus, including glycemic control targets, medication algorithms, and lifestyle interventions.",
    evidenceLevel: "A",
    lastReviewed: "2026-01-15",
    viewCount: 1247,
    isFavorite: true,
  },
  {
    id: "2",
    title: "Hypertension Treatment Guidelines",
    category: "treatment",
    condition: "Hypertension",
    specialty: "Cardiology",
    summary: "Updated guidelines for hypertension management based on ACC/AHA recommendations, including blood pressure targets and first-line antihypertensive therapy.",
    evidenceLevel: "A",
    lastReviewed: "2026-02-01",
    viewCount: 982,
    isFavorite: true,
  },
  {
    id: "3",
    title: "Acute Chest Pain Evaluation",
    category: "emergency",
    condition: "Acute Chest Pain",
    specialty: "Emergency Medicine",
    summary: "Rapid assessment protocol for acute chest pain presentations, including HEART score calculation and decision pathways for cardiac workup.",
    evidenceLevel: "A",
    lastReviewed: "2025-12-20",
    viewCount: 856,
    isFavorite: false,
  },
  {
    id: "4",
    title: "Anticoagulation in Atrial Fibrillation",
    category: "medication",
    condition: "Atrial Fibrillation",
    specialty: "Cardiology",
    summary: "Evidence-based approach to anticoagulation therapy in patients with atrial fibrillation, including CHA2DS2-VASc and HAS-BLED scoring.",
    evidenceLevel: "A",
    lastReviewed: "2026-01-10",
    viewCount: 734,
    isFavorite: false,
  },
  {
    id: "5",
    title: "COPD Exacerbation Management",
    category: "treatment",
    condition: "COPD",
    specialty: "Pulmonology",
    summary: "Protocol for managing acute exacerbations of chronic obstructive pulmonary disease, including bronchodilator therapy and corticosteroid use.",
    evidenceLevel: "B",
    lastReviewed: "2025-11-30",
    viewCount: 623,
    isFavorite: false,
  },
  {
    id: "6",
    title: "Depression Screening and Treatment",
    category: "diagnosis",
    condition: "Major Depressive Disorder",
    specialty: "Psychiatry",
    summary: "Systematic approach to depression screening using PHQ-9 and evidence-based treatment algorithms including pharmacotherapy and psychotherapy.",
    evidenceLevel: "A",
    lastReviewed: "2026-01-25",
    viewCount: 891,
    isFavorite: true,
  },
  {
    id: "7",
    title: "Osteoporosis Prevention and Treatment",
    category: "prevention",
    condition: "Osteoporosis",
    specialty: "Endocrinology",
    summary: "Comprehensive protocol for osteoporosis risk assessment, DEXA scan interpretation, and pharmacologic interventions to prevent fractures.",
    evidenceLevel: "A",
    lastReviewed: "2025-12-15",
    viewCount: 567,
    isFavorite: false,
  },
  {
    id: "8",
    title: "Acute Stroke Management",
    category: "emergency",
    condition: "Acute Ischemic Stroke",
    specialty: "Neurology",
    summary: "Time-critical protocol for acute stroke evaluation and management, including tPA eligibility criteria and thrombectomy considerations.",
    evidenceLevel: "A",
    lastReviewed: "2026-02-05",
    viewCount: 1034,
    isFavorite: false,
  },
  {
    id: "9",
    title: "Fatigue Evaluation and Management Protocol",
    category: "diagnosis",
    condition: "Fatigue",
    specialty: "Primary Care",
    summary: "Comprehensive evidence-based protocol for evaluating and managing patients presenting with persistent fatigue, including systematic assessment, differential diagnosis, and treatment strategies.",
    evidenceLevel: "A",
    lastReviewed: "2023-12-01",
    viewCount: 0,
    isFavorite: false,
  },
];

const EVIDENCE_COLORS = {
  A: "bg-green-100 text-green-800 border-green-300",
  B: "bg-blue-100 text-blue-800 border-blue-300",
  C: "bg-yellow-100 text-yellow-800 border-yellow-300",
  D: "bg-orange-100 text-orange-800 border-orange-300",
};

const CATEGORY_ICONS = {
  diagnosis: Stethoscope,
  treatment: Pill,
  prevention: Shield,
  emergency: Activity,
  chronic_care: Heart,
  medication: Pill,
  procedure: Brain,
};

export default function ClinicalLibrary() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [protocols] = useState<Protocol[]>(MOCK_PROTOCOLS);

  const filteredProtocols = protocols.filter(protocol => {
    const matchesSearch = 
      protocol.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      protocol.condition.toLowerCase().includes(searchQuery.toLowerCase()) ||
      protocol.summary.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === "all" || protocol.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const favoriteProtocols = protocols.filter(p => p.isFavorite);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access the clinical library</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
              Clinical Decision Support Library
            </h1>
            <p className="text-slate-600 mt-1">Evidence-based protocols and treatment guidelines</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button variant="outline">← Back to Dashboard</Button>
            </Link>
            <Link href="/knowledge-base">
              <Button variant="outline" className="gap-2">
                <Brain className="h-4 w-4" />
                Knowledge Base
              </Button>
            </Link>
            <Link href="/protocols/analytics">
              <Button variant="outline" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Link href="/library/author">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Protocol
              </Button>
            </Link>
          </div>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search protocols by condition, keyword, or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="flex flex-wrap sm:grid sm:grid-cols-4 w-full gap-1">
            <TabsTrigger value="all">All Protocols ({protocols.length})</TabsTrigger>
            <TabsTrigger value="favorites">Favorites ({favoriteProtocols.length})</TabsTrigger>
            <TabsTrigger value="recent">Recently Viewed</TabsTrigger>
            <TabsTrigger value="popular">Most Popular</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                All Categories
              </Button>
              <Button
                variant={selectedCategory === "emergency" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("emergency")}
              >
                Emergency
              </Button>
              <Button
                variant={selectedCategory === "chronic_care" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("chronic_care")}
              >
                Chronic Care
              </Button>
              <Button
                variant={selectedCategory === "treatment" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("treatment")}
              >
                Treatment
              </Button>
              <Button
                variant={selectedCategory === "diagnosis" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("diagnosis")}
              >
                Diagnosis
              </Button>
              <Button
                variant={selectedCategory === "prevention" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("prevention")}
              >
                Prevention
              </Button>
            </div>

            {/* Protocol Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProtocols.map((protocol) => {
                const CategoryIcon = CATEGORY_ICONS[protocol.category as keyof typeof CATEGORY_ICONS] || BookOpen;
                return (
                  <Card key={protocol.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <CategoryIcon className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{protocol.title}</CardTitle>
                            <CardDescription className="mt-1">
                              {protocol.condition} • {protocol.specialty}
                            </CardDescription>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <Star className={`h-4 w-4 ${protocol.isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-slate-600">{protocol.summary}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={EVIDENCE_COLORS[protocol.evidenceLevel]}>
                            Evidence Level {protocol.evidenceLevel}
                          </Badge>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {protocol.viewCount} views
                          </span>
                        </div>
                        <Link href={protocol.id === "9" ? "/protocols/fatigue" : "#"}>
                          <Button variant="link" className="gap-1 p-0 h-auto">
                            View Protocol
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                      
                      <div className="text-xs text-slate-500">
                        Last reviewed: {new Date(protocol.lastReviewed).toLocaleDateString()}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredProtocols.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600">No protocols found matching your search criteria</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {favoriteProtocols.map((protocol) => {
                const CategoryIcon = CATEGORY_ICONS[protocol.category as keyof typeof CATEGORY_ICONS] || BookOpen;
                return (
                  <Card key={protocol.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <CategoryIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{protocol.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {protocol.condition}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full">
                        View Protocol
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="recent">
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Your recently viewed protocols will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="popular">
            <Card>
              <CardContent className="py-12 text-center">
                <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600">Most popular protocols among physicians</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

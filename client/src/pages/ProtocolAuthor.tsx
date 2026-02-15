import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Save, 
  Eye, 
  Sparkles,
  Plus,
  Trash2,
  ArrowLeft,
  FileText
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

interface ProtocolSection {
  id: string;
  title: string;
  content: string;
}

const PROTOCOL_TEMPLATES = [
  {
    id: "diagnostic",
    name: "Diagnostic Protocol",
    sections: [
      { title: "Clinical Presentation", content: "" },
      { title: "Differential Diagnosis", content: "" },
      { title: "Diagnostic Workup", content: "" },
      { title: "Interpretation Guidelines", content: "" },
    ]
  },
  {
    id: "treatment",
    name: "Treatment Protocol",
    sections: [
      { title: "Indications", content: "" },
      { title: "Contraindications", content: "" },
      { title: "Treatment Steps", content: "" },
      { title: "Monitoring Parameters", content: "" },
      { title: "Expected Outcomes", content: "" },
    ]
  },
  {
    id: "emergency",
    name: "Emergency Protocol",
    sections: [
      { title: "Recognition Criteria", content: "" },
      { title: "Immediate Actions", content: "" },
      { title: "Stabilization Measures", content: "" },
      { title: "Escalation Criteria", content: "" },
    ]
  },
  {
    id: "preventive",
    name: "Preventive Care Protocol",
    sections: [
      { title: "Target Population", content: "" },
      { title: "Screening Recommendations", content: "" },
      { title: "Intervention Strategies", content: "" },
      { title: "Follow-up Schedule", content: "" },
    ]
  },
];

export default function ProtocolAuthor() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [evidenceLevel, setEvidenceLevel] = useState("");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<ProtocolSection[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleTemplateSelect = (templateId: string) => {
    const template = PROTOCOL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setSections(template.sections.map((s, i) => ({
        id: `section-${i}`,
        title: s.title,
        content: s.content
      })));
      toast.success(`Applied ${template.name} template`);
    }
  };

  const addSection = () => {
    setSections([...sections, {
      id: `section-${Date.now()}`,
      title: "",
      content: ""
    }]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSection = (id: string, field: 'title' | 'content', value: string) => {
    setSections(sections.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleAIGenerate = async () => {
    if (!title || !specialty) {
      toast.error("Please provide protocol title and specialty first");
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      toast.success("AI-generated content added to sections");
      setSections(sections.map(s => ({
        ...s,
        content: s.content || `[AI-generated content for ${s.title} based on current evidence and best practices for ${specialty}]`
      })));
      setIsGenerating(false);
    }, 2000);
  };

  const handleSave = () => {
    if (!title || !specialty || !evidenceLevel || sections.length === 0) {
      toast.error("Please complete all required fields");
      return;
    }

    // Save protocol (would call tRPC mutation in real implementation)
    toast.success("Protocol saved successfully!");
    setTimeout(() => setLocation("/library"), 1000);
  };

  const handlePreview = () => {
    toast.info("Preview mode - showing how protocol will appear in library");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/library">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Library
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BookOpen className="h-8 w-8 text-primary" />
                Protocol Authoring Tool
              </h1>
              <p className="text-muted-foreground mt-1">
                Create and share evidence-based clinical protocols
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Protocol
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Protocol Information</CardTitle>
                <CardDescription>Basic details about your protocol</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Protocol Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Management of Acute Hypertension"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="specialty">Specialty *</Label>
                    <Select value={specialty} onValueChange={setSpecialty}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cardiology">Cardiology</SelectItem>
                        <SelectItem value="endocrinology">Endocrinology</SelectItem>
                        <SelectItem value="emergency">Emergency Medicine</SelectItem>
                        <SelectItem value="family">Family Medicine</SelectItem>
                        <SelectItem value="internal">Internal Medicine</SelectItem>
                        <SelectItem value="neurology">Neurology</SelectItem>
                        <SelectItem value="pediatrics">Pediatrics</SelectItem>
                        <SelectItem value="psychiatry">Psychiatry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="evidence">Evidence Level *</Label>
                    <Select value={evidenceLevel} onValueChange={setEvidenceLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Level A - High Quality Evidence</SelectItem>
                        <SelectItem value="B">Level B - Moderate Quality Evidence</SelectItem>
                        <SelectItem value="C">Level C - Low Quality Evidence</SelectItem>
                        <SelectItem value="expert">Expert Opinion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief overview of the protocol's purpose and scope"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Protocol Content */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Protocol Content</CardTitle>
                    <CardDescription>Add sections to your protocol</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleAIGenerate}
                      disabled={isGenerating}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {isGenerating ? "Generating..." : "AI Assist"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={addSection}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {sections.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No sections yet. Choose a template or add sections manually.</p>
                  </div>
                ) : (
                  sections.map((section, index) => (
                    <div key={section.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Section {index + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSection(section.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <Input
                        placeholder="Section title"
                        value={section.title}
                        onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                      />
                      <Textarea
                        placeholder="Section content..."
                        value={section.content}
                        onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                        rows={6}
                      />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Templates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Protocol Templates</CardTitle>
                <CardDescription>Start with a predefined structure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {PROTOCOL_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate === template.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    {template.name}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Authoring Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div>
                  <strong className="text-foreground">Be Specific:</strong>
                  <p>Use clear, actionable language with specific parameters and thresholds.</p>
                </div>
                <div>
                  <strong className="text-foreground">Cite Evidence:</strong>
                  <p>Reference guidelines, studies, or expert consensus where applicable.</p>
                </div>
                <div>
                  <strong className="text-foreground">Consider Safety:</strong>
                  <p>Include contraindications, warnings, and monitoring requirements.</p>
                </div>
                <div>
                  <strong className="text-foreground">Keep Updated:</strong>
                  <p>Review and update protocols regularly as evidence evolves.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter,
  Pill,
  Activity,
  FileText,
  ExternalLink,
  Tag
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link } from "wouter";

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: entries, isLoading } = trpc.knowledgeBase.list.useQuery();

  const categories = entries 
    ? Array.from(new Set(entries.map((e: any) => e.category))) as string[]
    : [];

  const filteredEntries = entries?.filter((entry: any) => {
    const matchesSearch = !searchQuery || 
      entry.compoundName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = !selectedCategory || entry.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Activity className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading knowledge base...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-8 w-8" />
              Clinical Knowledge Base
            </h1>
            <p className="text-muted-foreground mt-1">
              Evidence-based treatment information integrated with Causal Brain
            </p>
          </div>
          <Link href="/knowledge-base/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          </Link>
        </div>

        {/* Search and Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search compounds, mechanisms, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 items-center">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                  >
                    All
                  </Button>
                  {categories.map((category: string) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{entries?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{categories.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Search Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{filteredEntries?.length || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Knowledge Entries */}
        {filteredEntries && filteredEntries.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory
                  ? "No entries match your search criteria"
                  : "No knowledge entries yet. Add your first entry to get started."}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-4">
          {filteredEntries?.map((entry: any) => (
            <Card key={entry.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="h-5 w-5 text-blue-600" />
                      {entry.compoundName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      <Badge variant="outline" className="mr-2">
                        {entry.category}
                      </Badge>
                      {entry.summary}
                    </CardDescription>
                  </div>
                  <Link href={`/knowledge-base/${entry.id}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Mechanisms */}
                  {entry.mechanisms && entry.mechanisms.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Mechanisms of Action
                      </h4>
                      <ul className="space-y-1">
                        {entry.mechanisms.slice(0, 2).map((mech: any, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground">
                            • <span className="font-medium">{mech.name}:</span> {mech.description.substring(0, 100)}...
                          </li>
                        ))}
                        {entry.mechanisms.length > 2 && (
                          <li className="text-sm text-blue-600">
                            + {entry.mechanisms.length - 2} more mechanisms
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Clinical Evidence */}
                  {entry.clinicalEvidence && entry.clinicalEvidence.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Clinical Evidence
                      </h4>
                      <ul className="space-y-1">
                        {entry.clinicalEvidence.slice(0, 2).map((evidence: any, idx: number) => (
                          <li key={idx} className="text-sm text-muted-foreground">
                            • {evidence.finding.substring(0, 120)}...
                          </li>
                        ))}
                        {entry.clinicalEvidence.length > 2 && (
                          <li className="text-sm text-blue-600">
                            + {entry.clinicalEvidence.length - 2} more findings
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Tags */}
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {entry.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Sources */}
                  {entry.sources && entry.sources.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ExternalLink className="h-4 w-4" />
                      <span>{entry.sources.length} source{entry.sources.length > 1 ? 's' : ''} cited</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

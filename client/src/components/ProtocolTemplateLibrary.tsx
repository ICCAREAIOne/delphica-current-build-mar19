import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, TrendingUp, Clock, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProtocolTemplateLibraryProps {
  onApplyTemplate: (templateData: any) => void;
}

export function ProtocolTemplateLibrary({ onApplyTemplate }: ProtocolTemplateLibraryProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  // Get all templates
  const { data: templates, isLoading } = trpc.templates.getAll.useQuery();

  // Use template mutation
  const useTemplate = trpc.templates.use.useMutation();

  // Filter templates based on search
  const filteredTemplates = templates?.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApplyTemplate = (template: any) => {
    // Track usage
    useTemplate.mutate({ templateId: template.id });

    // Apply template data
    onApplyTemplate(template.templateData);

    toast({
      title: 'Template Applied',
      description: `"${template.name}" has been applied to the protocol`,
    });

    setSelectedTemplate(null);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading templates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Protocol Template Library
          </CardTitle>
          <CardDescription>
            Quick-start templates for common conditions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates by name, category, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Templates Grid */}
          {filteredTemplates && filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      {template.isDefault && (
                        <Badge variant="secondary" className="text-xs">
                          Default
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {template.category}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {template.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>{template.usageCount} uses</span>
                      </div>
                      {template.lastUsedAt && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(template.lastUsedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm
                ? 'No templates found matching your search'
                : 'No templates available'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Template Preview Dialog */}
      {selectedTemplate && (
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>{selectedTemplate.name}</DialogTitle>
              <DialogDescription>
                {selectedTemplate.description || 'Protocol template preview'}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[500px] pr-4">
              <div className="space-y-4">
                {/* Diagnosis */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Diagnosis</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.templateData.diagnosis}
                  </p>
                </div>

                {/* Duration */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Duration</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.templateData.duration}
                  </p>
                </div>

                {/* Goals */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Treatment Goals</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedTemplate.templateData.goals.map((goal: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground">
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Interventions */}
                <div>
                  <h4 className="font-medium text-sm mb-2">Interventions</h4>
                  <div className="space-y-2">
                    {selectedTemplate.templateData.interventions.map((intervention: any, idx: number) => (
                      <div key={idx}>
                        <p className="text-sm font-medium">{intervention.category}</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          {intervention.items.map((item: string, itemIdx: number) => (
                            <li key={itemIdx} className="text-sm text-muted-foreground">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Medications */}
                {selectedTemplate.templateData.medications && selectedTemplate.templateData.medications.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Medications</h4>
                    <div className="space-y-2">
                      {selectedTemplate.templateData.medications.map((med: any, idx: number) => (
                        <div key={idx} className="text-sm">
                          <p className="font-medium">{med.name}</p>
                          <p className="text-muted-foreground">
                            {med.dosage} - {med.frequency}
                          </p>
                          {med.instructions && (
                            <p className="text-muted-foreground text-xs italic">
                              {med.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lifestyle */}
                {selectedTemplate.templateData.lifestyle && selectedTemplate.templateData.lifestyle.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Lifestyle Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedTemplate.templateData.lifestyle.map((item: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Follow-up */}
                {selectedTemplate.templateData.followUp && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Follow-up Care</h4>
                    <p className="text-sm text-muted-foreground">
                      Frequency: {selectedTemplate.templateData.followUp.frequency}
                    </p>
                    {selectedTemplate.templateData.followUp.metrics && (
                      <div className="mt-2">
                        <p className="text-sm font-medium">Metrics to Monitor:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {selectedTemplate.templateData.followUp.metrics.map((metric: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground">
                              {metric}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Warnings */}
                {selectedTemplate.templateData.warnings && selectedTemplate.templateData.warnings.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Safety Warnings</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedTemplate.templateData.warnings.map((warning: string, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                Cancel
              </Button>
              <Button onClick={() => handleApplyTemplate(selectedTemplate)}>
                <Check className="mr-2 h-4 w-4" />
                Apply Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

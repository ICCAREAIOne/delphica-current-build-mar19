import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Clock, User, FileText, GitCompare } from 'lucide-react';

interface TemplateVersionHistoryProps {
  templateId: number;
  templateName: string;
}

export function TemplateVersionHistory({ templateId, templateName }: TemplateVersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<number[]>([]);

  const { data: versions, isLoading } = (trpc.templates as any).getVersionHistory.useQuery(
    { templateId },
    { enabled: isOpen }
  );

  const handleVersionSelect = (versionId: number) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(selectedVersions.filter(id => id !== versionId));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions([...selectedVersions, versionId]);
    }
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      // Open comparison modal
      console.log('Compare versions:', selectedVersions);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Clock className="h-4 w-4" />
        Version History
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Version History: {templateName}</span>
              {selectedVersions.length === 2 && (
                <Button
                  size="sm"
                  onClick={handleCompare}
                  className="gap-2"
                >
                  <GitCompare className="h-4 w-4" />
                  Compare Selected
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4">
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading version history...
              </div>
            )}

            {!isLoading && versions && versions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No version history available
              </div>
            )}

            {!isLoading && versions && versions.length > 0 && (
              <div className="space-y-4">
                {versions.map((version: any) => (
                  <div
                    key={version.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedVersions.includes(version.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => handleVersionSelect(version.id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          v{version.versionNumber}
                        </Badge>
                        {version.versionNumber === versions[0].versionNumber && (
                          <Badge variant="default">Latest</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium text-sm">Change Summary</div>
                          <div className="text-sm text-muted-foreground">
                            {version.changeSummary}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Changed by User #{version.changedBy}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(version.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Template data preview */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          <span className="font-medium">Goals:</span>{' '}
                          {version.templateData.goals?.length || 0} items
                        </div>
                        <div>
                          <span className="font-medium">Medications:</span>{' '}
                          {version.templateData.medications?.length || 0} items
                        </div>
                        <div>
                          <span className="font-medium">Interventions:</span>{' '}
                          {version.templateData.interventions?.length || 0} categories
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedVersions.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              {selectedVersions.length === 1
                ? 'Select one more version to compare'
                : 'Click "Compare Selected" to view differences'}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

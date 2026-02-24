import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Save, Trash2, Star, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TemplatePresetManagerProps {
  onSelectPreset?: (preset: any) => void;
  category?: string;
}

export function TemplatePresetManager({ onSelectPreset, category }: TemplatePresetManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const { data: presets, isLoading, refetch } = (trpc.templates as any).getPresets.useQuery(
    { category },
    { enabled: isOpen }
  );

  const deletePreset = (trpc.templates as any).deletePreset.useMutation({
    onSuccess: () => {
      toast({
        title: 'Preset deleted',
        description: 'Template preset has been removed',
      });
      refetch();
    },
  });

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this preset?')) {
      await deletePreset.mutateAsync({ id });
    }
  };

  const handleSelectPreset = (preset: any) => {
    if (onSelectPreset) {
      onSelectPreset(preset);
      setIsOpen(false);
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
        <Star className="h-4 w-4" />
        My Presets
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>My Template Presets</DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4">
            {isLoading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading presets...
              </div>
            )}

            {!isLoading && presets && presets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No saved presets yet</p>
                <p className="text-sm mt-2">
                  Customize a template and save it as a preset for quick access
                </p>
              </div>
            )}

            {!isLoading && presets && presets.length > 0 && (
              <div className="grid gap-4">
                {presets.map((preset: any) => (
                  <div
                    key={preset.id}
                    className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{preset.name}</h3>
                        {preset.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {preset.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectPreset(preset)}
                        >
                          Use Preset
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(preset.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <Badge variant="secondary">{preset.category}</Badge>
                      
                      {preset.tags && preset.tags.length > 0 && (
                        <div className="flex gap-1">
                          {preset.tags.slice(0, 3).map((tag: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {preset.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{preset.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Used:</span>{' '}
                        <span className="font-medium">{preset.usageCount} times</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {new Date(preset.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Template data summary */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          <span className="font-medium">Goals:</span>{' '}
                          {preset.templateData.goals?.length || 0} items
                        </div>
                        <div>
                          <span className="font-medium">Medications:</span>{' '}
                          {preset.templateData.medications?.length || 0} items
                        </div>
                        <div>
                          <span className="font-medium">Interventions:</span>{' '}
                          {preset.templateData.interventions?.length || 0} categories
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface SavePresetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateData: any;
  baseTemplateId?: number;
  category: string;
}

export function SavePresetDialog({
  isOpen,
  onClose,
  templateData,
  baseTemplateId,
  category,
}: SavePresetDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const { toast } = useToast();

  const createPreset = (trpc.templates as any).createPreset.useMutation({
    onSuccess: () => {
      toast({
        title: 'Preset saved',
        description: 'Your template preset has been saved successfully',
      });
      onClose();
      setName('');
      setDescription('');
      setTags('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save preset',
        variant: 'destructive',
      });
    },
  });

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your preset',
        variant: 'destructive',
      });
      return;
    }

    await createPreset.mutateAsync({
      baseTemplateId,
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      templateData,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Preset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="preset-name">Preset Name *</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Hypertension Protocol"
            />
          </div>

          <div>
            <Label htmlFor="preset-description">Description</Label>
            <Textarea
              id="preset-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this preset"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="preset-tags">Tags (comma-separated)</Label>
            <Input
              id="preset-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., hypertension, elderly, high-risk"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={createPreset.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createPreset.isPending ? 'Saving...' : 'Save Preset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

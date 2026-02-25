import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, CheckCircle2, AlertCircle, Trash2, Edit, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { GenerateCMS1500Dialog } from './GenerateCMS1500Dialog';

interface MedicalCodeReviewMultiSelectProps {
  protocolDeliveryId: number;
  carePlanId: number;
}

export function MedicalCodeReviewMultiSelect({ protocolDeliveryId, carePlanId }: MedicalCodeReviewMultiSelectProps) {
  const { toast } = useToast();
  const [selectedCodeIds, setSelectedCodeIds] = useState<Set<number>>(new Set());
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
  const [cms1500DialogOpen, setCms1500DialogOpen] = useState(false);

  // Fetch protocol codes
  const { data: protocolCodes, refetch: refetchCodes } = trpc.medicalCoding.getProtocolCodes.useQuery({
    protocolDeliveryId,
  });

  // Batch verify mutation
  const batchVerify = trpc.medicalCoding.batchVerifyCodes.useMutation({
    onSuccess: (data) => {
      toast({ title: `Verified ${data.count} codes successfully` });
      refetchCodes();
      setSelectedCodeIds(new Set());
    },
    onError: (error) => {
      toast({ title: 'Failed to verify codes', description: error.message, variant: 'destructive' });
    },
  });

  // Batch remove mutation
  const batchRemove = trpc.medicalCoding.batchRemoveCodes.useMutation({
    onSuccess: (data) => {
      toast({ title: `Removed ${data.count} codes successfully` });
      refetchCodes();
      setSelectedCodeIds(new Set());
      setBatchDeleteConfirmOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Failed to remove codes', description: error.message, variant: 'destructive' });
    },
  });

  // Group codes by type
  const icd10Codes = protocolCodes?.filter((c) => c.codeType === 'ICD10') || [];
  const cptCodes = protocolCodes?.filter((c) => c.codeType === 'CPT') || [];
  const snomedCodes = protocolCodes?.filter((c) => c.codeType === 'SNOMED') || [];

  const handleSelectAll = (codes: any[]) => {
    const newSelected = new Set(selectedCodeIds);
    const allSelected = codes.every(c => selectedCodeIds.has(c.id));
    
    if (allSelected) {
      codes.forEach(c => newSelected.delete(c.id));
    } else {
      codes.forEach(c => newSelected.add(c.id));
    }
    setSelectedCodeIds(newSelected);
  };

  const handleToggleCode = (codeId: number) => {
    const newSelected = new Set(selectedCodeIds);
    if (newSelected.has(codeId)) {
      newSelected.delete(codeId);
    } else {
      newSelected.add(codeId);
    }
    setSelectedCodeIds(newSelected);
  };

  const handleBatchVerify = () => {
    if (selectedCodeIds.size === 0) {
      toast({ title: 'No codes selected', variant: 'destructive' });
      return;
    }
    batchVerify.mutate({ assignmentIds: Array.from(selectedCodeIds) });
  };

  const handleBatchRemove = () => {
    if (selectedCodeIds.size === 0) {
      toast({ title: 'No codes selected', variant: 'destructive' });
      return;
    }
    setBatchDeleteConfirmOpen(true);
  };

  const confirmBatchRemove = () => {
    batchRemove.mutate({ assignmentIds: Array.from(selectedCodeIds) });
  };

  const renderCodeList = (codes: any[], title: string) => {
    if (codes.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No {title} codes assigned yet
        </div>
      );
    }

    const allSelected = codes.every(c => selectedCodeIds.has(c.id));

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Checkbox
            checked={allSelected}
            onCheckedChange={() => handleSelectAll(codes)}
          />
          <span className="text-sm font-medium">Select All</span>
        </div>
        {codes.map((code) => (
          <Card key={code.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedCodeIds.has(code.id)}
                  onCheckedChange={() => handleToggleCode(code.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-lg font-mono font-semibold">{code.code}</code>
                    {code.isPrimary && <Badge variant="default">Primary</Badge>}
                    {code.verifiedBy ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{code.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Method: {code.assignmentMethod}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Batch Action Toolbar */}
      {selectedCodeIds.size > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">{selectedCodeIds.size} code(s) selected</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleBatchVerify}
                  disabled={batchVerify.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Verify Selected
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBatchRemove}
                  disabled={batchRemove.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCms1500DialogOpen(true)}
                  className="ml-auto"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Generate CMS-1500
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Code Tabs */}
      <Tabs defaultValue="icd10" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="icd10">
            ICD-10 Diagnosis ({icd10Codes.length})
          </TabsTrigger>
          <TabsTrigger value="cpt">
            CPT Procedures ({cptCodes.length})
          </TabsTrigger>
          <TabsTrigger value="snomed">
            SNOMED Terms ({snomedCodes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="icd10" className="mt-6">
          {renderCodeList(icd10Codes, 'ICD-10')}
        </TabsContent>

        <TabsContent value="cpt" className="mt-6">
          {renderCodeList(cptCodes, 'CPT')}
        </TabsContent>

        <TabsContent value="snomed" className="mt-6">
          {renderCodeList(snomedCodes, 'SNOMED')}
        </TabsContent>
      </Tabs>

      {/* Generate CMS-1500 Dialog */}
      <GenerateCMS1500Dialog
        open={cms1500DialogOpen}
        onOpenChange={setCms1500DialogOpen}
        protocolDeliveryId={protocolDeliveryId}
        patientName="Patient" 
      />

      {/* Batch Delete Confirmation Dialog */}
      <Dialog open={batchDeleteConfirmOpen} onOpenChange={setBatchDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Batch Removal</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {selectedCodeIds.size} selected code(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmBatchRemove}>
              Remove {selectedCodeIds.size} Code(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, Plus, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MedicalCodeReviewProps {
  protocolDeliveryId: number;
  carePlanId: number;
}

export function MedicalCodeReview({ protocolDeliveryId, carePlanId }: MedicalCodeReviewProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCodeType, setSelectedCodeType] = useState<'ICD10' | 'CPT' | 'SNOMED' | ''>('');
  const [isAddCodeDialogOpen, setIsAddCodeDialogOpen] = useState(false);
  const [newCode, setNewCode] = useState({ code: '', description: '', codeType: 'ICD10' as 'ICD10' | 'CPT' | 'SNOMED' });

  // Fetch protocol codes
  const { data: protocolCodes, refetch: refetchCodes } = trpc.medicalCoding.getProtocolCodes.useQuery({
    protocolDeliveryId,
  });

  // Search codes query
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Assign code mutation
  const assignCode = trpc.medicalCoding.assignCode.useMutation({
    onSuccess: () => {
      toast({ title: 'Code assigned successfully' });
      refetchCodes();
      setIsAddCodeDialogOpen(false);
      setNewCode({ code: '', description: '', codeType: 'ICD10' });
    },
    onError: (error) => {
      toast({ title: 'Failed to assign code', description: error.message, variant: 'destructive' });
    },
  });

  // Verify code mutation
  const verifyCode = trpc.medicalCoding.verifyCode.useMutation({
    onSuccess: () => {
      toast({ title: 'Code verified successfully' });
      refetchCodes();
    },
    onError: (error) => {
      toast({ title: 'Failed to verify code', description: error.message, variant: 'destructive' });
    },
  });

  // Group codes by type
  const icd10Codes = protocolCodes?.filter((c) => c.codeType === 'ICD10') || [];
  const cptCodes = protocolCodes?.filter((c) => c.codeType === 'CPT') || [];
  const snomedCodes = protocolCodes?.filter((c) => c.codeType === 'SNOMED') || [];

  const handleSearchCodes = async () => {
    if (!searchTerm) {
      toast({ title: 'Please enter a search term', variant: 'destructive' });
      return;
    }

    // For now, just show a message - full search implementation would require additional UI
    toast({ title: 'Search functionality', description: 'Use the Add Code button to manually assign codes' });
  };

  const handleAssignCode = async () => {
    if (!newCode.code || !newCode.description) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    // First, search for existing code or create new one
    // For simplicity, we'll use a placeholder medicalCodeId
    // In production, you'd search/create the code first
    await assignCode.mutateAsync({
      protocolDeliveryId,
      carePlanId,
      medicalCodeId: 1, // Placeholder - would come from search/create
      codeType: newCode.codeType,
      assignmentMethod: 'manual',
    });
  };

  const handleVerifyCode = async (assignmentId: number) => {
    await verifyCode.mutateAsync({ assignmentId });
  };

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null;
    
    const variant = confidence >= 0.8 ? 'default' : confidence >= 0.6 ? 'secondary' : 'outline';
    const label = confidence >= 0.8 ? 'High' : confidence >= 0.6 ? 'Medium' : 'Low';
    
    return (
      <Badge variant={variant} className="ml-2">
        {label} ({(confidence * 100).toFixed(0)}%)
      </Badge>
    );
  };

  const CodeList = ({ codes, type }: { codes: typeof protocolCodes; type: string }) => {
    if (!codes || codes.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="mx-auto h-12 w-12 mb-2 opacity-50" />
          <p>No {type} codes assigned</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {codes.map((code) => (
          <Card key={code.id} className="border-l-4" style={{ borderLeftColor: code.verifiedBy ? '#22c55e' : '#f59e0b' }}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono font-semibold">{code.code}</code>
                    {code.isPrimary && (
                      <Badge variant="default">Primary</Badge>
                    )}
                    {/* Confidence score not available in current schema */}
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
                    {/* Assignment date not available in current schema */}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!code.verifiedBy && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleVerifyCode(code.id)}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Verify
                    </Button>
                  )}
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Medical Codes Review</CardTitle>
              <CardDescription>
                Review and verify AI-generated medical codes for this protocol
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddCodeDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Code
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="flex gap-2 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search medical codes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchCodes()}
              />
            </div>
            <Select value={selectedCodeType} onValueChange={(value) => setSelectedCodeType(value as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="ICD10">ICD-10</SelectItem>
                <SelectItem value="CPT">CPT</SelectItem>
                <SelectItem value="SNOMED">SNOMED</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearchCodes}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Code Tabs */}
          <Tabs defaultValue="icd10">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="icd10">
                ICD-10 ({icd10Codes.length})
              </TabsTrigger>
              <TabsTrigger value="cpt">
                CPT ({cptCodes.length})
              </TabsTrigger>
              <TabsTrigger value="snomed">
                SNOMED ({snomedCodes.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="icd10" className="mt-4">
              <CodeList codes={icd10Codes} type="ICD-10" />
            </TabsContent>

            <TabsContent value="cpt" className="mt-4">
              <CodeList codes={cptCodes} type="CPT" />
            </TabsContent>

            <TabsContent value="snomed" className="mt-4">
              <CodeList codes={snomedCodes} type="SNOMED" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Code Dialog */}
      <Dialog open={isAddCodeDialogOpen} onOpenChange={setIsAddCodeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Medical Code</DialogTitle>
            <DialogDescription>
              Manually assign a medical code to this protocol
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="codeType">Code Type</Label>
              <Select
                value={newCode.codeType}
                onValueChange={(value) => setNewCode({ ...newCode, codeType: value as any })}
              >
                <SelectTrigger id="codeType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ICD10">ICD-10</SelectItem>
                  <SelectItem value="CPT">CPT</SelectItem>
                  <SelectItem value="SNOMED">SNOMED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="e.g., I10, 99213, 38341003"
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Code description"
                value={newCode.description}
                onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCodeDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignCode} disabled={assignCode.isPending}>
              Add Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GenerateCMS1500DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolDeliveryId: number;
  patientName: string;
}

export function GenerateCMS1500Dialog({
  open,
  onOpenChange,
  protocolDeliveryId,
  patientName,
}: GenerateCMS1500DialogProps) {
  const { toast } = useToast();
  const [insuranceInfo, setInsuranceInfo] = useState({
    insuranceCompany: '',
    insurancePolicyNumber: '',
    insuranceGroupNumber: '',
    subscriberName: '',
    subscriberDob: '',
    relationshipToSubscriber: 'self' as 'self' | 'spouse' | 'child' | 'other',
  });

  const { data: profiles } = trpc.billing.getProviderProfiles.useQuery();
  const generateClaim = trpc.billing.generateCMS1500.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'CMS-1500 Generated',
        description: `Claim ${data.claimNumber} created successfully. Total: $${data.totalCharges.toFixed(2)}`,
      });
      
      // Open PDF in new tab
      if (data.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
      }
      
      onOpenChange(false);
      
      // Reset form
      setInsuranceInfo({
        insuranceCompany: '',
        insurancePolicyNumber: '',
        insuranceGroupNumber: '',
        subscriberName: '',
        subscriberDob: '',
        relationshipToSubscriber: 'self',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error Generating Claim',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!insuranceInfo.insuranceCompany || !insuranceInfo.insurancePolicyNumber || 
        !insuranceInfo.subscriberName || !insuranceInfo.subscriberDob) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required insurance information',
        variant: 'destructive',
      });
      return;
    }

    generateClaim.mutate({
      protocolDeliveryId,
      insuranceInfo,
    });
  };

  const handleChange = (field: string, value: string) => {
    setInsuranceInfo(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate CMS-1500 Claim Form
          </DialogTitle>
          <DialogDescription>
            Create an insurance-ready CMS-1500 form for {patientName}
          </DialogDescription>
        </DialogHeader>

        {!profiles || profiles.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You need to create a provider profile before generating claims. 
              Please set up your billing information in Settings first.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Insurance Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Patient Insurance Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="insuranceCompany">Insurance Company *</Label>
                <Input
                  id="insuranceCompany"
                  value={insuranceInfo.insuranceCompany}
                  onChange={(e) => handleChange('insuranceCompany', e.target.value)}
                  placeholder="Blue Cross Blue Shield"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insurancePolicyNumber">Policy Number *</Label>
                  <Input
                    id="insurancePolicyNumber"
                    value={insuranceInfo.insurancePolicyNumber}
                    onChange={(e) => handleChange('insurancePolicyNumber', e.target.value)}
                    placeholder="ABC123456789"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insuranceGroupNumber">Group Number</Label>
                  <Input
                    id="insuranceGroupNumber"
                    value={insuranceInfo.insuranceGroupNumber}
                    onChange={(e) => handleChange('insuranceGroupNumber', e.target.value)}
                    placeholder="GRP12345"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscriberName">Subscriber Name *</Label>
                <Input
                  id="subscriberName"
                  value={insuranceInfo.subscriberName}
                  onChange={(e) => handleChange('subscriberName', e.target.value)}
                  placeholder="John Doe"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Name of the insurance policy holder
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subscriberDob">Subscriber Date of Birth *</Label>
                  <Input
                    id="subscriberDob"
                    type="date"
                    value={insuranceInfo.subscriberDob}
                    onChange={(e) => handleChange('subscriberDob', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationshipToSubscriber">Patient Relationship to Subscriber *</Label>
                  <Select
                    value={insuranceInfo.relationshipToSubscriber}
                    onValueChange={(value) => handleChange('relationshipToSubscriber', value)}
                  >
                    <SelectTrigger id="relationshipToSubscriber">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Self</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                This will generate a CMS-1500 form using the verified medical codes from this protocol delivery. 
                The form will include all ICD-10 diagnosis codes and CPT procedure codes.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={generateClaim.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={generateClaim.isPending || !profiles || profiles.length === 0}
              >
                {generateClaim.isPending ? (
                  'Generating...'
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate CMS-1500
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

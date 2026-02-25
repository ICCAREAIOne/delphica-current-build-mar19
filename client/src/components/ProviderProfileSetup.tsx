import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building2, CheckCircle2 } from 'lucide-react';

export function ProviderProfileSetup() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    npi: '',
    taxId: '',
    licenseNumber: '',
    licenseState: '',
    practiceName: '',
    practiceAddress: '',
    practiceCity: '',
    practiceState: '',
    practiceZip: '',
    practicePhone: '',
    practiceFax: '',
    specialty: '',
    taxonomyCode: '',
    billingContactName: '',
    billingContactPhone: '',
    billingContactEmail: '',
  });

  const { data: profiles, refetch } = trpc.billing.getProviderProfiles.useQuery();
  const createProfile = trpc.billing.createProviderProfile.useMutation({
    onSuccess: () => {
      toast({
        title: 'Provider Profile Created',
        description: 'Your billing information has been saved successfully.',
      });
      refetch();
      // Reset form
      setFormData({
        npi: '',
        taxId: '',
        licenseNumber: '',
        licenseState: '',
        practiceName: '',
        practiceAddress: '',
        practiceCity: '',
        practiceState: '',
        practiceZip: '',
        practicePhone: '',
        practiceFax: '',
        specialty: '',
        taxonomyCode: '',
        billingContactName: '',
        billingContactPhone: '',
        billingContactEmail: '',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.npi || formData.npi.length !== 10) {
      toast({
        title: 'Validation Error',
        description: 'NPI must be exactly 10 digits',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.taxId || !formData.practiceName || !formData.practiceAddress || 
        !formData.practiceCity || !formData.practiceState || !formData.practiceZip || !formData.practicePhone) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    createProfile.mutate({
      ...formData,
      isPrimary: profiles?.length === 0, // First profile is automatically primary
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {profiles && profiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Existing Provider Profiles
            </CardTitle>
            <CardDescription>Your saved billing information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profiles.map((profile) => (
                <div key={profile.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{profile.practiceName}</h4>
                      <p className="text-sm text-muted-foreground">NPI: {profile.npi}</p>
                      <p className="text-sm text-muted-foreground">{profile.practiceAddress}, {profile.practiceCity}, {profile.practiceState} {profile.practiceZip}</p>
                      {profile.specialty && (
                        <p className="text-sm text-muted-foreground">Specialty: {profile.specialty}</p>
                      )}
                    </div>
                    {profile.isPrimary && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Primary</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {profiles && profiles.length > 0 ? 'Add Another Provider Profile' : 'Create Provider Profile'}
          </CardTitle>
          <CardDescription>
            Enter your practice information for insurance billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Provider Identification */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Provider Identification</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="npi">NPI Number *</Label>
                  <Input
                    id="npi"
                    value={formData.npi}
                    onChange={(e) => handleChange('npi', e.target.value)}
                    placeholder="1234567890"
                    maxLength={10}
                    required
                  />
                  <p className="text-xs text-muted-foreground">10-digit National Provider Identifier</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / EIN *</Label>
                  <Input
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) => handleChange('taxId', e.target.value)}
                    placeholder="12-3456789"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={(e) => handleChange('licenseNumber', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseState">License State</Label>
                  <Input
                    id="licenseState"
                    value={formData.licenseState}
                    onChange={(e) => handleChange('licenseState', e.target.value.toUpperCase())}
                    placeholder="CA"
                    maxLength={2}
                  />
                </div>
              </div>
            </div>

            {/* Practice Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Practice Information</h3>
              <div className="space-y-2">
                <Label htmlFor="practiceName">Practice Name *</Label>
                <Input
                  id="practiceName"
                  value={formData.practiceName}
                  onChange={(e) => handleChange('practiceName', e.target.value)}
                  placeholder="ABC Medical Group"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="practiceAddress">Practice Address *</Label>
                <Input
                  id="practiceAddress"
                  value={formData.practiceAddress}
                  onChange={(e) => handleChange('practiceAddress', e.target.value)}
                  placeholder="123 Main Street, Suite 100"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="practiceCity">City *</Label>
                  <Input
                    id="practiceCity"
                    value={formData.practiceCity}
                    onChange={(e) => handleChange('practiceCity', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="practiceState">State *</Label>
                  <Input
                    id="practiceState"
                    value={formData.practiceState}
                    onChange={(e) => handleChange('practiceState', e.target.value.toUpperCase())}
                    placeholder="CA"
                    maxLength={2}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="practiceZip">ZIP Code *</Label>
                  <Input
                    id="practiceZip"
                    value={formData.practiceZip}
                    onChange={(e) => handleChange('practiceZip', e.target.value)}
                    placeholder="12345"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="practicePhone">Practice Phone *</Label>
                  <Input
                    id="practicePhone"
                    value={formData.practicePhone}
                    onChange={(e) => handleChange('practicePhone', e.target.value)}
                    placeholder="(555) 123-4567"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="practiceFax">Practice Fax</Label>
                  <Input
                    id="practiceFax"
                    value={formData.practiceFax}
                    onChange={(e) => handleChange('practiceFax', e.target.value)}
                    placeholder="(555) 123-4568"
                  />
                </div>
              </div>
            </div>

            {/* Specialty & Taxonomy */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Specialty Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="specialty">Specialty</Label>
                  <Input
                    id="specialty"
                    value={formData.specialty}
                    onChange={(e) => handleChange('specialty', e.target.value)}
                    placeholder="Internal Medicine"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxonomyCode">Taxonomy Code</Label>
                  <Input
                    id="taxonomyCode"
                    value={formData.taxonomyCode}
                    onChange={(e) => handleChange('taxonomyCode', e.target.value)}
                    placeholder="207R00000X"
                  />
                </div>
              </div>
            </div>

            {/* Billing Contact */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Billing Contact (Optional)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="billingContactName">Contact Name</Label>
                  <Input
                    id="billingContactName"
                    value={formData.billingContactName}
                    onChange={(e) => handleChange('billingContactName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingContactPhone">Contact Phone</Label>
                  <Input
                    id="billingContactPhone"
                    value={formData.billingContactPhone}
                    onChange={(e) => handleChange('billingContactPhone', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingContactEmail">Contact Email</Label>
                <Input
                  id="billingContactEmail"
                  type="email"
                  value={formData.billingContactEmail}
                  onChange={(e) => handleChange('billingContactEmail', e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={createProfile.isPending}>
              {createProfile.isPending ? 'Saving...' : 'Save Provider Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface FamilyHistoryFormProps {
  patientId: number;
}

export function FamilyHistoryForm({ patientId }: FamilyHistoryFormProps) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    relationship: "mother" as any,
    relationshipOther: "",
    condition: "",
    icdCode: "",
    ageAtDiagnosis: "",
    currentAge: "",
    ageAtDeath: "",
    causeOfDeath: "",
    isAlive: true,
    isConfirmed: false,
    notes: "",
  });

  const utils = trpc.useUtils();
  
  const { data: histories, isLoading } = trpc.enhancedDAO.getFamilyHistories.useQuery({ patientId });

  const createHistory = trpc.enhancedDAO.createFamilyHistory.useMutation({
    onSuccess: () => {
      toast({
        title: "Family history added",
        description: "Family history entry has been recorded successfully.",
      });
      utils.enhancedDAO.getFamilyHistories.invalidate({ patientId });
      setShowForm(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteHistory = trpc.enhancedDAO.deleteFamilyHistory.useMutation({
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: "Family history entry has been removed.",
      });
      utils.enhancedDAO.getFamilyHistories.invalidate({ patientId });
    },
  });

  const resetForm = () => {
    setFormData({
      relationship: "mother",
      relationshipOther: "",
      condition: "",
      icdCode: "",
      ageAtDiagnosis: "",
      currentAge: "",
      ageAtDeath: "",
      causeOfDeath: "",
      isAlive: true,
      isConfirmed: false,
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createHistory.mutate({
      patientId,
      ...formData,
      ageAtDiagnosis: formData.ageAtDiagnosis ? parseInt(formData.ageAtDiagnosis) : undefined,
      currentAge: formData.currentAge ? parseInt(formData.currentAge) : undefined,
      ageAtDeath: formData.ageAtDeath ? parseInt(formData.ageAtDeath) : undefined,
    });
  };

  const getRelationshipLabel = (relationship: string) => {
    return relationship.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Family History</h3>
          <p className="text-sm text-muted-foreground">
            Track hereditary disease patterns for genetic risk assessment
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Family History
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Family History Entry</CardTitle>
            <CardDescription>Record a family member's medical condition</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select
                    value={formData.relationship}
                    onValueChange={(value) => setFormData({ ...formData, relationship: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mother">Mother</SelectItem>
                      <SelectItem value="father">Father</SelectItem>
                      <SelectItem value="sister">Sister</SelectItem>
                      <SelectItem value="brother">Brother</SelectItem>
                      <SelectItem value="maternal_grandmother">Maternal Grandmother</SelectItem>
                      <SelectItem value="maternal_grandfather">Maternal Grandfather</SelectItem>
                      <SelectItem value="paternal_grandmother">Paternal Grandmother</SelectItem>
                      <SelectItem value="paternal_grandfather">Paternal Grandfather</SelectItem>
                      <SelectItem value="maternal_aunt">Maternal Aunt</SelectItem>
                      <SelectItem value="maternal_uncle">Maternal Uncle</SelectItem>
                      <SelectItem value="paternal_aunt">Paternal Aunt</SelectItem>
                      <SelectItem value="paternal_uncle">Paternal Uncle</SelectItem>
                      <SelectItem value="daughter">Daughter</SelectItem>
                      <SelectItem value="son">Son</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Condition/Disease *</Label>
                  <Input
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    placeholder="e.g., Type 2 Diabetes"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>ICD Code (optional)</Label>
                  <Input
                    value={formData.icdCode}
                    onChange={(e) => setFormData({ ...formData, icdCode: e.target.value })}
                    placeholder="e.g., E11"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Age at Diagnosis</Label>
                  <Input
                    type="number"
                    value={formData.ageAtDiagnosis}
                    onChange={(e) => setFormData({ ...formData, ageAtDiagnosis: e.target.value })}
                    placeholder="e.g., 45"
                  />
                </div>

                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox
                    checked={formData.isAlive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isAlive: checked as boolean })}
                  />
                  <Label>Family member is alive</Label>
                </div>

                {formData.isAlive ? (
                  <div className="space-y-2">
                    <Label>Current Age</Label>
                    <Input
                      type="number"
                      value={formData.currentAge}
                      onChange={(e) => setFormData({ ...formData, currentAge: e.target.value })}
                      placeholder="e.g., 65"
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Age at Death</Label>
                      <Input
                        type="number"
                        value={formData.ageAtDeath}
                        onChange={(e) => setFormData({ ...formData, ageAtDeath: e.target.value })}
                        placeholder="e.g., 70"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cause of Death</Label>
                      <Input
                        value={formData.causeOfDeath}
                        onChange={(e) => setFormData({ ...formData, causeOfDeath: e.target.value })}
                        placeholder="e.g., Heart attack"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center space-x-2 col-span-2">
                  <Checkbox
                    checked={formData.isConfirmed}
                    onCheckedChange={(checked) => setFormData({ ...formData, isConfirmed: checked as boolean })}
                  />
                  <Label>Confirmed by medical records</Label>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional information..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createHistory.isPending}>
                  {createHistory.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Entry
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {histories && histories.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Family History Records</CardTitle>
            <CardDescription>{histories.length} entries recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Age at Diagnosis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Confirmed</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {histories.map((history: any) => (
                  <TableRow key={history.id}>
                    <TableCell className="font-medium">
                      {getRelationshipLabel(history.relationship)}
                    </TableCell>
                    <TableCell>{history.condition}</TableCell>
                    <TableCell>{history.ageAtDiagnosis || "—"}</TableCell>
                    <TableCell>
                      {history.isAlive ? (
                        <span className="text-green-600">Alive ({history.currentAge})</span>
                      ) : (
                        <span className="text-muted-foreground">Deceased ({history.ageAtDeath})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {history.isConfirmed ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteHistory.mutate({ historyId: history.id })}
                        disabled={deleteHistory.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        !showForm && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground mb-4">No family history recorded yet</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Entry
              </Button>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}

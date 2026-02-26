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
import { Loader2 } from "lucide-react";

interface LifestyleAssessmentFormProps {
  patientId: number;
  onSuccess?: () => void;
}

export function LifestyleAssessmentForm({ patientId, onSuccess }: LifestyleAssessmentFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    smokingStatus: "never" as "never" | "former" | "current",
    cigarettesPerDay: "",
    yearsSmoked: "",
    quitDate: "",
    alcoholConsumption: "none" as "none" | "occasional" | "moderate" | "heavy",
    drinksPerWeek: "",
    bingeDrinking: false,
    exerciseFrequency: "sedentary" as "sedentary" | "light" | "moderate" | "vigorous",
    minutesPerWeek: "",
    exerciseTypes: [] as string[],
    dietQuality: "fair" as "poor" | "fair" | "good" | "excellent",
    fruitsVegetablesPerDay: "",
    fastFoodFrequency: "rarely" as "never" | "rarely" | "weekly" | "daily",
    sodaConsumption: "none" as "none" | "occasional" | "daily" | "multiple_daily",
    sleepHoursPerNight: "",
    sleepQuality: "fair" as "poor" | "fair" | "good" | "excellent",
    sleepDisorders: [] as string[],
    stressLevel: "moderate" as "low" | "moderate" | "high" | "severe",
    mentalHealthConditions: [] as string[],
    occupationalHazards: [] as string[],
    environmentalExposures: [] as string[],
    additionalNotes: "",
  });

  const createAssessment = trpc.enhancedDAO.createLifestyleAssessment.useMutation({
    onSuccess: () => {
      toast({
        title: "Assessment saved",
        description: "Lifestyle assessment has been recorded successfully.",
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createAssessment.mutate({
      patientId,
      assessmentDate: new Date(),
      ...formData,
      cigarettesPerDay: formData.cigarettesPerDay ? parseInt(formData.cigarettesPerDay) : undefined,
      yearsSmoked: formData.yearsSmoked ? parseInt(formData.yearsSmoked) : undefined,
      quitDate: formData.quitDate ? new Date(formData.quitDate) : undefined,
      drinksPerWeek: formData.drinksPerWeek ? parseInt(formData.drinksPerWeek) : undefined,
      minutesPerWeek: formData.minutesPerWeek ? parseInt(formData.minutesPerWeek) : undefined,
      fruitsVegetablesPerDay: formData.fruitsVegetablesPerDay ? parseInt(formData.fruitsVegetablesPerDay) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Smoking */}
      <Card>
        <CardHeader>
          <CardTitle>Smoking History</CardTitle>
          <CardDescription>Tobacco use and smoking patterns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Smoking Status</Label>
            <Select
              value={formData.smokingStatus}
              onValueChange={(value: any) => setFormData({ ...formData, smokingStatus: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never Smoked</SelectItem>
                <SelectItem value="former">Former Smoker</SelectItem>
                <SelectItem value="current">Current Smoker</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.smokingStatus === "current" && (
            <>
              <div className="space-y-2">
                <Label>Cigarettes Per Day</Label>
                <Input
                  type="number"
                  value={formData.cigarettesPerDay}
                  onChange={(e) => setFormData({ ...formData, cigarettesPerDay: e.target.value })}
                  placeholder="e.g., 10"
                />
              </div>
              <div className="space-y-2">
                <Label>Years Smoked</Label>
                <Input
                  type="number"
                  value={formData.yearsSmoked}
                  onChange={(e) => setFormData({ ...formData, yearsSmoked: e.target.value })}
                  placeholder="e.g., 15"
                />
              </div>
            </>
          )}

          {formData.smokingStatus === "former" && (
            <>
              <div className="space-y-2">
                <Label>Years Smoked</Label>
                <Input
                  type="number"
                  value={formData.yearsSmoked}
                  onChange={(e) => setFormData({ ...formData, yearsSmoked: e.target.value })}
                  placeholder="e.g., 15"
                />
              </div>
              <div className="space-y-2">
                <Label>Quit Date</Label>
                <Input
                  type="date"
                  value={formData.quitDate}
                  onChange={(e) => setFormData({ ...formData, quitDate: e.target.value })}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Alcohol */}
      <Card>
        <CardHeader>
          <CardTitle>Alcohol Consumption</CardTitle>
          <CardDescription>Drinking patterns and frequency</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Alcohol Consumption Level</Label>
            <Select
              value={formData.alcoholConsumption}
              onValueChange={(value: any) => setFormData({ ...formData, alcoholConsumption: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="occasional">Occasional (1-2 drinks/week)</SelectItem>
                <SelectItem value="moderate">Moderate (3-7 drinks/week)</SelectItem>
                <SelectItem value="heavy">Heavy (8+ drinks/week)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.alcoholConsumption !== "none" && (
            <>
              <div className="space-y-2">
                <Label>Drinks Per Week</Label>
                <Input
                  type="number"
                  value={formData.drinksPerWeek}
                  onChange={(e) => setFormData({ ...formData, drinksPerWeek: e.target.value })}
                  placeholder="e.g., 5"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.bingeDrinking}
                  onCheckedChange={(checked) => setFormData({ ...formData, bingeDrinking: checked as boolean })}
                />
                <Label>Binge drinking (5+ drinks in one sitting)</Label>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Physical Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Physical Activity</CardTitle>
          <CardDescription>Exercise habits and activity levels</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Exercise Frequency</Label>
            <Select
              value={formData.exerciseFrequency}
              onValueChange={(value: any) => setFormData({ ...formData, exerciseFrequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary (little to no exercise)</SelectItem>
                <SelectItem value="light">Light (1-2 days/week)</SelectItem>
                <SelectItem value="moderate">Moderate (3-5 days/week)</SelectItem>
                <SelectItem value="vigorous">Vigorous (6-7 days/week)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Minutes Per Week</Label>
            <Input
              type="number"
              value={formData.minutesPerWeek}
              onChange={(e) => setFormData({ ...formData, minutesPerWeek: e.target.value })}
              placeholder="e.g., 150"
            />
          </div>
        </CardContent>
      </Card>

      {/* Diet */}
      <Card>
        <CardHeader>
          <CardTitle>Diet & Nutrition</CardTitle>
          <CardDescription>Eating habits and dietary patterns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Overall Diet Quality</Label>
            <Select
              value={formData.dietQuality}
              onValueChange={(value: any) => setFormData({ ...formData, dietQuality: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="poor">Poor</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Fruits & Vegetables Per Day (servings)</Label>
            <Input
              type="number"
              value={formData.fruitsVegetablesPerDay}
              onChange={(e) => setFormData({ ...formData, fruitsVegetablesPerDay: e.target.value })}
              placeholder="e.g., 5"
            />
          </div>

          <div className="space-y-2">
            <Label>Fast Food Frequency</Label>
            <Select
              value={formData.fastFoodFrequency}
              onValueChange={(value: any) => setFormData({ ...formData, fastFoodFrequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="rarely">Rarely (1-2 times/month)</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Soda/Sugary Drink Consumption</Label>
            <Select
              value={formData.sodaConsumption}
              onValueChange={(value: any) => setFormData({ ...formData, sodaConsumption: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="occasional">Occasional</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="multiple_daily">Multiple Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sleep */}
      <Card>
        <CardHeader>
          <CardTitle>Sleep Patterns</CardTitle>
          <CardDescription>Sleep quality and duration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Sleep Hours Per Night</Label>
            <Input
              type="number"
              step="0.5"
              value={formData.sleepHoursPerNight}
              onChange={(e) => setFormData({ ...formData, sleepHoursPerNight: e.target.value })}
              placeholder="e.g., 7.5"
            />
          </div>

          <div className="space-y-2">
            <Label>Sleep Quality</Label>
            <Select
              value={formData.sleepQuality}
              onValueChange={(value: any) => setFormData({ ...formData, sleepQuality: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="poor">Poor</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stress & Mental Health */}
      <Card>
        <CardHeader>
          <CardTitle>Stress & Mental Health</CardTitle>
          <CardDescription>Psychological well-being</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Stress Level</Label>
            <Select
              value={formData.stressLevel}
              onValueChange={(value: any) => setFormData({ ...formData, stressLevel: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="severe">Severe</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
          <CardDescription>Any other relevant lifestyle information</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.additionalNotes}
            onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
            placeholder="Enter any additional lifestyle information..."
            rows={4}
          />
        </CardContent>
      </Card>

      <Button type="submit" disabled={createAssessment.isPending} className="w-full">
        {createAssessment.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Lifestyle Assessment
      </Button>
    </form>
  );
}

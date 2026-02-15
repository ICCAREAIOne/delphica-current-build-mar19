import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Bell, Mail, MessageSquare, Moon, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

interface NotificationPreferences {
  // Alert Types
  criticalAlerts: boolean;
  highAlerts: boolean;
  mediumAlerts: boolean;
  lowAlerts: boolean;
  
  // Channels
  inApp: boolean;
  email: boolean;
  sms: boolean;
  
  // Quiet Hours
  quietEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  
  // Sources
  causalBrain: boolean;
  reviewBoard: boolean;
  precisionCare: boolean;
  marketplace: boolean;
  
  // Frequency
  maxPerHour: number;
  digestMode: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  criticalAlerts: true,
  highAlerts: true,
  mediumAlerts: true,
  lowAlerts: false,
  inApp: true,
  email: true,
  sms: false,
  quietEnabled: false,
  quietStart: "22:00",
  quietEnd: "08:00",
  causalBrain: true,
  reviewBoard: true,
  precisionCare: true,
  marketplace: true,
  maxPerHour: 10,
  digestMode: false,
};

export default function NotificationSettings() {
  const { user, isAuthenticated } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [hasChanges, setHasChanges] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    if (user) {
      const stored = localStorage.getItem(`notif_prefs_${user.id}`);
      if (stored) {
        try {
          setPrefs(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse preferences:", e);
        }
      }
    }
  }, [user]);

  const updatePref = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (user) {
      localStorage.setItem(`notif_prefs_${user.id}`, JSON.stringify(prefs));
      toast.success("Notification preferences saved successfully");
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    setPrefs(DEFAULT_PREFS);
    setHasChanges(true);
    toast.info("Preferences reset to defaults");
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access notification settings</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Notification Settings</h1>
            <p className="text-slate-600 mt-1">Customize your alert preferences and notification channels</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">← Back to Dashboard</Button>
          </Link>
        </div>

        {/* Alert Priority Levels */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              <CardTitle>Alert Priority Levels</CardTitle>
            </div>
            <CardDescription>Choose which priority levels you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="critical" className="text-base font-medium">Critical Alerts</Label>
                <p className="text-sm text-slate-600">Life-threatening conditions, immediate action required</p>
              </div>
              <Switch
                id="critical"
                checked={prefs.criticalAlerts}
                onCheckedChange={(checked) => updatePref("criticalAlerts", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="high" className="text-base font-medium">High Priority</Label>
                <p className="text-sm text-slate-600">Significant clinical findings requiring prompt attention</p>
              </div>
              <Switch
                id="high"
                checked={prefs.highAlerts}
                onCheckedChange={(checked) => updatePref("highAlerts", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="medium" className="text-base font-medium">Medium Priority</Label>
                <p className="text-sm text-slate-600">Important updates and recommendations</p>
              </div>
              <Switch
                id="medium"
                checked={prefs.mediumAlerts}
                onCheckedChange={(checked) => updatePref("mediumAlerts", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="low" className="text-base font-medium">Low Priority</Label>
                <p className="text-sm text-slate-600">Informational alerts and system notifications</p>
              </div>
              <Switch
                id="low"
                checked={prefs.lowAlerts}
                onCheckedChange={(checked) => updatePref("lowAlerts", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Channels */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-green-600" />
              <CardTitle>Notification Channels</CardTitle>
            </div>
            <CardDescription>Select how you want to receive alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-blue-600" />
                <div>
                  <Label htmlFor="inApp" className="text-base font-medium">In-App Notifications</Label>
                  <p className="text-sm text-slate-600">Real-time alerts within the portal</p>
                </div>
              </div>
              <Switch
                id="inApp"
                checked={prefs.inApp}
                onCheckedChange={(checked) => updatePref("inApp", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-600" />
                <div>
                  <Label htmlFor="email" className="text-base font-medium">Email Notifications</Label>
                  <p className="text-sm text-slate-600">Receive alerts via email</p>
                </div>
              </div>
              <Switch
                id="email"
                checked={prefs.email}
                onCheckedChange={(checked) => updatePref("email", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <div>
                  <Label htmlFor="sms" className="text-base font-medium">SMS Notifications</Label>
                  <p className="text-sm text-slate-600">Text messages for critical alerts</p>
                </div>
              </div>
              <Switch
                id="sms"
                checked={prefs.sms}
                onCheckedChange={(checked) => updatePref("sms", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-indigo-600" />
              <CardTitle>Quiet Hours</CardTitle>
            </div>
            <CardDescription>Pause non-critical notifications during specified hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="quietEnabled" className="text-base font-medium">Enable Quiet Hours</Label>
              <Switch
                id="quietEnabled"
                checked={prefs.quietEnabled}
                onCheckedChange={(checked) => updatePref("quietEnabled", checked)}
              />
            </div>
            {prefs.quietEnabled && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <Label htmlFor="quietStart">Start Time</Label>
                  <Input
                    id="quietStart"
                    type="time"
                    value={prefs.quietStart}
                    onChange={(e) => updatePref("quietStart", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="quietEnd">End Time</Label>
                  <Input
                    id="quietEnd"
                    type="time"
                    value={prefs.quietEnd}
                    onChange={(e) => updatePref("quietEnd", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alert Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Alert Sources</CardTitle>
            <CardDescription>Control which AI components can send you alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="causalBrain" className="text-base font-medium">Causal Brain Risk Assessments</Label>
              <Switch
                id="causalBrain"
                checked={prefs.causalBrain}
                onCheckedChange={(checked) => updatePref("causalBrain", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="reviewBoard" className="text-base font-medium">Digital Review Board Safety Alerts</Label>
              <Switch
                id="reviewBoard"
                checked={prefs.reviewBoard}
                onCheckedChange={(checked) => updatePref("reviewBoard", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="precisionCare" className="text-base font-medium">Precision Care Recommendations</Label>
              <Switch
                id="precisionCare"
                checked={prefs.precisionCare}
                onCheckedChange={(checked) => updatePref("precisionCare", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="marketplace" className="text-base font-medium">Marketplace Feedback</Label>
              <Switch
                id="marketplace"
                checked={prefs.marketplace}
                onCheckedChange={(checked) => updatePref("marketplace", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Frequency Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Frequency Controls</CardTitle>
            <CardDescription>Manage alert volume to reduce notification fatigue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="maxPerHour" className="text-base font-medium">Maximum Alerts Per Hour</Label>
                <span className="text-sm font-semibold text-blue-600">{prefs.maxPerHour}</span>
              </div>
              <Slider
                id="maxPerHour"
                min={1}
                max={50}
                step={1}
                value={[prefs.maxPerHour]}
                onValueChange={([value]) => updatePref("maxPerHour", value)}
                className="mt-2"
              />
              <p className="text-sm text-slate-600 mt-2">Limit the number of alerts you receive per hour</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="digestMode" className="text-base font-medium">Digest Mode</Label>
                <p className="text-sm text-slate-600">Batch non-critical alerts into hourly summaries</p>
              </div>
              <Switch
                id="digestMode"
                checked={prefs.digestMode}
                onCheckedChange={(checked) => updatePref("digestMode", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}

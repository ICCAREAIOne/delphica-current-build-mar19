import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import NotificationSettings from "@/pages/NotificationSettings";
import ClinicalLibrary from "@/pages/ClinicalLibrary";
import ProtocolAuthor from "@/pages/ProtocolAuthor";
import ConsultationRoom from "@/pages/ConsultationRoom";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import QADashboard from "./pages/QADashboard";
import CodingDemo from "./pages/CodingDemo";
import PatientDetail from "./pages/PatientDetail";
import NewPatient from "./pages/NewPatient";
import NewEncounter from "./pages/NewEncounter";
import OutcomeAnalytics from "./pages/OutcomeAnalytics";
import FrameworkWorkflow from "./pages/FrameworkWorkflow";
import ClinicalAlerts from "./pages/ClinicalAlerts";
import FatigueProtocol from "./pages/FatigueProtocol";
import NewEncounterWithProtocol from "./pages/NewEncounterWithProtocol";
import ProtocolAnalytics from "./pages/ProtocolAnalytics";
import ProtocolComparison from "./pages/ProtocolComparison";
import KnowledgeBase from "./pages/KnowledgeBase";
import PatientIntake from "./pages/PatientIntake";
import IntakeDashboard from "./pages/IntakeDashboard";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/qa"} component={QADashboard} />
      <Route path={"/demo"} component={CodingDemo} />
      <Route path={"/patients/new"} component={NewPatient} />
      <Route path={"/patients/:id"} component={PatientDetail} />
      <Route path={"/patients/:patientId/encounters/new"} component={NewEncounter} />
      <Route path={"/new-encounter-with-protocol/:protocolId"} component={NewEncounterWithProtocol} />
      <Route path={"/analytics"} component={OutcomeAnalytics} />
      <Route path={"/settings/notifications"} component={NotificationSettings} />
      <Route path={"/library"} component={ClinicalLibrary} />
      <Route path={"/library/author"} component={ProtocolAuthor} />
      <Route path={"/consultation/:id"} component={ConsultationRoom} />
      <Route path={"/workflow/:encounterId"} component={FrameworkWorkflow} />
      <Route path={"/alerts"} component={ClinicalAlerts} />
      <Route path={"/protocols/fatigue"} component={FatigueProtocol} />
      <Route path={"/protocols/analytics"} component={ProtocolAnalytics} />
      <Route path={"/protocols/comparison"} component={ProtocolComparison} />
      <Route path={"/knowledge-base"} component={KnowledgeBase} />
      <Route path={"/intake"} component={PatientIntake} />
      <Route path={"/intake-dashboard"} component={IntakeDashboard} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

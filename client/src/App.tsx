import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
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

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/qa"} component={QADashboard} />
      <Route path={"/demo"} component={CodingDemo} />
      <Route path={"/patients/new"} component={NewPatient} />
      <Route path={"/patients/:id"} component={PatientDetail} />
      <Route path={"/patients/:patientId/encounters/new"} component={NewEncounter} />
      <Route path={"/analytics"} component={OutcomeAnalytics} />
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

import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { useGetProfile } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";

import Home from "@/pages/home";
import Onboarding from "@/pages/onboarding";
import Plan from "@/pages/plan";
import WorkoutNew from "@/pages/workout-new";
import WorkoutActive from "@/pages/workout-active";
import WorkoutComplete from "@/pages/workout-complete";
import History from "@/pages/history";
import HistoryDetail from "@/pages/history-detail";
import Exercises from "@/pages/exercises";
import ExerciseDetail from "@/pages/exercise-detail";
import Progress from "@/pages/progress";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading } = useGetProfile();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (profile && !profile.equipment && location !== "/onboarding") {
    return <Redirect to="/onboarding" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <AuthWrapper>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/plan" component={Plan} />
          <Route path="/workout/new" component={WorkoutNew} />
          <Route path="/workout/active/:id" component={WorkoutActive} />
          <Route path="/workout/:id/complete" component={WorkoutComplete} />
          <Route path="/history" component={History} />
          <Route path="/history/:id" component={HistoryDetail} />
          <Route path="/exercises" component={Exercises} />
          <Route path="/exercises/:id" component={ExerciseDetail} />
          <Route path="/progress" component={Progress} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </AuthWrapper>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

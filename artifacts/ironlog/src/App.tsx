import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { useGetProfile } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { AuthProvider } from "@/auth/context";

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
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 14, // keep cached 14 days for offline reads
      staleTime: 1000 * 30,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 404) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 3;
      },
    },
  },
});

const persister =
  typeof window !== "undefined"
    ? createSyncStoragePersister({
        storage: window.localStorage,
        key: "ironlog.cache.v1",
        throttleTime: 800,
      })
    : undefined;

const PUBLIC_ROUTES = new Set(["/login", "/signup", "/forgot-password"]);

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { data: profile, isLoading, error } = useGetProfile();
  const [location] = useLocation();

  if (PUBLIC_ROUTES.has(location)) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If the token was rejected (e.g. user was deleted), force re-auth.
  const status = (error as { status?: number } | null)?.status;
  if (status === 401) {
    return <Redirect to="/login" />;
  }

  // First run: drop user into onboarding once. The server profile is the
  // source of truth so that a fresh browser / new device for an already
  // onboarded account does not loop back through the welcome flow.
  if (profile && !profile.isOnboarded && location !== "/onboarding") {
    return <Redirect to="/onboarding" />;
  }
  // If they revisit /onboarding after completing it, send them home.
  if (profile && profile.isOnboarded && location === "/onboarding") {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function RoutedApp() {
  const [location] = useLocation();
  const isPublic = PUBLIC_ROUTES.has(location);

  return (
    <AuthWrapper>
      {isPublic ? (
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/forgot-password" component={ForgotPassword} />
        </Switch>
      ) : (
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
      )}
    </AuthWrapper>
  );
}

function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: persister!,
        maxAge: 1000 * 60 * 60 * 24 * 30,
        buster: "v1",
      }}
    >
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={base}>
            <RoutedApp />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
  );
}

export default App;

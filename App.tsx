import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Canvas from "@/pages/Canvas";
import BusinessDashboard from "@/pages/BusinessDashboard";
import SnowEffect from "@/components/SnowEffect";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/visual-brief" component={Canvas} />
      <Route path="/dashboard" component={BusinessDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <SnowEffect />
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
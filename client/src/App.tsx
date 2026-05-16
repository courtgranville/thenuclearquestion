import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import RouteFallback from "./components/RouteFallback";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const PosterPage = lazy(() => import("./pages/PosterPage"));
const About = lazy(() => import("./pages/About"));
const Sources = lazy(() => import("./pages/Sources"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/poster/:id" component={PosterPage} />
        <Route path="/about" component={About} />
        <Route path="/sources" component={Sources} />
        <Route path="/contact" component={Contact} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
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

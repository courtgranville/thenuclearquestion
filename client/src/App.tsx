import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Lazy-load every route - each becomes its own chunk, fetched only
// on navigation. Home is the largest critical route, the others
// are mostly static content.
const Home = lazy(() => import("./pages/Home"));
const PosterPage = lazy(() => import("./pages/PosterPage"));
const About = lazy(() => import("./pages/About"));
const Sources = lazy(() => import("./pages/Sources"));
const Contact = lazy(() => import("./pages/Contact"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Fallback during chunk download. Empty div keeps layout stable -
// don't add a spinner; the chunks should load fast enough on a
// reasonable connection that a flash of loading UI is worse than
// a blank moment. If post-deploy testing shows otherwise we'll
// revisit.
function RouteFallback() {
  return <div style={{ minHeight: '100vh' }} aria-busy="true" />;
}

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

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { Suspense, lazy } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PosterPage from "./pages/PosterPage";
import About from "./pages/About";
import Sources from "./pages/Sources";
import Contact from "./pages/Contact";

// Lazy-load /fission. Three.js + R3F + the form-points JSON are ~1.7
// MB raw / ~560 kB gzipped together; nothing else on the site needs
// them. Keeping them out of the main bundle means visitors who never
// enter the room don't pay for it.
const Fission = lazy(() => import("./pages/Fission"));

function FissionLoadingFallback() {
  return (
    <div className="fixed inset-0 bg-[#0A0A0A] flex items-center justify-center">
      <p className="font-sans text-sm text-[#ECE7DF]/50">Loading the room.</p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/poster/:id" component={PosterPage} />
      <Route path="/about" component={About} />
      <Route path="/sources" component={Sources} />
      <Route path="/contact" component={Contact} />
      <Route path="/fission">
        <Suspense fallback={<FissionLoadingFallback />}>
          <Fission />
        </Suspense>
      </Route>
      <Route path="/404" component={NotFound} />
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

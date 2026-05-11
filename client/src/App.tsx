import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PosterPage from "./pages/PosterPage";
import About from "./pages/About";
import Sources from "./pages/Sources";
import Contact from "./pages/Contact";
import Fission from "./pages/Fission";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/poster/:id" component={PosterPage} />
      <Route path="/about" component={About} />
      <Route path="/sources" component={Sources} />
      <Route path="/contact" component={Contact} />
      <Route path="/fission" component={Fission} />
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

import { Link, useLocation } from "wouter";

/*
  DESIGN: Editorial Archive — Dark Scholarly Journal
  Thin, minimal header. "The Nuclear Question" as a nameplate.
  Navigation: Series (home), About
*/

export default function SiteHeader() {
  const [location] = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
      <div className="container flex items-center justify-between h-14">
        <Link href="/">
          <span
            className="font-serif text-lg tracking-tight text-foreground hover:text-primary transition-colors duration-200"
            style={{ fontWeight: 500 }}
          >
            The Nuclear Question
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link href="/">
            <span
              className={`text-sm tracking-wide transition-colors duration-200 ${
                location === "/"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              Series
            </span>
          </Link>
          <Link href="/about">
            <span
              className={`text-sm tracking-wide transition-colors duration-200 ${
                location === "/about"
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              About
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

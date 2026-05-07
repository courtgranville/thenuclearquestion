import { Link } from "wouter";
import SiteHeader from "@/components/SiteHeader";
import PageTransition from "@/components/PageTransition";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <PageTransition>
        <main className="pt-14">
          <div className="container">
            <div className="min-h-[70vh] flex flex-col justify-center max-w-xl">
              <span
                className="text-xs tracking-[0.25em] uppercase text-primary mb-6 block"
                style={{ fontFamily: "'Playfair', Georgia, serif" }}
              >
                404
              </span>
              <h1
                className="font-serif text-3xl lg:text-4xl leading-tight mb-4"
                style={{ fontWeight: 600 }}
              >
                Page Not Found
              </h1>
              <p
                className="text-sm text-muted-foreground leading-relaxed mb-8"
                style={{ fontFamily: "'Playfair', Georgia, serif", fontWeight: 300 }}
              >
                The page you are looking for does not exist. It may have been moved or removed.
              </p>
              <Link href="/">
                <span className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                  <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200" />
                  <span style={{ fontFamily: "'Playfair', Georgia, serif" }}>
                    Back to series
                  </span>
                </span>
              </Link>
            </div>
          </div>
        </main>
      </PageTransition>
    </div>
  );
}

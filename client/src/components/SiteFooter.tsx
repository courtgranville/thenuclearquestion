/*
  DESIGN: Editorial Archive — Dark Scholarly Journal
  Shared footer component used across all pages.
*/

export default function SiteFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="container">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p
              className="text-xs text-muted-foreground"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              The Nuclear Question — Court Granville
            </p>
            <p
              className="text-xs text-muted-foreground mt-1"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Bachelor in Design Thesis, IE University, 2026
            </p>
          </div>
          <p
            className="text-xs text-muted-foreground"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Supervisor: Professor Kaleb Cardenas Zavala
          </p>
        </div>
      </div>
    </footer>
  );
}

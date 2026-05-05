import { Link, useLocation } from "wouter";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

/*
  DESIGN: Editorial Archive - Light Scholarly Journal
  Header shrinks subtly on scroll (h-14 -> h-12), increases backdrop blur.
  Active nav item has an animated underline indicator.
  Mobile: hamburger icon opens a slide-out side panel.
*/

const navItems = [
  { href: "/about", label: "About" },
  { href: "/sources", label: "Sources" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  const [location] = useLocation();
  const { scrollY } = useScroll();
  const [mobileOpen, setMobileOpen] = useState(false);

  const headerHeight = useTransform(scrollY, [0, 100], [56, 48]);
  const backdropBlur = useTransform(scrollY, [0, 100], [8, 16]);
  const titleSize = useTransform(scrollY, [0, 100], [22, 20]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90"
        style={{
          height: headerHeight,
          backdropFilter: useTransform(backdropBlur, (v) => `blur(${v}px)`),
        }}
      >
        <div className="container h-full flex items-center justify-between">
          <Link href="/">
            <motion.span
              className="font-serif tracking-tight text-foreground hover:text-primary transition-colors duration-200"
              style={{
                fontWeight: 500,
                fontSize: titleSize,
              }}
            >
              The Nuclear Question
            </motion.span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={location === item.href}
              />
            ))}
          </nav>

          {/* Mobile hamburger button */}
          <button
            className="md:hidden flex items-center justify-center w-9 h-9 text-foreground"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      {/* Mobile slide-out panel */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[60] bg-black/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
            />

            {/* Panel */}
            <motion.div
              className="fixed top-0 right-0 bottom-0 z-[70] w-64 bg-background border-l border-border shadow-lg"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <div className="flex items-center justify-end p-4">
                <button
                  className="flex items-center justify-center w-9 h-9 text-foreground"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col px-6 gap-1">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <span
                      className={`block py-3 text-sm tracking-wide transition-colors duration-200 ${
                        location === item.href
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function NavLink({
  href,
  label,
  active,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <Link href={href} onClick={onClick}>
      <span className="relative group">
        <span
          className={`text-sm tracking-wide transition-colors duration-200 ${
            active
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          {label}
        </span>
        <span
          className={`absolute -bottom-1 left-0 h-px bg-primary transition-all duration-300 ease-out ${
            active ? "w-full" : "w-0 group-hover:w-full"
          }`}
        />
      </span>
    </Link>
  );
}

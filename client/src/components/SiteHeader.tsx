import { Link, useLocation } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";


/*
  DESIGN: Editorial Archive - Light Scholarly Journal
  Header shrinks subtly on scroll (h-14 → h-12), increases backdrop blur.
  Active nav item has an animated underline indicator.
  "Series" link smooth-scrolls to #series when already on homepage.
*/

export default function SiteHeader() {
  const [location] = useLocation();
  const { scrollY } = useScroll();

  const headerHeight = useTransform(scrollY, [0, 100], [56, 48]);
  const backdropBlur = useTransform(scrollY, [0, 100], [8, 16]);
  const titleSize = useTransform(scrollY, [0, 100], [18, 16]);


  return (
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

        <nav className="flex items-center gap-6">
          <NavLink
            href="/about"
            label="About"
            active={location === "/about"}
          />
          <NavLink
            href="/sources"
            label="Sources"
            active={location === "/sources"}
          />
        </nav>
      </div>
    </motion.header>
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

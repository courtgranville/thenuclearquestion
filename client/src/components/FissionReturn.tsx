import { Link } from 'wouter';

// Positioning lives in the parent layout (Phase 11): the page wraps
// Return alongside Reset in a top-right flex container. This
// component just renders the link.
export default function FissionReturn() {
  return (
    <Link
      href="/"
      className="font-sans text-sm tracking-[0.15em] uppercase text-[#ECE7DF]/70 hover:text-[#ECE7DF] transition-colors duration-200 pointer-events-auto"
    >
      Return
    </Link>
  );
}

import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useStudent } from "../hooks/useStudent";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

const navLinks = [
  { to: "/", label: "Lessons" },
  { to: "/progress", label: "Progress" },
];

export default function Nav() {
  const { status, student, signOut } = useStudent();
  const isAdmin = status === "admin";
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 flex h-[72px] items-center justify-between border-b border-border bg-nav-bg px-6 backdrop-blur md:px-12">
      <Link to={isAdmin ? "/admin" : "/"} onClick={() => setMenuOpen(false)}>
        <Logo />
      </Link>

      {/* Desktop links */}
      <ul className="hidden items-center gap-10 md:flex">
        {navLinks.map((l) => (
          <li key={l.to}>
            <NavLink
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `text-[0.65rem] uppercase tracking-nav transition-colors duration-300 ${
                  isActive
                    ? "text-gold"
                    : "text-text-label hover:text-gold"
                }`
              }
            >
              {l.label}
            </NavLink>
          </li>
        ))}
        {isAdmin && (
          <li>
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `text-[0.65rem] uppercase tracking-nav transition-colors duration-300 ${
                  isActive ? "text-gold" : "text-text-label hover:text-gold"
                }`
              }
            >
              Admin
            </NavLink>
          </li>
        )}
        {student && !isAdmin && (
          <li className="flex items-center gap-4">
            <span className="text-[0.6rem] uppercase tracking-nav text-text-label">
              <span className="text-gold">{student.esis}</span>
            </span>
            <button
              onClick={signOut}
              className="text-[0.6rem] uppercase tracking-nav text-text-label transition-colors duration-300 hover:text-gold"
            >
              Sign out
            </button>
          </li>
        )}
        {isAdmin && (
          <li className="flex items-center gap-4">
            <span
              className="border border-gold px-3 py-1 text-[0.6rem] uppercase tracking-eyebrow text-gold"
              aria-label="Signed in as admin"
            >
              Admin
            </span>
            <button
              onClick={signOut}
              className="text-[0.6rem] uppercase tracking-nav text-text-label transition-colors duration-300 hover:text-gold"
            >
              Sign out
            </button>
          </li>
        )}
      </ul>

      <div className="hidden md:block">
        <ThemeToggle />
      </div>

      {/* Mobile: hamburger + theme toggle */}
      <div className="flex items-center gap-4 md:hidden">
        <ThemeToggle />
        <button
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-9 w-9 items-center justify-center border border-border-mid text-text-primary"
        >
          <span className="block h-px w-4 bg-current" />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="absolute inset-x-0 top-[72px] z-40 border-b border-border bg-nav-bg px-6 py-6 backdrop-blur md:hidden">
          <ul className="flex flex-col gap-5">
            {navLinks.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.to === "/"}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `block text-[0.7rem] uppercase tracking-nav transition-colors ${
                      isActive ? "text-gold" : "text-text-label"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
            {student && !isAdmin && (
              <li className="flex flex-col gap-3 pt-3 border-t border-border">
                <span className="text-[0.65rem] uppercase tracking-nav text-text-label">
                  Signed in as <span className="text-gold">{student.esis}</span>
                </span>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="self-start text-[0.65rem] uppercase tracking-nav text-text-label transition-colors hover:text-gold"
                >
                  Sign out
                </button>
              </li>
            )}
            {isAdmin && (
              <li className="flex flex-col gap-3 pt-3 border-t border-border">
                <span
                  className="inline-block w-fit border border-gold px-3 py-1 text-[0.6rem] uppercase tracking-eyebrow text-gold"
                  aria-label="Signed in as admin"
                >
                  Admin
                </span>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="self-start text-[0.65rem] uppercase tracking-nav text-text-label transition-colors hover:text-gold"
                >
                  Sign out
                </button>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Hidden state to keep `useLocation` referenced (avoids tree-shake warnings). */}
      <span className="hidden">{location.pathname}</span>
    </nav>
  );
}

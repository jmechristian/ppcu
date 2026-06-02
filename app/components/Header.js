"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "./Logo";
import { useGrowthzoneProfile } from "../providers/GrowthzoneProfileContext";

const NAV_ITEMS = [
  {
    label: "The Industry Voice",
    href: "/industry-voice",
    children: [
      { label: "News", href: "/industry-voice/news" },
      { label: "Publications", href: "/industry-voice/publications" },
    ],
  },
  {
    label: "Programs",
    href: "/programs",
    children: [
      { label: "Sustainability", href: "/programs/sustainability" },
      { label: "Safety", href: "/programs/safety" },
    ],
  },
  { label: "Events", href: "/events" },
  {
    label: "About",
    href: "/about",
    children: [
      { label: "Our Mission", href: "/about/mission" },
      { label: "Leadership", href: "/about/leadership" },
    ],
  },
  { label: "PPC University", href: "/ppc-university" },
];

function Caret({ className = "" }) {
  return (
    <svg
      className={className}
      width="10"
      height="10"
      viewBox="0 0 10 10"
      aria-hidden="true"
    >
      <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon({ className = "" }) {
  return (
    <svg
      className={className}
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M13.5 2.5a11 11 0 018.37 18.13l7.6 7.6a1.6 1.6 0 01-2.19 2.33l-.08-.07-7.6-7.6A11 11 0 1113.5 2.5zm0 3a8 8 0 100 16 8 8 0 000-16z" />
    </svg>
  );
}

export default function Header() {
  const router = useRouter();
  const { profile, refreshProfile } = useGrowthzoneProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState(null);
  const isLoggedIn = profile.status === "ready";

  async function handleLogout() {
    try {
      await fetch("/api/growthzone/oauth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("ppcu_growthzone_profile");
      }
      await refreshProfile();
      setMobileOpen(false);
      router.push("/login");
    }
  }

  return (
    <header className="w-full bg-white">
      <div className="mx-auto w-full max-w-[1200px]">
        <div className="flex items-center gap-6 py-4">
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Home">
            <Logo className="h-10 w-10" />
          </Link>

          {/* Stacked menus flush against the logo */}
          <div className="hidden lg:flex flex-col items-start flex-1 min-w-0">
            <ul className="flex items-center gap-5 list-none m-0 p-0">
              <li className="list-none">
                <Link href="/contact" className="utility-link">
                  Contact Us
                </Link>
              </li>
              <li className="list-none">
                {isLoggedIn ? (
                  <button type="button" className="utility-link" onClick={handleLogout}>
                    Log Out
                  </button>
                ) : (
                  <Link href="/login" className="utility-link">
                    Log In
                  </Link>
                )}
              </li>
            </ul>

            <nav className="flex items-center gap-7 -mt-0.5" aria-label="Primary">
              {NAV_ITEMS.map((item, idx) => {
                const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                return (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => hasChildren && setOpenIdx(idx)}
                    onMouseLeave={() => hasChildren && setOpenIdx(null)}
                  >
                    <Link
                      href={item.href}
                      className="inline-flex items-center gap-1.5 py-0 text-[17px] font-medium leading-tight text-neutral-900 hover:text-brand-blue"
                    >
                      {item.label}
                      {hasChildren && <Caret className="mt-0.5 opacity-70" />}
                    </Link>
                    {hasChildren && openIdx === idx && (
                      <div className="absolute left-0 top-full z-20 min-w-[220px] border border-brand-gray bg-white py-2 shadow-lg">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block px-4 py-2 text-[15px] font-medium text-neutral-900 hover:bg-brand-gray/40 hover:text-brand-blue"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* Search (desktop) pushed to the far right */}
          <button
            type="button"
            aria-label="Search"
            className="hidden lg:inline-block cursor-pointer leading-none text-[rgb(210,211,212)] hover:text-brand-blue self-end ml-auto"
          >
            <SearchIcon />
          </button>

          {/* Mobile controls */}
          <div className="flex items-center gap-3 lg:hidden ml-auto">
            <button
              type="button"
              aria-label="Search"
              className="text-neutral-700 hover:text-brand-blue"
            >
              <SearchIcon />
            </button>
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center text-neutral-800 hover:text-brand-blue"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                {mobileOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                ) : (
                  <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <nav
          aria-label="Mobile"
          className="lg:hidden border-t border-brand-gray bg-white"
        >
          <div className="mx-auto w-full max-w-[1200px] py-2">
            <div className="border-b border-brand-gray/70 pb-2 mb-1">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block py-2 text-[15px] font-medium text-neutral-800 hover:text-brand-blue"
                >
                  Log Out
                </button>
              ) : (
                <Link
                  href="/login"
                  className="block py-2 text-[15px] font-medium text-neutral-800 hover:text-brand-blue"
                  onClick={() => setMobileOpen(false)}
                >
                  Log In
                </Link>
              )}
            </div>
            {NAV_ITEMS.map((item) => (
              <div key={item.label} className="border-b border-brand-gray/70 last:border-b-0">
                <Link
                  href={item.href}
                  className="block py-3 text-[15px] font-medium text-neutral-800 hover:text-brand-blue"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
                {item.children?.length > 0 && (
                  <div className="pb-3 pl-4">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className="block py-1.5 text-sm text-neutral-600 hover:text-brand-blue"
                        onClick={() => setMobileOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

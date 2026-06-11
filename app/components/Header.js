"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FaBook, FaCog, FaHome, FaInfoCircle } from "react-icons/fa";
import Logo from "./Logo";
import { useGrowthzoneProfile } from "../providers/GrowthzoneProfileContext";

const NAV_ITEMS = [
  {
    label: "The Industry Voice",
    href: "https://paperbox.org/industry-voice/",
    external: true,
    children: [
      { label: "Blog", href: "https://paperbox.org/industry-voice/", external: true },
      {
        label: "Submit Content",
        href: "https://paperbox.org/amplify-your-brand/",
        external: true,
      },
    ],
  },
  {
    label: "Programs",
    href: "https://paperbox.org/programs/",
    external: true,
    children: [
      {
        label: "Paperboard Packaging Competition",
        href: "https://paperbox.org/programs/carton-competition/",
        external: true,
      },
      {
        label: "Industry Benchmarking",
        href: "https://paperbox.org/programs/benchmarking/",
        external: true,
      },
      {
        label: "Industry Affairs",
        href: "https://paperbox.org/industry-affairs/",
        external: true,
      },
      {
        label: "Buy PPC",
        href: "https://members.paperbox.org/buyppcdirectory/FindStartsWith?term=%23%21",
        external: true,
      },
      { label: "PPCU", href: "/" },
      { label: "TICCIT", href: "https://paperbox.org/programs/ticcit/", external: true },
      {
        label: "Sponsorship",
        href: "https://paperbox.org/programs/sponsorship/",
        external: true,
      },
      { label: "Film Fest", href: "https://paperbox.org/programs/filmfest/", external: true },
      { label: "Awards", href: "https://paperbox.org/programs/awards/", external: true },
      {
        label: "Merchandise",
        href: "https://paperbox.org/programs/ideasandinnovation/",
        external: true,
      },
    ],
  },
  { label: "Events", href: "https://paperbox.org/events/", external: true },
  {
    label: "About",
    href: "https://paperbox.org/about/",
    external: true,
    children: [
      { label: "Why join?", href: "https://paperbox.org/become-a-member/", external: true },
      {
        label: "Member Portal",
        href: "https://paperboardpackagingcouncil.growthzoneapp.com/MIC/login",
        external: true,
      },
      { label: "Help Desk", href: "https://paperbox.org/helpdesk/", external: true },
    ],
  },
  { label: "PPC University", href: "/" },
];

const MOBILE_SIDEBAR_ITEMS = [
  { key: "home", label: "Home", href: "/", icon: FaHome },
  { key: "getting-started", label: "Getting Started", href: "/getting-started", icon: FaInfoCircle },
  {
    key: "catalog",
    label: "Folding Carton Essentials",
    href: "/catalog",
    icon: FaBook,
  },
];

function NavItemLink({ item, className, children, onClick }) {
  if (item.external) {
    return (
      <a href={item.href} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

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
  const pathname = usePathname();
  const router = useRouter();
  const { profile, refreshProfile } = useGrowthzoneProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState(null);
  const isLoggedIn = profile.status === "ready";
  const isPrimaryContact = /primary/i.test(profile.type || "");
  const mobileItems = isPrimaryContact
    ? [
        ...MOBILE_SIDEBAR_ITEMS,
        { key: "admin", label: "Admin", href: "/admin", icon: FaCog },
      ]
    : MOBILE_SIDEBAR_ITEMS;

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
      router.push("/login?loggedOut=1");
    }
  }

  return (
    <header className="w-full bg-white">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-0">
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
                const isOpen = openIdx === idx;
                return (
                  <div
                    key={item.label}
                    className="relative"
                    onMouseEnter={() => hasChildren && setOpenIdx(idx)}
                    onMouseLeave={() => hasChildren && setOpenIdx(null)}
                  >
                    <NavItemLink
                      item={item}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[17px] leading-tight font-medium transition-colors ${
                        isOpen && hasChildren
                          ? "rounded-t-[4px] bg-[#242224] text-brand-green"
                          : "text-neutral-900 hover:text-brand-blue"
                      }`}
                    >
                      {item.label}
                      {hasChildren && <Caret className="mt-0.5 opacity-80" />}
                    </NavItemLink>
                    {hasChildren && isOpen && (
                      <div className="absolute left-0 top-full z-20 min-w-[168px] overflow-hidden rounded-b-[6px] border border-[#383838] bg-[#242224] shadow-xl">
                        {item.children.map((child) => (
                          <NavItemLink
                            item={child}
                            key={child.href}
                            className="block border-t border-dashed border-[#6c6b6c] px-3 py-2.5 text-[16px] font-medium leading-[1.1] text-white hover:bg-[#2b292b] first:border-t-0"
                          >
                            {child.label}
                          </NavItemLink>
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
        <nav aria-label="Mobile sidebar menu" className="lg:hidden bg-[#242224]">
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-0 py-3">
            <ul className="space-y-1.5">
              {mobileItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname === item.href || pathname?.startsWith(`${item.href}/`);

                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded px-5 py-2.5 text-[17px] font-medium transition ${
                        isActive
                          ? "bg-brand-green text-white"
                          : "text-white hover:bg-white/10"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 rounded-md bg-[#cfd0d3] px-3 py-3">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mx-auto block bg-brand-green px-6 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white"
                >
                  Log Out
                </button>
              ) : (
                <Link
                  href="/login"
                  className="mx-auto block w-fit bg-brand-green px-6 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Log In
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

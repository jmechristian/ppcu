import Link from "next/link";

const LEFT_LINKS = [
  { label: "About", href: "/about" },
  { label: "Membership", href: "/membership" },
  { label: "The Industry Voice", href: "/industry-voice" },
  { label: "Programs", href: "/programs" },
  { label: "Events", href: "/events" },
];

const RIGHT_LINKS = [
  { label: "Find a Member", href: "/members" },
  { label: "Contact Us", href: "/contact" },
  { label: "Phone: 413-686-9191", href: "tel:+14136869191" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Antitrust Policy", href: "/antitrust" },
];

function Crosshair({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <line x1="24" y1="2" x2="24" y2="14" stroke="currentColor" strokeWidth="1.5" />
      <line x1="24" y1="34" x2="24" y2="46" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="24" x2="14" y2="24" stroke="currentColor" strokeWidth="1.5" />
      <line x1="34" y1="24" x2="46" y2="24" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Facebook({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12a10 10 0 10-11.6 9.9v-7H8v-2.9h2.4V9.8c0-2.4 1.4-3.7 3.6-3.7 1 0 2 .2 2 .2v2.3h-1.2c-1.2 0-1.5.7-1.5 1.5V12H16l-.4 2.9h-2.3v7A10 10 0 0022 12z" />
    </svg>
  );
}

function LinkedIn({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M4.98 3.5A2.5 2.5 0 012.5 6a2.5 2.5 0 01.01-5A2.5 2.5 0 014.98 3.5zM2.95 8h4.06v12H2.95V8zM9.5 8h3.9v1.7h.05c.54-1 1.87-2.05 3.85-2.05 4.12 0 4.88 2.7 4.88 6.22V20h-4.06v-5.4c0-1.29-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V20H9.5V8z" />
    </svg>
  );
}

function Twitter({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2H21.5l-7.1 8.11L22.86 22H16.28l-5.15-6.74L5.28 22H2.02l7.59-8.67L1.62 2h6.75l4.66 6.17L18.24 2zm-1.15 18h1.85L7.02 3.9H5.04L17.09 20z" />
    </svg>
  );
}

function Instagram({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9s.7.8.9 1.4c.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4s-.8.7-1.4.9c-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4a3.8 3.8 0 01-1.4-.9 3.8 3.8 0 01-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4s.8-.7 1.4-.9c.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.1 0-3.5 0-4.7.1-1.1.1-1.7.2-2 .4-.5.2-.8.4-1.2.8s-.6.7-.8 1.2c-.1.3-.3.9-.4 2-.1 1.2-.1 1.6-.1 4.7s0 3.5.1 4.7c.1 1.1.2 1.7.4 2 .2.5.4.8.8 1.2s.7.6 1.2.8c.3.1.9.3 2 .4 1.2.1 1.6.1 4.7.1s3.5 0 4.7-.1c1.1-.1 1.7-.2 2-.4.5-.2.8-.4 1.2-.8s.6-.7.8-1.2c.1-.3.3-.9.4-2 .1-1.2.1-1.6.1-4.7s0-3.5-.1-4.7c-.1-1.1-.2-1.7-.4-2-.2-.5-.4-.8-.8-1.2s-.7-.6-1.2-.8c-.3-.1-.9-.3-2-.4-1.2-.1-1.6-.1-4.7-.1zm0 3.1a4.9 4.9 0 110 9.8 4.9 4.9 0 010-9.8zm0 1.8a3.1 3.1 0 100 6.2 3.1 3.1 0 000-6.2zm5.1-2a1.15 1.15 0 110 2.3 1.15 1.15 0 010-2.3z" />
    </svg>
  );
}

const SOCIALS = [
  { label: "Facebook", href: "#", Icon: Facebook },
  { label: "LinkedIn", href: "#", Icon: LinkedIn },
  { label: "Twitter", href: "#", Icon: Twitter },
  { label: "Instagram", href: "#", Icon: Instagram },
];

export default function Footer() {
  return (
    <footer className="w-full bg-footer-bg text-footer-fg">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-0 py-12 lg:py-16">
        <div className="pl-0 lg:pl-12">
          {/* Top row: "Navigate" on the left, Member Login on the right */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
            <h2 className="text-3xl md:text-4xl tracking-tight text-white">
              <span className="font-bold">Navi</span>
              <span className="font-light">gate</span>
            </h2>

            <Link
              href="/login"
              className="inline-flex w-fit items-center justify-center bg-brand-green px-6 py-3 text-xs font-bold tracking-[0.12em] text-white uppercase hover:brightness-110 transition"
            >
              Member Login
            </Link>
          </div>

          {/* Dashed divider with crosshair anchored in the left gutter, centered on the line */}
          <div className="relative mt-4">
            <Crosshair
              aria-hidden="true"
              className="absolute -left-12 top-1/2 hidden h-8 w-8 -translate-y-1/2 text-white/80 lg:block"
            />
            <div
              aria-hidden="true"
              className="border-t border-dashed border-white/40"
            />
          </div>

          {/* Link columns */}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-16">
            <ul className="space-y-1">
              {LEFT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/90 hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="space-y-1">
              {RIGHT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-white/90 hover:text-white">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom row: copyright + socials */}
          <div className="mt-8 flex flex-col-reverse gap-6 md:flex-row md:items-end md:justify-between">
            <p className="text-[11px] leading-relaxed text-white/70">
              &copy; {new Date().getFullYear()} Copyright Paperboard Packaging Council. All Rights Reserved.
              <br />
              North American Packaging Association&trade;
            </p>
            <ul className="flex items-center gap-3">
              {SOCIALS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={label}
                    className="inline-flex h-8 w-8 items-center justify-center text-white hover:text-brand-green transition"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}

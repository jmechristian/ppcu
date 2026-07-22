"use client";

import Link from "next/link";
import { FaBook, FaBookOpen, FaCog, FaFileAlt, FaHome, FaInfoCircle } from "react-icons/fa";
import { useGrowthzoneProfile } from "../providers/GrowthzoneProfileContext";
import { canViewDocs, isInternalStaff, isStaffRole } from "../lib/doc-access";

const BASE_NAV_ITEMS = [
  {
    key: "home",
    href: "/",
    label: "Home",
    icon: <FaHome className="h-5 w-5" aria-hidden="true" />,
  },
  {
    key: "getting-started",
    href: "/getting-started",
    label: "Getting Started",
    icon: <FaInfoCircle className="h-5 w-5" aria-hidden="true" />,
  },
];

const CATALOG_NAV_ITEM = {
  key: "catalog",
  href: "/catalog",
  label: "Folding Carton Essentials",
  icon: <FaBook className="h-5 w-5" aria-hidden="true" />,
};

const LEARNING_NAV_ITEM = {
  key: "learning",
  href: "/learning",
  label: "My Learning",
  icon: <FaBookOpen className="h-5 w-5" aria-hidden="true" />,
};

function cx(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

function VerifyingAccessNotice() {
  return (
    <div className="animate-pulse space-y-4 border border-gray-200 bg-gray-50 p-6">
      <div className="h-4 w-1/3 rounded bg-gray-200" />
      <div className="h-24 w-full rounded bg-gray-200" />
      <div className="h-24 w-full rounded bg-gray-200" />
    </div>
  );
}

function MembershipRequiredNotice() {
  return (
    <section className="border border-gray-300 bg-[#dddde1]">
      <div className="border-b border-gray-300 px-5 py-3">
        <h3 className="text-[17px] font-semibold leading-[1.15] text-[#1f1f1f]">
          PPC University is a members-only benefit.
        </h3>
      </div>
      <div className="space-y-3 px-5 py-4 text-[14px] leading-[1.45] text-gray-800">
        <p>
          Access to PPC University is limited to active members of the Paperboard
          Packaging Council. We were not able to confirm an active membership on your
          account.
        </p>
        <p>
          If you believe this is an error, or would like to learn more about becoming a
          member, please reach out and we&apos;ll help sort it out.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center rounded-none bg-brand-green px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white hover:brightness-110"
        >
          Contact Us
        </Link>
      </div>
    </section>
  );
}

function SidebarItem({ item, activeItem }) {
  const isActive = activeItem && item.key === activeItem;

  return (
    <li className="border-b border-dashed border-gray-300 last:border-b-0">
      <Link
        href={item.href}
        className={cx(
          "flex items-center gap-2.5 px-5 py-2.5 text-[17px] font-semibold text-gray-800 hover:text-black",
          isActive ? "bg-gray-100" : "",
        )}
      >
        <span className="text-gray-700">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    </li>
  );
}

export default function InteriorPageLayout({ children, activeItem = null }) {
  const { profile } = useGrowthzoneProfile();
  const fullName =
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.name || "";
  const isLoadingProfile = profile.status === "loading";
  const hasProfile = Boolean(fullName || profile.title || profile.business || profile.type);
  // Never show real content (or role-based nav items) off of an unverified (cached)
  // profile - wait for the server to confirm membership access before deciding what
  // to render.
  const isVerifying = !profile.verified;
  const isAdminVisible = !isVerifying && isStaffRole(profile.type);
  const isDocsVisible = !isVerifying && canViewDocs(profile);
  const isGated =
    !isVerifying &&
    profile.status === "ready" &&
    !isInternalStaff(profile.type) &&
    !isDocsVisible &&
    !profile.hasMembershipAccess;
  // Confirmed enrollment (post-verification) swaps the catalog link for "My Learning" -
  // never trust an unverified profile for this either.
  const isEnrolledConfirmed = !isVerifying && Boolean(profile.isEnrolled);

  const navItems = [
    ...BASE_NAV_ITEMS,
    isEnrolledConfirmed ? LEARNING_NAV_ITEM : CATALOG_NAV_ITEM,
    ...(isAdminVisible
      ? [
          {
            key: "admin",
            href: "/admin",
            label: "Admin",
            icon: <FaCog className="h-5 w-5" aria-hidden="true" />,
          },
        ]
      : []),
    ...(isDocsVisible
      ? [
          {
            key: "documentation",
            href: "/documentation",
            label: "Documentation",
            icon: <FaFileAlt className="h-5 w-5" aria-hidden="true" />,
          },
        ]
      : []),
  ];

  return (
    <div className="w-full bg-white py-6 lg:py-7">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-0">
        <div className="grid items-start gap-6 lg:grid-cols-[74.36%_23.08%] lg:gap-[2.56%]">
          <div className="space-y-6">
            {isVerifying ? (
              <VerifyingAccessNotice />
            ) : isGated ? (
              <MembershipRequiredNotice />
            ) : (
              children
            )}
          </div>

          <div className="space-y-3">
            {(isLoadingProfile || hasProfile) && (
              <aside className="border-4 border-[#2a2a2a] bg-white p-4">
                {isLoadingProfile ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 w-2/3 rounded bg-gray-200" />
                    <div className="h-3 w-full rounded bg-gray-200" />
                    <div className="h-5 w-1/3 rounded-full bg-gray-200" />
                  </div>
                ) : (
                  <>
                    <div className="text-[13px] font-semibold text-gray-900">
                      {fullName || "Member"}
                    </div>
                    {(profile.title || profile.business) && (
                      <div className="mt-1 text-[12px] text-gray-700">
                        {[profile.title, profile.business].filter(Boolean).join(" - ")}
                      </div>
                    )}
                    {profile.type && (
                      <div className="mt-2">
                        <span className="inline-flex items-center rounded-full bg-brand-green px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          {profile.type}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </aside>
            )}

            <aside className="mt-1 h-fit border-4 border-[#2a2a2a] bg-white">
              <ul>
                {navItems.map((item) => (
                  <SidebarItem key={item.key} item={item} activeItem={activeItem} />
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

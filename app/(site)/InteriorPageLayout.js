"use client";

import Link from "next/link";
import { FaBook, FaCog, FaHome, FaInfoCircle, FaShoppingCart } from "react-icons/fa";
import { useGrowthzoneProfile } from "../providers/GrowthzoneProfileContext";

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
  {
    key: "catalog",
    href: "/catalog",
    label: "Folding Carton Essentials",
    icon: <FaBook className="h-5 w-5" aria-hidden="true" />,
  },
  {
    key: "cart",
    href: "/cart",
    label: "Cart (0 items)",
    icon: <FaShoppingCart className="h-5 w-5" aria-hidden="true" />,
  },
];

function cx(...classNames) {
  return classNames.filter(Boolean).join(" ");
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
  const isPrimaryContact = /primary/i.test(profile.type || "");
  const hasProfile = Boolean(fullName || profile.title || profile.business || profile.type);

  const navItems = isPrimaryContact
    ? [
        ...BASE_NAV_ITEMS,
        {
          key: "admin",
          href: "/admin",
          label: "Admin",
          icon: <FaCog className="h-5 w-5" aria-hidden="true" />,
        },
      ]
    : BASE_NAV_ITEMS;

  return (
    <div className="w-full bg-white py-6 lg:py-7">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-0">
        <div className="grid items-start gap-6 lg:grid-cols-[74.36%_23.08%] lg:gap-[2.56%]">
          <div className="space-y-6">{children}</div>

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

"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ppcu_growthzone_profile";

const EMPTY_PROFILE = {
  status: "idle",
  firstName: "",
  lastName: "",
  name: "",
  email: "",
  contactId: "",
  organizationContactId: "",
  business: "",
  title: "",
  type: "",
  hasMembershipAccess: false,
  isEnrolled: false,
  // True only once a live server response has confirmed this profile (never trust the
  // sessionStorage cache alone for access-sensitive checks like membership gating).
  verified: false,
};

async function fetchIsEnrolled(email) {
  if (!email) return false;
  try {
    const response = await fetch(
      `/api/thinkific/enrollment-status?email=${encodeURIComponent(email)}`,
      { cache: "no-store" },
    );
    const json = await response.json().catch(() => ({}));
    return Boolean(json?.enrolled);
  } catch {
    return false;
  }
}

const GrowthzoneProfileContext = createContext({
  profile: EMPTY_PROFILE,
  refreshProfile: async () => {},
});

function normalizeProfile(json) {
  if (!json?.connected) return EMPTY_PROFILE;
  return {
    status: "ready",
    firstName: json?.profile?.firstName || "",
    lastName: json?.profile?.lastName || "",
    name: json?.profile?.name || "",
    email: json?.profile?.email || "",
    contactId: json?.profile?.contactId || "",
    organizationContactId: json?.profile?.organizationContactId || "",
    business: json?.profile?.business || "",
    title: json?.profile?.title || "",
    type: json?.profile?.type || "",
    hasMembershipAccess: Boolean(json?.profile?.hasMembershipAccess),
  };
}

export function GrowthzoneProfileProvider({ children }) {
  const [profile, setProfile] = useState(EMPTY_PROFILE);

  const refreshProfile = async () => {
    setProfile((prev) => ({ ...prev, status: prev.status === "ready" ? "ready" : "loading" }));
    try {
      const response = await fetch("/api/growthzone/oauth/profile", {
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) {
        setProfile({ ...EMPTY_PROFILE, verified: true });
        if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
        return;
      }

      const json = await response.json();
      const parsedProfile = normalizeProfile(json);
      const isEnrolled =
        parsedProfile.status === "ready" ? await fetchIsEnrolled(parsedProfile.email) : false;
      const nextProfile = { ...parsedProfile, isEnrolled, verified: true };
      setProfile(nextProfile);

      if (typeof window !== "undefined") {
        if (nextProfile.status === "ready") {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
        } else {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      setProfile((prev) => (prev.status === "ready" ? { ...prev, verified: true } : { ...EMPTY_PROFILE, verified: true }));
    }
  };

  useEffect(() => {
    try {
      const cached = window.sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === "object") {
          setProfile({
            ...EMPTY_PROFILE,
            ...parsed,
            status: "ready",
            // Cached data is optimistic only - always re-verify with the server
            // before trusting it for access-sensitive checks.
            verified: false,
          });
        }
      }
    } catch {}

    refreshProfile();
  }, []);

  const value = useMemo(() => ({ profile, refreshProfile }), [profile]);

  return (
    <GrowthzoneProfileContext.Provider value={value}>{children}</GrowthzoneProfileContext.Provider>
  );
}

export function useGrowthzoneProfile() {
  return useContext(GrowthzoneProfileContext);
}


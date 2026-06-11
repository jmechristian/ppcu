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
  business: "",
  title: "",
  type: "",
};

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
    business: json?.profile?.business || "",
    title: json?.profile?.title || "",
    type: json?.profile?.type || "",
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
        setProfile(EMPTY_PROFILE);
        if (typeof window !== "undefined") window.sessionStorage.removeItem(STORAGE_KEY);
        return;
      }

      const json = await response.json();
      const nextProfile = normalizeProfile(json);
      setProfile(nextProfile);

      if (typeof window !== "undefined") {
        if (nextProfile.status === "ready") {
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextProfile));
        } else {
          window.sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      setProfile((prev) => (prev.status === "ready" ? prev : EMPTY_PROFILE));
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


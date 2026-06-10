"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const oauthStartUrl = "/api/growthzone/oauth/start?returnTo=/";

  const oauthError = useMemo(() => {
    const oauth = searchParams.get("oauth");
    if (oauth !== "error") return null;
    const reason = searchParams.get("reason") || "unknown";
    if (reason === "invalid_callback") {
      return "Login callback was invalid or expired. Please try again.";
    }
    if (reason === "token_exchange_failed") {
      return "Could not sign in with OAuth. Please try again.";
    }
    return "An unexpected OAuth error occurred. Please try again.";
  }, [searchParams]);

  const startOAuthLogin = (fromUserClick = false) => {
    if (fromUserClick) {
      setSubmitting(true);
      setStatusMessage("Redirecting to secure sign-in...");
    }
    window.location.assign(oauthStartUrl);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/growthzone/oauth/status", {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const json = await response.json();
        if (json.connected && !cancelled) {
          router.replace("/");
          return;
        }

        if (!cancelled) {
          // If we were bounced back with an OAuth error, let user retry manually.
          if (oauthError) {
            setSubmitting(false);
            setStatusMessage("");
            return;
          }
          // Auto-start OAuth without setState writes right before navigation.
          window.location.assign(oauthStartUrl);
          return;
        }
      } catch {
        if (!cancelled) {
          setSubmitting(false);
          setStatusMessage("Could not reach sign-in service. Please try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [oauthError, oauthStartUrl, router]);

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f2f2]">
      {/* Thin dark top bar */}
      <div className="w-full bg-[#1a1a1a] h-12" aria-hidden="true" />

      <div className="flex-1 flex flex-col items-center px-4 py-10">
        {/* Login card */}
        <div className="w-full max-w-[860px] bg-white shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Left: logo */}
            <div className="flex items-center justify-center p-10 md:border-r md:border-[#e5e5e5]">
              <Image
                src="/logo.svg"
                alt="Paperboard Packaging Council"
                width={240}
                height={240}
                className="h-48 w-48 md:h-56 md:w-56"
                priority
              />
            </div>

            {/* Right: form */}
            <div className="p-8 md:p-10 flex flex-col">
              <h1 className="text-[20px] font-normal text-neutral-700 text-center mb-6">
                Login to Paperboard Packaging Council
              </h1>

              {oauthError && (
                <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-[12px] text-red-700">
                  {oauthError}
                </div>
              )}

              {statusMessage && (
                <div className="mb-4 rounded border border-brand-blue/30 bg-brand-blue/10 px-3 py-2 text-[12px] text-brand-blue">
                  {statusMessage}
                </div>
              )}

              <div
                className="flex flex-col gap-4"
              >
                <p className="text-[14px] text-neutral-600 text-center">
                  Continue to the official member sign-in.
                </p>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => startOAuthLogin(true)}
                  className="mt-4 w-full h-10 bg-brand-green text-white text-[14px] font-medium hover:brightness-110 transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? "Redirecting..." : "Continue to Login"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Powered by GrowthZone */}
        <p className="mt-6 text-[11px] text-neutral-500">
          Powered by{" "}
          <span className="italic font-bold">
            <span className="text-[#b84d1a]">Growth</span>
            <span className="text-[#d97435]">Zone</span>
          </span>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f2f2f2]" />}>
      <LoginContent />
    </Suspense>
  );
}

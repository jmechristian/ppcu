"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function UserIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.42 0-8 2.69-8 6v2h16v-2c0-3.31-3.58-6-8-6z" />
    </svg>
  );
}

function LockIcon({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17 9h-1V7a4 4 0 10-8 0v2H7a2 2 0 00-2 2v9a2 2 0 002 2h10a2 2 0 002-2v-9a2 2 0 00-2-2zm-7-2a2 2 0 114 0v2h-4V7zm2 11a2 2 0 110-4 2 2 0 010 4z" />
    </svg>
  );
}

function EyeIcon({ className = "", closed = false }) {
  if (closed) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 6.5c-4.5 0-8.4 2.8-10 7 .7 1.8 1.9 3.4 3.4 4.6l-2.4 2.4 1.4 1.4 18-18-1.4-1.4-3.3 3.3A11.3 11.3 0 0012 6.5zm0 3a4 4 0 013.9 4.9L13.6 12a2 2 0 00-1.8-1.8l-2.3-2.3c.8-.3 1.6-.4 2.5-.4zM2.1 4.9l3.3 3.3C3.9 9.4 2.7 11 2 12.5c1.6 4.2 5.5 7 10 7 1.5 0 2.9-.3 4.2-.8l3 3 1.4-1.4-18-18-1.5 1.6zm7 7l2 2c-.6 0-1.1-.2-1.5-.5-.3-.4-.5-.9-.5-1.5z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 5.5c-5 0-9.3 3.1-11 7.5 1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5c-1.7-4.4-6-7.5-11-7.5zm0 12.5a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

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
        }
      } catch {
        // Ignore status check failures on initial render.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const startOAuthLogin = () => {
    setSubmitting(true);
    setStatusMessage("Redirecting to secure sign-in...");
    window.location.assign("/api/growthzone/oauth/start?returnTo=/");
  };

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

              <form
                className="flex flex-col gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  startOAuthLogin();
                }}
              >
                {/* Username */}
                <div className="flex items-stretch border border-[#d9d9d9] bg-white">
                  <span className="flex h-10 w-10 items-center justify-center bg-[#e8e8e8] text-[#9a9a9a] shrink-0">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Username"
                    autoComplete="username"
                    className="flex-1 h-10 px-3 text-[14px] text-neutral-800 placeholder:text-[#b8b8b8] bg-white outline-none"
                  />
                </div>

                {/* Password */}
                <div className="flex items-stretch border border-[#d9d9d9] bg-white">
                  <span className="flex h-10 w-10 items-center justify-center bg-[#e8e8e8] text-[#9a9a9a] shrink-0">
                    <LockIcon className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="flex-1 h-10 px-3 text-[14px] text-neutral-800 placeholder:text-[#b8b8b8] bg-white outline-none"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="flex h-10 w-10 items-center justify-center text-[#9a9a9a] hover:text-neutral-700 cursor-pointer"
                  >
                    <EyeIcon className="h-4 w-4" closed={showPassword} />
                  </button>
                </div>

                <Link
                  href="/forgot-password"
                  className="text-[12px] text-brand-green hover:underline"
                >
                  Forgot your Username or Password?
                </Link>

                <label className="flex items-center gap-2 text-[12px] text-neutral-700 cursor-pointer select-none mt-1">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-brand-green" />
                  Remember Me
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-4 w-full h-10 bg-brand-green text-white text-[14px] font-medium hover:brightness-110 transition cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting ? "Redirecting..." : "Log In"}
                </button>

                <Link
                  href="/signup"
                  className="mt-1 text-[12px] text-brand-green hover:underline"
                >
                  Create an Account
                </Link>
              </form>
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

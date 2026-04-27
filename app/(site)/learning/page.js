"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useGrowthzoneProfile } from "../../providers/GrowthzoneProfileContext";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LearningPage() {
  const { profile } = useGrowthzoneProfile();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/growthzone/learning", {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok) throw new Error(`Request failed (${response.status})`);
        const json = await response.json();
        if (cancelled) return;
        if (!json?.connected) {
          setError("Please sign in to view your learning dashboard.");
        } else {
          setPayload(json);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load learning data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const certifications = payload?.certifications || [];
  const learners = payload?.manageLearners || [];
  const learningProfile = payload?.profile || {};

  const fullName = useMemo(
    () =>
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      [learningProfile.firstName, learningProfile.lastName].filter(Boolean).join(" "),
    [learningProfile.firstName, learningProfile.lastName, profile.firstName, profile.lastName],
  );

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-10 space-y-8">
      <section className="rounded-xl overflow-hidden">
        <div className="bg-black text-white px-6 py-5">
          {loading ? (
            <div className="text-white/80">Loading profile...</div>
          ) : error ? (
            <div className="text-red-300">{error}</div>
          ) : (
            <div className="space-y-2">
              <div className="text-2xl font-bold">{`Welcome, ${fullName || "Learner"}`}</div>
              <div className="text-sm text-white/90">
                {[profile.title || learningProfile.title, profile.business || learningProfile.business]
                  .filter(Boolean)
                  .join(" - ")}
              </div>
              {(profile.type || learningProfile.type) && (
                <span className="inline-flex items-center rounded-full bg-brand-green px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {profile.type || learningProfile.type}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-gray-900">My Certificates</h2>
        {loading ? (
          <p className="mt-4 text-gray-500">Loading certificates...</p>
        ) : certifications.length === 0 ? (
          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-gray-600">No certificates found for your account.</p>
            <Link
              href="/"
              className="inline-flex items-center rounded bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
            >
              Enroll
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certifications.map((cert) => (
              <article
                key={`${cert.certificationContactId}-${cert.certificationTypeId}`}
                className="rounded border border-gray-200 p-4 bg-gray-50"
              >
                <h3 className="font-semibold text-gray-900">{cert.certificationName}</h3>
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  <div>Status: {cert.statusText || cert.status || "-"}</div>
                  <div>Progress: {cert.percentage || "-"}</div>
                  <div>Hours: {cert.hoursEarned ?? 0}</div>
                  <div>Credits: {cert.creditsEarned ?? 0}</div>
                  <div>Started: {formatDate(cert.startDate)}</div>
                  <div>Completed: {formatDate(cert.completedDate)}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-bold text-gray-900">Manage Learners</h2>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <input
            type="text"
            placeholder="Search learners..."
            className="w-full sm:max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
          />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
          >
            Add Learner
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="py-2 pr-4">Learner</th>
                <th className="py-2 pr-4">Certification</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Progress</th>
                <th className="py-2 pr-4">Hours</th>
                <th className="py-2 pr-4">Credits</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {learners.slice(0, 50).map((row) => (
                <tr
                  key={`${row.contactId}-${row.certificationContactId}-${row.certificationTypeId}`}
                  className="border-b border-gray-100 text-gray-800"
                >
                  <td className="py-2 pr-4">{row.contactName || "-"}</td>
                  <td className="py-2 pr-4">{row.certificationName || "-"}</td>
                  <td className="py-2 pr-4">{row.statusText || row.status || "-"}</td>
                  <td className="py-2 pr-4">{row.percentage || "-"}</td>
                  <td className="py-2 pr-4">{row.hoursEarned ?? 0}</td>
                  <td className="py-2 pr-4">{row.creditsEarned ?? 0}</td>
                  <td className="py-2 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Play learner"
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-700"
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Pause learner"
                        className="inline-flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white text-gray-700"
                      >
                        <svg
                          className="h-4 w-4"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && learners.length === 0 && (
            <p className="py-4 text-gray-500">No learner tracking rows returned.</p>
          )}
        </div>
      </section>
    </div>
  );
}


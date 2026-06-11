"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InteriorPageLayout from "../InteriorPageLayout";
import { useGrowthzoneProfile } from "../../providers/GrowthzoneProfileContext";

function stripHtml(value) {
  if (!value) return "";
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export default function CatalogPage() {
  const { profile } = useGrowthzoneProfile();
  const isLoggedIn = profile.status === "ready";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [bundle, setBundle] = useState(null);
  const [openCourseIds, setOpenCourseIds] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;

    async function loadBundle() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/thinkific/course-outline", {
          method: "GET",
          cache: "no-store",
        });
        const json = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(json?.error || `Request failed (${response.status})`);
        }

        if (cancelled) return;
        const nextBundle = json?.data || null;
        setBundle(nextBundle);

        const firstCourseId = nextBundle?.courses?.[0]?.id;
        setOpenCourseIds(firstCourseId ? new Set([firstCourseId]) : new Set());
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load the catalog outline right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBundle();
    return () => {
      cancelled = true;
    };
  }, []);

  const courses = useMemo(() => bundle?.courses || [], [bundle]);
  const description = useMemo(() => stripHtml(bundle?.description), [bundle?.description]);
  const totals = bundle?.totals || {
    coursesCount: courses.length,
    chaptersCount: 0,
    lessonsCount: 0,
    totalVideoContentTime: 0,
  };

  function toggleCourse(courseId) {
    setOpenCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  }

  async function handleEnroll() {
    if (!bundle?.product?.checkoutUrl || isEnrolling) return;
    setEnrollError("");
    setIsEnrolling(true);

    try {
      const firstName = (profile.firstName || "").trim();
      const lastName = (profile.lastName || "").trim();
      const email = (profile.email || "").trim().toLowerCase();
      const contactId = Number(profile.contactId);
      const contactName = (profile.name || `${firstName} ${lastName}`.trim()).trim();

      if (!firstName || !lastName || !email) {
        throw new Error("Missing profile data required for enrollment.");
      }

      const response = await fetch("/api/thinkific/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          contact_id: Number.isFinite(contactId) && contactId > 0 ? contactId : null,
          contact_name: contactName,
          return_to: bundle.product.checkoutUrl,
        }),
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.url) {
        throw new Error(json?.error || "Unable to start Thinkific enrollment.");
      }

      window.location.assign(json.url);
    } catch (err) {
      setEnrollError(err?.message || "Unable to start enrollment.");
      setIsEnrolling(false);
    }
  }

  return (
    <InteriorPageLayout activeItem="catalog">
      <section className="min-h-[520px] border border-gray-300 bg-white p-5 sm:p-6">
        {loading ? (
          <div className="space-y-5 animate-pulse">
            <div className="h-7 w-2/3 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
            <div className="h-4 w-[85%] rounded bg-gray-200" />
            <div className="h-28 rounded bg-gray-100" />
            <div className="h-16 rounded bg-gray-100" />
            <div className="h-16 rounded bg-gray-100" />
          </div>
        ) : error ? (
          <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : !bundle ? (
          <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            No bundle data was returned.
          </div>
        ) : (
          <div className="space-y-7">
            <header className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-3xl font-semibold leading-tight text-[#1f2a44]">
                  {bundle.title}
                </h1>
                {isLoggedIn && bundle.product?.checkoutUrl && (
                  <button
                    type="button"
                    onClick={handleEnroll}
                    disabled={isEnrolling}
                    className="inline-flex items-center rounded bg-brand-green px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white hover:brightness-110"
                  >
                    {isEnrolling ? "Preparing..." : "Enroll"}
                  </button>
                )}
                {!isLoggedIn && (
                  <Link
                    href="/login"
                    className="inline-flex items-center rounded bg-brand-green px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-white hover:brightness-110"
                  >
                    Log In to Enroll
                  </Link>
                )}
              </div>
              {enrollError && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {enrollError}
                </div>
              )}
              {description && (
                <p className="max-w-4xl text-[15px] leading-relaxed text-gray-700">{description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-700">
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                  {totals.coursesCount || courses.length} courses
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                  {totals.chaptersCount || 0} chapters
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                  {totals.lessonsCount || 0} lessons
                </span>
                {bundle.product?.displayPrice && (
                  <span className="rounded-full bg-brand-green px-3 py-1 font-semibold text-white">
                    {bundle.product.displayPrice}
                  </span>
                )}
              </div>
            </header>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 bg-[#f7f7f8] px-4 py-3">
                <h2 className="text-[18px] font-semibold text-gray-900">Bundle Outline</h2>
              </div>

              <ul className="divide-y divide-gray-200">
                {courses.map((courseItem, index) => {
                  const isOpen = openCourseIds.has(courseItem.id);
                  const chapterCount = courseItem?.curriculum?.chaptersCount || 0;
                  const lessonCount = courseItem?.curriculum?.lessonsCount || 0;
                  return (
                    <li key={courseItem.id || `${courseItem.title}-${index}`} className="bg-white">
                      <button
                        type="button"
                        onClick={() => toggleCourse(courseItem.id)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-50"
                        aria-expanded={isOpen}
                      >
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                            Course {index + 1}
                          </div>
                          <div className="truncate text-[16px] font-semibold text-gray-900">
                            {courseItem.title}
                          </div>
                          <div className="mt-0.5 text-xs text-gray-500">
                            {chapterCount} chapters - {lessonCount} lessons
                          </div>
                        </div>
                        <svg
                          className={`h-4 w-4 shrink-0 text-gray-600 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          viewBox="0 0 20 20"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M5 8l5 5 5-5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </button>

                      {isOpen && (
                        <div className="bg-gray-50 px-4 pb-4">
                          {courseItem.description && (
                            <p className="pt-2 text-sm leading-relaxed text-gray-700">
                              {stripHtml(courseItem.description)}
                            </p>
                          )}
                          {courseItem.instructor?.fullName && (
                            <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
                              Instructor: {courseItem.instructor.fullName}
                            </p>
                          )}
                          {courseItem.curriculum?.chapters?.length ? (
                            <ul className="space-y-2 pt-1">
                              {courseItem.curriculum.chapters.map((chapter, chapterIdx) => (
                                <li
                                  key={chapter.id || `${chapter.title}-${chapterIdx}`}
                                  className="flex items-start justify-between gap-3 rounded border border-gray-200 bg-white px-3 py-2 text-sm"
                                >
                                  <span className="text-gray-800">{chapter.title}</span>
                                  <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                                    Chapter {chapterIdx + 1}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="pt-2 text-sm text-gray-600">No chapter items provided.</p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </section>
    </InteriorPageLayout>
  );
}

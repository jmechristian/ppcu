"use client";

import { useEffect, useMemo, useState } from "react";
import InteriorPageLayout from "../InteriorPageLayout";

function stripHtml(value) {
  if (!value) return "";
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDuration(value) {
  if (value == null) return "Self-paced";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return "Self-paced";
  const hours = Math.floor(numeric / 3600);
  const minutes = Math.floor((numeric % 3600) / 60);
  if (hours && minutes) return `${hours}h ${minutes}m video`;
  if (hours) return `${hours}h video`;
  return `${minutes}m video`;
}

export default function CatalogPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [course, setCourse] = useState(null);
  const [openChapterIds, setOpenChapterIds] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;

    async function loadOutline() {
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
        const nextCourse = json?.data || null;
        setCourse(nextCourse);

        const firstChapterId = nextCourse?.curriculum?.chapters?.[0]?.id;
        setOpenChapterIds(firstChapterId ? new Set([firstChapterId]) : new Set());
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Unable to load the course outline right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadOutline();
    return () => {
      cancelled = true;
    };
  }, []);

  const chapters = useMemo(() => course?.curriculum?.chapters || [], [course]);
  const description = useMemo(() => stripHtml(course?.description), [course?.description]);
  const instructorLine = useMemo(
    () => [course?.instructor?.fullName, course?.instructor?.title].filter(Boolean).join(" - "),
    [course?.instructor?.fullName, course?.instructor?.title],
  );

  function toggleChapter(chapterId) {
    setOpenChapterIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
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
        ) : !course ? (
          <div className="rounded border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            No course data was returned.
          </div>
        ) : (
          <div className="space-y-7">
            <header className="space-y-4">
              <h1 className="text-3xl font-semibold leading-tight text-[#1f2a44]">
                {course.title}
              </h1>
              {description && (
                <p className="max-w-4xl text-[15px] leading-relaxed text-gray-700">{description}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-700">
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                  {course.curriculum?.chaptersCount || chapters.length} lessons
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                  {course.curriculum?.lessonsCount || 0} topics
                </span>
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium">
                  {formatDuration(course.curriculum?.totalVideoContentTime)}
                </span>
                {course.product?.displayPrice && (
                  <span className="rounded-full bg-brand-green px-3 py-1 font-semibold text-white">
                    {course.product.displayPrice}
                  </span>
                )}
              </div>
              {instructorLine && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">Instructor:</span> {instructorLine}
                </p>
              )}
            </header>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 bg-[#f7f7f8] px-4 py-3">
                <h2 className="text-[18px] font-semibold text-gray-900">Course Outline</h2>
              </div>

              <ul className="divide-y divide-gray-200">
                {chapters.map((chapter, index) => {
                  const isOpen = openChapterIds.has(chapter.id);
                  return (
                    <li key={chapter.id || `${chapter.title}-${index}`} className="bg-white">
                      <button
                        type="button"
                        onClick={() => toggleChapter(chapter.id)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-gray-50"
                        aria-expanded={isOpen}
                      >
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">
                            Lesson {index + 1}
                          </div>
                          <div className="truncate text-[16px] font-semibold text-gray-900">
                            {chapter.title}
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
                          {chapter.lessons?.length ? (
                            <ul className="space-y-2 pt-1">
                              {chapter.lessons.map((lesson) => (
                                <li
                                  key={lesson.id}
                                  className="flex items-start justify-between gap-3 rounded border border-gray-200 bg-white px-3 py-2"
                                >
                                  <span className="text-sm text-gray-800">{lesson.title}</span>
                                  {lesson.lessonType && (
                                    <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                                      {lesson.lessonType}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="pt-2 text-sm text-gray-600">No lesson items provided.</p>
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

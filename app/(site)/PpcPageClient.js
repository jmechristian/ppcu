"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useGrowthzoneProfile } from "../providers/GrowthzoneProfileContext";

const FALLBACK_BG =
  "https://packschool.s3.us-east-1.amazonaws.com/ppc-card-back.png";

const FAQS = [
  {
    q: "Who is my Paperboard Packaging Council contact?",
    a: "For curriculum and navigation questions, contact info@paperboardpackagingcouncil.com.",
  },
  {
    q: "What if I run into technical difficulties?",
    a: "For technical support, email info@packagingschool.com.",
  },
  {
    q: "How do I sign up?",
    a: "Use the deck/PDF guidance at the top of this page or contact support for enrollment help.",
  },
  {
    q: "How do I access new courses each quarter?",
    a: "Return to this page each quarter to find newly available courses and updated learning content.",
  },
];

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toSlideshowEmbedUrl(rawUrl) {
  if (!rawUrl) return "";
  const match = rawUrl.match(/\/presentation\/d\/([^/]+)/);
  if (!match) return rawUrl;
  const deckId = match[1];
  return `https://docs.google.com/presentation/d/${deckId}/embed?start=false&loop=true&delayms=3000`;
}

export default function PpcPageClient({ lib, lotm, courses = [] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const { profile: userProfile } = useGrowthzoneProfile();
  const perPage = 9;

  const filteredLotm = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lotm;
    return lotm.filter(
      (item) =>
        item.title?.toLowerCase().includes(q) ||
        item.subhead?.toLowerCase().includes(q),
    );
  }, [lotm, query]);

  const totalPages = Math.max(1, Math.ceil(filteredLotm.length / perPage));
  const start = (page - 1) * perPage;
  const currentItems = filteredLotm.slice(start, start + perPage);

  const heroBg = lib?.backgroundImage || FALLBACK_BG;

  return (
    <div className="w-full flex flex-col lg:pt-12 pb-28 gap-12">
      <section className="w-full max-w-[1200px] mx-auto px-4 sm:px-6">
        <div
          className="rounded-lg h-[180px] lg:h-[240px] flex items-center justify-between px-8 lg:px-12 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        >
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="PPC logo" className="h-20 w-20 lg:h-28 lg:w-28 object-contain" />
            <div className="text-white font-bold leading-none text-3xl lg:text-5xl">
              <div>PPC</div>
              <div>University</div>
            </div>
          </div>
          <div className="min-h-10 min-w-[220px] flex items-center justify-end text-white text-right">
            {userProfile.status === "ready" &&
            (userProfile.firstName ||
              userProfile.lastName ||
              userProfile.name ||
              userProfile.business ||
              userProfile.title ||
              userProfile.type) ? (
              <div className="leading-tight">
                <div className="font-semibold text-lg">
                  {`Welcome, ${
                    [userProfile.firstName, userProfile.lastName].filter(Boolean).join(" ") ||
                    userProfile.name ||
                    ""
                  }`}
                </div>
                {(userProfile.business || userProfile.title) && (
                  <div className="text-sm font-medium text-white/90">
                    {[userProfile.title, userProfile.business].filter(Boolean).join(" - ")}
                  </div>
                )}
                {userProfile.type && (
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full bg-brand-green px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                      {userProfile.type}
                    </span>
                  </div>
                )}
                <div className="mt-4">
                  <Link
                    href="/learning"
                    className="inline-flex items-center gap-1.5 text-[12px] tracking-wide uppercase text-white font-bold hover:opacity-90"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" />
                    </svg>
                    Learning Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              ""
            )}
          </div>
        </div>
      </section>

      <section className="w-full grid lg:grid-cols-2 gap-10 max-w-[1200px] mx-auto px-4 sm:px-6">
        <div
          className="text-gray-700 text-lg leading-normal"
          dangerouslySetInnerHTML={{
            __html: lib?.description || "Paperboard Packaging Council learning hub.",
          }}
        />
        <div className="flex flex-col gap-2">
          <iframe
            title="PPC slides"
            src={toSlideshowEmbedUrl(lib?.slide || "")}
            className="w-full aspect-video border border-gray-200 bg-white"
          />
          <a
            href={lib?.pdf || "#"}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-gray-700 underline"
          >
            Download as PDF
          </a>
        </div>
      </section>

      <section className="w-full max-w-[1200px] mx-auto bg-[#DDDDDD] rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 w-full">
          <div className="col-span-3 bg-black flex items-center">
            <div className="py-4 px-6">
              <div
                className="w-12 h-12 bg-contain bg-center bg-no-repeat"
                style={{
                  backgroundImage:
                    "url('https://packschool.s3.us-east-1.amazonaws.com/ppc-box.png')",
                }}
              />
            </div>
            <div className="text-white text-xl font-bold -ml-2">
              Paperboard Packaging Council University
            </div>
          </div>
          <div className="col-span-2 bg-[#00AE42]" />
        </div>
        <div className="p-10 lg:p-14 grid lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-3 flex flex-col gap-6">
            <h2 className="text-3xl font-bold text-gray-900">Folding Carton Essentials</h2>
            <p className="text-gray-700 leading-snug text-lg max-w-3xl">
              This course explores sustainability in paperboard packaging,
              covering responsible forestry, eco-friendly design, recycling,
              composting, and regulations. Gain practical, real-world insight to
              understand, apply, and help communicate the industry's strong
              sustainability story.
            </p>
            <button className="bg-[#0071CE] text-white px-4 py-2 rounded-md text-lg font-semibold w-fit">
              Enroll Now -&gt;
            </button>
          </div>
          <div className="lg:col-span-2">
            <div
              className="aspect-[4/3] w-full bg-cover bg-center"
              style={{
                backgroundImage:
                  "url('https://packschool.s3.us-east-1.amazonaws.com/ppc-card-back.png')",
              }}
            />
          </div>
        </div>
      </section>

      <section className="w-full max-w-[1200px] mx-auto bg-[#DDDDDD] rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 w-full">
          <div className="col-span-3 bg-black flex items-center">
            <div className="py-4 px-6">
              <div
                className="w-12 h-12 bg-contain bg-center bg-no-repeat"
                style={{
                  backgroundImage:
                    "url('https://packschool.s3.us-east-1.amazonaws.com/PS+Square+TM+White.png')",
                }}
              />
            </div>
            <div className="text-white text-xl font-bold -ml-2">Packaging School Courses</div>
          </div>
          <div className="col-span-2 bg-[#F39200]" />
        </div>
        <div className="grid md:grid-cols-4 gap-6 py-8 px-3 lg:py-10 lg:px-4">
          {courses.slice(0, 8).map((course) => (
            <article
              key={course.id || course.courseId || course.title}
              className="bg-[#f4f4f5] rounded-md overflow-hidden border border-gray-200"
            >
              <div
                className="aspect-video bg-cover bg-center"
                style={{ backgroundImage: `url(${course.seoImage || FALLBACK_BG})` }}
              />
              <div className="p-3">
                <h3 className="font-semibold text-sm text-gray-900">
                  {course.courseId || "PPC"}{" "}
                  <span className="font-medium">{course.title}</span>
                </h3>
                <div className="my-2 text-xs text-gray-600 flex justify-between">
                  <span>
                    <span className="line-through">${course.price || 0}</span> $0
                  </span>
                  <span>
                    {course.hours || "0h"} / {course.lessons || 0} lessons
                  </span>
                </div>
                <p className="text-xs text-gray-700 min-h-16">
                  {course.shortDescription || course.subheadline || ""}
                </p>
                <button className="mt-3 w-full h-9 bg-gray-900 text-white rounded-md text-sm">
                  Enroll in Course
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 border-y border-gray-300 py-5 flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-700">
          Your Learning of the Month
        </h2>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Search courses..."
          className="px-3 py-2 border rounded-lg text-sm w-full max-w-xs"
        />
      </section>

      <section className="w-full max-w-[1200px] mx-auto px-2 sm:px-3">
        <div className="grid md:grid-cols-4 gap-6">
          {currentItems.map((lesson) => (
            <article
              key={lesson.id || lesson.slug}
              className="bg-[#f4f4f5] rounded-md overflow-hidden border border-gray-200"
            >
              <div
                className="aspect-video bg-cover bg-center"
                style={{ backgroundImage: `url(${lesson.seoImage || FALLBACK_BG})` }}
              />
              <div className="p-3">
                <h3 className="font-semibold text-sm text-gray-800 min-h-10">
                  {lesson.title}
                </h3>
                <div className="text-xs text-gray-600 border-y border-gray-300 py-1 my-2">
                  {formatDate(lesson.createdAt)}
                </div>
                <p className="text-xs text-gray-700 min-h-16">{lesson.subhead}</p>
                <button className="mt-3 w-full h-9 bg-gray-900 text-white rounded-md text-sm">
                  Read Lesson
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="flex items-center justify-center gap-4 mt-8 text-sm text-gray-700">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            &lt;-
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            -&gt;
          </button>
        </div>
      </section>

      <section className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 bg-[#f4f4f5] rounded-lg p-10">
        <h2 className="text-2xl font-bold text-gray-900">Frequently asked questions</h2>
        <div className="mt-6 space-y-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="bg-white border border-gray-200 rounded-md p-4">
              <summary className="cursor-pointer font-semibold text-gray-900">
                {faq.q}
              </summary>
              <p className="mt-2 text-gray-600">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}


"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useGrowthzoneProfile } from "../../providers/GrowthzoneProfileContext";
import InteriorPageLayout from "../InteriorPageLayout";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isPrimaryType(type) {
  return /primary/i.test(String(type || ""));
}

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

const STAFF_PAGE_SIZE = 25;

export default function AdminPage() {
  const { profile } = useGrowthzoneProfile();
  const [loading, setLoading] = useState(true);
  const [loadingNote, setLoadingNote] = useState("");
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [enrollError, setEnrollError] = useState("");
  const [enrollingContactId, setEnrollingContactId] = useState(null);
  const [learnerPage, setLearnerPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchedTerm, setSearchedTerm] = useState("");

  const loadAdminData = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setLoading(true);
    setLoadingNote("");

    const MAX_ATTEMPTS = 3;
    let lastErr = "";

    try {
      // Kick off the (fast) outline fetch once; it isn't the bottleneck.
      const outlinePromise = fetch("/api/thinkific/course-outline", {
        cache: "no-store",
      })
        .then((res) => res.json())
        .catch(() => ({}));

      let adminJson = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const adminRes = await fetch("/api/growthzone/admin", {
            cache: "no-store",
            credentials: "include",
          });
          const json = await adminRes.json().catch(() => ({}));

          if (adminRes.ok) {
            adminJson = json;
            break;
          }
          lastErr = json?.error || json?.message || `Request failed (${adminRes.status})`;
        } catch (err) {
          lastErr = err?.message || "Network error";
        }

        if (attempt < MAX_ATTEMPTS) {
          setLoadingNote(
            "This is taking a little longer than usual - still working on it...",
          );
          await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
        }
      }

      if (!adminJson) {
        throw new Error(lastErr || "Failed to load admin data.");
      }

      if (!adminJson?.connected) {
        setError("Please sign in to view the admin dashboard.");
      } else {
        setError("");
        setPayload(adminJson);
      }

      const outlineJson = await outlinePromise;
      setCheckoutUrl(outlineJson?.data?.product?.checkoutUrl || "");
    } catch (err) {
      setError(err?.message || "Failed to load admin data.");
    } finally {
      setLoadingNote("");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const adminProfile = payload?.profile || {};
  const view = payload?.view || "limited";
  const activeLearners = payload?.activeLearners || [];
  const relatedContacts = payload?.relatedContacts || [];
  const staffActiveLearners = payload?.staffLearners || [];

  const enrolledEmails = useMemo(() => {
    const set = new Set();
    for (const row of staffActiveLearners) {
      const email = String(row?.email || "").trim().toLowerCase();
      if (email) set.add(email);
    }
    return set;
  }, [staffActiveLearners]);
  const staffTotalPages = Math.max(1, Math.ceil(staffActiveLearners.length / STAFF_PAGE_SIZE));
  const staffCurrentPage = Math.min(learnerPage, staffTotalPages);
  const staffPageRows = staffActiveLearners.slice(
    (staffCurrentPage - 1) * STAFF_PAGE_SIZE,
    staffCurrentPage * STAFF_PAGE_SIZE,
  );

  const fullName = useMemo(
    () =>
      [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
      [adminProfile.firstName, adminProfile.lastName].filter(Boolean).join(" ") ||
      adminProfile.name ||
      "",
    [adminProfile.firstName, adminProfile.lastName, adminProfile.name, profile.firstName, profile.lastName],
  );

  async function handleEnrollContact(contact) {
    if (enrollingContactId) return;

    const contactId = Number(contact?.contactId);
    const email = String(contact?.email || "").trim().toLowerCase();
    const contactName = String(contact?.name || "").trim();
    const fallback = splitName(contactName);
    const firstName = String(contact?.firstName || fallback.firstName || "").trim();
    const lastName = String(contact?.lastName || fallback.lastName || "").trim();

    if (!firstName || !lastName || !email) {
      setEnrollError("Missing contact email or name required for enrollment.");
      return;
    }

    setEnrollError("");
    setEnrollingContactId(contactId);

    try {
      const response = await fetch("/api/thinkific/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          first_name: firstName,
          last_name: lastName,
          contact_id: Number.isFinite(contactId) && contactId > 0 ? contactId : null,
          contact_name: contactName,
          trigger_growthzone_enrollment: true,
          mode: "background",
        }),
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.enrolled) {
        throw new Error(json?.error || "Unable to complete enrollment.");
      }

      setSearchResults((prev) =>
        prev.map((row) =>
          Number(row.contactId) === contactId ? { ...row, isEnrolled: true } : row,
        ),
      );
      await loadAdminData({ showLoading: false });
    } catch (err) {
      setEnrollError(err?.message || "Unable to complete enrollment.");
    } finally {
      setEnrollingContactId(null);
    }
  }

  async function handleSearch(event) {
    event?.preventDefault?.();
    const q = searchTerm.trim();
    if (q.length < 2) {
      setSearchError("Enter at least 2 characters to search.");
      return;
    }

    setSearchError("");
    setSearching(true);
    try {
      const response = await fetch(
        `/api/growthzone/contacts/search?q=${encodeURIComponent(q)}`,
        { cache: "no-store", credentials: "include" },
      );
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.message || `Search failed (${response.status}).`);
      if (json?.allowed === false) throw new Error("You do not have access to contact search.");

      setSearchResults(Array.isArray(json?.results) ? json.results : []);
      setSearchedTerm(q);
    } catch (err) {
      setSearchError(err?.message || "Search failed.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  return (
    <InteriorPageLayout activeItem="admin">
      <section className="overflow-hidden rounded-xl">
        <div className="bg-black text-white px-6 py-5">
          {loading ? (
            <div className="space-y-1">
              <div className="text-white/80">Loading profile...</div>
              {loadingNote && (
                <div className="text-xs text-white/60">{loadingNote}</div>
              )}
            </div>
          ) : error ? (
            <div className="text-red-300">{error}</div>
          ) : (
            <div className="space-y-2">
              <div className="text-2xl font-bold">{`Welcome, ${fullName || "Admin"}`}</div>
              <div className="text-sm text-white/90">
                {[profile.title || adminProfile.title, profile.business || adminProfile.business]
                  .filter(Boolean)
                  .join(" - ")}
              </div>
              {(profile.type || adminProfile.type) && (
                <span className="inline-flex items-center rounded-full bg-brand-green px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {profile.type || adminProfile.type}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {enrollError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {enrollError}
        </div>
      )}

      {view === "primary" && (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Active Learners</h2>
            <p className="mt-1 text-sm text-gray-600">
              Organization members with certification activity.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-4">Learner</th>
                    <th className="py-2 pr-4">Certification</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Progress</th>
                    <th className="py-2 pr-4">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLearners.map((row) => (
                    <tr
                      key={`${row.contactId}-${row.certificationContactId}-${row.certificationTypeId}`}
                      className="border-b border-gray-100 text-gray-800"
                    >
                      <td className="py-2 pr-4">{row.contactName || "-"}</td>
                      <td className="py-2 pr-4">{row.certificationName || "-"}</td>
                      <td className="py-2 pr-4">{row.statusText || row.status || "-"}</td>
                      <td className="py-2 pr-4">{row.percentage || "-"}</td>
                      <td className="py-2 pr-4">{formatDate(row.startDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && activeLearners.length === 0 && (
                <p className="py-4 text-gray-500">No active learners in your organization yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Organization Contacts</h2>
            <p className="mt-1 text-sm text-gray-600">
              All contacts linked to {adminProfile.business || "your organization"}.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Title</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Enrolled</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {relatedContacts.map((contact) => {
                    const contactId = Number(contact.contactId);
                    const isEnrolling = enrollingContactId === contactId;
                    const canEnroll = Boolean(
                      contact.email && !contact.isEnrolled && !isPrimaryType(contact.type),
                    );

                    return (
                      <tr
                        key={contact.contactRoleId || contact.contactId}
                        className="border-b border-gray-100 text-gray-800"
                      >
                        <td className="py-2 pr-4">{contact.name || "-"}</td>
                        <td className="py-2 pr-4">{contact.title || "-"}</td>
                        <td className="py-2 pr-4">{contact.type || "-"}</td>
                        <td className="py-2 pr-4">{contact.email || "-"}</td>
                        <td className="py-2 pr-4">{contact.isEnrolled ? "Yes" : "No"}</td>
                        <td className="py-2 text-right">
                          {contact.isEnrolled ? (
                            <span className="text-gray-500">Enrolled</span>
                          ) : isPrimaryType(contact.type) ? (
                            <span className="text-gray-500">Primary</span>
                          ) : (
                            <button
                              type="button"
                              disabled={!canEnroll || isEnrolling}
                              onClick={() => handleEnrollContact(contact)}
                              className="inline-flex items-center rounded bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isEnrolling ? "Enrolling..." : "Enroll"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!loading && relatedContacts.length === 0 && (
                <p className="py-4 text-gray-500">No organization contacts returned.</p>
              )}
            </div>
          </section>
        </>
      )}

      {view === "staff" && (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Active Learners</h2>
                <p className="mt-1 text-sm text-gray-600">
                  All learners with certification activity.
                </p>
              </div>
              {staffActiveLearners.length > 0 && (
                <span className="text-sm text-gray-500">
                  {staffActiveLearners.length} total
                </span>
              )}
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-600">
                    <th className="py-2 pr-4">Learner</th>
                    <th className="py-2 pr-4">Email</th>
                    <th className="py-2 pr-4">Progress</th>
                    <th className="py-2 pr-4">Courses Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {staffPageRows.map((row) => (
                    <tr
                      key={row.userId}
                      className="border-b border-gray-100 text-gray-800"
                    >
                      <td className="py-2 pr-4">{row.name || "-"}</td>
                      <td className="py-2 pr-4">{row.email || "-"}</td>
                      <td className="py-2 pr-4">{`${row.percent ?? 0}%`}</td>
                      <td className="py-2 pr-4">{`${row.completedCourses ?? 0} / ${row.totalCourses ?? 0}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && staffActiveLearners.length === 0 && (
                <p className="py-4 text-gray-500">No active learners yet.</p>
              )}
            </div>
            {staffTotalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  disabled={staffCurrentPage <= 1}
                  onClick={() => setLearnerPage((p) => Math.max(1, p - 1))}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {staffCurrentPage} of {staffTotalPages}
                </span>
                <button
                  type="button"
                  disabled={staffCurrentPage >= staffTotalPages}
                  onClick={() => setLearnerPage((p) => Math.min(staffTotalPages, p + 1))}
                  className="rounded border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-xl font-bold text-gray-900">Find &amp; Enroll a Contact</h2>
            <p className="mt-1 text-sm text-gray-600">
              Search all GrowthZone contacts by name, company, or email.
            </p>
            <form onSubmit={handleSearch} className="mt-4 flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search contacts..."
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none"
              />
              <button
                type="submit"
                disabled={searching || searchTerm.trim().length < 2}
                className="inline-flex items-center rounded bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </form>

            {searchError && (
              <p className="mt-3 text-sm text-red-600">{searchError}</p>
            )}

            {searchResults.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-600">
                      <th className="py-2 pr-4">Name</th>
                      <th className="py-2 pr-4">Company</th>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map((contact) => {
                      const contactId = Number(contact.contactId);
                      const isEnrolling = enrollingContactId === contactId;
                      const contactEmail = String(contact.email || "").trim().toLowerCase();
                      const isEnrolled =
                        contact.isEnrolled || (contactEmail && enrolledEmails.has(contactEmail));
                      const canEnroll = Boolean(contact.email && !isEnrolled);
                      return (
                        <tr
                          key={contact.contactId}
                          className="border-b border-gray-100 text-gray-800"
                        >
                          <td className="py-2 pr-4">{contact.name || "-"}</td>
                          <td className="py-2 pr-4">{contact.company || "-"}</td>
                          <td className="py-2 pr-4">{contact.email || "-"}</td>
                          <td className="py-2 text-right">
                            {isEnrolled ? (
                              <span className="text-gray-500">Enrolled</span>
                            ) : (
                              <button
                                type="button"
                                disabled={!canEnroll || isEnrolling}
                                onClick={() => handleEnrollContact(contact)}
                                title={contact.email ? "" : "No email on file"}
                                className="inline-flex items-center rounded bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isEnrolling ? "Enrolling..." : "Enroll"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!searching && searchedTerm && searchResults.length === 0 && !searchError && (
              <p className="mt-4 text-gray-500">No contacts found for “{searchedTerm}”.</p>
            )}
          </section>
        </>
      )}

      {view === "limited" && !loading && !error && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-gray-600">{payload?.message || "Admin access is limited for this account."}</p>
          <Link href="/learning" className="mt-4 inline-flex text-sm font-semibold text-brand-blue">
            Go to My Learning
          </Link>
        </section>
      )}
    </InteriorPageLayout>
  );
}

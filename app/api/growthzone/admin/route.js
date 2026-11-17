import { NextResponse } from "next/server";
import {
  extractOrgDetails,
  extractOrganizationContactId,
  fetchAllCertificationTracking,
  fetchContactCertifications,
  fetchContactOverview,
  fetchJson,
  fetchOrganizationRoster,
  getApiHeaders,
  isPrimaryContactType,
  isStaffContactType,
  mapWithConcurrency,
  parseCookies,
  readResults,
  splitNameParts,
  toPositiveInt,
  trimSlash,
} from "@/app/lib/growthzone-api";
import {
  fetchAllBundleLearners,
  getPpcuBundleId,
} from "@/app/lib/thinkific-enrollments";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function getThinkificRestCreds() {
  const restApiKey = String(
    process.env.THINKIFIC_REST_API_KEY ||
      process.env.NEXT_THINKIFIC_API_KEY ||
      "",
  ).trim();
  const subdomain = String(
    process.env.THINKIFIC_SUBDOMAIN || process.env.NEXT_THINKIFIC_SUBDOMAIN || "",
  ).trim();
  return { restApiKey, subdomain };
}

function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return `${Math.round(n)}%`;
}

function pickPrimaryCert(contactCerts, trackingRows) {
  return contactCerts[0] || trackingRows[0] || null;
}

function buildActiveLearnerRow(contact, cert, trackingRow) {
  const source = cert || trackingRow || {};
  return {
    contactId: contact.contactId,
    contactName: contact.name || "",
    certificationContactId: source.certificationContactId ?? null,
    certificationTypeId: source.certificationTypeId ?? null,
    certificationName: source.certificationName || "",
    status: source.status ?? null,
    statusText: source.statusText || contact.statusText || "",
    percentage: source.percentage || "",
    startDate: source.startDate ?? null,
    completedDate: source.completedDate ?? null,
    hoursEarned: source.hoursEarned ?? 0,
    creditsEarned: source.creditsEarned ?? 0,
  };
}

function emptyProgress() {
  return { enrolled: false, percent: 0, completedCourses: 0, totalCourses: 0 };
}

function progressFromLearner(learner) {
  if (!learner) return emptyProgress();
  return {
    enrolled: true,
    percent: Number(learner.percent) || 0,
    completedCourses: learner.completedCourses || 0,
    totalCourses: learner.totalCourses || 0,
  };
}

function previewEmailFromRequest(request) {
  if (process.env.NODE_ENV === "production") return "";
  const email = new URL(request.url).searchParams.get("previewEmail");
  return String(email || "").trim().toLowerCase();
}

async function resolvePreviewIdentity(baseUrl, apiKey, email) {
  const listRes = await fetchJson(`${baseUrl}/api/contacts?$top=10`, {
    method: "POST",
    headers: getApiHeaders(apiKey),
    body: JSON.stringify({ EmailContains: email }),
  });
  const match =
    readResults(listRes.json).find(
      (row) => String(row?.EmailAddress || "").trim().toLowerCase() === email,
    ) || null;
  const personContactId = toPositiveInt(match?.ContactId);
  if (!personContactId) return null;

  const [overview, contactOrgsRes] = await Promise.all([
    fetchContactOverview(baseUrl, apiKey, personContactId),
    fetchJson(`${baseUrl}/api/ContactOverview/${personContactId}/ContactOrgs/`, {
      method: "GET",
      headers: getApiHeaders(apiKey),
    }),
  ]);

  const firstOrg = readResults(contactOrgsRes.json)?.[0] ?? null;
  const orgDetails = extractOrgDetails(firstOrg);
  const nameParts = splitNameParts(overview?.name || match?.Name || "");

  return {
    personContactId,
    organizationContactId: extractOrganizationContactId(firstOrg, personContactId),
    roleType: orgDetails.type || "",
    profile: {
      firstName: overview?.firstName || nameParts.firstName || null,
      lastName: overview?.lastName || nameParts.lastName || null,
      name: overview?.name || match?.Name || null,
      email: overview?.email || match?.EmailAddress || email,
      contactId: personContactId,
      organizationContactId: extractOrganizationContactId(firstOrg, personContactId),
      business: orgDetails.business,
      title: orgDetails.title,
      type: orgDetails.type || "",
    },
  };
}

function buildTrackingByContactId(rows) {
  const map = new Map();
  for (const row of rows) {
    const id = toPositiveInt(row.contactId);
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(row);
  }
  return map;
}

async function handleGet(request) {
  const baseUrl = trimSlash(process.env.GROWTHZONE_BASE_URL);
  const apiKey = process.env.GROWTHZONE_API_KEY;
  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { connected: false, message: "Missing GrowthZone configuration." },
      { status: 500 },
    );
  }

  const previewEmail = previewEmailFromRequest(request);
  let personContactId;
  let organizationContactId;
  let roleType;
  let profile;

  if (previewEmail) {
    const previewIdentity = await resolvePreviewIdentity(baseUrl, apiKey, previewEmail);
    if (!previewIdentity) {
      return NextResponse.json(
        { connected: false, message: "Preview contact was not found." },
        { status: 404 },
      );
    }
    personContactId = previewIdentity.personContactId;
    organizationContactId = previewIdentity.organizationContactId;
    roleType = previewIdentity.roleType;
    profile = previewIdentity.profile;
  } else {
    const cookies = parseCookies(request.headers.get("cookie"));
    const accessToken = cookies.growthzone_oauth_access_token;
    if (!accessToken) {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    const authHeader = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const aboutMeRes = await fetchJson(`${baseUrl}/api/login/aboutme`, {
      method: "GET",
      headers: authHeader,
    });

    if (!aboutMeRes.response.ok || !aboutMeRes.json) {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    const aboutMe = aboutMeRes.json;
    personContactId = toPositiveInt(aboutMe?.ContactId);
    if (!personContactId) {
      return NextResponse.json({ connected: false }, { status: 200 });
    }

    const contactOrgsRes = await fetchJson(
      `${baseUrl}/api/ContactOverview/${personContactId}/ContactOrgs/`,
      { method: "GET", headers: getApiHeaders(apiKey) },
    );

    const firstOrg = readResults(contactOrgsRes.json)?.[0] ?? null;
    const orgDetails = extractOrgDetails(firstOrg);
    organizationContactId = extractOrganizationContactId(firstOrg, personContactId);
    roleType = orgDetails.type || "";

    profile = {
      firstName: aboutMe?.FirstName ?? null,
      lastName: aboutMe?.LastName ?? null,
      name: aboutMe?.Name ?? null,
      email: aboutMe?.PrimaryEmailAddress ?? aboutMe?.Email ?? null,
      contactId: personContactId,
      organizationContactId,
      business: orgDetails.business,
      title: orgDetails.title,
      type: roleType,
    };
  }

  if (isStaffContactType(roleType)) {
    const { restApiKey, subdomain } = getThinkificRestCreds();
    const bundleId = getPpcuBundleId();
    const staffLearners = await fetchAllBundleLearners({ bundleId, restApiKey, subdomain });
    return NextResponse.json({
      connected: true,
      preview: Boolean(previewEmail),
      view: "staff",
      profile,
      bundleId,
      staffLearners,
    });
  }

  if (!isPrimaryContactType(roleType)) {
    return NextResponse.json({
      connected: true,
      preview: Boolean(previewEmail),
      view: "limited",
      profile,
      message: "Admin tools are available for primary and staff contacts.",
    });
  }

  if (!organizationContactId) {
    return NextResponse.json({
      connected: true,
      preview: Boolean(previewEmail),
      view: "primary",
      profile,
      activeLearners: [],
      relatedContacts: [],
      message: "Unable to resolve organization contact id for this account.",
    });
  }

  const { restApiKey, subdomain } = getThinkificRestCreds();
  const bundleId = getPpcuBundleId();
  const [orgContacts, trackingRows, bundleLearners] = await Promise.all([
    fetchOrganizationRoster(baseUrl, apiKey, organizationContactId),
    fetchAllCertificationTracking(baseUrl, apiKey),
    fetchAllBundleLearners({ bundleId, restApiKey, subdomain }),
  ]);

  const trackingByContact = buildTrackingByContactId(trackingRows);
  const progressByEmail = new Map(
    bundleLearners.map((row) => [String(row.email || "").trim().toLowerCase(), row]),
  );

  const relatedContacts = await mapWithConcurrency(orgContacts, 8, async (contact) => {
      const contactId = toPositiveInt(contact.contactId);
      const trackingForContact = contactId ? trackingByContact.get(contactId) || [] : [];

      let email = String(contact.email || "").trim();
      let firstName = "";
      let lastName = "";
      let contactCerts = [];

      if (contactId) {
        const needsOverview = !email || !contact.name;
        const [overview, certs] = await Promise.all([
          needsOverview ? fetchContactOverview(baseUrl, apiKey, contactId) : Promise.resolve(null),
          fetchContactCertifications(baseUrl, apiKey, contactId),
        ]);
        contactCerts = certs;
        if (overview) {
          email = email || overview.email || "";
          firstName = overview.firstName || "";
          lastName = overview.lastName || "";
          if (!contact.name && overview.name) contact.name = overview.name;
        }
      }

      if (!email && contactId === personContactId && profile.email) {
        email = String(profile.email).trim();
      }

      if (!firstName && !lastName) {
        const parts = splitNameParts(contact.name);
        firstName = parts.firstName;
        lastName = parts.lastName;
      }

      const progress = email
        ? progressFromLearner(progressByEmail.get(email.toLowerCase()))
        : emptyProgress();

      const primaryCert = pickPrimaryCert(contactCerts, trackingForContact);
      const isEnrolled = progress.enrolled || contactCerts.length > 0 || trackingForContact.length > 0;

      return {
        contact,
        contactCerts,
        progress,
        enriched: {
          ...contact,
          email,
          firstName,
          lastName,
          isEnrolled,
          certificationName: primaryCert?.certificationName || "",
          percentage: progress.enrolled ? formatPercent(progress.percent) : "",
          progressPercent: progress.percent,
          completedCourses: progress.completedCourses,
          totalCourses: progress.totalCourses,
          statusText: primaryCert?.statusText || contact.statusText || "",
        },
      };
  });

  const relatedContactsOut = relatedContacts
    .map((row) => row.enriched)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

  const activeLearners = relatedContacts
    .filter((row) => row.progress?.enrolled)
    .map((row) => {
      const contactId = toPositiveInt(row.contact.contactId);
      const trackingForContact = contactId ? trackingByContact.get(contactId) || [] : [];
      const primaryCert = pickPrimaryCert(row.contactCerts || [], trackingForContact);
      const base = buildActiveLearnerRow(row.contact, primaryCert, trackingForContact[0]);
      return {
        ...base,
        percentage: formatPercent(row.progress.percent),
        progressPercent: row.progress.percent,
        completedCourses: row.progress.completedCourses,
        totalCourses: row.progress.totalCourses,
      };
    })
    .sort((a, b) => String(a.contactName || "").localeCompare(String(b.contactName || "")));

  return NextResponse.json({
    connected: true,
    preview: Boolean(previewEmail),
    view: "primary",
    profile,
    organizationContactId,
    activeLearners,
    relatedContacts: relatedContactsOut,
  });
}

export async function GET(request) {
  try {
    return await handleGet(request);
  } catch (error) {
    console.error("[growthzone-admin] failed", {
      message: error?.message,
      stack: error?.stack,
    });
    return NextResponse.json(
      {
        connected: false,
        error: error?.message || "Admin data failed to load.",
      },
      { status: 500 },
    );
  }
}

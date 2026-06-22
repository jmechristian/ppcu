import { NextResponse } from "next/server";
import {
  extractOrgDetails,
  extractOrganizationContactId,
  fetchAllCertificationTracking,
  fetchContactCertifications,
  fetchContactOverview,
  fetchJson,
  getApiHeaders,
  isPrimaryContactType,
  isStaffContactType,
  normalizeOrgContact,
  normalizeTrackingRow,
  parseCookies,
  readResults,
  splitNameParts,
  toPositiveInt,
  trimSlash,
} from "@/app/lib/growthzone-api";

function hasActiveProgress(trackingRow) {
  const pct = String(trackingRow?.percentage || "").replace(/%/g, "").trim();
  const n = Number(pct);
  if (Number.isFinite(n) && n > 0) return true;
  if (trackingRow?.certificationContactId) return true;
  if (trackingRow?.statusText && !/nonmember/i.test(String(trackingRow.statusText))) return true;
  return false;
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

export async function GET(request) {
  const baseUrl = trimSlash(process.env.GROWTHZONE_BASE_URL);
  const apiKey = process.env.GROWTHZONE_API_KEY;
  if (!baseUrl || !apiKey) {
    return NextResponse.json(
      { connected: false, message: "Missing GrowthZone configuration." },
      { status: 500 },
    );
  }

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
  const personContactId = toPositiveInt(aboutMe?.ContactId);
  if (!personContactId) {
    return NextResponse.json({ connected: false }, { status: 200 });
  }

  const contactOrgsRes = await fetchJson(
    `${baseUrl}/api/ContactOverview/${personContactId}/ContactOrgs/`,
    { method: "GET", headers: getApiHeaders(apiKey) },
  );

  const firstOrg = readResults(contactOrgsRes.json)?.[0] ?? null;
  const orgDetails = extractOrgDetails(firstOrg);
  const organizationContactId = extractOrganizationContactId(firstOrg, personContactId);
  const roleType = orgDetails.type || "";

  const profile = {
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

  if (isStaffContactType(roleType)) {
    const manageLearners = await fetchAllCertificationTracking(baseUrl, apiKey);
    return NextResponse.json({
      connected: true,
      view: "staff",
      profile,
      manageLearners,
    });
  }

  if (!isPrimaryContactType(roleType)) {
    return NextResponse.json({
      connected: true,
      view: "limited",
      profile,
      message: "Admin tools are available for primary and staff contacts.",
    });
  }

  if (!organizationContactId) {
    return NextResponse.json({
      connected: true,
      view: "primary",
      profile,
      activeLearners: [],
      relatedContacts: [],
      message: "Unable to resolve organization contact id for this account.",
    });
  }

  const [orgContactsRes, trackingRows] = await Promise.all([
    fetchJson(`${baseUrl}/api/ContactOverview/${organizationContactId}/OrgContacts/`, {
      method: "GET",
      headers: getApiHeaders(apiKey),
    }),
    fetchAllCertificationTracking(baseUrl, apiKey),
  ]);

  const orgContacts = readResults(orgContactsRes.json).map(normalizeOrgContact);
  const orgContactIds = new Set(
    orgContacts.map((row) => toPositiveInt(row.contactId)).filter(Boolean),
  );
  const trackingByContact = buildTrackingByContactId(trackingRows);

  const relatedContacts = await Promise.all(
    orgContacts.map(async (contact) => {
      const contactId = toPositiveInt(contact.contactId);
      const trackingForContact = contactId ? trackingByContact.get(contactId) || [] : [];

      let email = "";
      let firstName = "";
      let lastName = "";
      let contactCerts = [];

      if (contactId) {
        const [overview, certs] = await Promise.all([
          fetchContactOverview(baseUrl, apiKey, contactId),
          fetchContactCertifications(baseUrl, apiKey, contactId),
        ]);
        contactCerts = certs;
        if (overview) {
          email = overview.email || "";
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

      const primaryCert = pickPrimaryCert(contactCerts, trackingForContact);
      const isEnrolled = contactCerts.length > 0 || trackingForContact.length > 0;

      return {
        contact,
        contactCerts,
        enriched: {
          ...contact,
          email,
          firstName,
          lastName,
          isEnrolled,
          certificationName: primaryCert?.certificationName || "",
          percentage: primaryCert?.percentage || "",
          statusText: primaryCert?.statusText || contact.statusText || "",
        },
      };
    }),
  );

  const relatedContactsOut = relatedContacts.map((row) => row.enriched);

  const activeLearners = relatedContacts
    .filter((row) => {
      const contactId = toPositiveInt(row.contact.contactId);
      const trackingForContact = contactId ? trackingByContact.get(contactId) || [] : [];
      if (trackingForContact.some(hasActiveProgress)) return true;
      return (row.contactCerts || []).some(hasActiveProgress);
    })
    .map((row) => {
      const contactId = toPositiveInt(row.contact.contactId);
      const trackingForContact = contactId ? trackingByContact.get(contactId) || [] : [];
      const primaryCert = pickPrimaryCert(row.contactCerts || [], trackingForContact);
      return buildActiveLearnerRow(row.contact, primaryCert, trackingForContact[0]);
    });

  const globalActiveLearners = trackingRows
    .filter((row) => orgContactIds.has(toPositiveInt(row.contactId)))
    .filter(hasActiveProgress)
    .map(normalizeTrackingRow);

  for (const row of globalActiveLearners) {
    const id = toPositiveInt(row.contactId);
    if (!id || activeLearners.some((learner) => toPositiveInt(learner.contactId) === id)) continue;
    activeLearners.push(row);
  }

  return NextResponse.json({
    connected: true,
    view: "primary",
    profile,
    organizationContactId,
    activeLearners,
    relatedContacts: relatedContactsOut,
  });
}

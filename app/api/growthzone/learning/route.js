import { NextResponse } from "next/server";

const DEFAULT_TIMEOUT_MS = 10000;

function trimSlash(value) {
  if (!value) return "";
  return String(value).replace(/\/+$/, "");
}

function parseCookies(cookieHeader) {
  const out = {};
  (cookieHeader || "")
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean)
    .forEach((part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return;
      const key = part.slice(0, idx);
      const value = part.slice(idx + 1);
      out[key] = decodeURIComponent(value);
    });
  return out;
}

function getApiHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    Authorization: `ApiKey ${apiKey}`,
  };
}

async function requestWithTimeout(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const response = await requestWithTimeout(url, options, timeoutMs);
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, json, text, url };
}

function readResults(payload) {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.Results)) return payload.Results;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.Items)) return payload.Items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function normalizeCert(item) {
  return {
    certificationContactId: item?.CertificationContactId ?? null,
    certificationTypeId: item?.CertificationTypeId ?? null,
    certificationName: item?.CertificationName ?? item?.Name ?? "",
    status: item?.Status ?? null,
    statusText: item?.StatusText ?? "",
    percentage: item?.Percentage ?? "",
    startDate: item?.StartDate ?? null,
    completedDate: item?.CompletedDate ?? null,
    hoursEarned: item?.HoursEarned ?? 0,
    creditsEarned: item?.CreditsEarned ?? 0,
  };
}

function normalizeTrackingRow(item) {
  return {
    certificationContactId: item?.CertificationContactId ?? null,
    certificationTypeId: item?.CertificationTypeId ?? null,
    certificationName: item?.CertificationName ?? item?.Name ?? "",
    contactId: item?.ContactId ?? null,
    contactName: item?.ContactName ?? item?.Name ?? "",
    status: item?.Status ?? null,
    statusText: item?.StatusText ?? "",
    percentage: item?.Percentage ?? "",
    startDate: item?.StartDate ?? null,
    completedDate: item?.CompletedDate ?? null,
    hoursEarned: item?.HoursEarned ?? 0,
    creditsEarned: item?.CreditsEarned ?? 0,
  };
}

function extractOrgDetails(contactOrg) {
  const raw = contactOrg && typeof contactOrg === "object" ? contactOrg : {};
  return {
    business: raw.Name || raw.OrganizationName || raw.CompanyName || raw.Company || null,
    title: raw.Title || raw.JobTitle || raw.PositionTitle || null,
    type: raw.Type || null,
  };
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
  const contactId = aboutMe?.ContactId ?? null;
  if (!contactId) {
    return NextResponse.json({ connected: false }, { status: 200 });
  }

  const [contactOrgsRes, certRes, trackingRes] = await Promise.all([
    fetchJson(`${baseUrl}/api/ContactOverview/${contactId}/ContactOrgs/`, {
      method: "GET",
      headers: getApiHeaders(apiKey),
    }),
    fetchJson(`${baseUrl}/api/ContactOverview/${contactId}/Certifications/`, {
      method: "GET",
      headers: getApiHeaders(apiKey),
    }),
    fetchJson(`${baseUrl}/api/certifications/contacts/?$skip=0&$top=100`, {
      method: "GET",
      headers: getApiHeaders(apiKey),
    }),
  ]);

  const org = readResults(contactOrgsRes.json)?.[0] ?? null;
  const orgDetails = extractOrgDetails(org);
  const certifications = readResults(certRes.json).map(normalizeCert);
  const manageLearners = readResults(trackingRes.json).map(normalizeTrackingRow);

  return NextResponse.json({
    connected: true,
    profile: {
      firstName: aboutMe?.FirstName ?? null,
      lastName: aboutMe?.LastName ?? null,
      contactId,
      business: orgDetails.business,
      title: orgDetails.title,
      type: orgDetails.type,
    },
    certifications,
    manageLearners,
  });
}


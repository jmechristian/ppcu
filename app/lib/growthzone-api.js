export const DEFAULT_TIMEOUT_MS = 10000;

export function trimSlash(value) {
  if (!value) return "";
  return String(value).replace(/\/+$/, "");
}

export function parseCookies(cookieHeader) {
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

export function toPositiveInt(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

export function getApiHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    Authorization: `ApiKey ${apiKey}`,
  };
}

export async function requestWithTimeout(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJson(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
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

export function readResults(payload) {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.Results)) return payload.Results;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.Items)) return payload.Items;
  if (Array.isArray(payload)) return payload;
  return [];
}

export function extractOrgDetails(contactOrg) {
  const raw = contactOrg && typeof contactOrg === "object" ? contactOrg : {};
  return {
    business: raw.Name || raw.OrganizationName || raw.CompanyName || raw.Company || null,
    title: raw.Title || raw.JobTitle || raw.PositionTitle || null,
    type: raw.Type || null,
  };
}

export function extractOrganizationContactId(contactOrgItem, personContactId) {
  if (!contactOrgItem || typeof contactOrgItem !== "object") return null;

  const personId = toPositiveInt(personContactId);
  const candidates = [
    contactOrgItem.OrganizationId,
    contactOrgItem.CommContactRelatedOrganizationId,
    contactOrgItem.OrganizationContactId,
    contactOrgItem.ContactId,
  ];

  for (const value of candidates) {
    const id = toPositiveInt(value);
    if (!id) continue;
    if (personId && id === personId) continue;
    return id;
  }

  return null;
}

export function isPrimaryContactType(type) {
  return /primary/i.test(String(type || ""));
}

export function isStaffContactType(type) {
  return /staff/i.test(String(type || ""));
}

export function normalizeCertRow(item) {
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

export function normalizeTrackingRow(item) {
  return {
    ...normalizeCertRow(item),
    contactId: item?.ContactId ?? null,
    contactName: item?.ContactName ?? item?.Name ?? "",
  };
}

export function normalizeOrgContact(item) {
  return {
    contactRoleId: item?.ContactRoleId ?? null,
    contactId: item?.ContactId ?? null,
    organizationId: item?.OrganizationId ?? item?.CommContactRelatedOrganizationId ?? null,
    name: item?.Name ?? "",
    title: item?.Title ?? "",
    type: item?.Type ?? "",
    statusText: item?.StatusText ?? "",
  };
}

export function splitNameParts(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function extractEmailFromContactInfos(contactInfos, primaryEmailAddressId) {
  const items = Array.isArray(contactInfos) ? contactInfos : [];
  const primaryId = toPositiveInt(primaryEmailAddressId);

  if (primaryId) {
    const primary = items.find((item) => toPositiveInt(item?.Id) === primaryId);
    const email = String(primary?.EmailAddress || primary?.Value || "").trim();
    if (email.includes("@")) return email;
  }

  for (const item of items) {
    const email = String(item?.EmailAddress || "").trim();
    if (email.includes("@")) return email;
    if (Number(item?.Type) === 1) {
      const value = String(item?.Value || "").trim();
      if (value.includes("@")) return value;
    }
  }

  return "";
}

function parseContactOverviewRoot(root, fallbackId) {
  if (!root || typeof root !== "object") return null;

  const fromParts = splitNameParts(
    [root.FirstName, root.LastName].filter(Boolean).join(" ") ||
      root.Name ||
      root.ContactDisplayName ||
      root.DisplayName ||
      "",
  );

  const email =
    root.PrimaryEmailAddress ??
    root.Email ??
    extractEmailFromContactInfos(root.ContactInfos, root.PrimaryEmailAddressId);

  return {
    contactId: root.ContactId ?? fallbackId,
    name:
      root.Name ??
      root.ContactDisplayName ??
      root.DisplayName ??
      (`${fromParts.firstName} ${fromParts.lastName}`.trim() || ""),
    firstName: root.FirstName ?? fromParts.firstName,
    lastName: root.LastName ?? fromParts.lastName,
    email: email || "",
  };
}

export async function fetchContactOverview(baseUrl, apiKey, contactId, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const id = toPositiveInt(contactId);
  if (!id) return null;

  const rootUrl = trimSlash(baseUrl);
  const headers = getApiHeaders(apiKey);
  const attempts = [
    `${rootUrl}/api/contacts/OrgGeneral/${id}`,
    `${rootUrl}/api/contactoverview/${id}`,
    `${rootUrl}/api/ContactOverview/${id}/`,
  ];

  for (const url of attempts) {
    const result = await fetchJson(url, { method: "GET", headers }, timeoutMs);
    if (!result.response.ok || !result.json || typeof result.json !== "object") continue;

    const parsed = parseContactOverviewRoot(result.json, id);
    if (parsed?.email || parsed?.name) return parsed;
  }

  return null;
}

export async function fetchContactCertifications(
  baseUrl,
  apiKey,
  contactId,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const id = toPositiveInt(contactId);
  if (!id) return [];

  const result = await fetchJson(
    `${trimSlash(baseUrl)}/api/ContactOverview/${id}/Certifications/`,
    { method: "GET", headers: getApiHeaders(apiKey) },
    timeoutMs,
  );

  if (!result.response.ok) return [];
  return readResults(result.json).map(normalizeCertRow);
}

export async function fetchAllCertificationTracking(baseUrl, apiKey, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const pageSize = 100;
  const rows = [];
  let skip = 0;
  let total = Infinity;

  while (skip < total) {
    const result = await fetchJson(
      `${trimSlash(baseUrl)}/api/certifications/contacts/?$skip=${skip}&$top=${pageSize}`,
      { method: "GET", headers: getApiHeaders(apiKey) },
      timeoutMs,
    );

    if (!result.response.ok) break;

    const batch = readResults(result.json).map(normalizeTrackingRow);
    rows.push(...batch);
    total = Number(result.json?.TotalRecordAvailable);
    if (!Number.isFinite(total) || total <= 0) break;
    if (batch.length < pageSize) break;
    skip += pageSize;
    if (skip >= 1000) break;
  }

  return rows;
}

export function normalizeContactListRow(item) {
  const systemType = Number(item?.SystemContactTypeId);
  const isBusiness = systemType === 2;
  const name = item?.Name ?? item?.ContactName ?? "";
  const company = isBusiness ? name : item?.PrimaryContact ?? "";
  return {
    contactId: toPositiveInt(item?.ContactId),
    name,
    company: company || "",
    email: item?.EmailAddress ?? "",
    systemContactTypeId: Number.isFinite(systemType) ? systemType : null,
    type: item?.ContactType ? String(item.ContactType).replace(/[{}]/g, "") : "",
    city: item?.City ?? "",
  };
}

const CONTACTS_CACHE_TTL_MS = 10 * 60 * 1000;
let contactsCache = { rows: null, fetchedAt: 0 };

export async function fetchAllContacts(
  baseUrl,
  apiKey,
  { force = false, timeoutMs = 30000 } = {},
) {
  if (
    !force &&
    contactsCache.rows &&
    Date.now() - contactsCache.fetchedAt < CONTACTS_CACHE_TTL_MS
  ) {
    return contactsCache.rows;
  }

  const root = trimSlash(baseUrl);
  const headers = getApiHeaders(apiKey);
  const pageSize = 500;
  const rows = [];
  let skip = 0;
  let total = Infinity;

  while (skip < total) {
    const result = await fetchJson(
      `${root}/api/contacts?$skip=${skip}&$top=${pageSize}&$orderby=ContactId`,
      { method: "GET", headers },
      timeoutMs,
    );
    if (!result.response.ok) break;

    const batch = readResults(result.json)
      .map(normalizeContactListRow)
      .filter((row) => row.contactId);
    rows.push(...batch);

    const reported = Number(result.json?.TotalRecordAvailable);
    total = Number.isFinite(reported) && reported > 0 ? reported : rows.length;
    if (batch.length < pageSize) break;
    skip += pageSize;
    if (skip > 20000) break;
  }

  contactsCache = { rows, fetchedAt: Date.now() };
  return rows;
}

export async function resolveGrowthzoneRole(request) {
  const baseUrl = trimSlash(process.env.GROWTHZONE_BASE_URL);
  const apiKey = process.env.GROWTHZONE_API_KEY;
  if (!baseUrl || !apiKey) {
    return { ok: false, status: 500, error: "Missing GrowthZone configuration." };
  }

  const cookies = parseCookies(request.headers.get("cookie"));
  const accessToken = cookies.growthzone_oauth_access_token;
  if (!accessToken) {
    return { ok: false, status: 200, connected: false };
  }

  const aboutMeRes = await fetchJson(`${baseUrl}/api/login/aboutme`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });

  if (!aboutMeRes.response.ok || !aboutMeRes.json) {
    return { ok: false, status: 200, connected: false };
  }

  const aboutMe = aboutMeRes.json;
  const personContactId = toPositiveInt(aboutMe?.ContactId);
  if (!personContactId) {
    return { ok: false, status: 200, connected: false };
  }

  const contactOrgsRes = await fetchJson(
    `${baseUrl}/api/ContactOverview/${personContactId}/ContactOrgs/`,
    { method: "GET", headers: getApiHeaders(apiKey) },
  );
  const firstOrg = readResults(contactOrgsRes.json)?.[0] ?? null;
  const details = extractOrgDetails(firstOrg);

  return {
    ok: true,
    connected: true,
    baseUrl,
    apiKey,
    personContactId,
    aboutMe,
    roleType: details.type || "",
  };
}

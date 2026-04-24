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

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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
      {
        connected: false,
        message: "Missing GrowthZone configuration.",
      },
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

  let userinfoRes;
  let aboutMeRes;
  try {
    [userinfoRes, aboutMeRes] = await Promise.all([
      fetchJson(`${baseUrl}/oauth/userinfo`, { method: "GET", headers: authHeader }),
      fetchJson(`${baseUrl}/api/login/aboutme`, { method: "GET", headers: authHeader }),
    ]);
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        message: error?.name === "AbortError" ? "Profile request timed out." : "Profile request failed.",
      },
      { status: 200 },
    );
  }

  if (!userinfoRes.response.ok && !aboutMeRes.response.ok) {
    return NextResponse.json({ connected: false }, { status: 200 });
  }

  const userinfo = userinfoRes.json && typeof userinfoRes.json === "object" ? userinfoRes.json : {};
  const aboutMe = aboutMeRes.json && typeof aboutMeRes.json === "object" ? aboutMeRes.json : {};

  const fullName = aboutMe.Name || userinfo.name || null;
  const nameParts = fullName ? String(fullName).trim().split(/\s+/) : [];
  const email = aboutMe.PrimaryEmailAddress || aboutMe.Email || userinfo.email || null;
  const emailPrefix = email ? String(email).split("@")[0] : null;
  const firstName = aboutMe.FirstName || userinfo.given_name || nameParts[0] || null;
  const lastName =
    aboutMe.LastName ||
    userinfo.family_name ||
    (nameParts.length > 1 ? nameParts.slice(1).join(" ") : null);
  const normalizedEmail = normalizeEmail(email);

  let matchedContact = null;
  let business = aboutMe.CurrentOrganizationName || null;
  let title = aboutMe.Title || null;
  let type = null;

  if (normalizedEmail) {
    try {
      const pageSize = 500;
      const firstPage = await fetchJson(
        `${baseUrl}/api/contacts?$skip=0&$top=${pageSize}&$orderby=ContactId`,
        { method: "GET", headers: getApiHeaders(apiKey) },
      );

      if (firstPage.response.ok) {
        const totalAvailable = Number(firstPage.json?.TotalRecordAvailable) || 0;
        const findMatch = (rows) =>
          rows.find((row) => normalizeEmail(row?.EmailAddress) === normalizedEmail);

        matchedContact = findMatch(readResults(firstPage.json)) || null;

        for (
          let skip = pageSize;
          skip < totalAvailable && !matchedContact;
          skip += pageSize
        ) {
          const page = await fetchJson(
            `${baseUrl}/api/contacts?$skip=${skip}&$top=${pageSize}&$orderby=ContactId`,
            { method: "GET", headers: getApiHeaders(apiKey) },
          );
          if (!page.response.ok) break;
          matchedContact = findMatch(readResults(page.json)) || null;
        }
      }

      if (matchedContact?.ContactId) {
        const contactOrgs = await fetchJson(
          `${baseUrl}/api/ContactOverview/${matchedContact.ContactId}/ContactOrgs/`,
          { method: "GET", headers: getApiHeaders(apiKey) },
        );
        if (contactOrgs.response.ok) {
          const firstOrg = readResults(contactOrgs.json)?.[0] || null;
          const details = extractOrgDetails(firstOrg);
          business = details.business || business;
          title = details.title || title;
          type = details.type || type;
        }
      }
    } catch {
    }
  }

  return NextResponse.json({
    connected: true,
    profile: {
      firstName: firstName || emailPrefix || null,
      lastName,
      name: fullName,
      email,
      contactId: matchedContact?.ContactId || aboutMe.ContactId || null,
      business,
      title,
      type,
    },
  });
}


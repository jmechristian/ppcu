import { NextResponse } from "next/server";
import {
  extractOrgDetails,
  extractOrganizationContactId,
  fetchJson,
  getApiHeaders,
  parseCookies,
  readResults,
  toPositiveInt,
  trimSlash,
} from "@/app/lib/growthzone-api";

const DEFAULT_TIMEOUT_MS = 10000;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
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

  const oauthContactId = toPositiveInt(aboutMe.ContactId);
  let matchedContact = null;
  let business = aboutMe.CurrentOrganizationName || null;
  let title = aboutMe.Title || null;
  let type = null;
  let organizationContactId = null;

  async function applyContactOrgs(personContactId) {
    try {
      const contactOrgs = await fetchJson(
        `${baseUrl}/api/ContactOverview/${personContactId}/ContactOrgs/`,
        { method: "GET", headers: getApiHeaders(apiKey) },
        DEFAULT_TIMEOUT_MS,
      );
      if (!contactOrgs.response.ok) return;

      const firstOrg = readResults(contactOrgs.json)?.[0] || null;
      const details = extractOrgDetails(firstOrg);
      business = details.business || business;
      title = details.title || title;
      type = details.type || type;
      organizationContactId =
        extractOrganizationContactId(firstOrg, personContactId) || organizationContactId;
    } catch {}
  }

  if (oauthContactId) {
    await applyContactOrgs(oauthContactId);
  } else if (normalizedEmail) {
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
        await applyContactOrgs(matchedContact.ContactId);
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
      contactId: oauthContactId || matchedContact?.ContactId || null,
      organizationContactId,
      business,
      title,
      type,
    },
  });
}


import { NextResponse } from "next/server";
import {
  buildOauthCookie,
  expireOauthCookie,
  extractOrgDetails,
  extractOrganizationContactId,
  fetchContactMemberships,
  fetchJson,
  getApiHeaders,
  hasQualifyingMembership,
  parseCookies,
  readResults,
  refreshGrowthzoneAccessToken,
  toPositiveInt,
  trimSlash,
} from "@/app/lib/growthzone-api";

const DEFAULT_TIMEOUT_MS = 10000;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export async function GET(request) {
  const baseUrl = trimSlash(process.env.GROWTHZONE_BASE_URL);
  const apiKey = process.env.GROWTHZONE_API_KEY;
  const clientId = process.env.GROWTHZONE_CLIENT_ID;
  const clientSecret = process.env.GROWTHZONE_CLIENT_SECRET;
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
  let accessToken = cookies.growthzone_oauth_access_token;
  const refreshToken = cookies.growthzone_oauth_refresh_token;

  // The access token cookie is intentionally short-lived (~1hr). Collect any cookie
  // updates from a refresh here so they can be attached to whichever response we end
  // up sending, instead of silently treating an expired token as "logged out".
  const pendingCookies = [];

  function rememberRefreshedTokens(result) {
    pendingCookies.push(
      buildOauthCookie("growthzone_oauth_access_token", result.accessToken, result.expiresIn),
      buildOauthCookie(
        "growthzone_oauth_refresh_token",
        result.refreshToken,
        REFRESH_TOKEN_MAX_AGE_SECONDS,
      ),
      buildOauthCookie(
        "growthzone_oauth_expires_at",
        new Date(Date.now() + result.expiresIn * 1000).toISOString(),
        result.expiresIn,
      ),
    );
  }

  function clearAuthCookies() {
    pendingCookies.push(
      expireOauthCookie("growthzone_oauth_access_token"),
      expireOauthCookie("growthzone_oauth_refresh_token"),
      expireOauthCookie("growthzone_oauth_expires_at"),
    );
  }

  function respond(body, status = 200) {
    const response = NextResponse.json(body, { status });
    for (const cookie of pendingCookies) {
      response.headers.append("Set-Cookie", cookie);
    }
    return response;
  }

  let attemptedRefresh = false;
  async function tryRefresh() {
    if (attemptedRefresh || !refreshToken || !clientId || !clientSecret) return false;
    attemptedRefresh = true;
    const result = await refreshGrowthzoneAccessToken({
      baseUrl,
      clientId,
      clientSecret,
      refreshToken,
    });
    if (!result.ok) {
      console.warn("[growthzone-profile] refresh token exchange failed", {
        status: result.status,
      });
      return false;
    }
    console.info("[growthzone-profile] access token refreshed via refresh token");
    accessToken = result.accessToken;
    rememberRefreshedTokens(result);
    return true;
  }

  if (!accessToken) {
    const refreshed = await tryRefresh();
    if (!refreshed) {
      if (refreshToken) clearAuthCookies();
      return respond({ connected: false });
    }
  }

  async function fetchUserinfoAndAboutMe() {
    const authHeader = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    return Promise.all([
      fetchJson(`${baseUrl}/oauth/userinfo`, { method: "GET", headers: authHeader }),
      fetchJson(`${baseUrl}/api/login/aboutme`, { method: "GET", headers: authHeader }),
    ]);
  }

  let userinfoRes;
  let aboutMeRes;
  try {
    [userinfoRes, aboutMeRes] = await fetchUserinfoAndAboutMe();
  } catch (error) {
    return respond({
      connected: false,
      message: error?.name === "AbortError" ? "Profile request timed out." : "Profile request failed.",
    });
  }

  if (!userinfoRes.response.ok && !aboutMeRes.response.ok) {
    // The token may have just expired (or been rejected) - try a refresh once and retry.
    const refreshed = await tryRefresh();
    if (refreshed) {
      try {
        [userinfoRes, aboutMeRes] = await fetchUserinfoAndAboutMe();
      } catch {
        clearAuthCookies();
        return respond({ connected: false });
      }
    }

    if (!userinfoRes.response.ok && !aboutMeRes.response.ok) {
      clearAuthCookies();
      return respond({ connected: false });
    }
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

  const resolvedContactId = oauthContactId || matchedContact?.ContactId || null;
  let membershipAccess = false;
  if (resolvedContactId) {
    try {
      const memberships = await fetchContactMemberships(
        baseUrl,
        apiKey,
        resolvedContactId,
        DEFAULT_TIMEOUT_MS,
      );
      membershipAccess = hasQualifyingMembership(memberships);
    } catch {}
  }

  return respond({
    connected: true,
    profile: {
      firstName: firstName || emailPrefix || null,
      lastName,
      name: fullName,
      email,
      contactId: resolvedContactId,
      organizationContactId,
      business,
      title,
      type,
      hasMembershipAccess: membershipAccess,
    },
  });
}


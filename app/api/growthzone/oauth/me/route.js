import { NextResponse } from "next/server";

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

function trimSlash(value) {
  if (!value) return "";
  return String(value).replace(/\/+$/, "");
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { method: "GET", headers });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, json, url };
}

function pickUserInfo(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  return {
    sub: data.sub ?? null,
    email: data.email ?? null,
    givenName: data.given_name ?? null,
    familyName: data.family_name ?? null,
    contactId: data.ContactId ?? null,
  };
}

function pickAboutMe(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  return {
    contactId: data.ContactId ?? null,
    name: data.Name ?? null,
    firstName: data.FirstName ?? null,
    lastName: data.LastName ?? null,
    tenantName: data.TenantName ?? null,
  };
}

export async function GET(request) {
  const baseUrl = trimSlash(process.env.GROWTHZONE_BASE_URL);
  if (!baseUrl) {
    return NextResponse.json(
      {
        connected: false,
        message: "Missing GROWTHZONE_BASE_URL",
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

  try {
    const [userinfoRes, aboutMeRes] = await Promise.all([
      fetchJson(`${baseUrl}/oauth/userinfo`, authHeader),
      fetchJson(`${baseUrl}/api/login/aboutme`, authHeader),
    ]);

    const connected = userinfoRes.response.ok || aboutMeRes.response.ok;
    return NextResponse.json({
      connected,
      userinfo: pickUserInfo(userinfoRes.json),
      aboutMe: pickAboutMe(aboutMeRes.json),
    });
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        message: error?.message || "Failed to query oauth profile",
      },
      { status: 500 },
    );
  }
}


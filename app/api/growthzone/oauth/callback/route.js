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

function buildCookie(name, value, maxAgeSeconds) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function expireCookie(name) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function trimSlash(value) {
  if (!value) return "";
  return String(value).replace(/\/+$/, "");
}

async function exchangeAuthorizationCode({
  tokenUrl,
  code,
  clientId,
  clientSecret,
  redirectUri,
}) {
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, json };
}

function withClearedFlowCookies(response) {
  response.headers.append("Set-Cookie", expireCookie("growthzone_oauth_state"));
  response.headers.append("Set-Cookie", expireCookie("growthzone_oauth_return_to"));
  response.headers.append("Set-Cookie", expireCookie("growthzone_oauth_callback_url"));
  return response;
}

export async function GET(request) {
  const baseUrl = trimSlash(process.env.GROWTHZONE_BASE_URL);
  const clientId = process.env.GROWTHZONE_CLIENT_ID;
  const clientSecret = process.env.GROWTHZONE_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    return NextResponse.json(
      {
        message: "Missing OAuth environment variables",
        required: [
          "GROWTHZONE_BASE_URL",
          "GROWTHZONE_CLIENT_ID",
          "GROWTHZONE_CLIENT_SECRET",
        ],
      },
      { status: 500 },
    );
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const cookies = parseCookies(request.headers.get("cookie"));
  const expectedState = cookies.growthzone_oauth_state;
  const returnTo = cookies.growthzone_oauth_return_to || "/";
  const callbackUrl = cookies.growthzone_oauth_callback_url;
  const tokenUrl = `${baseUrl}/oauth/token`;
  const absoluteReturnTo = returnTo.startsWith("http") ? returnTo : `${origin}${returnTo}`;

  if (!code || !state || !expectedState || state !== expectedState || !callbackUrl) {
    const url = new URL("/login", origin);
    url.searchParams.set("oauth", "error");
    url.searchParams.set("reason", "invalid_callback");
    return withClearedFlowCookies(NextResponse.redirect(url));
  }

  try {
    const { response, json } = await exchangeAuthorizationCode({
      tokenUrl,
      code,
      clientId,
      clientSecret,
      redirectUri: callbackUrl,
    });

    if (!response.ok || !json?.access_token) {
      const url = new URL("/login", origin);
      url.searchParams.set("oauth", "error");
      url.searchParams.set("reason", "token_exchange_failed");
      return withClearedFlowCookies(NextResponse.redirect(url));
    }

    const ttl = Number(json.expires_in || 3600);
    const successResponse = withClearedFlowCookies(NextResponse.redirect(absoluteReturnTo));
    successResponse.headers.append(
      "Set-Cookie",
      buildCookie("growthzone_oauth_access_token", json.access_token, ttl),
    );
    successResponse.headers.append(
      "Set-Cookie",
      buildCookie(
        "growthzone_oauth_refresh_token",
        json.refresh_token || "",
        60 * 60 * 24 * 30,
      ),
    );
    successResponse.headers.append(
      "Set-Cookie",
      buildCookie(
        "growthzone_oauth_expires_at",
        new Date(Date.now() + ttl * 1000).toISOString(),
        ttl,
      ),
    );
    return successResponse;
  } catch {
    const url = new URL("/login", origin);
    url.searchParams.set("oauth", "error");
    url.searchParams.set("reason", "exception");
    return withClearedFlowCookies(NextResponse.redirect(url));
  }
}


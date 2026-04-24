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

export async function GET(request) {
  const cookies = parseCookies(request.headers.get("cookie"));
  const accessToken = cookies.growthzone_oauth_access_token;
  const refreshToken = cookies.growthzone_oauth_refresh_token;
  const expiresAt = cookies.growthzone_oauth_expires_at || null;

  return NextResponse.json({
    connected: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken),
    expiresAt,
  });
}


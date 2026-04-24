import { NextResponse } from "next/server";

function expireCookie(name) {
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export async function POST() {
  const response = NextResponse.json({
    ok: true,
    message: "GrowthZone OAuth cookies cleared",
  });
  for (const name of [
    "growthzone_oauth_access_token",
    "growthzone_oauth_refresh_token",
    "growthzone_oauth_expires_at",
    "growthzone_oauth_state",
    "growthzone_oauth_return_to",
    "growthzone_oauth_callback_url",
  ]) {
    response.headers.append("Set-Cookie", expireCookie(name));
  }
  return response;
}


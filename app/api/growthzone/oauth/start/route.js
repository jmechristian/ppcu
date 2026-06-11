import { NextResponse } from "next/server";

function trimSlash(value) {
  if (!value) return "";
  return String(value).replace(/\/+$/, "");
}

function buildCookie(name, value, maxAgeSeconds) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

function inferCallbackUrl(request) {
  const proto = request.headers.get("x-forwarded-proto") || "http";
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  return `${proto}://${host}/api/growthzone/oauth/callback`;
}

export async function GET(request) {
  const baseUrl = trimSlash(process.env.GROWTHZONE_BASE_URL);
  const clientId = process.env.GROWTHZONE_CLIENT_ID;
  const callbackUrl =
    process.env.GROWTHZONE_OAUTH_CALLBACK_URL || inferCallbackUrl(request);

  if (!baseUrl || !clientId) {
    return NextResponse.json(
      {
        message: "Missing OAuth environment variables",
        required: ["GROWTHZONE_BASE_URL", "GROWTHZONE_CLIENT_ID"],
        optional: ["GROWTHZONE_OAUTH_CALLBACK_URL"],
      },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/";
  const scope = searchParams.get("scope") || "email openid profile offline_access";
  const prompt = searchParams.get("prompt");
  const maxAge = searchParams.get("max_age");
  const state = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

  const authorize = new URL(`${baseUrl}/oauth/authorize`);
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callbackUrl);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", scope);
  authorize.searchParams.set("state", state);
  if (prompt) {
    authorize.searchParams.set("prompt", prompt);
  }
  if (maxAge) {
    authorize.searchParams.set("max_age", maxAge);
  }

  const authorizeUrl = authorize.toString();

  const response = NextResponse.redirect(authorizeUrl);
  response.headers.append("Set-Cookie", buildCookie("growthzone_oauth_state", state, 600));
  response.headers.append(
    "Set-Cookie",
    buildCookie("growthzone_oauth_return_to", returnTo, 600),
  );
  response.headers.append(
    "Set-Cookie",
    buildCookie("growthzone_oauth_callback_url", callbackUrl, 600),
  );
  return response;
}


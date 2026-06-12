import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { enrollGrowthzoneContactInCertification } from "../../../lib/growthzone-ce-enrollment";

const THINKIFIC_GRAPHQL_URL =
  process.env.THINKIFIC_GRAPHQL_URL || "https://api.thinkific.com/stable/graphql";
const THINKIFIC_USERS_URL =
  process.env.THINKIFIC_USERS_URL || "https://api.thinkific.com/api/public/v1/users";
const DEFAULT_GROWTHZONE_CERTIFICATION_TYPE_ID = 4806;

const USER_BY_EMAIL_QUERY = `
  query UserByEmail($email: EmailAddress!) {
    userByEmail(email: $email) {
      id
    }
  }
`;

function maskEmail(email) {
  const value = clean(email).toLowerCase();
  if (!value || !value.includes("@")) return "unknown";
  const [local, domain] = value.split("@");
  const safeLocal =
    local.length <= 2 ? `${local[0] || "*"}*` : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${safeLocal}@${domain}`;
}

function logEnrollEvent(event, details = {}) {
  const payload = {
    ts: new Date().toISOString(),
    event,
    ...details,
  };

  if (event.includes("failed")) {
    console.error("[thinkific-enroll]", JSON.stringify(payload));
    return;
  }

  console.info("[thinkific-enroll]", JSON.stringify(payload));
}

function pickEnv(...keys) {
  for (const key of keys) {
    const value = clean(process.env[key]);
    if (value) return { key, value };
  }
  return { key: "", value: "" };
}

function clean(value) {
  return String(value || "").trim();
}

function withRoleParam(rawUrl, role = "ppcu") {
  const value = clean(rawUrl);
  if (!value) return "";

  try {
    const isAbsolute = /^https?:\/\//i.test(value);
    const parsed = new URL(value, "https://packagingschool.com");
    if (!parsed.searchParams.get("role")) {
      parsed.searchParams.set("role", role);
    }
    return isAbsolute ? parsed.toString() : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const hasQuery = value.includes("?");
    const hasHash = value.includes("#");
    if (hasHash) {
      const [base, hash] = value.split("#", 2);
      return `${base}${hasQuery ? "&" : "?"}role=${encodeURIComponent(role)}#${hash}`;
    }
    return `${value}${hasQuery ? "&" : "?"}role=${encodeURIComponent(role)}`;
  }
}

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signHs256(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${signingInput}.${signature}`;
}

function normalizeSubdomain(rawSubdomain) {
  const value = clean(rawSubdomain);
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      return new URL(value).hostname;
    } catch {
      return "";
    }
  }
  return value.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function getSsoBaseUrl() {
  const explicit =
    clean(process.env.THINKIFIC_SSO_URL) || clean(process.env.NEXT_THINKIFIC_SSO_URL);
  if (explicit) return explicit;

  const subdomain = normalizeSubdomain(
    process.env.THINKIFIC_SUBDOMAIN || process.env.NEXT_THINKIFIC_SUBDOMAIN,
  );
  if (!subdomain) return "";
  if (subdomain.includes(".")) {
    return `https://${subdomain}/api/sso/v2/sso/jwt`;
  }
  return `https://${subdomain}.thinkific.com/api/sso/v2/sso/jwt`;
}

async function queryThinkificUserByEmail(email, bearerApiKey) {
  const response = await fetch(THINKIFIC_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: USER_BY_EMAIL_QUERY,
      variables: { email },
    }),
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function createThinkificUser({ email, first_name, last_name, restApiKey, subdomain }) {
  const response = await fetch(THINKIFIC_USERS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-API-Key": restApiKey,
      "X-Auth-Subdomain": subdomain,
    },
    body: JSON.stringify({
      email,
      first_name,
      last_name,
      provider: "SSO",
    }),
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  return { response, json };
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = clean(body?.email).toLowerCase();
    const firstName = clean(body?.first_name);
    const lastName = clean(body?.last_name);
    const returnTo = clean(body?.return_to);
    const returnToWithRole = withRoleParam(returnTo, "ppcu");
    const contactId = Number(body?.contact_id);
    const contactName = clean(body?.contact_name);

    if (!email || !firstName || !lastName || !returnToWithRole) {
      logEnrollEvent("request.failed.validation", {
        email: maskEmail(email),
        hasFirstName: Boolean(firstName),
        hasLastName: Boolean(lastName),
        hasReturnTo: Boolean(returnToWithRole),
      });
      return NextResponse.json(
        {
          message: "error",
          error: "email, first_name, last_name, and return_to are required.",
        },
        { status: 400 },
      );
    }

    const bearerApiKey = pickEnv("THINKIFIC_API_KEY", "NEXT_THINKIFIC_PUBLIC_API_KEY").value;
    const restApiKey =
      pickEnv("THINKIFIC_REST_API_KEY", "NEXT_THINKIFIC_API_KEY").value || bearerApiKey;
    const subdomain = normalizeSubdomain(
      process.env.THINKIFIC_SUBDOMAIN || process.env.NEXT_THINKIFIC_SUBDOMAIN,
    );
    const ssoSecretPick = pickEnv(
      "THINKIFIC_SSO_SECRET",
      "NEXT_THINKIFIC_SSO_SECRET",
      "NEXT_PUBLIC_API_KEY",
      "NEXT_THINKIFIC_API_KEY",
      "THINKIFIC_OAUTH_CLIENT_SECRET",
      "NEXT_THINKIFIC_OAUTH_CLIENT_SECRET",
      "THINKIFIC_SSO_SHARED_SECRET",
      "NEXT_THINKIFIC_SSO_SHARED_SECRET",
      "THINKIFIC_API_SECRET",
      "NEXT_THINKIFIC_API_SECRET",
    );
    const ssoSecret = ssoSecretPick.value;

    if (!bearerApiKey || !restApiKey || !subdomain || !ssoSecret) {
      logEnrollEvent("request.failed.config", {
        email: maskEmail(email),
        hasBearerApiKey: Boolean(bearerApiKey),
        hasRestApiKey: Boolean(restApiKey),
        hasSubdomain: Boolean(subdomain),
        hasSsoSecret: Boolean(ssoSecret),
        ssoSecretSource: ssoSecretPick.key || null,
      });
      return NextResponse.json(
        {
          message: "error",
          error:
            "Missing Thinkific config. Required: THINKIFIC_API_KEY (or NEXT_THINKIFIC_PUBLIC_API_KEY), THINKIFIC_SUBDOMAIN, THINKIFIC_SSO_SECRET (or THINKIFIC_SSO_SHARED_SECRET).",
        },
        { status: 500 },
      );
    }

    logEnrollEvent("request.started", {
      email: maskEmail(email),
      subdomain,
      ssoSecretSource: ssoSecretPick.key || null,
    });

    const certificationTypeId =
      Number(
        clean(process.env.GROWTHZONE_CERTIFICATION_TYPE_ID) ||
          DEFAULT_GROWTHZONE_CERTIFICATION_TYPE_ID,
      ) || DEFAULT_GROWTHZONE_CERTIFICATION_TYPE_ID;
    const growthzoneEnrollment = await enrollGrowthzoneContactInCertification({
      email,
      contactId: Number.isFinite(contactId) && contactId > 0 ? contactId : null,
      contactName,
      certificationTypeId,
      dryRun: false,
    });

    if (!growthzoneEnrollment.ok) {
      logEnrollEvent("request.failed.growthzone-enroll", {
        email: maskEmail(email),
        certificationTypeId,
        error: growthzoneEnrollment.error || "GrowthZone enrollment failed.",
      });
      return NextResponse.json(
        {
          message: "error",
          error: growthzoneEnrollment.error || "GrowthZone enrollment failed.",
          growthzone: {
            certificationTypeId,
            contactId: growthzoneEnrollment.contactId || null,
            certificationContactId: growthzoneEnrollment.certificationContactId || null,
            attempts: growthzoneEnrollment.attempts || [],
          },
        },
        { status: 409 },
      );
    }

    logEnrollEvent("request.growthzone-enroll.succeeded", {
      email: maskEmail(email),
      certificationTypeId,
      alreadyEnrolled: Boolean(growthzoneEnrollment.alreadyEnrolled),
      growthzoneContactId: growthzoneEnrollment.contactId || null,
      growthzoneCertificationContactId: growthzoneEnrollment.certificationContactId || null,
    });

    const userLookup = await queryThinkificUserByEmail(email, bearerApiKey);
    if (!userLookup.response.ok) {
      logEnrollEvent("request.failed.lookup", {
        email: maskEmail(email),
        status: userLookup.response.status,
      });
      return NextResponse.json(
        {
          message: "error",
          error: userLookup.json?.message || `User lookup failed (${userLookup.response.status}).`,
        },
        { status: userLookup.response.status || 500 },
      );
    }
    if (Array.isArray(userLookup.json?.errors) && userLookup.json.errors.length > 0) {
      logEnrollEvent("request.failed.lookup-graphql", {
        email: maskEmail(email),
        error: userLookup.json.errors[0]?.message || "unknown",
      });
      return NextResponse.json(
        {
          message: "error",
          error: userLookup.json.errors[0]?.message || "Thinkific user lookup error.",
          errors: userLookup.json.errors,
        },
        { status: 400 },
      );
    }

    const existingUserId = userLookup.json?.data?.userByEmail?.id || null;
    let createdUserId = null;
    if (!existingUserId) {
      const created = await createThinkificUser({
        email,
        first_name: firstName,
        last_name: lastName,
        restApiKey,
        subdomain,
      });

      if (!created.response.ok) {
        logEnrollEvent("request.failed.create-user", {
          email: maskEmail(email),
          status: created.response.status,
          error: created.json?.message || null,
        });
        return NextResponse.json(
          {
            message: "error",
            error: created.json?.message || `Create user failed (${created.response.status}).`,
            details: created.json,
          },
          { status: created.response.status || 500 },
        );
      }
      createdUserId = created.json?.id || null;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const payload = {
      email,
      first_name: firstName,
      last_name: lastName,
      iat: nowSeconds,
      exp: nowSeconds + 60 * 15,
    };
    const token = signHs256(payload, ssoSecret);
    const ssoBaseUrl = getSsoBaseUrl();

    if (!ssoBaseUrl) {
      logEnrollEvent("request.failed.sso-url", {
        email: maskEmail(email),
      });
      return NextResponse.json(
        {
          message: "error",
          error: "Unable to resolve Thinkific SSO URL. Set THINKIFIC_SSO_URL or THINKIFIC_SUBDOMAIN.",
        },
        { status: 500 },
      );
    }

    const separator = ssoBaseUrl.includes("?") ? "&" : "?";
    const url = `${ssoBaseUrl}${separator}jwt=${encodeURIComponent(token)}&return_to=${encodeURIComponent(returnToWithRole)}`;

    logEnrollEvent("request.succeeded", {
      email: maskEmail(email),
      userCreated: Boolean(createdUserId),
      userId: existingUserId || createdUserId || null,
      returnToDomain: (() => {
        try {
          return new URL(returnToWithRole).hostname;
        } catch {
          return "unknown";
        }
      })(),
    });

    return NextResponse.json({
      message: "success",
      url,
      userCreated: Boolean(createdUserId),
      userId: existingUserId || createdUserId || null,
    });
  } catch (error) {
    logEnrollEvent("request.failed.exception", {
      error: error?.message || "Internal server error",
    });
    return NextResponse.json(
      {
        message: "error",
        error: error?.message || "Internal server error",
      },
      { status: 500 },
    );
  }
}

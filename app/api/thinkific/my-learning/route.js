import { NextResponse } from "next/server";

const THINKIFIC_GRAPHQL_URL =
  process.env.THINKIFIC_GRAPHQL_URL || "https://api.thinkific.com/stable/graphql";
const THINKIFIC_ENROLLMENTS_URL =
  process.env.THINKIFIC_ENROLLMENTS_URL || "https://api.thinkific.com/api/public/v1/enrollments";

const USER_LEARNING_QUERY = `
  query UserByEmail($email: EmailAddress!, $first: Int) {
    userByEmail(email: $email) {
      hasAdminRole
      courses(first: $first) {
        nodes {
          id
          name
          title
          slug
          instructor {
            fullName
          }
          cardImage {
            url
          }
          product {
            resumeUrl
            primaryPrice {
              price
              displayPrice
            }
          }
        }
      }
      firstName
      lastName
      email
      id
    }
  }
`;

function clean(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function normalizeProgressValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n <= 1 && n >= 0) return Math.round(n * 100);
  if (n >= 0 && n <= 100) return Math.round(n);
  return null;
}

function normalizeCourseId(value) {
  return clean(value);
}

function extractLegacyNumericId(value) {
  const raw = clean(value);
  if (!raw) return null;

  if (/^\d+$/.test(raw)) return raw;

  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const match = decoded.match(/:(\d+)$/);
    if (match?.[1]) return match[1];
  } catch {}

  const plainMatch = raw.match(/:(\d+)$/);
  if (plainMatch?.[1]) return plainMatch[1];

  return null;
}

function getProgressByCourseId(payload) {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.enrollments)
      ? payload.enrollments
      : Array.isArray(payload)
        ? payload
        : [];

  const map = new Map();
  for (const item of items) {
    const courseId = normalizeCourseId(item?.course_id ?? item?.courseId);
    if (!courseId) continue;
    const progress = normalizeProgressValue(item?.percentage_completed ?? item?.percentageCompleted);
    if (progress == null) continue;
    map.set(courseId, progress);
  }
  return map;
}

async function queryThinkificUserByEmail(email, bearerApiKey) {
  const response = await fetch(THINKIFIC_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: USER_LEARNING_QUERY,
      variables: {
        email,
        first: 100,
      },
    }),
    cache: "no-store",
  });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

async function fetchEnrollmentsByEmail({ email, restApiKey, subdomain }) {
  if (!email || !restApiKey || !subdomain) return new Map();

  const url = `${THINKIFIC_ENROLLMENTS_URL}?page=1&limit=500&query[email]=${encodeURIComponent(email)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-API-Key": restApiKey,
      "X-Auth-Subdomain": subdomain,
    },
    cache: "no-store",
  });
  if (!response.ok) return new Map();

  const json = await response.json().catch(() => ({}));
  return getProgressByCourseId(json);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = normalizeEmail(searchParams.get("email"));
    if (!email) {
      return NextResponse.json(
        { message: "error", error: "email query param is required." },
        { status: 400 },
      );
    }

    const bearerApiKey = clean(process.env.THINKIFIC_API_KEY || process.env.NEXT_THINKIFIC_PUBLIC_API_KEY);
    const restApiKey =
      clean(process.env.THINKIFIC_REST_API_KEY || process.env.NEXT_THINKIFIC_API_KEY) || bearerApiKey;
    const subdomain = clean(process.env.THINKIFIC_SUBDOMAIN || process.env.NEXT_THINKIFIC_SUBDOMAIN);
    if (!bearerApiKey) {
      return NextResponse.json(
        { message: "error", error: "Missing Thinkific API key." },
        { status: 500 },
      );
    }

    const { response, json } = await queryThinkificUserByEmail(email, bearerApiKey);
    if (!response.ok) {
      return NextResponse.json(
        { message: "error", error: json?.message || `Request failed (${response.status}).` },
        { status: response.status || 500 },
      );
    }
    if (Array.isArray(json?.errors) && json.errors.length > 0) {
      return NextResponse.json(
        { message: "error", error: json.errors[0]?.message || "GraphQL error.", errors: json.errors },
        { status: 400 },
      );
    }

    const user = json?.data?.userByEmail;
    if (!user) {
      return NextResponse.json({
        message: "success",
        data: {
          user: null,
          courses: [],
        },
      });
    }

    const progressByCourseId = await fetchEnrollmentsByEmail({
      email: normalizeEmail(user?.email) || email,
      restApiKey,
      subdomain,
    });

    const courses = (user?.courses?.nodes || []).filter(Boolean).map((course, idx) => {
      const courseId = normalizeCourseId(course?.id || `${idx}`);
      const legacyCourseId = extractLegacyNumericId(courseId);
      const progressPercent =
        progressByCourseId.get(courseId) ??
        (legacyCourseId ? progressByCourseId.get(legacyCourseId) : null) ??
        null;
      return {
        id: courseId,
        legacyId: legacyCourseId,
        title: course?.title || course?.name || `Course ${idx + 1}`,
        instructor: course?.instructor?.fullName || "",
        cardImageUrl: course?.cardImage?.url || "",
        priceDisplay: course?.product?.primaryPrice?.displayPrice || "",
        resumeUrl: clean(course?.product?.resumeUrl),
        progressPercent,
      };
    });

    return NextResponse.json({
      message: "success",
      data: {
        user: {
          id: clean(user?.id),
          firstName: clean(user?.firstName),
          lastName: clean(user?.lastName),
          email: normalizeEmail(user?.email),
          hasAdminRole: Boolean(user?.hasAdminRole),
        },
        courses,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "error", error: error?.message || "Internal server error." },
      { status: 500 },
    );
  }
}

const THINKIFIC_ENROLLMENTS_URL =
  process.env.THINKIFIC_ENROLLMENTS_URL ||
  "https://api.thinkific.com/api/public/v1/enrollments";
const THINKIFIC_GRAPHQL_URL =
  process.env.THINKIFIC_GRAPHQL_URL || "https://api.thinkific.com/stable/graphql";

const BUNDLE_COURSES_QUERY = `
  query BundleCourses($bundleId: ID!, $first: Int) {
    bundle(id: $bundleId) {
      items(first: $first) {
        nodes {
          ... on Course {
            id
          }
        }
      }
    }
  }
`;

function clean(value) {
  return String(value || "").trim();
}

export function toNumericCourseId(value) {
  const raw = clean(value);
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    const match = decoded.match(/:(\d+)$/);
    if (match?.[1]) {
      const numeric = Number(match[1]);
      return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
    }
  } catch {}

  const plainMatch = raw.match(/:(\d+)$/);
  if (plainMatch?.[1]) {
    const numeric = Number(plainMatch[1]);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }

  return null;
}

export function getPpcuBundleId() {
  return (
    clean(process.env.THINKIFIC_BUNDLE_ID) ||
    clean(process.env.NEXT_PUBLIC_THINKIFIC_BUNDLE_ID) ||
    "424513"
  );
}

export async function getBundleCourseIds({ bundleId, bearerApiKey }) {
  const id = clean(bundleId) || getPpcuBundleId();
  if (!bearerApiKey || !id) return [];

  const response = await fetch(THINKIFIC_GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: BUNDLE_COURSES_QUERY,
      variables: { bundleId: id, first: 100 },
    }),
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || (Array.isArray(json?.errors) && json.errors.length > 0)) {
    return [];
  }

  const nodes = json?.data?.bundle?.items?.nodes || [];
  const ids = [];
  for (const node of nodes) {
    const numeric = toNumericCourseId(node?.id);
    if (numeric && !ids.includes(numeric)) ids.push(numeric);
  }
  return ids;
}

function isAlreadyEnrolledResponse(status, json) {
  if (status === 422 || status === 409) {
    const message = clean(json?.message || json?.error).toLowerCase();
    const detail = JSON.stringify(json?.errors || json || "").toLowerCase();
    return (
      message.includes("already") ||
      detail.includes("already") ||
      detail.includes("taken") ||
      detail.includes("exists")
    );
  }
  return false;
}

export async function enrollUserInBundle({ userId, bundleId, restApiKey, subdomain }) {
  const numericUserId = toNumericCourseId(userId);
  const id = clean(bundleId) || getPpcuBundleId();

  if (!numericUserId || !id) {
    return { ok: false, status: 400, bundleId: id, error: "Missing user or bundle id." };
  }
  if (!restApiKey || !subdomain) {
    return { ok: false, status: 500, bundleId: id, error: "Missing Thinkific REST credentials." };
  }

  const response = await fetch(
    `https://api.thinkific.com/api/public/v1/bundles/${id}/enrollments`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-API-Key": restApiKey,
        "X-Auth-Subdomain": subdomain,
      },
      body: JSON.stringify({
        user_id: numericUserId,
        activated_at: new Date().toISOString(),
      }),
      cache: "no-store",
    },
  );

  const json = await response.json().catch(() => ({}));
  const alreadyEnrolled = isAlreadyEnrolledResponse(response.status, json);

  if (response.ok || alreadyEnrolled) {
    return { ok: true, status: response.status, bundleId: id, alreadyEnrolled };
  }

  return {
    ok: false,
    status: response.status,
    bundleId: id,
    error: clean(json?.message) || `Bundle enrollment failed (${response.status}).`,
  };
}

export async function enrollUserInCourse({ userId, courseId, restApiKey, subdomain }) {
  const numericUserId = toNumericCourseId(userId);
  const numericCourseId = toNumericCourseId(courseId);

  if (!numericUserId || !numericCourseId) {
    return { ok: false, status: 400, courseId: numericCourseId, error: "Missing user or course id." };
  }
  if (!restApiKey || !subdomain) {
    return { ok: false, status: 500, courseId: numericCourseId, error: "Missing Thinkific REST credentials." };
  }

  const response = await fetch(THINKIFIC_ENROLLMENTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-API-Key": restApiKey,
      "X-Auth-Subdomain": subdomain,
    },
    body: JSON.stringify({
      course_id: numericCourseId,
      user_id: numericUserId,
      activated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  const alreadyEnrolled = isAlreadyEnrolledResponse(response.status, json);

  if (response.ok || alreadyEnrolled) {
    return {
      ok: true,
      status: response.status,
      courseId: numericCourseId,
      alreadyEnrolled,
      enrollmentId: json?.id || null,
    };
  }

  return {
    ok: false,
    status: response.status,
    courseId: numericCourseId,
    error: clean(json?.message) || `Course enrollment failed (${response.status}).`,
  };
}

export async function enrollUserInCourses({ userId, courseIds, restApiKey, subdomain }) {
  const ids = (Array.isArray(courseIds) ? courseIds : [courseIds])
    .map((id) => toNumericCourseId(id))
    .filter(Boolean);

  if (ids.length === 0) {
    return { ok: false, enrolledCount: 0, results: [], error: "No course ids to enroll." };
  }

  const results = await Promise.all(
    ids.map((courseId) =>
      enrollUserInCourse({ userId, courseId, restApiKey, subdomain }),
    ),
  );

  const failures = results.filter((result) => !result.ok);
  const enrolledCount = results.filter((result) => result.ok).length;

  return {
    ok: failures.length === 0,
    enrolledCount,
    results,
    error: failures.length > 0 ? failures[0].error : "",
  };
}

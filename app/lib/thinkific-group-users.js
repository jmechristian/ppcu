const THINKIFIC_GROUP_USERS_URL =
  process.env.THINKIFIC_GROUP_USERS_URL ||
  "https://api.thinkific.com/api/public/v1/group_users";
const THINKIFIC_USERS_URL =
  process.env.THINKIFIC_USERS_URL || "https://api.thinkific.com/api/public/v1/users";

function clean(value) {
  return String(value || "").trim();
}

export function normalizeThinkificNumericUserId(id) {
  const raw = clean(id);
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

function isAlreadyInGroupResponse(status, json) {
  if (status === 409) return true;

  const message = clean(json?.message || json?.error || "").toLowerCase();
  if (!message) return false;

  return (
    message.includes("already") ||
    message.includes("duplicate") ||
    message.includes("member") ||
    message.includes("exists")
  );
}

async function lookupThinkificUserIdByEmail({ email, restApiKey, subdomain }) {
  const normalizedEmail = clean(email).toLowerCase();
  if (!normalizedEmail) return null;

  const url = `${THINKIFIC_USERS_URL}?page=1&limit=1&query[email]=${encodeURIComponent(normalizedEmail)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-API-Key": restApiKey,
      "X-Auth-Subdomain": subdomain,
    },
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    return null;
  }

  const items = Array.isArray(json?.items) ? json.items : [];
  const first = items[0];
  return normalizeThinkificNumericUserId(first?.id);
}

export async function resolveThinkificNumericUserId({
  graphqlId,
  restCreatedId,
  email,
  restApiKey,
  subdomain,
}) {
  const fromRestCreate = normalizeThinkificNumericUserId(restCreatedId);
  if (fromRestCreate) return fromRestCreate;

  // The Thinkific REST user id (used by enrollment/group endpoints) is NOT the
  // same as the GraphQL global id. The GraphQL id only sometimes decodes to the
  // REST id, so always prefer the canonical REST lookup by email first.
  const fromRestLookup = await lookupThinkificUserIdByEmail({ email, restApiKey, subdomain });
  if (fromRestLookup) return fromRestLookup;

  return normalizeThinkificNumericUserId(graphqlId);
}

export async function addThinkificUserToGroups({
  userId,
  groupNames,
  restApiKey,
  subdomain,
}) {
  const numericUserId = normalizeThinkificNumericUserId(userId);
  const names = (Array.isArray(groupNames) ? groupNames : [groupNames])
    .map((name) => clean(name))
    .filter(Boolean);

  if (!numericUserId) {
    return {
      ok: false,
      status: 400,
      json: null,
      error: "Unable to resolve Thinkific user id for group assignment.",
      alreadyMember: false,
    };
  }

  if (!restApiKey || !subdomain) {
    return {
      ok: false,
      status: 500,
      json: null,
      error: "Missing Thinkific REST API credentials for group assignment.",
      alreadyMember: false,
    };
  }

  if (names.length === 0) {
    return {
      ok: false,
      status: 400,
      json: null,
      error: "At least one Thinkific group name is required.",
      alreadyMember: false,
    };
  }

  const response = await fetch(THINKIFIC_GROUP_USERS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Auth-API-Key": restApiKey,
      "X-Auth-Subdomain": subdomain,
    },
    body: JSON.stringify({
      user_id: numericUserId,
      group_names: names,
    }),
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  const alreadyMember = isAlreadyInGroupResponse(response.status, json);

  if (response.ok || alreadyMember) {
    return {
      ok: true,
      status: response.status,
      json,
      error: "",
      alreadyMember,
      userId: numericUserId,
    };
  }

  return {
    ok: false,
    status: response.status,
    json,
    error: clean(json?.message) || `Thinkific group assignment failed (${response.status}).`,
    alreadyMember: false,
    userId: numericUserId,
  };
}

export function getPpcuGroupName() {
  return clean(process.env.THINKIFIC_PPCU_GROUP_NAME) || "PPCU";
}

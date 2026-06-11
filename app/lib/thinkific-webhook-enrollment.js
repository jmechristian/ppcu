import { enrollGrowthzoneContactInCertification } from "./growthzone-ce-enrollment";

const DEFAULT_CERTIFICATION_TYPE_ID = 4806;

function clean(value) {
  return String(value || "").trim();
}

function normalizeEmail(value) {
  return clean(value).toLowerCase();
}

function maskEmail(email) {
  const value = normalizeEmail(email);
  if (!value || !value.includes("@")) return "unknown";
  const [local, domain] = value.split("@");
  const safeLocal =
    local.length <= 2 ? `${local[0] || "*"}*` : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${safeLocal}@${domain}`;
}

function logWebhook(event, details = {}) {
  const payload = { ts: new Date().toISOString(), event, ...details };
  if (event.includes("failed")) {
    console.error("[thinkific-webhook-enrollment]", JSON.stringify(payload));
    return;
  }
  console.info("[thinkific-webhook-enrollment]", JSON.stringify(payload));
}

export function parseEnrollmentWebhookPayload(raw) {
  const body = raw && typeof raw === "object" ? raw : {};
  const eventId = clean(body.id);
  const resource = clean(body.resource);
  const action = clean(body.action);
  const tenantId = clean(body.tenant_id);
  const eventCreatedAt = clean(body.created_at);
  const payload = body.payload && typeof body.payload === "object" ? body.payload : {};
  const user = payload.user && typeof payload.user === "object" ? payload.user : {};

  return {
    eventId,
    resource,
    action,
    tenantId,
    eventCreatedAt,
    email: normalizeEmail(user.email),
    firstName: clean(user.first_name),
    lastName: clean(user.last_name),
    thinkificUserId: clean(user.id),
    thinkificEnrollmentId: clean(payload.id),
    thinkificCourseId: clean(payload.course_id || payload?.course?.id),
    raw: body,
  };
}

export function validateEnrollmentWebhook(parsed) {
  const errors = [];
  if (!parsed.eventId) errors.push("id is required");
  if (parsed.resource !== "enrollment") errors.push("resource must be enrollment");
  if (parsed.action !== "created") errors.push("action must be created");
  if (!parsed.email) errors.push("payload.user.email is required");
  if (!parsed.firstName) errors.push("payload.user.first_name is required");
  if (!parsed.lastName) errors.push("payload.user.last_name is required");
  if (!parsed.thinkificEnrollmentId) errors.push("payload.id is required");
  return errors;
}

export async function processThinkificEnrollmentWebhook(parsed) {
  const certificationTypeId =
    Number(process.env.GROWTHZONE_CERTIFICATION_TYPE_ID || DEFAULT_CERTIFICATION_TYPE_ID) ||
    DEFAULT_CERTIFICATION_TYPE_ID;
  if (!Number.isFinite(certificationTypeId) || certificationTypeId <= 0) {
    throw new Error("Missing/invalid GROWTHZONE_CERTIFICATION_TYPE_ID.");
  }

  const dryRun = String(process.env.GROWTHZONE_ENROLL_DRY_RUN || "").toLowerCase() === "true";
  logWebhook("processing.started", {
    eventId: parsed.eventId,
    email: maskEmail(parsed.email),
    certificationTypeId,
    dryRun,
  });

  const enrollmentResult = await enrollGrowthzoneContactInCertification({
    email: parsed.email,
    certificationTypeId,
    dryRun,
  });

  if (!enrollmentResult.ok) {
    logWebhook("processing.failed", {
      eventId: parsed.eventId,
      email: maskEmail(parsed.email),
      certificationTypeId,
      error: enrollmentResult.error || "Enrollment failed",
    });
    return {
      ok: false,
      status: "failed",
      growthzoneContactId: enrollmentResult.contactId || null,
      growthzoneCertificationContactId: enrollmentResult.certificationContactId || null,
      error: enrollmentResult.error || "Enrollment failed",
      processingNotes: JSON.stringify({
        attempts: enrollmentResult.attempts || [],
        endpointUsed: enrollmentResult.endpointUsed || null,
      }),
    };
  }

  logWebhook("processing.succeeded", {
    eventId: parsed.eventId,
    email: maskEmail(parsed.email),
    certificationTypeId,
    alreadyEnrolled: enrollmentResult.alreadyEnrolled,
    growthzoneCertificationContactId: enrollmentResult.certificationContactId || null,
  });

  return {
    ok: true,
    status: "processed",
    growthzoneContactId: enrollmentResult.contactId || null,
    growthzoneCertificationContactId: enrollmentResult.certificationContactId || null,
    error: "",
    processingNotes: JSON.stringify({
      alreadyEnrolled: Boolean(enrollmentResult.alreadyEnrolled),
      endpointUsed: enrollmentResult.endpointUsed || null,
      attempts: enrollmentResult.attempts || [],
    }),
  };
}

import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  findGrowthzoneContactByEmail,
  getContactCertifications,
} from "../../../../lib/growthzone-ce-enrollment";
import { markCertificationComponentCompleteByName } from "../../../../lib/growthzone-component-completion";
import { isThinkificCourseCompleted } from "../../../../lib/thinkific-enrollments";
import { getModuleForLesson, getModuleForCourseName } from "../../../../lib/ppcu-lesson-component-map";

const DEFAULT_CERTIFICATION_NAME = "Folding Carton Essentials";

function clean(value) {
  return String(value || "").trim();
}

function getCertificationName() {
  return clean(process.env.GROWTHZONE_CERTIFICATION_NAME) || DEFAULT_CERTIFICATION_NAME;
}

function maskEmail(email) {
  const value = clean(email).toLowerCase();
  if (!value || !value.includes("@")) return "unknown";
  const [local, domain] = value.split("@");
  const safeLocal =
    local.length <= 2 ? `${local[0] || "*"}*` : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${safeLocal}@${domain}`;
}

function logEvent(event, details = {}) {
  const payload = { ts: new Date().toISOString(), event, ...details };
  if (event.includes("failed")) {
    console.error("[thinkific-lesson-webhook]", JSON.stringify(payload));
    return;
  }
  console.info("[thinkific-lesson-webhook]", JSON.stringify(payload));
}

function pickEnv(...keys) {
  for (const key of keys) {
    const value = clean(process.env[key]);
    if (value) return value;
  }
  return "";
}

function getThinkificRestCreds() {
  return {
    restApiKey: pickEnv("THINKIFIC_REST_API_KEY", "NEXT_THINKIFIC_API_KEY", "THINKIFIC_API_KEY"),
    subdomain: pickEnv("THINKIFIC_SUBDOMAIN", "NEXT_THINKIFIC_SUBDOMAIN"),
  };
}

function tokenMatches(provided, expected) {
  const a = Buffer.from(String(provided || ""));
  const b = Buffer.from(String(expected || ""));
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function findFceCertificationContactId(certifications) {
  const targetName = getCertificationName().toLowerCase();
  const match =
    certifications.find((c) => clean(c.certificationName).toLowerCase() === targetName) ||
    certifications.find((c) => /folding carton/i.test(clean(c.certificationName))) ||
    null;
  return match?.certificationContactId || null;
}

export async function POST(request) {
  try {
    const expectedToken = pickEnv("THINKIFIC_WEBHOOK_TOKEN");
    if (!expectedToken) {
      logEvent("request.failed.config", { reason: "THINKIFIC_WEBHOOK_TOKEN not set" });
      return NextResponse.json({ ok: false, error: "Webhook token not configured." }, { status: 500 });
    }
    if (!tokenMatches(request.nextUrl.searchParams.get("token"), expectedToken)) {
      logEvent("request.failed.auth", { reason: "bad token" });
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const resource = clean(body?.resource);
    const action = clean(body?.action);
    const payload = body?.payload || {};
    const email = clean(payload?.user?.email).toLowerCase();
    const thinkificUserId = payload?.user?.id ?? null;
    const lessonId = payload?.lesson?.id ?? null;
    const courseId = payload?.course?.id ?? null;
    const courseName = clean(payload?.course?.name);
    const eventId = clean(body?.id) || null;

    logEvent("request.received", {
      eventId,
      resource,
      action,
      email: maskEmail(email),
      lessonId,
      courseId,
    });

    if (resource && resource !== "lesson") {
      return NextResponse.json({ ok: true, ignored: true, reason: "non-lesson resource" });
    }

    // Every course has a trailing filler lesson (e.g. "Continue Your Learning Journey")
    // that isn't in the objective map but is often what actually completes the course.
    // Fall back to matching the module by course name so that completion event isn't skipped.
    const moduleName = getModuleForLesson(lessonId) || getModuleForCourseName(courseName);
    if (!moduleName) {
      logEvent("request.ignored.unmapped-lesson", { eventId, lessonId, courseName });
      return NextResponse.json({ ok: true, ignored: true, reason: "lesson not part of certification" });
    }

    if (!email || !courseId) {
      logEvent("request.ignored.missing-fields", { eventId, hasEmail: Boolean(email), hasCourse: Boolean(courseId) });
      return NextResponse.json({ ok: true, ignored: true, reason: "missing email or course id" });
    }

    const { restApiKey, subdomain } = getThinkificRestCreds();
    if (!restApiKey || !subdomain) {
      logEvent("request.failed.config", { reason: "missing Thinkific REST creds" });
      return NextResponse.json({ ok: false, error: "Thinkific credentials not configured." }, { status: 500 });
    }

    const courseStatus = await isThinkificCourseCompleted({
      userId: thinkificUserId,
      courseId,
      restApiKey,
      subdomain,
    });

    if (!courseStatus.ok) {
      logEvent("request.failed.course-check", { eventId, courseId, error: courseStatus.error });
      return NextResponse.json({ ok: false, error: courseStatus.error || "Course lookup failed." }, { status: 502 });
    }

    if (!courseStatus.completed) {
      logEvent("request.ack.course-incomplete", {
        eventId,
        moduleName,
        courseId,
        percent: courseStatus.percent,
      });
      return NextResponse.json({
        ok: true,
        completed: false,
        reason: "Thinkific course not yet complete",
        percent: courseStatus.percent,
      });
    }

    const contact = await findGrowthzoneContactByEmail(email);
    if (!contact?.contactId) {
      logEvent("request.ack.no-contact", { eventId, email: maskEmail(email) });
      return NextResponse.json({ ok: true, completed: false, reason: "No GrowthZone contact for email" });
    }

    const certifications = await getContactCertifications(contact.contactId);
    const certificationContactId = findFceCertificationContactId(certifications);
    if (!certificationContactId) {
      logEvent("request.ack.not-enrolled", { eventId, contactId: contact.contactId });
      return NextResponse.json({ ok: true, completed: false, reason: "Contact not enrolled in certification" });
    }

    const result = await markCertificationComponentCompleteByName({
      certificationContactId,
      componentName: moduleName,
    });

    if (!result.ok) {
      logEvent("request.failed.mark-complete", {
        eventId,
        certificationContactId,
        moduleName,
        error: result.error,
        retryable: Boolean(result.retryable),
      });
      return NextResponse.json(
        { ok: false, error: result.error || "Failed to mark component complete." },
        { status: result.retryable ? 502 : 200 },
      );
    }

    logEvent("request.succeeded", {
      eventId,
      email: maskEmail(email),
      contactId: contact.contactId,
      certificationContactId,
      moduleName,
      certificationComponentId: result.certificationComponentId,
      alreadyComplete: Boolean(result.alreadyComplete),
      changed: Boolean(result.changed),
    });

    return NextResponse.json({
      ok: true,
      completed: true,
      moduleName,
      certificationComponentId: result.certificationComponentId,
      alreadyComplete: Boolean(result.alreadyComplete),
      changed: Boolean(result.changed),
    });
  } catch (error) {
    logEvent("request.failed.exception", { error: error?.message || "unknown" });
    return NextResponse.json(
      { ok: false, error: error?.message || "Internal server error" },
      { status: 500 },
    );
  }
}

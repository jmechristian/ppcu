import { NextResponse } from "next/server";
import {
  createWebhookEvent,
  getWebhookEventById,
  updateWebhookEvent,
} from "../../../../lib/thinkific-webhook-events";
import {
  parseEnrollmentWebhookPayload,
  processThinkificEnrollmentWebhook,
  validateEnrollmentWebhook,
} from "../../../../lib/thinkific-webhook-enrollment";

function toWebhookRecord(parsed) {
  return {
    id: parsed.eventId,
    eventId: parsed.eventId,
    resource: parsed.resource,
    action: parsed.action,
    tenantId: parsed.tenantId || null,
    eventCreatedAt: parsed.eventCreatedAt || null,
    email: parsed.email || null,
    firstName: parsed.firstName || null,
    lastName: parsed.lastName || null,
    thinkificUserId: parsed.thinkificUserId || null,
    thinkificEnrollmentId: parsed.thinkificEnrollmentId || null,
    thinkificCourseId: parsed.thinkificCourseId || null,
  };
}

export async function POST(request) {
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = parseEnrollmentWebhookPayload(raw);
    const validationErrors = validateEnrollmentWebhook(parsed);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Invalid webhook payload.",
          errors: validationErrors,
        },
        { status: 400 },
      );
    }

    const baseRecord = toWebhookRecord(parsed);
    let event = null;
    try {
      event = await getWebhookEventById(parsed.eventId);
      if (!event) {
        try {
          event = await createWebhookEvent({
            ...baseRecord,
            status: "received",
            retryCount: 0,
            processingNotes: "initial receive",
            error: "",
          });
        } catch {
          event = await getWebhookEventById(parsed.eventId);
        }
      }
    } catch (persistenceError) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Webhook persistence backend unavailable. Confirm GraphQL endpoint/api key and run amplify push for schema updates.",
          error: persistenceError?.message || "Persistence error",
        },
        { status: 503 },
      );
    }

    if (!event) {
      return NextResponse.json(
        {
          ok: false,
          message: "Unable to persist webhook event.",
        },
        { status: 500 },
      );
    }

    if (event.status === "processed") {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        message: "Event already processed.",
        eventId: parsed.eventId,
      });
    }

    const retryCount = Number(event.retryCount || 0) + 1;
    await updateWebhookEvent({
      id: parsed.eventId,
      ...baseRecord,
      status: "received",
      retryCount,
      processingNotes: `processing attempt ${retryCount}`,
      error: "",
    });

    const processed = await processThinkificEnrollmentWebhook(parsed);
    const updated = await updateWebhookEvent({
      id: parsed.eventId,
      status: processed.status,
      retryCount,
      growthzoneContactId: processed.growthzoneContactId || null,
      growthzoneCertificationContactId: processed.growthzoneCertificationContactId || null,
      error: processed.error || "",
      processingNotes: processed.processingNotes || null,
    });

    return NextResponse.json({
      ok: processed.ok,
      message: processed.ok ? "Webhook processed." : "Webhook processing failed.",
      eventId: parsed.eventId,
      status: updated?.status || processed.status,
      growthzoneContactId: updated?.growthzoneContactId || processed.growthzoneContactId || null,
      growthzoneCertificationContactId:
        updated?.growthzoneCertificationContactId ||
        processed.growthzoneCertificationContactId ||
        null,
      retryCount,
      error: processed.error || null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error?.message || "Unhandled webhook failure.",
      },
      { status: 500 },
    );
  }
}

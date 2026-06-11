const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_CERTIFICATION_SALEABLE_ITEM_ID = 467095;
const DEFAULT_CERTIFICATION_SALEABLE_ITEM_NAME = "Demo CE";
const DEFAULT_CERTIFICATION_FEE_DESCRIPTION = "Demo CE Fee Item";
const DEFAULT_CERTIFICATION_STATUS_ID = 3;

function trimSlash(value) {
  if (!value) return "";
  return String(value).replace(/\/+$/, "");
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function maskEmail(email) {
  const value = normalizeEmail(email);
  if (!value || !value.includes("@")) return "unknown";
  const [local, domain] = value.split("@");
  const safeLocal =
    local.length <= 2 ? `${local[0] || "*"}*` : `${local.slice(0, 2)}***${local.slice(-1)}`;
  return `${safeLocal}@${domain}`;
}

function getApiHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    Authorization: `ApiKey ${apiKey}`,
  };
}

function readResults(payload) {
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.Results)) return payload.Results;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.Items)) return payload.Items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function logGz(event, details = {}) {
  const payload = { ts: new Date().toISOString(), event, ...details };
  if (event.includes("failed")) {
    console.error("[growthzone-ce-enroll]", JSON.stringify(payload));
    return;
  }
  console.info("[growthzone-ce-enroll]", JSON.stringify(payload));
}

function shouldRetryStatus(status) {
  return status === 429 || (status >= 500 && status <= 599);
}

async function requestWithTimeout(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithRetry(url, options, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let lastResponse = null;
  let lastJson = null;
  let lastText = "";
  const backoffMs = [200, 500, 1000];

  for (let i = 0; i < backoffMs.length; i += 1) {
    const response = await requestWithTimeout(url, options, timeoutMs);
    const text = await response.text();
    let json;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    lastResponse = response;
    lastJson = json;
    lastText = text;

    if (!shouldRetryStatus(response.status) || i >= backoffMs.length - 1) {
      return { response, json, text, url };
    }

    await new Promise((resolve) => setTimeout(resolve, backoffMs[i]));
  }

  return { response: lastResponse, json: lastJson, text: lastText, url };
}

function getGrowthzoneConfig() {
  const baseUrl = trimSlash(process.env.GROWTHZONE_BASE_URL);
  const apiKey = String(process.env.GROWTHZONE_API_KEY || "").trim();
  if (!baseUrl || !apiKey) {
    throw new Error("Missing GrowthZone configuration.");
  }
  return { baseUrl, apiKey };
}

export async function findGrowthzoneContactByEmail(email, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const normalized = normalizeEmail(email);
  const { baseUrl, apiKey } = getGrowthzoneConfig();
  if (!normalized) return null;

  const pageSize = 500;
  const firstPage = await fetchJsonWithRetry(
    `${baseUrl}/api/contacts?$skip=0&$top=${pageSize}&$orderby=ContactId`,
    { method: "GET", headers: getApiHeaders(apiKey) },
    timeoutMs,
  );
  if (!firstPage.response.ok) {
    throw new Error(`Contact lookup failed (${firstPage.response.status}).`);
  }

  const totalAvailable = Number(firstPage.json?.TotalRecordAvailable) || 0;
  const findMatch = (rows) => rows.find((row) => normalizeEmail(row?.EmailAddress) === normalized);

  let matched = findMatch(readResults(firstPage.json)) || null;
  for (let skip = pageSize; skip < totalAvailable && !matched; skip += pageSize) {
    const page = await fetchJsonWithRetry(
      `${baseUrl}/api/contacts?$skip=${skip}&$top=${pageSize}&$orderby=ContactId`,
      { method: "GET", headers: getApiHeaders(apiKey) },
      timeoutMs,
    );
    if (!page.response.ok) break;
    matched = findMatch(readResults(page.json)) || null;
  }

  if (!matched) return null;
  return {
    contactId: matched?.ContactId ?? null,
    email: matched?.EmailAddress ?? null,
    name: matched?.Name ?? matched?.ContactName ?? null,
  };
}

export async function getContactCertifications(contactId, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const { baseUrl, apiKey } = getGrowthzoneConfig();
  const response = await fetchJsonWithRetry(
    `${baseUrl}/api/ContactOverview/${contactId}/Certifications/`,
    { method: "GET", headers: getApiHeaders(apiKey) },
    timeoutMs,
  );
  if (!response.response.ok) {
    throw new Error(`Failed to load contact certifications (${response.response.status}).`);
  }

  return readResults(response.json).map((item) => ({
    certificationContactId: item?.CertificationContactId ?? null,
    certificationTypeId: item?.CertificationTypeId ?? null,
    certificationName: item?.CertificationName ?? item?.Name ?? "",
    status: item?.Status ?? null,
    statusText: item?.StatusText ?? "",
  }));
}

function findEnrollmentForType(rows, certificationTypeId) {
  return (
    rows.find((row) => Number(row.certificationTypeId) === Number(certificationTypeId)) || null
  );
}

function getEnrollmentFromWriteResponse(json, certificationTypeId, contactId) {
  if (!json || typeof json !== "object") return null;

  const directTypeId = Number(json.CertificationTypeId);
  const hasDirectContactId = Number.isFinite(Number(json.ContactId)) && Number(json.ContactId) > 0;
  const directContactId = hasDirectContactId ? Number(json.ContactId) : null;
  const directCertificationContactId = Number(json.CertificationContactId);
  if (
    Number.isFinite(directCertificationContactId) &&
    directCertificationContactId > 0 &&
    directTypeId === Number(certificationTypeId) &&
    (!hasDirectContactId || directContactId === Number(contactId))
  ) {
    return {
      certificationContactId: directCertificationContactId,
      certificationTypeId: directTypeId,
      contactId: directContactId,
    };
  }

  const rows = readResults(json);
  const found =
    rows.find(
      (row) =>
        Number(row?.CertificationContactId) > 0 &&
        Number(row?.CertificationTypeId) === Number(certificationTypeId) &&
        Number(row?.ContactId) === Number(contactId),
    ) || null;
  if (!found) return null;

  return {
    certificationContactId: Number(found.CertificationContactId),
    certificationTypeId: Number(found.CertificationTypeId),
    contactId: Number(found.ContactId),
  };
}

function buildAdminStyleEnrollmentPayload({ contactId, contactName, certificationTypeId }) {
  const saleableItemId =
    Number(process.env.GROWTHZONE_CERTIFICATION_SALEABLE_ITEM_ID || DEFAULT_CERTIFICATION_SALEABLE_ITEM_ID) ||
    DEFAULT_CERTIFICATION_SALEABLE_ITEM_ID;
  const saleableItemName =
    String(process.env.GROWTHZONE_CERTIFICATION_SALEABLE_ITEM_NAME || DEFAULT_CERTIFICATION_SALEABLE_ITEM_NAME).trim() ||
    DEFAULT_CERTIFICATION_SALEABLE_ITEM_NAME;
  const feeDescription =
    String(process.env.GROWTHZONE_CERTIFICATION_FEE_DESCRIPTION || DEFAULT_CERTIFICATION_FEE_DESCRIPTION).trim() ||
    DEFAULT_CERTIFICATION_FEE_DESCRIPTION;
  const statusId =
    Number(process.env.GROWTHZONE_CERTIFICATION_STATUS_ID || DEFAULT_CERTIFICATION_STATUS_ID) ||
    DEFAULT_CERTIFICATION_STATUS_ID;

  return {
    CertificationContactId: 0,
    AuditId: 0,
    CertificationTypeId: Number(certificationTypeId),
    CertificationTypeName: "",
    ContactId: Number(contactId),
    ContactName: contactName || "",
    SystemCertificationStatusId: statusId,
    CertificationStartDate: new Date().toISOString(),
    CompletedDate: null,
    ExpirationDate: null,
    Fee: {
      SaleableItemId: saleableItemId,
      SaleableItemName: saleableItemName,
      Description: feeDescription,
      Price: 0,
      TaxAmount: 0,
    },
    Invoice: {
      PrintInvoice: false,
      EmailInvoice: false,
      BillingContactId: null,
      BillingAddressId: null,
      BillingEmailId: null,
      TermId: null,
      InvoiceMessage: "",
    },
    Percentage: "",
    HoursEarned: 0,
    CreditsEarned: 0,
    CertItems: [],
    Files: [],
    PercentComplete: 0,
    forceSave: false,
    AllowInvoicing: false,
    ShouldTrackCertificateCompletion: false,
    ExtraOptions: "",
  };
}

function enrollmentEndpointCandidates(contact, certificationTypeId) {
  return [
    {
      path: "/api/certifications/contacts/0/",
      payloads: () => [
        buildAdminStyleEnrollmentPayload({
          contactId: contact.contactId,
          contactName: contact.name,
          certificationTypeId,
        }),
      ],
    },
    {
      path: "/api/certifications/contacts/",
      payloads: () => [
        { ContactId: contact.contactId, CertificationTypeId: certificationTypeId },
        { ContactId: contact.contactId, CertificationTypeId: certificationTypeId, IsActive: true },
      ],
    },
    {
      path: "/api/certifications/contacts",
      payloads: () => [{ ContactId: contact.contactId, CertificationTypeId: certificationTypeId }],
    },
    {
      path: "/api/mic/certificationcontact",
      payloads: () => [
        { contactId: contact.contactId, certificationTypeId },
        { ContactId: contact.contactId, CertificationTypeId: certificationTypeId },
      ],
    },
    {
      path: "/api/mic/certificationcontactactivity",
      payloads: () => [
        { contactId: contact.contactId, certificationTypeId },
        { ContactId: contact.contactId, CertificationTypeId: certificationTypeId },
      ],
    },
  ];
}

export async function discoverGrowthzoneEnrollment({
  email,
  certificationTypeId,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  allowWriteProbe = false,
}) {
  const normalizedEmail = normalizeEmail(email);
  const typeId = Number(certificationTypeId);
  if (!normalizedEmail || !Number.isFinite(typeId) || typeId <= 0) {
    throw new Error("email and certificationTypeId are required for discovery.");
  }

  const { baseUrl, apiKey } = getGrowthzoneConfig();
  const contact = await findGrowthzoneContactByEmail(normalizedEmail, timeoutMs);
  if (!contact?.contactId) {
    return {
      ok: false,
      message: "No GrowthZone contact found for email.",
      contact: null,
      attempts: [],
      alreadyEnrolled: false,
      endpointConfirmed: false,
    };
  }

  const before = await getContactCertifications(contact.contactId, timeoutMs);
  const existing = findEnrollmentForType(before, typeId);
  if (existing) {
    return {
      ok: true,
      message: "Contact is already enrolled for this certification type.",
      contact,
      alreadyEnrolled: true,
      endpointConfirmed: false,
      certificationContactId: existing.certificationContactId,
      attempts: [],
    };
  }

  const attempts = [];
  const candidates = enrollmentEndpointCandidates(contact, typeId);
  for (const candidate of candidates) {
    for (const payload of candidate.payloads()) {
      if (!allowWriteProbe) {
        attempts.push({
          endpoint: candidate.path,
          payload,
          skipped: true,
          reason: "allowWriteProbe=false",
        });
        continue;
      }

      const writeRes = await fetchJsonWithRetry(
        `${baseUrl}${candidate.path}`,
        {
          method: "POST",
          headers: getApiHeaders(apiKey),
          body: JSON.stringify(payload),
        },
        timeoutMs,
      );

      const result = {
        endpoint: candidate.path,
        payload,
        status: writeRes.response.status,
        ok: writeRes.response.ok,
        preview: writeRes.text.slice(0, 220),
      };
      attempts.push(result);

      if (!writeRes.response.ok) continue;

      const writeCreated = getEnrollmentFromWriteResponse(writeRes.json, typeId, contact.contactId);
      if (writeCreated) {
        return {
          ok: true,
          message: "Enrollment confirmed by write response payload.",
          contact,
          alreadyEnrolled: false,
          endpointConfirmed: true,
          endpointUsed: candidate.path,
          certificationContactId: writeCreated.certificationContactId,
          attempts,
        };
      }

      const after = await getContactCertifications(contact.contactId, timeoutMs);
      const enrolled = findEnrollmentForType(after, typeId);
      if (enrolled) {
        return {
          ok: true,
          message: "Enrollment endpoint confirmed by observed certification row.",
          contact,
          alreadyEnrolled: false,
          endpointConfirmed: true,
          endpointUsed: candidate.path,
          certificationContactId: enrolled.certificationContactId,
          attempts,
        };
      }
    }
  }

  return {
    ok: false,
    message: "Unable to confirm enrollment endpoint for this tenant.",
    contact,
    alreadyEnrolled: false,
    endpointConfirmed: false,
    attempts,
  };
}

export async function enrollGrowthzoneContactInCertification({
  email,
  certificationTypeId,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  dryRun = false,
}) {
  const normalizedEmail = normalizeEmail(email);
  const typeId = Number(certificationTypeId);
  if (!normalizedEmail || !Number.isFinite(typeId) || typeId <= 0) {
    throw new Error("email and certificationTypeId are required.");
  }

  logGz("enrollment.started", {
    email: maskEmail(normalizedEmail),
    certificationTypeId: typeId,
    dryRun,
  });

  const discovery = await discoverGrowthzoneEnrollment({
    email: normalizedEmail,
    certificationTypeId: typeId,
    timeoutMs,
    allowWriteProbe: !dryRun,
  });

  if (discovery.alreadyEnrolled) {
    logGz("enrollment.skipped.already-enrolled", {
      email: maskEmail(normalizedEmail),
      certificationTypeId: typeId,
      certificationContactId: discovery.certificationContactId || null,
    });
    return {
      ok: true,
      alreadyEnrolled: true,
      contactId: discovery.contact?.contactId || null,
      certificationContactId: discovery.certificationContactId || null,
      endpointUsed: discovery.endpointUsed || null,
      attempts: discovery.attempts || [],
    };
  }

  if (!discovery.ok) {
    logGz("enrollment.failed", {
      email: maskEmail(normalizedEmail),
      certificationTypeId: typeId,
      reason: discovery.message,
    });
    return {
      ok: false,
      alreadyEnrolled: false,
      contactId: discovery.contact?.contactId || null,
      certificationContactId: null,
      endpointUsed: null,
      attempts: discovery.attempts || [],
      error: discovery.message,
    };
  }

  logGz("enrollment.succeeded", {
    email: maskEmail(normalizedEmail),
    certificationTypeId: typeId,
    contactId: discovery.contact?.contactId || null,
    certificationContactId: discovery.certificationContactId || null,
    endpointUsed: discovery.endpointUsed || null,
  });

  return {
    ok: true,
    alreadyEnrolled: false,
    contactId: discovery.contact?.contactId || null,
    certificationContactId: discovery.certificationContactId || null,
    endpointUsed: discovery.endpointUsed || null,
    attempts: discovery.attempts || [],
  };
}

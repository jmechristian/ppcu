/**
 * Marks a single GrowthZone certification component (module/course) complete for a
 * given certificationContactId, using the certification progress/saveprogress flow.
 *
 * GrowthZone tracks completion at the component level. We GET the progress model,
 * find the target component (by name, with id fallback), flip it to Completed, then
 * POST the full model back to saveprogress and verify. Idempotent: if the component
 * is already complete we skip the write.
 */

const DEFAULT_TIMEOUT_MS = 10000;

function trimSlash(value) {
  if (!value) return "";
  return String(value).replace(/\/+$/, "");
}

function clean(value) {
  return String(value || "").trim();
}

function normalizeName(value) {
  return clean(value).toLowerCase();
}

function getApiHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    Authorization: `ApiKey ${apiKey}`,
  };
}

function getGrowthzoneConfig() {
  const baseUrl = trimSlash(process.env.GROWTHZONE_BASE_URL);
  const apiKey = clean(process.env.GROWTHZONE_API_KEY);
  if (!baseUrl || !apiKey) {
    throw new Error("Missing GrowthZone configuration.");
  }
  return { baseUrl, apiKey };
}

async function requestWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, options, timeoutMs) {
  const response = await requestWithTimeout(url, options, timeoutMs);
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { response, text, json };
}

function findComponent(items, { componentName, componentId }) {
  const targetName = normalizeName(componentName);
  const targetId = Number(componentId);
  return (
    items.find((item) => {
      if (Number.isFinite(targetId) && targetId > 0 && Number(item?.CertificationComponentId) === targetId) {
        return true;
      }
      if (targetName && normalizeName(item?.Name) === targetName) return true;
      return false;
    }) || null
  );
}

/**
 * @param {object} args
 * @param {number} args.certificationContactId
 * @param {string} [args.componentName] - GrowthZone component Name to match (preferred).
 * @param {number} [args.componentId]   - GrowthZone CertificationComponentId fallback.
 * @returns {Promise<{ok: boolean, alreadyComplete: boolean, changed: boolean, certificationComponentId: number|null, error?: string, status?: number, retryable?: boolean}>}
 */
export async function markCertificationComponentCompleteByName({
  certificationContactId,
  componentName,
  componentId,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const ccId = Number(certificationContactId);
  if (!Number.isFinite(ccId) || ccId <= 0) {
    return { ok: false, alreadyComplete: false, changed: false, certificationComponentId: null, error: "certificationContactId is required.", retryable: false };
  }
  if (!clean(componentName) && !(Number(componentId) > 0)) {
    return { ok: false, alreadyComplete: false, changed: false, certificationComponentId: null, error: "componentName or componentId is required.", retryable: false };
  }

  const { baseUrl, apiKey } = getGrowthzoneConfig();
  const progressUrl = `${baseUrl}/api/certifications/progress/${ccId}/?$skip=0&$top=80`;
  const saveUrl = `${baseUrl}/api/certifications/saveprogress/${ccId}/`;
  const nowIso = new Date().toISOString();

  const progressRes = await fetchJson(progressUrl, { method: "GET", headers: getApiHeaders(apiKey) }, timeoutMs);
  if (!progressRes.response.ok || !progressRes.json || typeof progressRes.json !== "object") {
    const status = progressRes.response.status || 500;
    return {
      ok: false,
      alreadyComplete: false,
      changed: false,
      certificationComponentId: null,
      error: `Failed to load progress model (${status}).`,
      status,
      retryable: status === 429 || status >= 500,
    };
  }

  const model = progressRes.json;
  const items = Array.isArray(model.ListViewItems) ? model.ListViewItems : [];
  const target = findComponent(items, { componentName, componentId });
  if (!target) {
    return {
      ok: false,
      alreadyComplete: false,
      changed: false,
      certificationComponentId: null,
      error: `Component not found in progress model (name="${clean(componentName)}", id=${componentId || "n/a"}).`,
      retryable: false,
    };
  }

  const resolvedComponentId = Number(target.CertificationComponentId) || null;

  if (target.Completed === true) {
    return { ok: true, alreadyComplete: true, changed: false, certificationComponentId: resolvedComponentId };
  }

  const updatedItem = { ...target, Completed: true, CompletedChanged: true, ActivityDate: nowIso };
  const updatedItems = items.map((item) =>
    Number(item?.CertificationComponentId) === resolvedComponentId ? updatedItem : item,
  );
  const updatedModel = { ...model, forceSave: false, ListViewItems: updatedItems };
  const savePayload = { ListViewPages: { 0: updatedModel }, ...updatedModel };

  const saveRes = await fetchJson(
    saveUrl,
    { method: "POST", headers: getApiHeaders(apiKey), body: JSON.stringify(savePayload) },
    timeoutMs,
  );

  if (!saveRes.response.ok) {
    const status = saveRes.response.status || 500;
    return {
      ok: false,
      alreadyComplete: false,
      changed: false,
      certificationComponentId: resolvedComponentId,
      error: `saveprogress failed (${status}).`,
      status,
      retryable: status === 429 || status >= 500,
    };
  }

  return {
    ok: true,
    alreadyComplete: false,
    changed: true,
    certificationComponentId: resolvedComponentId,
  };
}

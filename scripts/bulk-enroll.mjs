#!/usr/bin/env node
/**
 * Bulk-enroll learners (exported from their old LMS) into Thinkific
 * (user create/find, PPCU group, bundle enroll) by reusing the app's
 * background enroll endpoint so behavior is identical to the admin UI.
 *
 * Thinkific-only by default. GrowthZone certification enrollment is opt-in
 * via --growthzone (we'll sync GrowthZone later). When enabled, GrowthZone
 * notification emails are suppressed via a setting in the GrowthZone admin.
 *
 * Usage:
 *   node scripts/bulk-enroll.mjs <csv-path> [flags]
 *
 * Flags:
 *   --commit                Actually enroll. Without this, runs a dry run (no writes).
 *   --growthzone            Also enroll in the GrowthZone certification (off by default).
 *   --base-url=<url>        App base URL (default http://localhost:3000).
 *   --limit=<n>            Only process the first n unique learners.
 *   --only=<emails>        Comma-separated emails to process (others skipped).
 *   --delay=<ms>          Delay between requests (default 750).
 *   --out=<path>          Results CSV path (default scripts/bulk-enroll-results.csv).
 *
 * Examples:
 *   node scripts/bulk-enroll.mjs ~/Desktop/progress-report.csv
 *   node scripts/bulk-enroll.mjs ~/Desktop/progress-report.csv --only=julie@packagingschool.com --commit
 *   node scripts/bulk-enroll.mjs ~/Desktop/progress-report.csv --commit
 */

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const args = { _: [] };
  for (const raw of argv.slice(2)) {
    if (raw.startsWith("--")) {
      const [key, ...rest] = raw.slice(2).split("=");
      args[key] = rest.length ? rest.join("=") : true;
    } else {
      args._.push(raw);
    }
  }
  return args;
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Minimal RFC-4180-ish CSV parser supporting quoted fields and embedded commas/newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // ignore; handled by \n
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

function clean(value) {
  return String(value || "").trim();
}

async function main() {
  const args = parseArgs(process.argv);
  const csvPath = args._[0];
  if (!csvPath) {
    console.error("Error: provide a CSV path.\n  node scripts/bulk-enroll.mjs <csv-path> [--commit]");
    process.exit(1);
  }

  const resolvedCsv = path.resolve(csvPath.replace(/^~/, process.env.HOME || ""));
  if (!fs.existsSync(resolvedCsv)) {
    console.error(`Error: CSV not found at ${resolvedCsv}`);
    process.exit(1);
  }

  const commit = Boolean(args.commit);
  const withGrowthzone = Boolean(args.growthzone);
  const baseUrl = (args["base-url"] || "http://localhost:3000").replace(/\/+$/, "");
  const delayMs = Number(args.delay) || 750;
  const limit = args.limit ? Number(args.limit) : null;
  const onlySet = args.only
    ? new Set(String(args.only).split(",").map((e) => e.trim().toLowerCase()).filter(Boolean))
    : null;
  const outPath = path.resolve(args.out || "scripts/bulk-enroll-results.csv");

  const text = fs.readFileSync(resolvedCsv, "utf8");
  const rows = parseCsv(text);
  if (rows.length < 2) {
    console.error("Error: CSV has no data rows.");
    process.exit(1);
  }

  const header = rows[0].map((h) => clean(h).toLowerCase());
  const idxFirst = header.indexOf("first name");
  const idxLast = header.indexOf("last name");
  const idxEmail = header.indexOf("email");
  if (idxFirst === -1 || idxLast === -1 || idxEmail === -1) {
    console.error(
      `Error: CSV must have "First Name", "Last Name", "Email" columns. Found: ${header.join(", ")}`,
    );
    process.exit(1);
  }

  const seen = new Map();
  const learners = [];
  const skipped = [];
  for (let i = 1; i < rows.length; i += 1) {
    const r = rows[i];
    const firstName = decodeEntities(clean(r[idxFirst]));
    const lastName = decodeEntities(clean(r[idxLast]));
    const email = clean(r[idxEmail]).toLowerCase();
    if (!email || !email.includes("@") || !firstName || !lastName) {
      skipped.push({ line: i + 1, firstName, lastName, email, reason: "missing name/email" });
      continue;
    }
    if (onlySet && !onlySet.has(email)) continue;
    if (seen.has(email)) {
      skipped.push({ line: i + 1, firstName, lastName, email, reason: `duplicate of line ${seen.get(email)}` });
      continue;
    }
    seen.set(email, i + 1);
    learners.push({ firstName, lastName, email });
  }

  const targets = limit ? learners.slice(0, limit) : learners;

  console.log("=".repeat(72));
  console.log(`Bulk enroll  |  mode: ${commit ? "COMMIT (writes)" : "DRY RUN (no writes)"}`);
  console.log(`Target:      Thinkific${withGrowthzone ? " + GrowthZone certification" : " only (GrowthZone skipped)"}`);
  console.log(`CSV:         ${resolvedCsv}`);
  console.log(`Endpoint:    ${baseUrl}/api/thinkific/enroll  (mode=background)`);
  console.log(`Unique learners: ${learners.length}  |  processing: ${targets.length}  |  skipped: ${skipped.length}`);
  console.log("=".repeat(72));

  if (skipped.length) {
    console.log("\nSkipped rows:");
    for (const s of skipped) {
      console.log(`  line ${s.line}: ${s.firstName} ${s.lastName} <${s.email || "no-email"}> — ${s.reason}`);
    }
  }

  if (!commit) {
    console.log("\nWould enroll (dry run):");
    targets.forEach((t, n) => {
      console.log(`  ${String(n + 1).padStart(3)}. ${t.firstName} ${t.lastName} <${t.email}>`);
    });
    console.log("\nDry run complete. Re-run with --commit to perform enrollments.");
    return;
  }

  const results = [];
  for (let n = 0; n < targets.length; n += 1) {
    const t = targets[n];
    const label = `${String(n + 1).padStart(3)}/${targets.length} ${t.email}`;
    try {
      const res = await fetch(`${baseUrl}/api/thinkific/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: t.email,
          first_name: t.firstName,
          last_name: t.lastName,
          mode: "background",
          trigger_growthzone_enrollment: withGrowthzone,
        }),
      });
      const json = await res.json().catch(() => ({}));
      const ok = res.ok && json?.message === "success";
      const summary = ok
        ? `OK  (userCreated=${json.userCreated} bundleAlready=${json.bundleAlreadyEnrolled} groupAlready=${json.groupAlreadyMember})`
        : `FAIL [${res.status}] ${json?.error || "unknown error"}`;
      console.log(`  ${label} -> ${summary}`);
      results.push({
        ...t,
        status: ok ? "success" : "error",
        httpStatus: res.status,
        userId: json?.userId || "",
        userCreated: json?.userCreated ?? "",
        bundleAlreadyEnrolled: json?.bundleAlreadyEnrolled ?? "",
        groupAlreadyMember: json?.groupAlreadyMember ?? "",
        error: ok ? "" : json?.error || "unknown error",
      });
    } catch (err) {
      console.log(`  ${label} -> FAIL (request error) ${err?.message || err}`);
      results.push({ ...t, status: "error", httpStatus: "", error: err?.message || String(err) });
    }
    if (n < targets.length - 1 && delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  const cols = [
    "email",
    "firstName",
    "lastName",
    "status",
    "httpStatus",
    "userId",
    "userCreated",
    "bundleAlreadyEnrolled",
    "groupAlreadyMember",
    "error",
  ];
  const csvOut = [
    cols.join(","),
    ...results.map((r) =>
      cols
        .map((c) => {
          const v = r[c] ?? "";
          const s = String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    ),
  ].join("\n");
  fs.writeFileSync(outPath, csvOut);

  const okCount = results.filter((r) => r.status === "success").length;
  const failCount = results.length - okCount;
  console.log("\n" + "=".repeat(72));
  console.log(`Done.  success: ${okCount}  |  failed: ${failCount}`);
  console.log(`Results written to: ${outPath}`);
  console.log("=".repeat(72));
  if (failCount) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

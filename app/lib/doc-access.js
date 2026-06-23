// Non-staff people who are allowed to view the staff documentation (e.g. shareholders).
// This list is intentionally simple/hardcoded. Emails are matched case-insensitively.
export const DOC_ALLOWLIST = [
  "drew@packagingschool.com",
  "julie@packagingschool.com",
].map((email) => email.trim().toLowerCase());

export function isStaffRole(type) {
  const roleType = String(type || "").trim();
  return /primary/i.test(roleType) || /staff/i.test(roleType);
}

// Who can view the staff documentation: any staff/admin role, or an allowlisted email.
export function canViewDocs(profile) {
  if (!profile) return false;
  if (isStaffRole(profile.type)) return true;
  const email = String(profile.email || "").trim().toLowerCase();
  return Boolean(email) && DOC_ALLOWLIST.includes(email);
}

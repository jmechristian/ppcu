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

// Stricter than isStaffRole: only matches actual internal PPC staff, not "Primary"
// business contacts (who still need an active membership like anyone else).
export function isInternalStaff(type) {
  return /staff/i.test(String(type || "").trim());
}

// Who can view the staff documentation: internal PPC staff only, or an allowlisted
// email. Deliberately uses isInternalStaff (not isStaffRole) so "Primary" business
// contacts - who get admin panel access but are not internal staff - don't see it.
export function canViewDocs(profile) {
  if (!profile) return false;
  if (isInternalStaff(profile.type)) return true;
  const email = String(profile.email || "").trim().toLowerCase();
  return Boolean(email) && DOC_ALLOWLIST.includes(email);
}

import { NextResponse } from "next/server";
import {
  fetchAllContacts,
  fetchContactOverview,
  isStaffContactType,
  resolveGrowthzoneRole,
  splitNameParts,
} from "@/app/lib/growthzone-api";

const MAX_RESULTS = 25;

export async function GET(request) {
  const session = await resolveGrowthzoneRole(request);
  if (!session.ok) {
    if (session.connected === false) {
      return NextResponse.json({ connected: false }, { status: 200 });
    }
    return NextResponse.json(
      { connected: false, message: session.error || "Unable to resolve session." },
      { status: session.status || 500 },
    );
  }

  if (!isStaffContactType(session.roleType)) {
    return NextResponse.json({ connected: true, allowed: false, results: [] }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") || "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json({ connected: true, allowed: true, results: [], query: q });
  }

  const allContacts = await fetchAllContacts(session.baseUrl, session.apiKey);
  const matches = allContacts
    .filter((contact) => {
      const haystack = [contact.name, contact.company, contact.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, MAX_RESULTS);

  const results = await Promise.all(
    matches.map(async (contact) => {
      let email = contact.email || "";
      let name = contact.name || "";
      if (!email) {
        const overview = await fetchContactOverview(
          session.baseUrl,
          session.apiKey,
          contact.contactId,
        );
        if (overview) {
          email = overview.email || "";
          if (!name) name = overview.name || "";
        }
      }

      const parts = splitNameParts(name);
      return {
        contactId: contact.contactId,
        name,
        firstName: parts.firstName,
        lastName: parts.lastName,
        company: contact.company || "",
        email,
        type: contact.type || "",
        systemContactTypeId: contact.systemContactTypeId,
      };
    }),
  );

  return NextResponse.json({ connected: true, allowed: true, results, query: q });
}

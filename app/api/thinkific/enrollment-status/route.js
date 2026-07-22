import { NextResponse } from "next/server";
import { fetchBundleProgressByEmail, getPpcuBundleId } from "@/app/lib/thinkific-enrollments";

function clean(value) {
  return String(value || "").trim();
}

function getThinkificRestCreds() {
  return {
    restApiKey: clean(process.env.THINKIFIC_REST_API_KEY || process.env.NEXT_THINKIFIC_API_KEY),
    subdomain: clean(process.env.THINKIFIC_SUBDOMAIN || process.env.NEXT_THINKIFIC_SUBDOMAIN),
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = clean(searchParams.get("email")).toLowerCase();
    if (!email) {
      return NextResponse.json({ enrolled: false, error: "email query param is required." }, { status: 400 });
    }

    const { restApiKey, subdomain } = getThinkificRestCreds();
    if (!restApiKey || !subdomain) {
      return NextResponse.json({ enrolled: false, error: "Missing Thinkific REST credentials." }, { status: 500 });
    }

    const progress = await fetchBundleProgressByEmail({
      email,
      bundleId: getPpcuBundleId(),
      restApiKey,
      subdomain,
    });

    return NextResponse.json({ enrolled: Boolean(progress?.enrolled) });
  } catch (error) {
    return NextResponse.json(
      { enrolled: false, error: error?.message || "Internal server error." },
      { status: 500 },
    );
  }
}

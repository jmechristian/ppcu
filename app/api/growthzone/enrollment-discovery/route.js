import { NextResponse } from "next/server";
import { discoverGrowthzoneEnrollment } from "../../../lib/growthzone-ce-enrollment";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = String(searchParams.get("email") || "").trim();
    const certificationTypeId = Number(searchParams.get("certificationTypeId"));
    const timeoutMs = Number(searchParams.get("timeoutMs")) || 10000;
    const probeWrite = String(searchParams.get("probeWrite") || "").toLowerCase() === "true";
    const allowProbeEnv = String(process.env.GROWTHZONE_ALLOW_WRITE_PROBE || "").toLowerCase() === "true";
    const allowWriteProbe = probeWrite && allowProbeEnv;

    if (!email || !Number.isFinite(certificationTypeId) || certificationTypeId <= 0) {
      return NextResponse.json(
        { ok: false, message: "email and certificationTypeId query params are required." },
        { status: 400 },
      );
    }

    const result = await discoverGrowthzoneEnrollment({
      email,
      certificationTypeId,
      timeoutMs,
      allowWriteProbe,
    });

    return NextResponse.json({
      ok: result.ok,
      checkedAt: new Date().toISOString(),
      allowWriteProbe,
      note:
        probeWrite && !allowProbeEnv
          ? "probeWrite requested but disabled. Set GROWTHZONE_ALLOW_WRITE_PROBE=true to enable."
          : undefined,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Discovery failed." },
      { status: 500 },
    );
  }
}

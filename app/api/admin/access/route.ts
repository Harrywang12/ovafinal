import { NextResponse } from "next/server";
import { getRequestIdentity, isAdminEmail } from "../../../../lib/admin";

export async function GET(request: Request) {
  const identity = await getRequestIdentity(request);
  if (!identity.ok) {
    return NextResponse.json({ error: identity.error }, { status: identity.status });
  }

  return NextResponse.json({
    isAdmin: await isAdminEmail(identity.email),
    email: identity.email,
  });
}

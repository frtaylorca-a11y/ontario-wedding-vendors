import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
}

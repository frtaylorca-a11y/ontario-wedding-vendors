import { NextResponse } from "next/server";
import { z } from "zod";
import { requestMagicLink, type MagicLinkIntent } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/auth-email";
import { readPlanSessionId } from "@/lib/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email:       z.string().email().max(255),
  callbackUrl: z.string().max(500).default("/plan"),
  intent:      z.enum([
    "save-shortlist",
    "save-budget",
    "publish-website",
    "sign-in",
  ]).default("sign-in"),
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: "invalid request", detail: err instanceof Error ? err.message : "" },
      { status: 400 },
    );
  }

  /* Only allow same-origin callback paths — never an external URL. */
  const callbackUrl = parsed.callbackUrl.startsWith("/")
    ? parsed.callbackUrl
    : "/plan";

  const sessionId = await readPlanSessionId();

  const { token } = await requestMagicLink({
    email:       parsed.email,
    callbackUrl,
    intent:      parsed.intent as MagicLinkIntent,
    sessionId,
  });

  const sendResult = await sendMagicLinkEmail({
    email:  parsed.email,
    token,
    intent: parsed.intent as MagicLinkIntent,
  });

  /* Don't disclose send failures to the client — same response either
   * way. Server logs carry the failure reason for ops. */
  if (!sendResult.sent) {
    console.warn(`[auth] magic-link send failed for ${parsed.email}: ${sendResult.reason}`);
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { blogPosts } from "@/lib/schema";
import { isAdminAuthorized } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["unpublish", "publish", "delete"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id, 10);
  if (!Number.isFinite(postId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let raw: unknown;
  try { raw = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const [post] = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(eq(blogPosts.id, postId))
    .limit(1);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  if (parsed.data.action === "unpublish") {
    await db
      .update(blogPosts)
      .set({ isPublished: false, updatedAt: new Date() })
      .where(eq(blogPosts.id, postId));
    return NextResponse.json({ ok: true, status: "unpublished" });
  }
  if (parsed.data.action === "publish") {
    await db
      .update(blogPosts)
      .set({
        isPublished: true,
        publishedAt: new Date(),
        updatedAt:   new Date(),
      })
      .where(eq(blogPosts.id, postId));
    return NextResponse.json({ ok: true, status: "published" });
  }
  /* delete — hard delete is destructive but acceptable for AI-generated
   * drafts. The user explicitly clicked the button. */
  await db.delete(blogPosts).where(eq(blogPosts.id, postId));
  return NextResponse.json({ ok: true, status: "deleted" });
}

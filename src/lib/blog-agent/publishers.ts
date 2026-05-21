/**
 * Cross-platform publishers — GBP, Meta (Instagram + Facebook),
 * Pinterest. Each module returns a uniform PublishResult so the
 * caller can persist a content_distribution_log row consistently.
 *
 * Design rule: missing credentials never fail the agent. A module
 * with no creds returns { status: 'skipped', reason: '<env var> missing' }
 * — the agent logs that and continues.
 */
import type { AdaptedContent } from "./adapter";

export type PublishResult = {
  platform:        string;
  status:          "published" | "skipped" | "failed";
  platformPostId?: string;
  reason?:         string;
};

/* ─── Google Business Profile ───────────────────────────────────── */

/* GBP requires OAuth — we use the standard refresh-token flow. The
 * access_token endpoint exchanges (refresh_token, client_id, client_secret)
 * → a 1-hour access token. We do this on every publish since this is a
 * once-or-twice-a-day cron, not a hot path. */
async function gbpAccessToken(): Promise<string | null> {
  const cid   = process.env.GBP_CLIENT_ID;
  const csec  = process.env.GBP_CLIENT_SECRET;
  const rtok  = process.env.GBP_REFRESH_TOKEN;
  if (!cid || !csec || !rtok) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     cid,
      client_secret: csec,
      refresh_token: rtok,
      grant_type:    "refresh_token",
    }).toString(),
  });
  if (!res.ok) {
    throw new Error(`GBP token exchange failed: ${res.status} ${await res.text().catch(() => "")}`);
  }
  const j = (await res.json()) as { access_token?: string };
  return j.access_token ?? null;
}

export async function publishToGbp(opts: {
  postUrl: string;
  adapted: AdaptedContent;
  heroImageUrl: string | null;
}): Promise<PublishResult> {
  const accountId  = process.env.GBP_ACCOUNT_ID;
  const locationId = process.env.GBP_LOCATION_ID;
  if (!accountId || !locationId) {
    return { platform: "gbp", status: "skipped", reason: "GBP_ACCOUNT_ID/GBP_LOCATION_ID missing" };
  }

  let token: string | null;
  try { token = await gbpAccessToken(); }
  catch (err) {
    return { platform: "gbp", status: "failed", reason: err instanceof Error ? err.message : String(err) };
  }
  if (!token) {
    return { platform: "gbp", status: "skipped", reason: "GBP OAuth env vars missing" };
  }

  const url = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;
  const payload: Record<string, unknown> = {
    languageCode: "en-CA",
    summary:      opts.adapted.gbp.text,
    callToAction: {
      actionType: opts.adapted.gbp.callToAction.actionType,
      url:        opts.adapted.gbp.callToAction.url,
    },
    topicType:    "STANDARD",
  };
  if (opts.heroImageUrl) {
    payload.media = [{ mediaFormat: "PHOTO", sourceUrl: opts.heroImageUrl }];
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    return { platform: "gbp", status: "failed", reason: `${res.status} ${await res.text().catch(() => "")}` };
  }
  const j = (await res.json()) as { name?: string };
  return { platform: "gbp", status: "published", platformPostId: j.name };
}

/* ─── Meta Graph (Instagram + Facebook) ─────────────────────────── */

/* IG single-image publish is a two-step container flow:
 *   1. POST /{ig-user-id}/media         → container id
 *   2. POST /{ig-user-id}/media_publish → live post id
 * The hero image MUST be reachable by Meta's crawler — we pass the R2
 * public URL directly, which works because the bucket is public. */
export async function publishToInstagram(opts: {
  caption:      string;
  hashtags:     string[];
  heroImageUrl: string | null;
}): Promise<PublishResult> {
  const token = process.env.META_ACCESS_TOKEN;
  const igId  = process.env.META_IG_USER_ID;
  if (!token || !igId) {
    return { platform: "instagram", status: "skipped", reason: "META_ACCESS_TOKEN/META_IG_USER_ID missing" };
  }
  if (!opts.heroImageUrl) {
    return { platform: "instagram", status: "skipped", reason: "No hero image to attach" };
  }

  const fullCaption = `${opts.caption}\n\n${opts.hashtags.join(" ")}`;

  /* Step 1 — container. */
  const containerRes = await fetch(
    `https://graph.facebook.com/v18.0/${igId}/media`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        image_url:    opts.heroImageUrl,
        caption:      fullCaption,
        access_token: token,
      }).toString(),
    },
  );
  if (!containerRes.ok) {
    return { platform: "instagram", status: "failed", reason: `container: ${containerRes.status} ${await containerRes.text().catch(() => "")}` };
  }
  const containerJson = (await containerRes.json()) as { id?: string };
  if (!containerJson.id) {
    return { platform: "instagram", status: "failed", reason: "container returned no id" };
  }

  /* Step 2 — publish. */
  const publishRes = await fetch(
    `https://graph.facebook.com/v18.0/${igId}/media_publish`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        creation_id:  containerJson.id,
        access_token: token,
      }).toString(),
    },
  );
  if (!publishRes.ok) {
    return { platform: "instagram", status: "failed", reason: `publish: ${publishRes.status} ${await publishRes.text().catch(() => "")}` };
  }
  const publishJson = (await publishRes.json()) as { id?: string };
  return { platform: "instagram", status: "published", platformPostId: publishJson.id };
}

export async function publishToFacebook(opts: {
  text: string;
  postUrl: string;
  heroImageUrl: string | null;
}): Promise<PublishResult> {
  const token  = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.META_PAGE_ID;
  if (!token || !pageId) {
    return { platform: "facebook", status: "skipped", reason: "META_ACCESS_TOKEN/META_PAGE_ID missing" };
  }

  /* Use the /photos endpoint with link param when we have an image,
   * /feed otherwise. */
  const endpoint = opts.heroImageUrl
    ? `https://graph.facebook.com/v18.0/${pageId}/photos`
    : `https://graph.facebook.com/v18.0/${pageId}/feed`;

  const body = new URLSearchParams({
    message:      `${opts.text}\n\n${opts.postUrl}`,
    access_token: token,
  });
  if (opts.heroImageUrl) body.set("url", opts.heroImageUrl);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    return { platform: "facebook", status: "failed", reason: `${res.status} ${await res.text().catch(() => "")}` };
  }
  const j = (await res.json()) as { id?: string; post_id?: string };
  return { platform: "facebook", status: "published", platformPostId: j.post_id ?? j.id };
}

/* ─── Pinterest v5 ──────────────────────────────────────────────── */

/* PINTEREST_BOARD_IDS is a JSON map: { "Ontario Wedding Venues": "12345…",
 * "Niagara Wedding Inspiration": "67890…" }. If a board name comes
 * back from the adapter that isn't in the map, we skip with a clear
 * reason rather than picking a random board. */
export async function publishToPinterest(opts: {
  title:        string;
  description:  string;
  board:        string;
  postUrl:      string;
  heroImageUrl: string | null;
}): Promise<PublishResult> {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  const map   = process.env.PINTEREST_BOARD_IDS;
  if (!token || !map) {
    return { platform: "pinterest", status: "skipped", reason: "PINTEREST_ACCESS_TOKEN/PINTEREST_BOARD_IDS missing" };
  }
  if (!opts.heroImageUrl) {
    return { platform: "pinterest", status: "skipped", reason: "No hero image to attach" };
  }

  let boardIds: Record<string, string>;
  try { boardIds = JSON.parse(map); }
  catch { return { platform: "pinterest", status: "failed", reason: "PINTEREST_BOARD_IDS is not valid JSON" }; }
  const boardId = boardIds[opts.board];
  if (!boardId) {
    return { platform: "pinterest", status: "skipped", reason: `No board id mapped for "${opts.board}"` };
  }

  const res = await fetch("https://api.pinterest.com/v5/pins", {
    method: "POST",
    headers: {
      authorization:  `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      board_id:    boardId,
      title:       opts.title,
      description: opts.description,
      link:        opts.postUrl,
      media_source: {
        source_type: "image_url",
        url:         opts.heroImageUrl,
      },
    }),
  });
  if (!res.ok) {
    return { platform: "pinterest", status: "failed", reason: `${res.status} ${await res.text().catch(() => "")}` };
  }
  const j = (await res.json()) as { id?: string };
  return { platform: "pinterest", status: "published", platformPostId: j.id };
}

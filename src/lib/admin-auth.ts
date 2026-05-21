/**
 * Shared admin auth helper for /api/admin/* routes.
 *
 * The admin pages bootstrap the cookie via a one-time ?token=... query
 * string on first visit; subsequent requests carry it in the Authorization
 * header or the owv_admin_token cookie. When ADMIN_TOKEN is unset (local
 * dev) the helper falls open so iteration is friction-free.
 */
export function isAdminAuthorized(req: Request): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return true;

  /* Bearer header — used by the client fetch() calls. */
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/);
  if (m && m[1].trim() === expected.trim()) return true;

  /* Cookie — used by the server-rendered admin pages. */
  const cookie = req.headers.get("cookie") ?? "";
  const cm = cookie.match(/owv_admin_token=([^;]+)/);
  if (cm && decodeURIComponent(cm[1]) === expected) return true;

  return false;
}

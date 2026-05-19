import { cookies } from "next/headers";

const COOKIE_NAME = "owv_plan_session";

/**
 * Read-only access to the planner session ID. The cookie is minted by
 * middleware (src/middleware.ts) before server-component render, so this
 * should always return a value on /plan and /api/plan/* routes.
 */
export async function readPlanSessionId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}

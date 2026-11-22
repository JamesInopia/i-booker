import { headers } from "next/headers";
import { getAuthState } from "@/lib/auth";
import { auth } from "@/lib/better-auth";

// Polled by <SessionWatcher />. Besides reporting whether this login is still valid, it is
// where the session token gets rotated (a route handler can set the new cookie).
export async function GET() {
  const state = await getAuthState();

  if (state.kind === "suspended")
    return Response.json({ suspended: true }, { status: 403 });

  if (state.kind === "displaced") {
    // Delete this device's session and clear its cookie; the page shows
    // "Logging in with different device" and goes to the login screen.
    await auth.api.signOut({ headers: await headers() }).catch(() => null);
    return Response.json({ displaced: true }, { status: 409 });
  }

  // Transient DB/network error: not a logout. The watcher ignores this and polls again.
  if (state.kind === "unavailable") return Response.json({}, { status: 503 });

  if (state.kind === "anonymous") return Response.json({}, { status: 401 });

  const rotated = await auth.api
    .rotateSession({ headers: await headers() })
    .catch(() => null);
  if (rotated?.status === "displaced") {
    await auth.api.signOut({ headers: await headers() }).catch(() => null);
    return Response.json({ displaced: true }, { status: 409 });
  }
  if (rotated?.status === "expired") return Response.json({}, { status: 401 });

  return Response.json({ ok: true });
}

import { getAuthState } from "@/lib/auth";

export async function GET() {
  const state = await getAuthState();
  if (state.kind === "suspended")
    return Response.json({ suspended: true }, { status: 403 });
  if (state.kind === "anonymous") return Response.json({}, { status: 401 });
  return Response.json({ ok: true });
}

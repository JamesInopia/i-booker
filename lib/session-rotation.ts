import "server-only";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { db } from "@/db";
import { session as sessionTable } from "@/db/schema";
import { SESSION_MAX_MS, SESSION_ROTATE_AFTER_MS, SESSION_ROTATE_GRACE_MS } from "@/lib/session";

export type RotateResult = "rotated" | "fresh" | "displaced" | "expired";

/**
 * Replaces the session token (and with it the signed cookie value) once the current one is
 * older than SESSION_ROTATE_AFTER_MS. Server-only: call it as `auth.api.rotateSession({ headers })`.
 *
 * The old row stays valid for SESSION_ROTATE_GRACE_MS so requests that were already in flight
 * with the old cookie still succeed; then it expires and is deleted.
 */
export const sessionRotation = () =>
  ({
    id: "session-rotation",
    endpoints: {
      rotateSession: createAuthEndpoint(
        "/rotate-session",
        { method: "POST", use: [sessionMiddleware], metadata: { SERVER_ONLY: true } },
        async (ctx) => {
          const { session, user } = ctx.context.session;
          const now = Date.now();

          if (session.revokedAt) return ctx.json({ status: "displaced" as RotateResult });

          const startedAt = session.startedAt ?? session.createdAt;
          if (now - new Date(startedAt).getTime() > SESSION_MAX_MS) {
            await db.delete(sessionTable).where(eq(sessionTable.familyId, session.familyId));
            return ctx.json({ status: "expired" as RotateResult });
          }

          if (now - new Date(session.createdAt).getTime() < SESSION_ROTATE_AFTER_MS) {
            return ctx.json({ status: "fresh" as RotateResult });
          }

          // Claim the rotation: only one concurrent request can shorten the old row's life.
          const claimed = await db
            .update(sessionTable)
            .set({ expiresAt: new Date(now + SESSION_ROTATE_GRACE_MS) })
            .where(
              and(
                eq(sessionTable.id, session.id),
                gt(sessionTable.expiresAt, new Date(now + SESSION_ROTATE_GRACE_MS + 5_000)),
              ),
            )
            .returning({ id: sessionTable.id });
          if (claimed.length === 0) return ctx.json({ status: "fresh" as RotateResult });

          let next;
          try {
            next = await ctx.context.internalAdapter.createSession(
              user.id,
              false,
              { familyId: session.familyId, startedAt: new Date(startedAt) },
              true,
            );
          } catch (error) {
            // Give the old token its normal lifetime back instead of logging the user out.
            await db
              .update(sessionTable)
              .set({ expiresAt: new Date(session.expiresAt) })
              .where(eq(sessionTable.id, session.id));
            throw error;
          }

          await setSessionCookie(ctx, { session: next, user });

          // Rows of this login that were rotated away and are past their grace period.
          await db
            .delete(sessionTable)
            .where(
              and(
                eq(sessionTable.familyId, session.familyId),
                ne(sessionTable.id, next.id),
                lt(sessionTable.expiresAt, new Date(now)),
              ),
            )
            .catch(() => {});

          return ctx.json({ status: "rotated" as RotateResult });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;

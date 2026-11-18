import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { and, eq, isNotNull, isNull, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import { sessionRotation } from "@/lib/session-rotation";

const ALLOWED_DOMAIN = "iacademy.edu.ph";
const isAllowedEmail = (email: string) => email.trim().toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      hd: ALLOWED_DOMAIN,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => {
          const email = newUser.email.toLowerCase();
          if (!newUser.emailVerified || !isAllowedEmail(email)) {
            throw new APIError("FORBIDDEN", {
              message: `Sign in with your @${ALLOWED_DOMAIN} account.`,
            });
          }
          return { data: { ...newUser, email } };
        },
      },
    },
    session: {
      create: {
        // Every login is a new "family" (one device); rotation passes its own family through.
        before: async (newSession) => ({
          data: {
            ...newSession,
            familyId: newSession.familyId ?? crypto.randomUUID(),
            startedAt: newSession.startedAt ?? new Date(),
          },
        }),
        // Only one device at a time: a new login marks every other login of this user as
        // replaced. Rotation reuses its family, so it never touches anything here.
        after: async (newSession) => {
          const now = new Date();
          await db
            .delete(session)
            .where(
              and(
                eq(session.userId, newSession.userId),
                isNotNull(session.revokedAt),
                lt(session.revokedAt, new Date(now.getTime() - 60 * 60 * 1000)),
              ),
            );
          await db
            .update(session)
            .set({ revokedAt: now })
            .where(
              and(
                eq(session.userId, newSession.userId),
                ne(session.familyId, String(newSession.familyId)),
                isNull(session.revokedAt),
              ),
            );
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 3,
    // Expiry is renewed by token rotation (lib/session-rotation.ts), not by the built-in refresh.
    disableSessionRefresh: true,
    additionalFields: {
      familyId: { type: "string", required: true, input: false },
      startedAt: { type: "date", required: true, input: false },
      revokedAt: { type: "date", required: false, input: false },
    },
  },
  plugins: [nextCookies(), sessionRotation()],
});

import "server-only";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";

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
  },
  plugins: [nextCookies()],
});

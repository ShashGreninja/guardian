import "server-only";

import { cookies } from "next/headers";

// Demo sign-in: this build serves one household, so a role cookie is enough
// to separate the landing page from the app. Real accounts would replace this.
const COOKIE = "guardian_role";

export type Role = "caregiver";

export async function currentRole(): Promise<Role | null> {
  const value = (await cookies()).get(COOKIE)?.value;
  return value === "caregiver" ? value : null;
}

export async function startSession(role: Role) {
  (await cookies()).set(COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

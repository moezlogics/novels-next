import "server-only";
import { col } from "./db";
import { publicMember, safeReturn } from "./auth";
import type { Member } from "./types";

export function normalizePhone(p: unknown): string {
  return String(p || "").replace(/[^\d+\s\-()]/g, "").trim().slice(0, 20);
}

export async function uniqueUsername(seed: string): Promise<string> {
  const base = (seed.split("@")[0] || "user").replace(/[^a-zA-Z0-9]/g, "").slice(0, 30) || "user";
  const members = await col.members();
  for (let i = 0; i < 15; i++) {
    const u = i === 0 ? base : `${base}${Math.floor(100 + Math.random() * 900)}`;
    if (!(await members.findOne({ username: u }, { projection: { _id: 1 } }))) return u;
  }
  return `${base}${Date.now()}`;
}

/** Same JSON shape the PHP community_auth.php returned. */
export function authSuccess(m: Member, isNew: boolean, returnUrl: string) {
  const needsPhone = isNew && !String(m.phone || "").trim();
  // people go back to where they were (community, checkout…); the phone prompt only
  // shows when they signed up from the account page itself
  const redirect = safeReturn(returnUrl) || (needsPhone ? "/account/?need_phone=1" : "/account/");
  return Response.json({ status: "success", is_new: isNew, needs_phone: needsPhone, redirect, user: publicMember(m) });
}

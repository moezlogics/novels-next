import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { col } from "./db";
import type { Seller } from "./types";

/** Seller accounts are separate from reader accounts and from admins. */
const COOKIE = "kn_seller";
const TTL = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is missing in .env.local");
  return new TextEncoder().encode(s);
}

const secure = () => process.env.NODE_ENV === "production" && (process.env.SITE_URL || "").startsWith("https");

/** `asAdmin` = an admin opened this seller's dashboard (shown as a banner). */
export async function startSellerSession(s: Seller, asAdmin?: string) {
  const token = await new SignJWT({ sid: s._id, kind: "seller", ...(asAdmin ? { adm: asAdmin } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${asAdmin ? 60 * 60 * 2 : TTL}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secure(), path: "/", maxAge: asAdmin ? 60 * 60 * 2 : TTL });
}

export async function endSellerSession() {
  (await cookies()).delete(COOKIE);
}

export async function sellerSession(): Promise<{ id: number; asAdmin: string } | null> {
  const t = (await cookies()).get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, secret());
    if (payload.kind !== "seller") return null;
    return { id: Number(payload.sid), asAdmin: String(payload.adm || "") };
  } catch {
    return null;
  }
}

export async function getSeller(): Promise<(Seller & { asAdmin: string }) | null> {
  const ses = await sellerSession();
  if (!ses) return null;
  const s = await (await col.sellers()).findOne({ _id: ses.id });
  if (!s) return null;
  return { ...s, asAdmin: ses.asAdmin };
}

/** Every seller page/action calls this. Suspended sellers can only see their status. */
export async function requireSeller(opts: { allowInactive?: boolean } = {}) {
  const s = await getSeller();
  if (!s) redirect("/seller/login/");
  if (!opts.allowInactive && s.status !== "active") redirect("/seller/");
  return s;
}

export function sellerBack(path: string, msg: string, type: "ok" | "err" = "ok"): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${type}=${encodeURIComponent(msg)}`);
}

import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { col } from "./db";
import type { AdminUser, Member } from "./types";

const ADMIN_COOKIE = "kn_admin";
const MEMBER_COOKIE = "kn_member";
const MARKER_COOKIE = "kn_auth"; // readable by JS: tells the static pages a user is signed in

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET is missing in .env.local");
  return new TextEncoder().encode(s);
}

async function sign(payload: Record<string, unknown>, maxAgeSec: number) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${maxAgeSec}s`).sign(secret());
}

async function verify<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

const secure = () => process.env.NODE_ENV === "production" && (process.env.SITE_URL || "").startsWith("https");

// ── Passwords (PHP bcrypt $2y$ hashes are compatible) ────────
export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function checkPassword(pw: string, hash: string | null | undefined) {
  if (!hash) return false;
  try {
    return await bcrypt.compare(pw, hash.replace(/^\$2y\$/, "$2b$"));
  } catch {
    return false;
  }
}

// ── Admin sessions ───────────────────────────────────────────
const ADMIN_TTL = 60 * 60 * 12;

export async function startAdminSession(user: AdminUser) {
  const token = await sign({ uid: user._id, role: user.role, kind: "admin" }, ADMIN_TTL);
  const c = await cookies();
  c.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secure(), path: "/", maxAge: ADMIN_TTL });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function getAdmin(): Promise<AdminUser | null> {
  const p = await verify<{ uid: number; kind: string }>((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!p || p.kind !== "admin") return null;
  return (await col.admins()).findOne({ _id: p.uid });
}

// ── Member sessions ──────────────────────────────────────────
const MEMBER_TTL = 60 * 60 * 24 * 60;

export async function startMemberSession(m: Member) {
  const token = await sign({ mid: m._id, kind: "member" }, MEMBER_TTL);
  const c = await cookies();
  c.set(MEMBER_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: secure(), path: "/", maxAge: MEMBER_TTL });
  c.set(MARKER_COOKIE, "m", { httpOnly: false, sameSite: "lax", secure: secure(), path: "/", maxAge: MEMBER_TTL });
}

export async function endMemberSession() {
  const c = await cookies();
  c.delete(MEMBER_COOKIE);
  c.delete(MARKER_COOKIE);
}

export async function getMemberId(): Promise<number | null> {
  const p = await verify<{ mid: number; kind: string }>((await cookies()).get(MEMBER_COOKIE)?.value);
  return p && p.kind === "member" ? p.mid : null;
}

export async function getMember(): Promise<Member | null> {
  const id = await getMemberId();
  if (!id) return null;
  const m = await (await col.members()).findOne({ _id: id });
  return m && m.status === "active" ? m : null;
}

export function publicMember(m: Member) {
  return {
    id: m._id,
    name: m.name,
    username: m.username,
    email: m.email,
    phone: m.phone || "",
    bio: m.bio || "",
    profile_pic: m.profile_pic && !/default_avatar/i.test(m.profile_pic) ? m.profile_pic : "",
  };
}

/** Only allow same-site relative return URLs. */
export function safeReturn(url: string | null | undefined): string {
  const u = String(url || "").trim();
  if (!u.startsWith("/") || u.startsWith("//")) return "";
  return u;
}

// ── Brute-force protection (same idea as PHP login_attempts) ─
export async function tooManyAttempts(key: string): Promise<boolean> {
  const r = await (await col.loginAttempts()).findOne({ _id: key });
  if (!r) return false;
  if (Date.now() - r.last > 15 * 60 * 1000) return false;
  return r.attempts >= 8;
}
export async function recordAttempt(key: string, ok: boolean) {
  const c = await col.loginAttempts();
  if (ok) await c.deleteOne({ _id: key });
  else {
    const r = await c.findOne({ _id: key });
    const fresh = !r || Date.now() - r.last > 15 * 60 * 1000;
    await c.updateOne({ _id: key }, { $set: { last: Date.now(), attempts: fresh ? 1 : r!.attempts + 1 } }, { upsert: true });
  }
}

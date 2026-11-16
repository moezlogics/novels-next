import { col, nextId } from "@/lib/db";
import { hashPassword, startMemberSession } from "@/lib/auth";
import { authSuccess, normalizePhone, uniqueUsername } from "@/lib/memberApi";
import type { Member } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || "").trim();
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  const confirm = String(b.password_confirm || "");
  const phone = normalizePhone(b.phone);
  const bad = (error: string, status = 400) => Response.json({ error }, { status });

  if (!name) return bad("Please enter your display name.");
  if (name.length > 80) return bad("Display name is too long (max 80 characters).");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Please enter a valid email address.");
  if (phone && phone.replace(/\D/g, "").length < 10) return bad("Please enter a valid mobile number (at least 10 digits), or leave it blank.");
  if (password.length < 8) return bad("Password must be at least 8 characters.");
  if (password !== confirm) return bad("Passwords do not match.");

  const members = await col.members();
  const existing = await members.findOne({ email });
  if (existing) {
    return bad(existing.google_id && !existing.password_hash ? "This email is already registered with Google. Please sign in with Google." : "An account with this email already exists. Please sign in instead.", 409);
  }
  const m: Member = {
    _id: await nextId("members"),
    google_id: null,
    name,
    username: await uniqueUsername(email),
    email,
    phone: phone || null,
    password_hash: await hashPassword(password),
    profile_pic: null,
    bio: null,
    status: "active",
    created_at: new Date(),
    bookmarks: {},
  };
  await members.insertOne(m);
  await startMemberSession(m);
  return authSuccess(m, true, b.return_url);
}

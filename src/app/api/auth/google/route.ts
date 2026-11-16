import { col, nextId } from "@/lib/db";
import { startMemberSession } from "@/lib/auth";
import { authSuccess, uniqueUsername } from "@/lib/memberApi";
import type { Member } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const credential = String(b.credential || "");
  if (!credential) return Response.json({ error: "Missing ID token" }, { status: 400 });

  const r = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, { signal: AbortSignal.timeout(10000) }).catch(() => null);
  if (!r || !r.ok) return Response.json({ error: "Invalid Google ID token" }, { status: 401 });
  const p = (await r.json()) as { sub?: string; email?: string; name?: string; picture?: string; aud?: string; email_verified?: string };
  if (!p.sub || !p.email) return Response.json({ error: "Invalid token payload" }, { status: 400 });
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (clientId && p.aud !== clientId) return Response.json({ error: "Invalid Google token audience" }, { status: 401 });

  const email = p.email.toLowerCase();
  const members = await col.members();
  let m = await members.findOne({ $or: [{ google_id: p.sub }, { email }] });
  let isNew = false;
  if (m) {
    if (!m.google_id) {
      if (m.password_hash) return Response.json({ error: "An account with this email already exists. Sign in with your email and password, or contact support to link Google." }, { status: 409 });
      await members.updateOne({ _id: m._id }, { $set: { google_id: p.sub, profile_pic: m.profile_pic || p.picture || null } });
      m = { ...m, google_id: p.sub, profile_pic: m.profile_pic || p.picture || null };
    }
  } else {
    isNew = true;
    m = {
      _id: await nextId("members"),
      google_id: p.sub,
      name: p.name || email.split("@")[0],
      username: await uniqueUsername(email),
      email,
      phone: null,
      password_hash: null,
      profile_pic: p.picture || null,
      bio: null,
      status: "active",
      created_at: new Date(),
      bookmarks: {},
    } satisfies Member;
    await members.insertOne(m);
  }
  if (m.status === "suspended") return Response.json({ error: "Your account has been suspended." }, { status: 403 });
  await startMemberSession(m);
  return authSuccess(m, isNew, b.return_url);
}

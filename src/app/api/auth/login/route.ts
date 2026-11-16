import { col } from "@/lib/db";
import { checkPassword, recordAttempt, startMemberSession, tooManyAttempts } from "@/lib/auth";
import { authSuccess } from "@/lib/memberApi";
import { clientIp } from "@/lib/moderation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || "").trim().toLowerCase();
  const password = String(b.password || "");
  if (!email || !password) return Response.json({ error: "Please enter your email and password." }, { status: 400 });
  const key = `m:${clientIp(req)}`;
  if (await tooManyAttempts(key)) return Response.json({ error: "Too many attempts. Please wait 15 minutes and try again." }, { status: 429 });

  const m = await (await col.members()).findOne({ email });
  if (!m || !m.password_hash) {
    await recordAttempt(key, false);
    if (m?.google_id) return Response.json({ error: "This account uses Google sign-in. Please continue with Google." }, { status: 401 });
    return Response.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  if (!(await checkPassword(password, m.password_hash))) {
    await recordAttempt(key, false);
    return Response.json({ error: "Incorrect email or password." }, { status: 401 });
  }
  if (m.status === "suspended") return Response.json({ error: "Your account has been suspended." }, { status: 403 });
  await recordAttempt(key, true);
  await startMemberSession(m);
  return authSuccess(m, false, b.return_url);
}

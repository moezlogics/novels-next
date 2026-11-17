import { after } from "next/server";
import { revalidateTag } from "next/cache";
import { col, nextId } from "@/lib/db";
import { getAdmin, getMember } from "@/lib/auth";
import { clientIp } from "@/lib/moderation";
import { aiFlagComment, checkComment, messageHash } from "@/lib/commentBrain";
import { toCommentView } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import type { Comment } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_LEN = 2000;
const COOLDOWN_MS = 15_000; // one comment per 15 s per visitor
const PER_10_MIN = 8;
const PER_DAY = 40;

function fail(error: string, status = 400, extra: Record<string, unknown> = {}) {
  return Response.json({ error, ...extra }, { status });
}

/** Requests from other websites (or scripts that fake one) are refused. */
function sameSite(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const o = new URL(origin).host;
    const hosts = [req.headers.get("x-forwarded-host"), req.headers.get("host")].filter(Boolean) as string[];
    try {
      hosts.push(new URL(process.env.SITE_URL || "").host);
    } catch {}
    const bare = (h: string) => h.replace(/^www\./, "").split(":")[0];
    return hosts.some((h) => bare(h) === bare(o));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const t0 = Date.now();
  if (!sameSite(req)) return fail("Request blocked.", 403);
  const body = await req.json().catch(() => ({}));
  const postId = parseInt(body.post_id, 10);
  const targetId = parseInt(body.parent_id, 10) || null;
  const message = String(body.message || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const ip = clientIp(req);
  if (!postId) return fail("Invalid novel.");
  if (!message) return fail("Please write a comment.");
  if (message.length > MAX_LEN) return fail(`Comment is too long (max ${MAX_LEN} characters).`);

  // Bot traps: hidden "website" field filled, or the form was sent faster than a human can type
  const honeypot = String(body.website || "").trim();
  const elapsed = Number(body.elapsed);
  if (honeypot) return Response.json({ status: "success", message: "Thanks! Your comment will appear after a quick review.", comment: null });

  const comments = await col.comments();
  const since = new Date(Date.now() - 24 * 3600_000);
  const hash = messageHash(message);

  // everything the decision needs, in parallel (one round trip)
  const [post, admin, member, settings, recent, sameTextElsewhere, target] = await Promise.all([
    col.posts().then((c) => c.findOne({ _id: postId, status: "active" }, { projection: { _id: 1 } })),
    getAdmin(),
    getMember(),
    getSettings(),
    comments.find({ ip_address: ip, created_at: { $gt: since } }, { projection: { created_at: 1, msg_hash: 1, message: 1 } }).sort({ created_at: -1 }).limit(60).toArray(),
    message.length >= 20 ? comments.countDocuments({ msg_hash: hash, post_id: { $ne: postId }, created_at: { $gt: new Date(Date.now() - 6 * 3600_000) } }) : Promise.resolve(0),
    targetId ? comments.findOne({ _id: targetId, post_id: postId }, { projection: { _id: 1, parent_id: 1, name: 1, status: 1 } }) : Promise.resolve(null),
  ]);

  if (!post) return fail("Novel not found.", 404);
  if (settings.comments_enabled === false && !admin) return fail("Comments are closed.", 403);
  if (targetId && (!target || target.status !== "approved")) return fail("The comment you are replying to was removed.");

  let name = "";
  let email = "";
  let memberId: number | null = null;
  if (admin) {
    name = admin.username || "Admin";
    email = admin.email || "admin@site.com";
  } else if (member) {
    memberId = member._id;
    name = member.name;
    email = member.email;
  } else {
    name = String(body.name || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
    email = `guest_${Buffer.from(ip).toString("hex").slice(0, 8)}@example.com`;
    if (name.length < 2) return fail("Please enter your name.");
  }

  let status: Comment["status"] = "approved";
  let flagReason = "";
  let score = 0;

  if (!admin) {
    // ── rate limits (per visitor) ──
    const last = recent[0]?.created_at ? new Date(recent[0].created_at).getTime() : 0;
    const wait = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
    if (last && wait > 0) return fail(`Please wait ${wait} seconds before posting again.`, 429, { retryAfter: wait });
    const tenMin = recent.filter((r) => Date.now() - new Date(r.created_at).getTime() < 10 * 60_000).length;
    if (tenMin >= PER_10_MIN || recent.length >= PER_DAY) return fail("You have posted a lot of comments. Please try again later.", 429);
    // ── duplicates ──
    if (recent.some((r) => r.msg_hash === hash || r.message === message)) return fail("You have already posted this comment.", 409);
    if (sameTextElsewhere >= 2) return fail("This looks like spam, so it can't be posted.");

    // ── the brain (instant, no network) ──
    const v = checkComment({ message, name: member ? "" : name });
    if (v.action === "block") return fail(v.reason, 400, { blocked: true });
    score = v.score;
    if (v.action === "review") {
      status = "pending";
      flagReason = v.flags.join(" · ");
    }
    // a script that skipped the page (no timing) or a form sent in under 2 s
    if (!Number.isFinite(elapsed) || elapsed < 2000) {
      status = "pending";
      flagReason = [flagReason, "Sent too fast / no form timing (possible bot)"].filter(Boolean).join(" · ");
    }
  }

  const rootId = target ? target.parent_id || target._id : null;
  const doc: Comment = {
    _id: await nextId("comments"),
    post_id: postId,
    member_id: memberId,
    parent_id: rootId,
    // shown as "↳ Name" only when answering a reply (answering the thread starter is obvious)
    reply_to: target && target._id !== rootId ? target.name : null,
    reply_to_id: target ? target._id : null,
    name,
    email,
    ip_address: ip,
    is_admin: !!admin,
    message,
    status,
    created_at: new Date(),
    msg_hash: hash,
    ...(flagReason ? { flag_reason: flagReason } : {}),
    ...(score ? { spam_score: score } : {}),
  };
  await comments.insertOne(doc);
  if (status === "approved") revalidateTag(`comments-${postId}`, { expire: 0 });

  // AI second opinion AFTER the reply has been sent: posting never waits for it
  if (!admin && status === "approved" && process.env.OPENAI_API_KEY) {
    after(async () => {
      const ai = await aiFlagComment(message);
      if (!ai.flag) return;
      await (await col.comments()).updateOne({ _id: doc._id }, { $set: { status: "pending", flag_reason: `AI: ${ai.reason || "flagged"}` } });
      revalidateTag(`comments-${postId}`, { expire: 0 });
    });
  }

  const avatar = member?.profile_pic || "";
  const view = { ...toCommentView(doc, avatar), ...(status === "pending" ? { pending: true } : {}) };
  return Response.json(
    {
      status: "success",
      message: status === "pending" ? "Thanks! Your comment will appear after a quick review." : doc.parent_id ? "Reply posted!" : "Comment posted!",
      comment: view,
    },
    { headers: { "Server-Timing": `total;dur=${Date.now() - t0}` } },
  );
}

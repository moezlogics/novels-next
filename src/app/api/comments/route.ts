import { revalidateTag } from "next/cache";
import { col, nextId } from "@/lib/db";
import { getAdmin, getMember } from "@/lib/auth";
import { clientIp, moderate } from "@/lib/moderation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const postId = parseInt(body.post_id, 10);
  const parentId = parseInt(body.parent_id, 10) || null;
  const message = String(body.message || "").trim().slice(0, 3000);
  const ip = clientIp(req);
  if (!postId) return Response.json({ error: "Invalid novel." }, { status: 400 });

  const post = await (await col.posts()).findOne({ _id: postId }, { projection: { _id: 1 } });
  if (!post) return Response.json({ error: "Novel not found." }, { status: 404 });

  const [admin, member] = await Promise.all([getAdmin(), getMember()]);
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
    name = String(body.name || "").trim().slice(0, 80);
    email = `guest_${Buffer.from(ip).toString("hex").slice(0, 8)}@example.com`;
  }
  if (!name) return Response.json({ error: "Please enter your name." }, { status: 400 });
  if (!message) return Response.json({ error: "Please write a comment." }, { status: 400 });

  const mod = await moderate("comment", message);
  if (!mod.ok) return Response.json({ error: mod.reason }, { status: 400 });

  const comments = await col.comments();
  const dup = await comments.findOne({ ip_address: ip, message, created_at: { $gt: new Date(Date.now() - 30_000) } });
  if (dup) return Response.json({ error: "Duplicate comment detected. Please wait a few seconds." }, { status: 429 });
  const recent = await comments.countDocuments({ ip_address: ip, created_at: { $gt: new Date(Date.now() - 10 * 60_000) } });
  if (recent >= 10 && !admin) return Response.json({ error: "Too many comments. Please wait a few minutes." }, { status: 429 });

  if (parentId) {
    const parent = await comments.findOne({ _id: parentId, post_id: postId });
    if (!parent) return Response.json({ error: "Comment not found." }, { status: 400 });
  }

  await comments.insertOne({
    _id: await nextId("comments"),
    post_id: postId,
    member_id: memberId,
    parent_id: parentId,
    name,
    email,
    ip_address: ip,
    is_admin: !!admin,
    message,
    status: "approved",
    created_at: new Date(),
  });
  revalidateTag("comments", { expire: 0 });
  return Response.json({ status: "success", message: "Comment posted successfully!" });
}

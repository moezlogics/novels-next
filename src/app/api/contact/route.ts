import { col, nextId } from "@/lib/db";
import { clientIp } from "@/lib/moderation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (b.website) return Response.json({ type: "ok", message: "Thank you! Your message has been sent successfully." }); // honeypot
  const name = String(b.name || "").trim().slice(0, 120);
  const email = String(b.email || "").trim().slice(0, 160);
  const subject = String(b.subject || "").trim().slice(0, 200);
  const message = String(b.message || "").trim().slice(0, 5000);
  if (!name || !email || !subject || !message) return Response.json({ type: "err", error: "Please fill in all fields." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ type: "err", error: "Please enter a valid email address." }, { status: 400 });
  const ip = clientIp(req);
  const c = await col.contact();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (await c.findOne({ ip_address: ip, created_at: { $gte: start } })) {
    return Response.json({ type: "warn", message: "You can only submit one message per day. We will get back to you soon." });
  }
  await c.insertOne({ _id: await nextId("contact"), name, email, subject, message, ip_address: ip, status: "new", created_at: new Date() });
  return Response.json({ type: "ok", message: "Thank you! Your message has been sent successfully." });
}

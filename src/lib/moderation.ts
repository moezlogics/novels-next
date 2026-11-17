import "server-only";
import { checkComment, hasLink } from "./commentBrain";

export { hasLink };

const PROMPTS = {
  community_post: `You are the content moderation brain for a novels & quotes community (English and Urdu).
ALLOW and publish: novel excerpts, story text, poetry, literary quotes, reading thoughts — in English, Urdu script, or Roman Urdu.
BLOCK and reject: any URL/link or website mention, phone/WhatsApp/Telegram promotion, ads, spam, self-promotion, buy/sell, adult/sexual content, nudity, hate speech, threats, abusive/profane words (English, Urdu, Roman Urdu), violence, illegal content, completely off-topic spam.
For attached images: ALLOW images that show quotes, poetry, novel text, or harmless literary visuals. BLOCK images with adult/nudity, abusive text, promotional ads, watermarks with URLs, QR codes, or contact spam.
Return STRICT JSON only: {"allowed":true|false,"reason":"short user-friendly message if blocked, else empty string"}`,
  comment: `You are the comment moderation brain for a novel reading website (English and Urdu).
ALLOW: opinions, reviews, praise, criticism, emotions, discussion about the novel/story/characters — any respectful reader opinion.
BLOCK only: URLs/links, promotional spam, phone/contact spam, abusive/profane words (English, Urdu, Roman Urdu), sexual/adult content, hate speech, threats.
Do NOT block polite disagreement or negative opinions about the story.
Return STRICT JSON only: {"allowed":true|false,"reason":"short user-friendly message if blocked, else empty string"}`,
};

export async function moderate(mode: "comment" | "community_post", text: string, images: { mime: string; data: Buffer }[] = []): Promise<{ ok: boolean; reason: string }> {
  text = text.trim();
  if (!text && !images.length) return { ok: false, reason: "Content cannot be empty." };
  if (text && hasLink(text)) return { ok: false, reason: "Links and URLs are not allowed." };
  if (mode === "comment") {
    const v = checkComment({ message: text });
    if (v.action === "block") return { ok: false, reason: v.reason };
    return { ok: true, reason: "" };
  }
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { ok: true, reason: "" };
  try {
    const content: unknown[] = [{ type: "text", text: text || "(no text)" }];
    for (const img of images.slice(0, 4)) content.push({ type: "image_url", image_url: { url: `data:${img.mime};base64,${img.data.toString("base64")}`, detail: "low" } });
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: PROMPTS[mode] },
          { role: "user", content },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) throw new Error(String(r.status));
    const d = await r.json();
    const out = JSON.parse(d.choices?.[0]?.message?.content || "{}");
    if (out.allowed === false) return { ok: false, reason: out.reason || "This content is not allowed." };
    return { ok: true, reason: "" };
  } catch {
    return { ok: false, reason: "Posting is temporarily unavailable. Please try again later." };
  }
}

export function clientIp(req: Request): string {
  return (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "0.0.0.0").trim().slice(0, 45);
}

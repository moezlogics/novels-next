import "server-only";
import { createHash } from "node:crypto";
import { hasPhone } from "./spamBrain";

/**
 * Comment brain — decides in < 1 ms (pure rules, no network) what happens to a
 * reader's comment:
 *
 *   block   → the reader sees the reason and can fix the comment
 *   review  → saved as "pending"; the admin approves it in Admin → Comments
 *   allow   → published at once
 *
 * Hard blocks: links (also "site dot com", "w w w", "h t t p"), emails, phone
 * numbers (also "0 3 0 0", "O3OO", Urdu digits), "WhatsApp me / my number" style
 * contact requests, adult words and strong abuse (English, Roman Urdu, Urdu).
 * Soft signals (promotion, mild abuse, gibberish, repeated words…) add to a score.
 * The optional OpenAI check runs AFTER the reply is sent, so it never slows posting.
 */

export type CommentAction = "allow" | "review" | "block";
export interface CommentVerdict {
  action: CommentAction;
  /** Message for the reader (block / review). */
  reason: string;
  /** 0 … 100 */
  score: number;
  /** Why (shown to the admin). */
  flags: string[];
}

const ZERO_WIDTH = /[\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180F\u200B-\u200F\u202A-\u202E\u2060-\u206F\u3164\uFE00-\uFE0F\uFEFF]/g;

/** Lower-case, NFKC (turns 𝐟𝐮𝐥𝐥-𝐰𝐢𝐝𝐭𝐡 / fancy letters into normal ones), no invisible characters. */
export function normalize(text: string): string {
  return String(text || "")
    .normalize("NFKC")
    .replace(ZERO_WIDTH, "")
    .toLowerCase();
}

/** Same text for duplicate detection: letters and digits only. */
export function messageHash(text: string): string {
  const core = normalize(text).replace(/[^\p{L}\p{N}]+/gu, "");
  return createHash("sha1").update(core).digest("hex").slice(0, 20);
}

// ── Links ─────────────────────────────────────────────────────
// TLDs that are never normal words → match "name.tld" anywhere
const SAFE_TLDS = "com|net|org|pk|io|xyz|info|biz|link|online|website|ru|cn|tk|ml|ga|cf|gq|icu|vip|click|buzz|uk";
// TLDs that are also words ("tha.to", "story.me", "end.live") → only with a path ("site.me/abc")
const WORD_TLDS = "to|me|in|co|us|ai|fun|pro|one|is|it|be|so|my|do|no|go|at|top|shop|store|site|club|blog|live|app|dev|tv|cc|ly|gg";
const LINK_RX: RegExp[] = [
  /h\s*t\s*t\s*p\s*s?\s*:\s*\/\s*\//i, // http:// and h t t p s : / /
  /\bhttps?\b/i,
  /\bw\s*w\s*w\s*(\.|\s+dot\s+|\(dot\)|\[dot\])/i, // www. / w w w . / www dot
  new RegExp(`\\b[a-z0-9][-a-z0-9]{0,62}(?:\\.|\\s+\\.\\s+|\\s*\\(dot\\)\\s*|\\s*\\[dot\\]\\s*|\\s*\\{dot\\}\\s*|\\s+dot\\s+|\\s+daat\\s+)(?:${SAFE_TLDS})\\b`, "i"),
  new RegExp(`\\b[a-z0-9][-a-z0-9]{1,62}\\.(?:${WORD_TLDS})\\/`, "i"),
  /\bdot\s*(?:com|net|org|pk)\b/i,
  /\b(?:wa\.me|t\.me|bit\.ly|tinyurl|goo\.gl|linktr\.ee|chat\.whatsapp|youtu\.be|fb\.me|fb\.watch|shorturl|cutt\.ly|rb\.gy|is\.gd)\b/i,
  /\b(?:wa|t)\s*\.\s*me\s*\//i,
  /:\/\//,
];

export function hasLink(text: string): boolean {
  const t = normalize(text);
  return LINK_RX.some((r) => r.test(t));
}

const EMAIL_RX = /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\{at\})\s*[a-z0-9-]+\s*(?:\.|\(dot\)|\[dot\]|\s+dot\s+)\s*[a-z]{2,}/i;
const MAIL_RX = /\b(?:gmail|yahoo|hotmail|outlook|icloud|proton(?:mail)?)\s*(?:\.|\s+dot\s+|\(dot\))?\s*com\b|@\s*(?:gmail|yahoo|hotmail|outlook|icloud)\b/i;

// @handle with platform words, or handles that look like accounts (digits, _ or .)
const PLATFORM = "insta(?:gram)?|ig|tiktok|tik\\s*tok|snap(?:chat)?|fb|facebook|twitter|telegram|youtube|yt|threads|discord";
const HANDLE_PLATFORM_RX = new RegExp(`(?:\\b(?:${PLATFORM})\\b[^\\n]{0,25}@[a-z0-9_.]{3,})|(?:@[a-z0-9_.]{3,}[^\\n]{0,25}\\b(?:${PLATFORM})\\b)`, "i");
const HANDLE_ACCOUNT_RX = /(?:^|[\s(])@[a-z0-9]*(?:[_.][a-z0-9]+|\d{2,})[a-z0-9_.]*/i;

// ── Contact / promotion phrases (Roman Urdu + English + Urdu) ─
const CONTACT_RX: RegExp[] = [
  /\b(?:whats\s*app|whatsap|watsapp|watsap|wtsapp|wtsp|telegram|tele\s*gram|imo|viber)\s*(?:kro|karo|karen|karein|kren|kar|krna|number|num|nmbr|no\s*\d|id|contact|msg|message|inbox|dm)\b/i,
  /\b(?:dm|inbox|msg|message|call|contact|text|ping)\s+(?:me|kro|karo|karen|karein|kren)\b/i,
  /\b(?:my|mera|meri|mere|apna|apni|hamara)\s+(?:number|num|nmbr|contact|whats\s*app|insta(?:gram)?|channel|group|page)\b/i,
  /\b(?:number|nmbr|contact)\s+(?:do|dein|den|dena|bhejo|bhejen|send)\b/i,
  /\b(?:rabta|rabita|raabta|raabita)\s+(?:kr|kar|karen|karein|kren|krain|karo|kro)\b/i,
  /\b(?:join|subscribe|follow)\s+(?:my|our|mera|hamara|mere|hamare)\b/i,
  /\b(?:check|visit|watch)\s+(?:my|our)\s+(?:channel|profile|page|website|site|videos?|group|bio)\b/i,
  /\blink\s+in\s+(?:my\s+)?bio\b/i,
  /(?:واٹس\s?ایپ|وٹس\s?ایپ|واٹساپ|وٹساپ|ٹیلیگرام|ٹیلی\s?گرام)\s*(?:پر|پہ|نمبر|گروپ|لنک|کریں|کرو)/,
  /(?:میرا|میرے|مجھے)\s*(?:نمبر|واٹس\s?ایپ|وٹس\s?ایپ|رابطہ)/,
  /رابطہ\s*(?:کریں|کرو|کیجئے|کیجیے)/,
];

// ── Word lists ────────────────────────────────────────────────
/** Strong abuse + adult words: always blocked. Matched as whole words. */
const HARD_WORDS = [
  // English
  "fuck", "fucking", "fucker", "fuk", "fck", "fcuk", "motherfucker", "bitch", "bitches", "bastard", "asshole", "slut", "whore", "pussy", "dick", "cock", "cunt", "nigga", "nigger", "porn", "porno", "xxx", "nude", "nudes", "sexy video", "sex video", "hot video", "call girl", "call girls", "escort", "escorts", "onlyfans", "18+ video",
  // Roman Urdu
  "bhenchod", "behenchod", "bhanchod", "benchod", "bhencho", "bhen chod", "behen chod", "bahenchod", "madarchod", "maderchod", "madar chod", "mader chod", "maa chod", "chutiya", "chutiye", "chutia", "chutiyapa", "bhosdi", "bhosdike", "bhosri", "bhosdiwala", "bhosriwala", "gandu", "gaandu", "gaand", "gand mar", "lund", "lauda", "phudi", "phuddi", "fuddi", "randi", "randwa", "kanjri", "kanjar", "haramzada", "haramzadi", "haram zada", "haram zadi", "haramkhor", "kuttiya", "kuti ka bacha", "kutte ka bacha", "kuttay ka bacha", "sale kutte", "teri ma ki", "tatte", "tattay", "chodu",
];
/** Urdu-script strong abuse (matched inside the text). */
const HARD_URDU = ["بہن چود", "بہنچود", "بھن چود", "مادر چود", "مادرچود", "چوتیا", "چوتیے", "گانڈو", "گانڈ", "رنڈی", "حرامزادہ", "حرامزادی", "حرام زادہ", "حرام زادی", "بھوسڑی", "بھوسڑے", "کنجری", "پھدی", "لوڑا", "کتے کا بچہ", "کتی کا بچہ"];
/** Mild insults: comment goes to admin review (these words can also appear in story talk). */
const SOFT_WORDS = ["harami", "kamina", "kamine", "kameena", "kameeni", "kaminey", "kutta", "kutte", "kuttay", "kutti", "ullu ka patha", "ullu ka pattha", "jahil aurat", "bakwas writer", "bc", "mc", "bsdk", "shit", "bullshit", "sex", "sexy", "hot girl"];
const SOFT_URDU = ["حرامی", "کمینہ", "کمینے", "کمینی", "کتا", "کتے", "کتی", "الو کا پٹھا"];
/** Promotion / scam phrases. */
const PROMO = [
  "earn money", "earn from home", "online earning", "online earn", "work from home", "ghar baithe", "ghar bethe", "paise kamaye", "paise kamayen", "paisay kamain", "paise kamao", "daily income", "guaranteed profit", "double your money", "investment plan", "invest now", "crypto", "bitcoin", "forex", "binary option", "betting", "casino", "satta", "lottery", "jackpot", "loan", "free followers", "free likes", "buy followers", "promo code", "discount code", "referral code", "use my code", "click here", "free recharge", "free gift", "jazzcash", "jazz cash", "easypaisa", "easy paisa", "subscribe", "subscriber", "my channel", "mera channel", "meray channel", "youtube channel", "join group", "join channel", "join karo", "join karen", "group join", "apk",
];
const PROMO_URDU = ["گھر بیٹھے", "پیسے کمائیں", "پیسے کماؤ", "سبسکرائب", "میرا چینل", "چینل جوائن", "گروپ جوائن", "جوائن کریں"];

function padded(text: string) {
  // letters/digits/+ kept, everything else a space → "whole word" matching with includes()
  return ` ${text.replace(/[^\p{L}\p{N}+]+/gu, " ").replace(/\s+/g, " ").trim()} `;
}
/** Letters only, repeated letters collapsed: catches "f.u.c.k", "fuuuuck", "b h e n c h o d". */
function squash(text: string) {
  return text.replace(/[^\p{L}]+/gu, "").replace(/(\p{L})\1+/gu, "$1");
}
function wordHits(pad: string, list: string[]) {
  return list.filter((w) => pad.includes(` ${w} `));
}

// long, distinctive abuse stems are safe to look for inside squashed text
const SQUASH_STEMS = ["fuck", "motherfucker", "benchod", "bhenchod", "behenchod", "bahenchod", "bhanchod", "madarchod", "maderchod", "chutiya", "chutia", "bhosdi", "bhosri", "haramzad", "haramkhor", "phudi"].map((s) => s.replace(/(\p{L})\1+/gu, "$1"));

const KEYBOARD_MASH = /\b(?:asdf|qwer|zxcv|hjkl|sdfg|dfgh|fghj|ghjk|jkjk|xcvb|lkjh)[a-z]*\b/i;

export interface CommentInput {
  message: string;
  name?: string;
}

/** Instant verdict. Never touches the network or the database. */
export function checkComment({ message, name = "" }: CommentInput): CommentVerdict {
  const raw = String(message || "");
  const t = normalize(raw);
  const n = normalize(name);
  const flags: string[] = [];
  const block = (reason: string, flag: string): CommentVerdict => ({ action: "block", reason, score: 100, flags: [...flags, flag] });

  // ── name ──
  if (name) {
    if (hasLink(n) || EMAIL_RX.test(n) || MAIL_RX.test(n) || hasPhone(n)) return block("Please use your real name. Links, emails and numbers are not allowed in the name.", "Contact info in name");
    const npad = padded(n);
    if (wordHits(npad, HARD_WORDS).length || HARD_URDU.some((w) => n.includes(w))) return block("Please use a proper name.", "Abusive name");
    if (wordHits(npad, PROMO).length) return block("Please use your real name.", "Promotional name");
  }

  // ── message: must say something ──
  const letters = (t.match(/\p{L}/gu) || []).length;
  const emoji = (raw.match(/\p{Extended_Pictographic}/gu) || []).length;
  if (letters < 2 && !emoji) return block("Please write a proper comment.", "No words");

  // ── hard blocks ──
  if (hasLink(t)) return block("Links and website names are not allowed in comments.", "Link");
  if (EMAIL_RX.test(t) || MAIL_RX.test(t)) return block("Email addresses are not allowed in comments.", "Email");
  if (hasPhone(t)) return block("Phone numbers are not allowed in comments.", "Phone number");
  if (HANDLE_PLATFORM_RX.test(t) || HANDLE_ACCOUNT_RX.test(t)) return block("Social media IDs are not allowed in comments.", "Social handle");
  const contact = CONTACT_RX.find((r) => r.test(t));
  if (contact) return block("Contact details, WhatsApp/Telegram requests and self-promotion are not allowed.", `Contact request (${(t.match(contact) || [""])[0].trim()})`);

  const pad = padded(t);
  const sq = squash(t);
  const hard = wordHits(pad, HARD_WORDS);
  if (hard.length || HARD_URDU.some((w) => t.includes(w)) || SQUASH_STEMS.some((s) => sq.includes(s))) {
    return block("Please keep comments respectful. Abusive or adult words are not allowed.", `Abuse/adult${hard[0] ? `: ${hard[0]}` : ""}`);
  }

  // ── soft score ──
  let score = 0;
  const add = (pts: number, why: string) => {
    score += pts;
    flags.push(why);
  };

  const promo = [...wordHits(pad, PROMO), ...PROMO_URDU.filter((w) => t.includes(w))];
  if (promo.length) add(40 + 20 * Math.min(2, promo.length - 1), `Promotion: ${promo.slice(0, 3).join(", ")}`);

  const soft = [...wordHits(pad, SOFT_WORDS), ...wordHits(pad, SOFT_URDU)];
  if (soft.length) add(45, `Rude words: ${soft.slice(0, 3).join(", ")}`);

  const words = t.split(/\s+/).filter(Boolean);
  // "nice nice nice nice nice"
  let run = 1;
  let maxRun = 1;
  for (let i = 1; i < words.length; i++) {
    run = words[i] === words[i - 1] ? run + 1 : 1;
    maxRun = Math.max(maxRun, run);
  }
  if (maxRun >= 5) add(25, `Same word ${maxRun}× in a row`);
  if (words.length >= 12) {
    const uniq = new Set(words).size;
    if (uniq / words.length < 0.3) add(25, "Very repetitive text");
  }
  if (/(\S)\1{9,}/u.test(t)) add(15, "Long repeated characters");
  if (words.some((w) => w.length > 45 && !/[\u0600-\u06FF]/.test(w))) add(30, "Gibberish (very long word)");
  if (KEYBOARD_MASH.test(t)) add(25, "Keyboard mash");
  if (emoji > 20) add(20, `${emoji} emojis`);
  const latin = raw.replace(/[^A-Za-z]/g, "");
  if (latin.length >= 25 && latin === latin.toUpperCase()) add(10, "ALL CAPS");
  // lots of digits (codes, prices, numbers broken up)
  const digits = (normalize(raw).match(/[0-9۰-۹٠-٩]/g) || []).length;
  if (digits >= 8) add(30, `${digits} digits`);
  if (/[$€£₹]|\brs\.?\s*\d{3,}|\bpkr\b/i.test(t)) add(20, "Money amounts");

  score = Math.min(100, score);
  if (score >= 80) return { action: "block", reason: "This looks like spam or promotion, so it can't be posted.", score, flags };
  if (score >= 40) return { action: "review", reason: "Thanks! Your comment will appear after a quick review.", score, flags };
  return { action: "allow", reason: "", score, flags };
}

// ── Optional AI second opinion (runs after the response, never blocks posting) ──
const AI_PROMPT = `You are the comment moderation brain for a Pakistani Urdu novel reading website (English, Urdu script and Roman Urdu).
ALLOW: opinions, reviews, praise, criticism, emotions, questions, requests for next episodes, discussion about the novel/story/characters/writer — any respectful reader opinion, including negative opinions about the story.
FLAG only: links or website names, promotion/ads/self-promotion, phone/WhatsApp/Telegram/contact sharing, scams, abusive or profane words (English, Urdu, Roman Urdu), sexual/adult content, hate speech, threats, harassment of other readers, and meaningless spam.
Return STRICT JSON only: {"flag":true|false,"reason":"short reason for the admin, empty if not flagged"}`;

export async function aiFlagComment(text: string): Promise<{ flag: boolean; reason: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { flag: false, reason: "" };
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        max_tokens: 80,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: AI_PROMPT },
          { role: "user", content: `Reader comment:\n"""\n${text.slice(0, 3000)}\n"""` },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) return { flag: false, reason: "" };
    const d = await r.json();
    const out = JSON.parse(d.choices?.[0]?.message?.content || "{}");
    return { flag: out.flag === true, reason: String(out.reason || "").slice(0, 200) };
  } catch {
    return { flag: false, reason: "" };
  }
}

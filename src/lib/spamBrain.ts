import "server-only";

/**
 * The seller spam brain. Decides what a seller may publish.
 *
 * Hard blocks (the seller sees the reason and must fix it):
 *   phone numbers, WhatsApp/Telegram/social handles, emails and links — in any
 *   field, including the tricks people use: "0 3 0 0", "O3OO", "zero three",
 *   "03oo-1234567", "wa.me", "insta: @shop", "gmail dot com".
 *
 * Soft signals add to a 0–100 score. At or above the admin's threshold the product
 * goes to the admin's review queue WITH the reasons, so approving is a 10-second job.
 * Rules only ever get stricter with AI: a model having a bad day can never publish
 * something the rules caught.
 */

export interface BrainResult {
  /** Problems the seller must fix before saving. */
  blocks: string[];
  /** 0 (clean) … 100 (spam). */
  score: number;
  /** Why the score is what it is (shown to the admin). */
  reasons: string[];
}

const DIGIT_WORDS: [RegExp, string][] = [
  [/\bzero\b|\bsifr\b/gi, "0"],
  [/\bone\b|\bek\b|\baik\b/gi, "1"],
  [/\btwo\b/gi, "2"],
  [/\bthree\b/gi, "3"],
  [/\bfour\b|\bchaar\b/gi, "4"],
  [/\bfive\b|\bpaanch\b|\bpanch\b/gi, "5"],
  [/\bsix\b|\bchay\b|\bchey\b/gi, "6"],
  [/\bseven\b|\bsaat\b/gi, "7"],
  [/\beight\b|\baath\b/gi, "8"],
  [/\bnine\b|\bnau\b/gi, "9"],
  [/\bdouble\s+(\d)/gi, "$1$1"],
];

const URDU_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normaliseDigits(text: string) {
  let t = text.replace(/[۰-۹]/g, (d) => String(URDU_DIGITS.indexOf(d))).replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
  t = t.replace(/[０-９]/g, (d) => String(d.charCodeAt(0) - 0xff10));
  return t;
}

/** Does the text hide a phone number? */
export function hasPhone(text: string): boolean {
  // ISBNs are long digit runs but not phone numbers
  let t = normaliseDigits(String(text || "")).replace(/\bisbn(?:-1[03])?\s*[:#]?\s*[\d\s-]{10,17}[\dxX]/gi, " ");
  for (const [rx, d] of DIGIT_WORDS) t = t.replace(rx, d);
  // letters that stand in for digits ("O3OO I234567") — only inside chunks that already
  // contain a digit and nothing but digit-like characters, so normal words are untouched
  const deLeet = t
    .split(/(\s+)/)
    .map((tok) => (/\d/.test(tok) && /^[\doOiIlL|.\-_()+/]+$/.test(tok) ? tok.replace(/[oO]/g, "0").replace(/[iIlL|]/g, "1") : tok))
    .join("");
  const compact = deLeet.replace(/[\s.\-_()+/,*#~]/g, "");
  return (
    /(?:\+?92|0092|0)3\d{9}/.test(compact) || // 03xx xxxxxxx / +92 3xx…
    /(?:^|\D)3\d{9}(?:\D|$)/.test(compact) || // 3xx xxxxxxx without the 0
    /(?:\+?92|0)(?:21|22|41|42|51|52|53|55|61|62|68|81|91)\d{7,8}/.test(compact) || // landlines
    /\d{10,}/.test(compact) // any long run of digits (prices, pages and years are never this long)
  );
}

const URL_RX = [
  /https?:\/\//i,
  /\bwww\s*\.\s*\S/i,
  /\b[a-z0-9][-a-z0-9]{1,}\s*(\.|\(dot\)|\[dot\]|\sdot\s)\s*(com|net|org|pk|io|co|info|biz|xyz|shop|store|site|online|me|app|link|ly|to|in)\b/i,
  /\b(?:wa\.me|t\.me|bit\.ly|tinyurl|goo\.gl|linktr\.ee|chat\.whatsapp)\b/i,
];
const EMAIL_RX = /[a-z0-9._%+-]+\s*(@|\(at\)|\[at\]|\sat\s)\s*[a-z0-9-]+\s*(\.|\(dot\)|\[dot\]|\sdot\s)\s*[a-z]{2,}/i;
const MAIL_WORDS = /\b(gmail|yahoo|hotmail|outlook|icloud)\b/i;
const HANDLE_RX = /(^|\s)@[a-z0-9_.]{3,}/i;

const OFF_PLATFORM = [
  "whatsapp",
  "whats app",
  "watsapp",
  "watsap",
  "wtsp",
  "telegram",
  "signal app",
  "imo",
  "viber",
  "inbox me",
  "dm me",
  "message me",
  "msg me",
  "call me",
  "contact me",
  "contact number",
  "contact no",
  "mobile no",
  "cell no",
  "phone no",
  "rabta",
  "rabita",
  "raabta",
  "facebook page",
  "fb page",
  "insta",
  "instagram",
  "tiktok",
  "youtube channel",
  "snapchat",
  "jazzcash",
  "jazz cash",
  "easypaisa",
  "easy paisa",
  "bank account",
  "iban",
  "account number",
  "advance payment",
  "pay first",
  "pay in advance",
];

const SCAM = [
  "earn money",
  "earn from home",
  "work from home",
  "online earning",
  "guaranteed profit",
  "double your money",
  "investment",
  "crypto",
  "bitcoin",
  "forex",
  "lottery",
  "prize",
  "winner",
  "free gift",
  "click here",
  "limited offer",
  "100% free",
  "loan",
  "betting",
  "casino",
  "followers",
  "likes",
];

const ADULT = ["xxx", "porn", "sex video", "nude", "18+ video", "escort", "call girl", "adult video", "hot video", "mms"];

export interface BrainInput {
  title: string;
  description?: string;
  author?: string;
  tags?: string[];
  price?: number;
  salePrice?: number | null;
  /** Other fields that must also be free of contact info (store name, bio, policy…). */
  extra?: string[];
}

export interface BrainRules {
  minPrice: number;
  maxPrice: number;
  bannedWords: string[];
}

function words(text: string) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
}

function containsAny(text: string, list: string[]) {
  const t = ` ${words(text)} `;
  return list.filter((w) => w && t.includes(` ${w.toLowerCase()} `));
}

/** Contact info anywhere = hard block. Used for products AND store profiles. */
export function contactBlocks(fields: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [name, raw] of Object.entries(fields)) {
    const text = String(raw || "");
    if (!text.trim()) continue;
    if (hasPhone(text)) out.push(`${name}: phone numbers are not allowed. Buyers order through the website.`);
    if (URL_RX.some((r) => r.test(text))) out.push(`${name}: links and website names are not allowed.`);
    if (EMAIL_RX.test(text) || MAIL_WORDS.test(text)) out.push(`${name}: email addresses are not allowed.`);
    if (HANDLE_RX.test(text)) out.push(`${name}: social media @handles are not allowed.`);
    const off = containsAny(text, OFF_PLATFORM);
    if (off.length) out.push(`${name}: please remove “${off[0]}”. Contact and payment details are not allowed; buyers pay on delivery.`);
  }
  return [...new Set(out)];
}

export function checkListing(input: BrainInput, rules: BrainRules): BrainResult {
  const blocks = contactBlocks({
    Title: input.title,
    Description: input.description || "",
    Author: input.author || "",
    Tags: (input.tags || []).join(" "),
    ...Object.fromEntries((input.extra || []).map((v, i) => [`Field ${i + 1}`, v])),
  });
  const all = [input.title, input.description, input.author, ...(input.tags || [])].join(" \n ");

  const adult = containsAny(all, ADULT);
  if (adult.length) blocks.push("Adult content is not allowed in the bookstore.");
  const banned = containsAny(all, rules.bannedWords);
  if (banned.length) blocks.push(`Please remove the word “${banned[0]}”.`);

  let score = 0;
  const reasons: string[] = [];
  const add = (n: number, why: string) => {
    score += n;
    reasons.push(why);
  };

  const scam = containsAny(all, SCAM);
  if (scam.length) add(25 + 10 * Math.min(3, scam.length - 1), `Scam-like words: ${scam.slice(0, 4).join(", ")}`);

  const title = input.title.trim();
  if (title.length < 4) add(20, "Title is very short");
  const letters = title.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 8 && letters === letters.toUpperCase()) add(15, "Title is ALL CAPS");
  if (/(.)\1{4,}/u.test(all)) add(15, "Repeated characters (e.g. !!!!! or aaaaa)");
  const emoji = (all.match(/\p{Extended_Pictographic}/gu) || []).length;
  if (emoji > 6) add(10, `${emoji} emojis`);
  if (/[!?]{3,}/.test(all)) add(5, "Shouting punctuation");
  const desc = (input.description || "").trim();
  if (desc && desc.length < 30) add(10, "Description is very short");

  if (typeof input.price === "number") {
    if (input.price < rules.minPrice) blocks.push(`Price must be at least Rs. ${rules.minPrice}.`);
    if (input.price > rules.maxPrice) blocks.push(`Price must be at most Rs. ${rules.maxPrice.toLocaleString()}. Contact the admin for special editions.`);
    if (input.salePrice !== null && input.salePrice !== undefined && input.salePrice > 0) {
      if (input.salePrice >= input.price) blocks.push("Sale price must be lower than the normal price.");
      else if (input.salePrice < input.price * 0.2) add(30, `Discount over 80% (Rs. ${input.price} → ${input.salePrice})`);
    }
  }

  return { blocks: [...new Set(blocks)], score: Math.min(100, score), reasons };
}

/** Optional second opinion from OpenAI. Can only make the verdict stricter. */
export async function aiOpinion(text: string): Promise<{ flag: boolean; reason: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { flag: false, reason: "" };
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'You review book listings for a Pakistani Urdu-novel bookstore (English, Urdu, Roman Urdu). FLAG listings that: are not books/novels/magazines/stationery for readers; hide contact details or push buyers off the site; are scams, adult content, hate, piracy offers ("PDF of any book"), or nonsense spam. Do NOT flag normal book descriptions, reviews or prices. Return JSON only: {"flag":true|false,"reason":"short reason for the admin"}',
          },
          { role: "user", content: text.slice(0, 4000) },
        ],
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return { flag: false, reason: "" };
    const d = await r.json();
    const out = JSON.parse(d.choices?.[0]?.message?.content || "{}");
    return { flag: out.flag === true, reason: String(out.reason || "").slice(0, 200) };
  } catch {
    return { flag: false, reason: "" };
  }
}

/** Seller text is shown as plain text: strip any HTML and keep line breaks. */
export function plainText(s: string, max = 5000) {
  return String(s || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

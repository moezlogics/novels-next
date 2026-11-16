import { revalidateTag } from "next/cache";
import { col } from "@/lib/db";
import { getMember, publicMember } from "@/lib/auth";
import { normalizePhone } from "@/lib/memberApi";
import { deleteStoredFile, saveImage } from "@/lib/storage";

export const dynamic = "force-dynamic";

/** Update name / bio / phone / avatar (multipart) or just phone (JSON). */
export async function POST(req: Request) {
  const m = await getMember();
  if (!m) return Response.json({ error: "Please sign in." }, { status: 401 });
  const set: Record<string, unknown> = {};
  const type = req.headers.get("content-type") || "";

  if (type.includes("multipart/form-data")) {
    const f = await req.formData();
    const name = String(f.get("name") || "").trim().slice(0, 80);
    if (!name) return Response.json({ error: "Name cannot be empty." }, { status: 400 });
    set.name = name;
    set.bio = String(f.get("bio") || "").trim().slice(0, 255) || null;
    if (f.has("phone")) {
      const phone = normalizePhone(f.get("phone"));
      if (phone && phone.replace(/\D/g, "").length < 10) return Response.json({ error: "Please enter a valid mobile number." }, { status: 400 });
      set.phone = phone || null;
    }
    const file = f.get("profile_pic");
    if (file instanceof File && file.size > 0) {
      if (file.size > 2 * 1024 * 1024) return Response.json({ error: "Profile picture must be under 2 MB." }, { status: 400 });
      try {
        const img = await saveImage(file, { dir: "uploads/community", prefix: `profile_${m._id}`, maxWidth: 600 });
        if (m.profile_pic?.startsWith("uploads/community/profile_")) await deleteStoredFile(m.profile_pic);
        set.profile_pic = img.path;
      } catch (e) {
        return Response.json({ error: (e as Error).message }, { status: 400 });
      }
    }
  } else {
    const b = await req.json().catch(() => ({}));
    const phone = normalizePhone(b.phone);
    if (phone && phone.replace(/\D/g, "").length < 10) return Response.json({ error: "Please enter a valid mobile number (at least 10 digits)." }, { status: 400 });
    set.phone = phone || null;
  }
  await (await col.members()).updateOne({ _id: m._id }, { $set: set });
  revalidateTag("comments", "max");
  return Response.json({ status: "success", user: publicMember({ ...m, ...set }) });
}

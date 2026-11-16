import "server-only";
import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { getAdmin } from "./auth";
import type { AdminUser } from "./types";

export const ADMIN = "/newlogin";

/** Every admin page/action calls this first. */
export async function requireAdmin(mainOnly = false): Promise<AdminUser> {
  const a = await getAdmin();
  if (!a) redirect(`${ADMIN}/`);
  if (mainOnly && a.role !== "main_admin") redirect(`${ADMIN}/dashboard/?denied=1`);
  return a;
}

/** Clear the public site cache after any content change (same idea as clear_page_cache()). */
export function bustSite() {
  revalidateTag("content", { expire: 0 });
  revalidateTag("comments", { expire: 0 });
  revalidatePath("/", "layout");
}

export function str(fd: FormData, k: string, max = 100000): string {
  return String(fd.get(k) ?? "").trim().slice(0, max);
}
export function int(fd: FormData, k: string): number | null {
  const v = parseInt(String(fd.get(k) ?? ""), 10);
  return Number.isFinite(v) ? v : null;
}
export function num(fd: FormData, k: string): number | null {
  const v = parseFloat(String(fd.get(k) ?? ""));
  return Number.isFinite(v) ? v : null;
}
export function bool(fd: FormData, k: string): boolean {
  const v = fd.get(k);
  return v === "1" || v === "on" || v === "true";
}
export function file(fd: FormData, k: string): File | null {
  const f = fd.get(k);
  return f instanceof File && f.size > 0 ? f : null;
}

/** ImageField value: newly uploaded file wins, otherwise the chosen/kept path. */
export async function imageFrom(fd: FormData, name: string, alt = ""): Promise<string> {
  const up = file(fd, `${name}_file`);
  if (up) {
    const { saveImage } = await import("./storage");
    return (await saveImage(up, { alt })).path;
  }
  return str(fd, name, 500);
}

export function back(path: string, msg: string, type: "ok" | "err" = "ok"): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${type}=${encodeURIComponent(msg)}`);
}

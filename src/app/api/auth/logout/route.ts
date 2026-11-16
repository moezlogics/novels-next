import { endMemberSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  await endMemberSession();
  return Response.json({ status: "success" });
}

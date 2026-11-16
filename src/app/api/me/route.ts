import { getAdmin, getMember, publicMember } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [m, a] = await Promise.all([getMember(), getAdmin()]);
  return Response.json(
    { member: m ? publicMember(m) : null, admin: a ? { username: a.username } : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

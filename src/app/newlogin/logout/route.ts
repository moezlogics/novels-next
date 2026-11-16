import { endAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await endAdminSession();
  return Response.redirect(new URL("/newlogin/", req.url), 303);
}
export const GET = POST;

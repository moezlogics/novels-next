import { endSellerSession } from "@/lib/sellerAuth";

export async function POST(req: Request) {
  await endSellerSession();
  return Response.redirect(new URL("/seller/login/", req.url), 303);
}

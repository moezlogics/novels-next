import { redirect } from "next/navigation";
import { getMember, safeReturn } from "@/lib/auth";
import AcctTopNav from "@/components/account/TopNav";
import { LoginForm } from "@/components/account/AuthForms";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Sign In" }, description: "Sign in to your reader account to join the community, track orders, and manage your profile.", robots: "noindex, nofollow", alternates: { canonical: "/login/" } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ return?: string }> }) {
  const ret = safeReturn((await searchParams).return);
  if (await getMember()) redirect(ret || "/account/");
  return (
    <>
      <AcctTopNav title="Sign In" back="/account/" />
      <div className="acct-app-shell">
        <div className="auth-page">
          <div className="auth-shell">
            <div className="auth-brand">
              <h1 className="auth-title">Welcome back</h1>
              <p className="auth-sub">Sign in to continue.</p>
            </div>
            <LoginForm returnUrl={ret} />
          </div>
        </div>
      </div>
    </>
  );
}

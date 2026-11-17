import { redirect } from "next/navigation";
import { getMember, safeReturn } from "@/lib/auth";
import AcctTopNav from "@/components/account/TopNav";
import { RegisterForm } from "@/components/account/AuthForms";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Create Account" }, description: "Create your reader account.", robots: "noindex, nofollow", alternates: { canonical: "/register/" } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ return?: string }> }) {
  const ret = safeReturn((await searchParams).return);
  if (await getMember()) redirect(ret || "/account/");
  return (
    <>
      <AcctTopNav title="Create Account" back="/account/" />
      <div className="acct-app-shell">
        <div className="auth-page">
          <div className="auth-shell">
            <div className="auth-brand">
              <h1 className="auth-title">Create your account</h1>
              <p className="auth-sub">It takes less than a minute.</p>
            </div>
            <RegisterForm returnUrl={ret} />
          </div>
        </div>
      </div>
    </>
  );
}

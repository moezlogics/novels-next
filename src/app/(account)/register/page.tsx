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
              <div className="auth-logo">
                <i className="fa-solid fa-user-plus"></i>
              </div>
              <h1 className="auth-title">Create your account</h1>
              <p className="auth-sub">Sign up with email or Google to manage orders, bookmarks, and your profile.</p>
            </div>
            <RegisterForm returnUrl={ret} />
          </div>
        </div>
      </div>
    </>
  );
}

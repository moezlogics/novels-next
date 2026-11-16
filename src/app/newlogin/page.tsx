import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getAdmin, checkPassword, recordAttempt, startAdminSession, tooManyAttempts } from "@/lib/auth";
import { col } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "Login" };

async function login(fd: FormData) {
  "use server";
  const user = String(fd.get("username") || "").trim();
  const pass = String(fd.get("password") || "");
  const h = await headers();
  const key = `a:${(h.get("cf-connecting-ip") || h.get("x-forwarded-for") || "local").split(",")[0]}`;
  if (await tooManyAttempts(key)) redirect("/newlogin/?err=Too many attempts. Wait 15 minutes.");
  const a = await (await col.admins()).findOne({ $or: [{ username: user }, { email: user.toLowerCase() }] });
  if (!a || !(await checkPassword(pass, a.password))) {
    await recordAttempt(key, false);
    redirect("/newlogin/?err=Invalid username or password");
  }
  await recordAttempt(key, true);
  await startAdminSession(a);
  redirect("/newlogin/dashboard/");
}

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  if (await getAdmin()) redirect("/newlogin/dashboard/");
  const [{ err }, s] = await Promise.all([searchParams, getSettings()]);
  return (
    <div className="adm">
      <div className="a-login">
        <form action={login} className="a-login-card">
          <div className="adm-brand" style={{ padding: "0 0 18px" }}>
            <span className="logo">
              <i className="fa-solid fa-book"></i>
            </span>
            {s.site_name}
          </div>
          <h1>Welcome back</h1>
          <p className="a-muted" style={{ margin: "0 0 20px", fontSize: ".9rem" }}>
            Sign in to the admin panel
          </p>
          {err ? <div className="a-alert err">{err}</div> : null}
          <div className="a-field">
            <label>Username or Email</label>
            <input type="text" name="username" required autoComplete="username" autoFocus />
          </div>
          <div className="a-field">
            <label>Password</label>
            <input type="password" name="password" required autoComplete="current-password" />
          </div>
          <button className="a-btn a-btn-p" style={{ width: "100%", marginTop: 6 }}>
            <i className="fa-solid fa-right-to-bracket"></i> Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

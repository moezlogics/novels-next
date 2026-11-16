import Link from "next/link";

export default function AcctTopNav({ title, back = "/account/", right = "home" }: { title: string; back?: string; right?: "home" | "none" }) {
  return (
    <nav className="acct-app-topnav" aria-label="Account page navigation">
      <Link href={back} className="acct-app-topnav-btn" aria-label="Back">
        <i className="fa-solid fa-arrow-left"></i>
      </Link>
      <span className="acct-app-topnav-title">{title}</span>
      {right === "home" ? (
        <Link href="/" className="acct-app-topnav-btn" aria-label="Home">
          <i className="fa-solid fa-house"></i>
        </Link>
      ) : (
        <span className="acct-app-topnav-btn acct-app-topnav-spacer" aria-hidden="true"></span>
      )}
    </nav>
  );
}

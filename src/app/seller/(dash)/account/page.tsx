import { requireSeller } from "@/lib/sellerAuth";
import { AccountForm } from "@/components/seller/SellerForms";

export const metadata = { title: "Account" };

export default async function SellerAccount() {
  const s = await requireSeller({ allowInactive: true });
  return (
    <>
      <h1 className="sl-h1">Account</h1>
      <AccountForm name={s.name} phone={s.phone} email={s.email} asAdmin={!!s.asAdmin} />
      <div className="sl-card" style={{ marginTop: 14 }}>
        <h2>
          <i className="fa-solid fa-circle-info"></i> Account status
        </h2>
        <p className="sl-small" style={{ margin: 0 }}>
          Status: <b>{s.status}</b>
          {s.verified ? (
            <>
              {" "}
              · <span className="sl-pill ok">
                <i className="fa-solid fa-circle-check"></i> Verified seller
              </span>
            </>
          ) : null}
          <br />
          Member since {new Date(s.created_at).toLocaleDateString("en-PK", { dateStyle: "long" })}
        </p>
      </div>
    </>
  );
}

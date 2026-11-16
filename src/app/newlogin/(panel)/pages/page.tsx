import Link from "next/link";
import { col } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { ConfirmButton, Flash } from "@/components/admin/Fields";
import { formatDate } from "@/lib/utils";
import { deletePage } from "./actions";

export const metadata = { title: "Pages" };

export default async function Pages({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const rows = await (await col.pages()).find({}, { projection: { content: 0 } }).sort({ _id: -1 }).toArray();
  return (
    <>
      <Flash {...sp} />
      <div className="a-row" style={{ marginBottom: 12 }}>
        <span className="a-sp" />
        <Link href="/newlogin/pages/new/" className="a-btn a-btn-p">
          <i className="fa-solid fa-plus"></i> Add Page
        </Link>
      </div>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>URL</th>
              <th>Status</th>
              <th>Updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p._id}>
                <td>
                  <Link href={`/newlogin/pages/edit/${p._id}/`} style={{ fontWeight: 700, textDecoration: "none" }}>
                    {p.title}
                  </Link>
                </td>
                <td>
                  <a href={`/${p.slug}/`} target="_blank" className="a-muted">
                    /{p.slug}/
                  </a>
                </td>
                <td>
                  <span className={`a-pill ${p.status === "publish" ? "ok" : p.status === "draft" ? "warn" : "bad"}`}>{p.status}</span>
                </td>
                <td className="a-muted">{formatDate(p.updated_at, false)}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <Link href={`/newlogin/pages/edit/${p._id}/`} className="a-btn a-btn-g a-btn-xs">
                    <i className="fa-solid fa-pen"></i> Edit
                  </Link>{" "}
                  <form action={deletePage} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={p._id} />
                    <ConfirmButton className="a-btn a-btn-d a-btn-xs" message="Delete this page?">
                      <i className="fa-solid fa-trash-can"></i>
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

import Link from "next/link";
import { addTerm, deleteTerm } from "@/app/newlogin/(panel)/taxonomy-actions";
import { ConfirmButton, Flash, Submit } from "./Fields";
import { letterImage, thumbUrl } from "@/lib/utils";

export interface TermRow {
  id: number;
  name: string;
  slug: string;
  image?: string;
  count: number;
}

export default function TermList({ kind, title, rows, ok, err, q }: { kind: "categories" | "writers" | "series"; title: string; rows: TermRow[]; ok?: string; err?: string; q?: string }) {
  const base = `/newlogin/${kind}/`;
  const shown = q ? rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())) : rows;
  return (
    <>
      <Flash ok={ok} err={err} />
      <div className="a-main-side" style={{ gridTemplateColumns: "340px minmax(0,1fr)" }}>
        <form action={addTerm} className="a-card">
          <h3>
            <i className="fa-solid fa-plus"></i> Add {title}
          </h3>
          <input type="hidden" name="kind" value={kind} />
          <div className="a-field">
            <label>Name</label>
            <input type="text" name="name" required placeholder={kind === "writers" ? "e.g. Umera Ahmed" : kind === "series" ? "e.g. Tum Jo Aye Zindagi Main" : "e.g. Romantic Novels"} />
          </div>
          <div className="a-field">
            <label>Slug (optional)</label>
            <input type="text" name="slug" placeholder="auto from name" />
          </div>
          <Submit>
            <i className="fa-solid fa-plus"></i> Add
          </Submit>
        </form>
        <div>
          <form className="a-row" style={{ marginBottom: 10 }}>
            <input type="search" name="q" defaultValue={q} placeholder={`Search ${title.toLowerCase()}…`} style={{ maxWidth: 320 }} />
            <button className="a-btn a-btn-g a-btn-sm">Search</button>
            <span className="a-sp" />
            <span className="a-muted" style={{ fontSize: ".82rem" }}>
              {shown.length} total
            </span>
          </form>
          <div className="a-table-wrap">
            <table className="a-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>URL</th>
                  <th>Novels</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="a-row" style={{ flexWrap: "nowrap" }}>
                        {kind !== "series" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={r.image ? thumbUrl(r.image, 200) : letterImage(r.name)} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
                        ) : null}
                        <Link href={`${base}edit/${r.id}/`} style={{ fontWeight: 700, textDecoration: "none" }}>
                          {r.name}
                        </Link>
                      </div>
                    </td>
                    <td className="a-muted" style={{ fontSize: ".8rem" }}>
                      {kind === "series" ? r.slug : <a href={`/${r.slug}/`} target="_blank">/{r.slug}/</a>}
                    </td>
                    <td>{r.count}</td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <Link href={`${base}edit/${r.id}/`} className="a-btn a-btn-g a-btn-xs">
                        <i className="fa-solid fa-pen"></i> Edit
                      </Link>{" "}
                      <form action={deleteTerm} style={{ display: "inline" }}>
                        <input type="hidden" name="kind" value={kind} />
                        <input type="hidden" name="id" value={r.id} />
                        <ConfirmButton className="a-btn a-btn-d a-btn-xs" message={`Delete "${r.name}"? Novels will stay but lose this link.`}>
                          <i className="fa-solid fa-trash-can"></i>
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

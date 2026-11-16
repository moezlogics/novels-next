import { addMenu, saveMenu } from "@/app/newlogin/(panel)/settings-actions";
import { Flash, Submit } from "./Fields";
import type { MenuItem } from "@/lib/types";

export default function MenuEditor({ kind, items, ok, err, title }: { kind: "menu" | "footerMenu"; items: MenuItem[]; ok?: string; err?: string; title: string }) {
  const parents = items.filter((i) => !i.parent_id);
  return (
    <>
      <Flash ok={ok} err={err} />
      <div className="a-main-side" style={{ gridTemplateColumns: "320px minmax(0,1fr)" }}>
        <form action={addMenu} className="a-card">
          <h3>
            <i className="fa-solid fa-plus"></i> Add link
          </h3>
          <input type="hidden" name="kind" value={kind} />
          <div className="a-field">
            <label>Label</label>
            <input type="text" name="label" required placeholder="e.g. Romantic Novels" />
          </div>
          <div className="a-field">
            <label>URL</label>
            <input type="text" name="url" placeholder="romantic-novels/  or  https://…" />
            <small>Use a site path like about/ or a full URL. Empty = homepage.</small>
          </div>
          <div className="a-field">
            <label>{kind === "footerMenu" ? "Column (parent)" : "Parent (dropdown)"}</label>
            <select name="parent_id">
              <option value="">— Top level —</option>
              {parents.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <Submit>
            <i className="fa-solid fa-plus"></i> Add
          </Submit>
        </form>
        <form action={saveMenu} className="a-card">
          <h3>
            <i className="fa-solid fa-bars"></i> {title}
          </h3>
          <input type="hidden" name="kind" value={kind} />
          {items.length ? (
            <div className="a-table-wrap" style={{ marginBottom: 14 }}>
              <table className="a-table">
                <thead>
                  <tr>
                    <th style={{ width: 70 }}>Order</th>
                    <th>Label</th>
                    <th>URL</th>
                    <th>Parent</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {[...items]
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((i) => (
                      <tr key={i._id}>
                        <td>
                          <input type="hidden" name="id" value={i._id} />
                          <input type="number" name="sort_order" defaultValue={i.sort_order} style={{ width: 64 }} />
                        </td>
                        <td>
                          <input type="text" name="label" defaultValue={i.label} />
                        </td>
                        <td>
                          <input type="text" name="url" defaultValue={i.url} />
                        </td>
                        <td>
                          <select name="parent_id" defaultValue={i.parent_id ?? ""}>
                            <option value="">— Top —</option>
                            {parents
                              .filter((p) => p._id !== i._id)
                              .map((p) => (
                                <option key={p._id} value={p._id}>
                                  {p.label}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <input type="checkbox" name="delete" value={i._id} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="a-empty">No links yet — the site shows a default menu.</div>
          )}
          <Submit>
            <i className="fa-solid fa-floppy-disk"></i> Save menu
          </Submit>
        </form>
      </div>
    </>
  );
}

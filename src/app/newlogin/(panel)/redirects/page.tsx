import { revalidateTag } from "next/cache";
import { col, nextId } from "@/lib/db";
import { back, int, requireAdmin, str } from "@/lib/admin";
import { normPath } from "@/lib/redirects";
import { ConfirmButton, Flash, Submit } from "@/components/admin/Fields";

export const metadata = { title: "Redirects" };

async function act(fd: FormData) {
  "use server";
  await requireAdmin(true);
  const c = await col.redirects();
  if (str(fd, "a") === "delete") {
    await c.deleteOne({ _id: int(fd, "id") || 0 });
    revalidateTag("redirects", { expire: 0 });
    back("/newlogin/redirects/", "Redirect deleted");
  }
  const from = normPath(str(fd, "from", 500));
  let to = str(fd, "to", 1000);
  if (!from || from === "/" || !to) back("/newlogin/redirects/", "Enter both the old link and the new link", "err");
  if (!/^https?:\/\//i.test(to)) to = normPath(to);
  if (to === from) back("/newlogin/redirects/", "The old and new links are the same", "err");
  const code = str(fd, "code") === "302" ? 302 : 301;
  const hit = await c.findOne({ from });
  if (hit) await c.updateOne({ _id: hit._id }, { $set: { to, code } });
  else await c.insertOne({ _id: await nextId("redirects"), from, to, code, hits: 0, created_at: new Date() });
  revalidateTag("redirects", { expire: 0 });
  back("/newlogin/redirects/", `Redirect saved: ${from} → ${to}`);
}

export default async function RedirectsPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  await requireAdmin(true);
  const sp = await searchParams;
  const rows = await (await col.redirects()).find({}).sort({ _id: -1 }).limit(1000).toArray();
  return (
    <>
      <Flash {...sp} />
      <div className="a-card">
        <h3>
          <i className="fa-solid fa-route"></i> Add a redirect
        </h3>
        <p className="a-muted" style={{ marginTop: 0, fontSize: ".82rem" }}>
          When you change a novel&apos;s link or delete a page, send the old link to the new one so Google and readers never hit a 404. Use 301 (permanent) unless the move is temporary.
        </p>
        <form action={act} className="a-grid a-g3" style={{ alignItems: "end" }}>
          <div className="a-field">
            <label>Old link</label>
            <input name="from" placeholder="/old-novel-name/" required />
          </div>
          <div className="a-field">
            <label>New link</label>
            <input name="to" placeholder="/new-novel-name/ or https://…" required />
          </div>
          <div className="a-row" style={{ gap: 8 }}>
            <select name="code" defaultValue="301" style={{ maxWidth: 140 }}>
              <option value="301">301 Permanent</option>
              <option value="302">302 Temporary</option>
            </select>
            <Submit>
              <i className="fa-solid fa-plus"></i> Save
            </Submit>
          </div>
        </form>
      </div>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Old link</th>
              <th>New link</th>
              <th>Type</th>
              <th>Used</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((r) => (
                <tr key={r._id}>
                  <td>
                    <code>{r.from}</code>
                  </td>
                  <td style={{ wordBreak: "break-all" }}>
                    <a href={r.to} target="_blank" rel="noreferrer">
                      {r.to}
                    </a>
                  </td>
                  <td>{r.code}</td>
                  <td>{r.hits || 0}</td>
                  <td>
                    <form action={act}>
                      <input type="hidden" name="id" value={r._id} />
                      <ConfirmButton name="a" value="delete" message="Delete this redirect?">
                        <i className="fa-solid fa-trash"></i>
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="a-muted">
                  No redirects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

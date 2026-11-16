import { col } from "@/lib/db";
import { back, bustSite, requireAdmin, str } from "@/lib/admin";
import { pdfSize } from "@/lib/pdfCache";
import { extractDriveId } from "@/lib/utils";
import { Flash, Submit } from "@/components/admin/Fields";
import AutoRefresh from "@/components/admin/AutoRefresh";

export const metadata = { title: "Tools & Cache" };

type G = typeof globalThis & { _knCheck?: { running: boolean; done: number; total: number } };
const g = globalThis as G;

async function act(fd: FormData) {
  "use server";
  await requireAdmin(true);
  const a = str(fd, "a");
  if (a === "clear-site") {
    bustSite();
    back("/newlogin/tools/", "Site cache cleared — every page will rebuild with fresh data ✓");
  }
  if (a === "check-all") {
    if (g._knCheck?.running) back("/newlogin/tools/?watch=1", "A check is already running…");
    const posts = await (await col.posts()).find({ read_online_url: { $ne: "" } }, { projection: { read_online_url: 1 } }).toArray();
    const state: NonNullable<G["_knCheck"]> = { running: true, done: 0, total: posts.length };
    g._knCheck = state;
    // one by one in the background: tiny 1-byte requests, no load on the server
    void (async () => {
      const c = await col.posts();
      for (const p of posts) {
        const id = extractDriveId(p.read_online_url);
        const size = id ? await pdfSize(id).catch(() => 0) : 0;
        await c.updateOne({ _id: p._id }, { $set: { pdf_size: size } });
        state.done++;
      }
      state.running = false;
      bustSite();
    })();
    back("/newlogin/tools/?watch=1", `Checking ${posts.length} novels…`);
  }
  back("/newlogin/tools/", "Unknown action", "err");
}

export default async function Tools({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; watch?: string }> }) {
  await requireAdmin(true);
  const sp = await searchParams;
  const rows = await (await col.posts()).find({}, { projection: { title: 1, read_online_url: 1, pdf_size: 1, status: 1, pages: 1, episodes: 1 } }).sort({ _id: -1 }).toArray();
  const withPdf = rows.filter((r) => extractDriveId(r.read_online_url));
  const ok = withPdf.filter((r) => r.pdf_size);
  const broken = withPdf.filter((r) => r.pdf_size === 0);
  // Google's viewer fails on very big PDFs (page 1 shows, then "Could not preview the file")
  const tooBig = (r: (typeof rows)[number]) => !(r.episodes || []).length && ((r.pages || 0) > 2500 || (r.pdf_size || 0) > 25 * 1048576);
  const big = withPdf.filter(tooBig);
  const check = g._knCheck;
  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      {sp.watch && check?.running ? <AutoRefresh seconds={3} /> : null}
      <div className="a-grid a-g2">
        <div className="a-card">
          <h3>
            <i className="fa-solid fa-bolt"></i> Reader health — Google Drive links
          </h3>
          <p className="a-muted" style={{ marginTop: 0 }}>
            Novels open in Google Drive&apos;s own viewer inside our reader. Google renders the pages, so this server does no work and stores nothing. This check finds Drive files that are private or deleted (readers would see an error for those).
          </p>
          <div className="a-row" style={{ marginBottom: 8 }}>
            <b style={{ fontSize: "1.5rem" }}>
              {ok.length}/{withPdf.length}
            </b>
            <span className="a-muted">novels ready</span>
            {broken.length ? <span className="a-pill bad">{broken.length} not reachable</span> : null}
            {big.length ? <span className="a-pill warn">{big.length} too big for Google — split into parts</span> : null}
            {check?.running ? (
              <span className="a-pill info">
                <i className="fa-solid fa-spinner fa-spin"></i> checking {check.done}/{check.total}
              </span>
            ) : null}
          </div>
          <div className="a-progress" style={{ marginBottom: 14 }}>
            <span style={{ width: `${(ok.length / Math.max(1, withPdf.length)) * 100}%` }}></span>
          </div>
          <form action={act}>
            <Submit name="a" value="check-all" pendingText="Starting…">
              <i className="fa-solid fa-stethoscope"></i> Check all Drive links
            </Submit>
          </form>
        </div>
        <div className="a-card">
          <h3>
            <i className="fa-solid fa-broom"></i> Site cache
          </h3>
          <p className="a-muted" style={{ marginTop: 0 }}>
            Pages are cached for speed and refresh automatically when you edit content. Use this if something on the site looks out of date.
          </p>
          <form action={act}>
            <Submit name="a" value="clear-site" pendingText="Clearing…">
              <i className="fa-solid fa-rotate"></i> Clear site cache
            </Submit>
          </form>
        </div>
      </div>
      <div className="a-table-wrap">
        <table className="a-table">
          <thead>
            <tr>
              <th>Novel</th>
              <th>Drive file</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {[...broken, ...big, ...withPdf.filter((r) => r.pdf_size === undefined || r.pdf_size === null), ...ok.filter((r) => !tooBig(r))].map((r) => (
              <tr key={r._id}>
                <td>
                  <a href={`/newlogin/posts/edit/${r._id}/`}>{r.title}</a>
                </td>
                <td className="a-muted" style={{ fontSize: ".75rem" }}>
                  {extractDriveId(r.read_online_url)}
                </td>
                <td>
                  {r.pdf_size && tooBig(r) ? (
                    <span className="a-pill warn" title="Google's viewer often fails after page 1 on PDFs this big. Split it into parts of about 800 pages and add them under 'More parts'.">
                      Too big ({r.pages || "?"} pages · {(r.pdf_size / 1048576).toFixed(0)} MB) — split into parts
                    </span>
                  ) : r.pdf_size ? (
                    <span className="a-pill ok">
                      <i className="fa-solid fa-bolt"></i> Ready · {(r.pdf_size / 1048576).toFixed(1)} MB
                    </span>
                  ) : r.pdf_size === 0 ? (
                    <span className="a-pill bad">Not reachable — check sharing</span>
                  ) : (
                    <span className="a-pill warn">Not checked</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

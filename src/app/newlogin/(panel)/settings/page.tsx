import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { readSettingsUncached, siteUrl } from "@/lib/settings";
import { SETTINGS_TABS, tabById, type Field } from "@/lib/settingsSchema";
import { Flash, ImageField, Submit } from "@/components/admin/Fields";
import { saveSettings } from "../settings-actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string; tab?: string }> }) {
  await requireAdmin(true);
  const [s, sp] = await Promise.all([readSettingsUncached(), searchParams]);
  const tab = tabById(sp.tab || "general");
  const base = siteUrl();
  const val = (k: Field["k"]) => s[k] as unknown;

  const input = (f: Field) => {
    const v = val(f.k);
    if (f.type === "bool")
      return (
        <label className="a-check" key={f.k} style={{ marginBottom: 10 }}>
          <input type="checkbox" name={f.k} value="1" defaultChecked={!!v} /> {f.label}
        </label>
      );
    if (f.type === "image") return <ImageField key={f.k} name={f.k} current={String(v || "")} label={f.label} wide />;
    const common = { name: f.k, defaultValue: v === undefined || v === null ? "" : String(v), placeholder: f.ph };
    return (
      <div className="a-field" key={f.k}>
        <label>{f.label}</label>
        {f.type === "textarea" || f.type === "code" ? (
          <textarea {...common} rows={f.rows || 3} spellCheck={f.type !== "code"} style={f.type === "code" ? { fontFamily: "ui-monospace,Consolas,monospace", fontSize: ".8rem" } : undefined} />
        ) : f.type === "select" ? (
          <select name={f.k} defaultValue={String(v || "")}>
            {(f.options || []).map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
        ) : f.type === "color" ? (
          <input type="color" name={f.k} defaultValue={String(v || "#000000")} style={{ height: 40, padding: 2 }} />
        ) : (
          <input {...common} type={f.type === "number" ? "number" : f.type === "secret" ? "password" : f.type === "email" ? "email" : "text"} autoComplete="off" />
        )}
        {f.help ? <small>{f.help}</small> : null}
      </div>
    );
  };

  return (
    <>
      <Flash ok={sp.ok} err={sp.err} />
      <div className="a-tabs" style={{ flexWrap: "wrap" }}>
        {SETTINGS_TABS.map((t) => (
          <Link key={t.id} href={`?tab=${t.id}`} className={t.id === tab.id ? "on" : ""}>
            <i className={`fa-solid ${t.icon}`}></i> {t.label}
          </Link>
        ))}
      </div>
      <form action={saveSettings}>
        <input type="hidden" name="__tab" value={tab.id} />
        <div className="a-grid a-g2">
          {tab.sections.map((sec) => {
            const half = sec.fields.filter((f) => f.half);
            return (
              <div className="a-card" key={sec.title}>
                <h3>
                  <i className={`fa-solid ${sec.icon}`}></i> {sec.title}
                </h3>
                {sec.help ? (
                  <p className="a-muted" style={{ marginTop: 0, fontSize: ".82rem" }}>
                    {sec.help}
                  </p>
                ) : null}
                {sec.fields.filter((f) => !f.half).map(input)}
                {half.length ? <div className="a-grid a-g2">{half.map(input)}</div> : null}
                {sec.title === "Analytics & push" ? (
                  <div className="a-field">
                    <label>LaraPush service-worker file (.js)</label>
                    <input type="file" name="larapush_file" accept=".js" />
                    <small>Served from the site root, e.g. {base}/firebase-messaging-sw.js</small>
                  </div>
                ) : null}
                {sec.title === "Bookstore" && s.shop_preview_key ? (
                  <small className="a-muted" style={{ display: "block", wordBreak: "break-all" }}>
                    Preview link: {base}/shop/?preview={s.shop_preview_key}
                  </small>
                ) : null}
                {sec.title === "Community" && s.community_preview_key ? (
                  <small className="a-muted" style={{ display: "block", wordBreak: "break-all" }}>
                    Preview link: {base}/community/?preview={s.community_preview_key}
                  </small>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="a-sticky-bar">
          <Submit>
            <i className="fa-solid fa-floppy-disk"></i> Save {tab.label} settings
          </Submit>
        </div>
      </form>
    </>
  );
}

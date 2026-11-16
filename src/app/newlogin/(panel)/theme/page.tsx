import { requireAdmin } from "@/lib/admin";
import { readSettingsUncached } from "@/lib/settings";
import { Flash, Submit } from "@/components/admin/Fields";
import { saveTheme } from "../settings-actions";
import ThemePreview from "@/components/admin/ThemePreview";

export const metadata = { title: "Theme Colors" };

export default async function Theme({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await requireAdmin(true);
  const [s, sp] = await Promise.all([readSettingsUncached(), searchParams]);
  return (
    <>
      <Flash ok={sp.ok} />
      <form action={saveTheme} className="a-card" style={{ maxWidth: 820 }}>
        <h3>
          <i className="fa-solid fa-palette"></i> Site colors
        </h3>
        <ThemePreview primary={s.theme_primary} secondary={s.theme_secondary} hover={s.theme_hover} />
        <div style={{ marginTop: 16 }}>
          <Submit>
            <i className="fa-solid fa-floppy-disk"></i> Save colors
          </Submit>
        </div>
      </form>
    </>
  );
}

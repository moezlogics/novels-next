import { col } from "@/lib/db";
import { back, imageFrom, requireAdmin, str } from "@/lib/admin";
import { checkPassword, hashPassword } from "@/lib/auth";
import { Flash, ImageField, Submit } from "@/components/admin/Fields";

export const metadata = { title: "My Profile" };

async function save(fd: FormData) {
  "use server";
  const a = await requireAdmin();
  const email = str(fd, "email", 100).toLowerCase();
  const set: Record<string, string> = { email: email || a.email, bio: str(fd, "bio", 2000), profile_pic: await imageFrom(fd, "profile_pic", a.username) };
  const np = str(fd, "new_password", 200);
  if (np) {
    if (np.length < 8) back("/newlogin/profile/", "New password must be at least 8 characters", "err");
    if (!(await checkPassword(str(fd, "current_password", 200), a.password))) back("/newlogin/profile/", "Current password is wrong", "err");
    set.password = await hashPassword(np);
  }
  await (await col.admins()).updateOne({ _id: a._id }, { $set: set });
  back("/newlogin/profile/", np ? "Profile and password updated ✓" : "Profile updated ✓");
}

export default async function Profile({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const a = await requireAdmin();
  return (
    <>
      <Flash {...await searchParams} />
      <form action={save} className="a-grid a-g2">
        <div className="a-card">
          <h3>
            <i className="fa-solid fa-user"></i> Profile
          </h3>
          <div className="a-field">
            <label>Username</label>
            <input type="text" value={a.username} disabled />
          </div>
          <div className="a-field">
            <label>Email</label>
            <input type="email" name="email" defaultValue={a.email} />
          </div>
          <div className="a-field">
            <label>Bio</label>
            <textarea name="bio" rows={3} defaultValue={a.bio} />
          </div>
          <ImageField name="profile_pic" current={a.profile_pic} label="Profile picture" />
        </div>
        <div className="a-card">
          <h3>
            <i className="fa-solid fa-key"></i> Change password
          </h3>
          <div className="a-field">
            <label>Current password</label>
            <input type="password" name="current_password" autoComplete="current-password" />
          </div>
          <div className="a-field">
            <label>New password (min 8)</label>
            <input type="password" name="new_password" autoComplete="new-password" />
          </div>
          <Submit>
            <i className="fa-solid fa-floppy-disk"></i> Save
          </Submit>
        </div>
      </form>
    </>
  );
}

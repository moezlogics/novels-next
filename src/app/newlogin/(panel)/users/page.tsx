import { col, nextId } from "@/lib/db";
import { back, int, requireAdmin, str } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";
import { ConfirmButton, Flash, Submit } from "@/components/admin/Fields";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Manage Users" };

async function add(fd: FormData) {
  "use server";
  await requireAdmin(true);
  const username = str(fd, "username", 50);
  const email = str(fd, "email", 100).toLowerCase();
  const pw = str(fd, "password", 200);
  if (!username || !email || pw.length < 8) back("/newlogin/users/", "Username, email and an 8+ character password are required", "err");
  const admins = await col.admins();
  if (await admins.findOne({ $or: [{ username }, { email }] })) back("/newlogin/users/", "Username or email already exists", "err");
  await admins.insertOne({ _id: await nextId("admin_users"), username, email, password: await hashPassword(pw), bio: "", profile_pic: "", role: str(fd, "role") === "main_admin" ? "main_admin" : "author", created_at: new Date() });
  back("/newlogin/users/", `User ${username} created`);
}

async function remove(fd: FormData) {
  "use server";
  const me = await requireAdmin(true);
  const id = int(fd, "id")!;
  if (id === me._id) back("/newlogin/users/", "You cannot delete yourself", "err");
  await (await col.admins()).deleteOne({ _id: id });
  back("/newlogin/users/", "User deleted");
}

export default async function Users({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const me = await requireAdmin(true);
  const rows = await (await col.admins()).find({}, { projection: { password: 0 } }).toArray();
  return (
    <>
      <Flash {...await searchParams} />
      <div className="a-main-side" style={{ gridTemplateColumns: "340px minmax(0,1fr)" }}>
        <form action={add} className="a-card">
          <h3>
            <i className="fa-solid fa-user-plus"></i> Add admin / author
          </h3>
          <div className="a-field">
            <label>Username</label>
            <input type="text" name="username" required />
          </div>
          <div className="a-field">
            <label>Email</label>
            <input type="email" name="email" required />
          </div>
          <div className="a-field">
            <label>Password</label>
            <input type="password" name="password" required minLength={8} />
          </div>
          <div className="a-field">
            <label>Role</label>
            <select name="role">
              <option value="author">Author (novels, pages, comments)</option>
              <option value="main_admin">Main admin (everything)</option>
            </select>
          </div>
          <Submit>Create user</Submit>
        </form>
        <div className="a-table-wrap">
          <table className="a-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u._id}>
                  <td>
                    <b>{u.username}</b> {u._id === me._id ? <span className="a-pill info">you</span> : null}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`a-pill ${u.role === "main_admin" ? "ok" : ""}`}>{u.role.replace("_", " ")}</span>
                  </td>
                  <td className="a-muted">{formatDate(u.created_at, false)}</td>
                  <td style={{ textAlign: "right" }}>
                    {u._id !== me._id ? (
                      <form action={remove}>
                        <input type="hidden" name="id" value={u._id} />
                        <ConfirmButton className="a-btn a-btn-d a-btn-xs" message={`Delete ${u.username}?`}>
                          <i className="fa-solid fa-trash-can"></i>
                        </ConfirmButton>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

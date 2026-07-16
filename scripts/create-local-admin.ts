import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.LOCAL_ADMIN_EMAIL ?? "admin@sisober.local";
  const password = process.env.LOCAL_ADMIN_PASSWORD;
  if (!url || !key || !password) throw new Error("Missing local admin environment variables");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const listed = await db.auth.admin.listUsers();
  if (listed.error) throw listed.error;
  let user = listed.data.users.find((item) => item.email === email);
  if (!user) {
    const created = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: "SISOBER Administrator" } });
    if (created.error) throw created.error;
    user = created.data.user;
  } else {
    const updated = await db.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (updated.error) throw updated.error;
  }
  const profile = await db.from("profiles").upsert({ id: user.id, email, full_name: "SISOBER Administrator", role: "SUPER_ADMIN", active: true });
  if (profile.error) throw profile.error;
  console.log(`Local SUPER_ADMIN ready: ${email}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

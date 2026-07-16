import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.LOCAL_CONTRACTOR_EMAIL;
  const password = process.env.LOCAL_CONTRACTOR_PASSWORD;
  const companyCode = process.env.LOCAL_CONTRACTOR_COMPANY;
  if (!url || !key || !email || !password || !companyCode) throw new Error("Missing contractor environment variables");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const listed = await db.auth.admin.listUsers();
  if (listed.error) throw listed.error;
  let user = listed.data.users.find((item) => item.email === email);
  if (!user) {
    const created = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `${companyCode} Contractor` } });
    if (created.error) throw created.error;
    user = created.data.user;
  } else {
    const updated = await db.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    if (updated.error) throw updated.error;
  }
  const { data: company, error: companyError } = await db.from("companies").select("id,code").eq("code", companyCode).single();
  if (companyError) throw companyError;
  const profile = await db.from("profiles").upsert({ id: user.id, email, full_name: `${companyCode} Contractor`, role: "CONTRACTOR", active: true });
  if (profile.error) throw profile.error;
  const cleared = await db.from("user_company_access").delete().eq("user_id", user.id);
  if (cleared.error) throw cleared.error;
  const access = await db.from("user_company_access").insert({ user_id: user.id, company_id: company.id });
  if (access.error) throw access.error;
  console.log(`Local CONTRACTOR ready: ${email} -> ${company.code}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });

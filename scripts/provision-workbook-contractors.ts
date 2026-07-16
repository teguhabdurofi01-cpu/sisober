import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const companies = ["BMS", "JAM", "MIM", "MRP", "PMS", "REAL", "STM", "TII"];
const makePassword = () => `${randomBytes(18).toString("base64url")}aA7!`;

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resetPasswords = process.env.RESET_CONTRACTOR_PASSWORDS === "true";
  if (!url || !key) throw new Error("Missing Supabase environment");

  const db = createClient(url, key, { auth: { persistSession: false } });
  const listed = await db.auth.admin.listUsers({ perPage: 1000 });
  if (listed.error) throw listed.error;
  const credentials: Array<{ company: string; email: string; temporaryPassword?: string }> = [];

  for (const code of companies) {
    const email = `contractor.${code.toLowerCase()}@sisober.local`;
    const password = makePassword();
    let user = listed.data.users.find((item) => item.email === email);
    let temporaryPassword: string | undefined;

    if (!user) {
      const made = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: `${code} Contractor` } });
      if (made.error) throw made.error;
      user = made.data.user;
      temporaryPassword = password;
    } else if (resetPasswords) {
      const changed = await db.auth.admin.updateUserById(user.id, { password, email_confirm: true });
      if (changed.error) throw changed.error;
      temporaryPassword = password;
    }

    const company = await db.from("companies").select("id").eq("code", code).single();
    if (company.error) throw company.error;
    const profile = await db.from("profiles").upsert({ id: user.id, email, full_name: `${code} Contractor`, role: "CONTRACTOR", active: true });
    if (profile.error) throw profile.error;
    const cleared = await db.from("user_company_access").delete().eq("user_id", user.id);
    if (cleared.error) throw cleared.error;
    const access = await db.from("user_company_access").insert({ user_id: user.id, company_id: company.data.id });
    if (access.error) throw access.error;
    credentials.push({ company: code, email, temporaryPassword });
  }

  await mkdir("outputs", { recursive: true });
  await writeFile("outputs/sisober-staging-credentials.json", JSON.stringify(credentials, null, 2));
  console.log(`Provisioned ${credentials.length} contractor accounts. Credentials saved outside Git tracking.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });

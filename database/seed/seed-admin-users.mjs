/**
 * Seed admin users into Supabase public.users table.
 * Run: node database/seed/seed-admin-users.mjs
 *
 * This creates the super_admin account needed to approve SSO users.
 * It uses the Supabase REST API with the service role key.
 */

const SUPABASE_URL = "https://gtyuajboeffmfskofoyh.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_boQ_U1tSUZLbI7_0-NQvcg_3s_TEjfm";

// Read service role key from env or .env file
let SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!SERVICE_KEY) {
  try {
    const fs = await import("fs");
    const env = fs.readFileSync(new URL("../../.env", import.meta.url), "utf8");
    const match = env.match(/VELURA_SUPABASE_SERVICE_ROLE_KEY=(.*)/);
    if (match) SERVICE_KEY = match[1].trim();
  } catch {}
}

const KEY = SERVICE_KEY || SUPABASE_ANON_KEY;

const ADMIN_USERS = [
  {
    user_id: "33c7a82f-4713-4471-b651-6f0943ea2e50",
    email: "ninhdp23406@st.uel.edu.vn",
    full_name: "Ninh Đoàn Phương",
    phone: null,
    role: "admin",
    admin_role: "super_admin",
    is_active: true,
    is_verified: true,
    avatar: "NP"
  },
  {
    user_id: "a0000000-0000-4000-8000-000000000001",
    email: "admin@velura.vn",
    full_name: "Phạm Thu Hương",
    phone: "0923456789",
    role: "admin",
    admin_role: "super_admin",
    is_active: true,
    is_verified: true,
    avatar: "PH"
  },
  {
    user_id: "a0000000-0000-4000-8000-000000000002",
    email: "product@velura.vn",
    full_name: "Trần Minh Tuấn",
    phone: "0912345678",
    role: "admin",
    admin_role: "admin_operator_sanpham",
    is_active: true,
    is_verified: true,
    avatar: "TT"
  },
  {
    user_id: "a0000000-0000-4000-8000-000000000003",
    email: "order@velura.vn",
    full_name: "Lê Gia Linh",
    phone: "0934567890",
    role: "admin",
    admin_role: "admin_operator_donhang",
    is_active: true,
    is_verified: true,
    avatar: "LG"
  },
  {
    user_id: "a0000000-0000-4000-8000-000000000004",
    email: "price@velura.vn",
    full_name: "Ngô Thanh Sơn",
    phone: "0956789012",
    role: "admin",
    admin_role: "admin_operator_gia_km",
    is_active: true,
    is_verified: true,
    avatar: "NS"
  },
  {
    user_id: "a0000000-0000-4000-8000-000000000005",
    email: "cskh@velura.vn",
    full_name: "Vũ Thanh Mai",
    phone: "0967890123",
    role: "admin",
    admin_role: "admin_operator_cskh_dt",
    is_active: true,
    is_verified: true,
    avatar: "VM"
  },
  {
    user_id: "a0000000-0000-4000-8000-000000000006",
    email: "review@velura.vn",
    full_name: "Đỗ Minh Anh",
    phone: "0978901234",
    role: "admin",
    admin_role: "admin_operator_danhgia_review",
    is_active: true,
    is_verified: true,
    avatar: "DA"
  }
];

async function upsertUser(user) {
  const now = new Date().toISOString();
  const payload = {
    ...user,
    password_hash: null,
    is_quiz_completed: false,
    failed_login_count: 0,
    created_at: now,
    updated_at: now,
    version: 1
  };

  const url = `${SUPABASE_URL}/rest/v1/users`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      apikey: KEY,
      authorization: `Bearer ${KEY}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(payload)
  });

  const text = await resp.text();
  if (!resp.ok) {
    // Try update if insert fails (duplicate)
    const updateResp = await fetch(`${url}?user_id=eq.${user.user_id}`, {
      method: "PATCH",
      headers: {
        apikey: KEY,
        authorization: `Bearer ${KEY}`,
        "content-type": "application/json",
        prefer: "return=representation"
      },
      body: JSON.stringify({ is_active: true, is_verified: true, updated_at: now })
    });
    const updateText = await updateResp.text();
    if (!updateResp.ok) {
      console.error(`  FAIL ${user.email}: ${updateText}`);
      return false;
    }
    console.log(`  UPDATED ${user.email} (${user.admin_role})`);
    return true;
  }

  console.log(`  CREATED ${user.email} (${user.admin_role})`);
  return true;
}

async function main() {
  console.log("=== Seeding Velura Admin Users ===");
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Key: ${KEY.slice(0, 10)}...`);
  console.log(`Users: ${ADMIN_USERS.length}`);
  console.log("");

  let ok = 0;
  let fail = 0;
  for (const user of ADMIN_USERS) {
    try {
      const success = await upsertUser(user);
      if (success) ok++; else fail++;
    } catch (err) {
      console.error(`  ERROR ${user.email}: ${err.message}`);
      fail++;
    }
  }

  console.log("");
  console.log(`Done: ${ok} success, ${fail} failed`);
}

main().catch(console.error);

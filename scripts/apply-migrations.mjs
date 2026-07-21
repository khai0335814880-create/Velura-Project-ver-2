/**
 * Velura — Database Migration Runner
 * Chạy toàn bộ SQL migrations theo thứ tự lên Supabase PostgreSQL.
 *
 * Sử dụng: npm run db:migrate
 * Yêu cầu: Biến SUPABASE_DB_URL trong file .env
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SCRIPT_CONFIG } from './config.mjs';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbUrl = SCRIPT_CONFIG.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('❌ Missing SUPABASE_DB_URL in .env file.');
  console.error('   Example: postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.example:5432/postgres');
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

// Danh sách migration theo thứ tự chạy
const MIGRATIONS = [
  '001_uc_a01_account_rbac.sql',
  '002_uc_a02_products_inventory.sql',
  '003_uc_a03_order_operations.sql',
  '004_uc_a03_order_reader_rbac_fix.sql',
  '005_uc_a04_a05_a06_rpcs.sql',
  '005b_fix_rpc_actor_role.sql',
  '005c_fix_audit_actions.sql',
  '006_admin_unhide_review.sql',
  '006_uc_a01_a06_rls_hardening.sql',
  '007_uc_a04_review_product_read.sql',
  '008_uc_a06_base_sale_price_update.sql',
  '009_fix_database_errors.sql',
  '010_combo_item_table.sql',
  '011_fix_combo_rls_roles.sql',
  '012_chat_tables.sql',
  '013_uc_chatbot_blog_n8n_production.sql',
  '014_recommendation_rag_pgvector.sql',
  '015_deactivate_vouchers_on_promo_pause.sql',
  '015_notifications_table.sql',
  '015_policy_knowledge_content.sql',
  '016_fix_evidence_images_type.sql',
  '017_create_return_evidence_bucket.sql',
  '018_admin_dashboard_summary.sql',
  '020_user_social_accounts.sql',
  '20260717090000_ensure_user_social_accounts_schema_cache.sql',
];

async function main() {
  await client.connect();
  console.log('✅ Connected to Supabase PostgreSQL database.\n');

  const migrationsDir = path.join(__dirname, '../database/migrations');
  let applied = 0;
  let skipped = 0;

  for (const filename of MIGRATIONS) {
    const filePath = path.join(migrationsDir, filename);
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  ${filename} — not found, skipping`);
      skipped++;
      continue;
    }

    console.log(`▶️  Applying ${filename}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await client.query(sql);
      console.log(`   ✅ Done.`);
      applied++;
    } catch (e) {
      // Idempotent migrations may warn on "already exists"
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        console.log(`   ⚠️  Warning (already applied): ${e.message}`);
        applied++;
      } else {
        console.error(`   ❌ FAILED: ${e.message}`);
        throw e;
      }
    }
  }

  await client.end();
  console.log(`\n🎉 Migration complete: ${applied} applied, ${skipped} skipped.`);
}

main().catch(e => {
  console.error('\n❌ Migration failed:', e.message);
  process.exit(1);
});

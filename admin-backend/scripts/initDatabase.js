import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function initDatabase() {
  try {
    console.log('🔄 Starting database initialization...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/001_create_admin_tables.sql');

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Executing migration SQL via Supabase...');

    // Use fetch to execute SQL via Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ sql_string: sqlContent })
    });

    const data = await response.json();

    if (!response.ok) {
      // If RPC method doesn't work, provide instructions
      console.warn('\n⚠️  Automatic migration via API not available.');
      console.log('\n📋 To run the migration manually:');
      console.log('\n1. Go to: https://app.supabase.com/');
      console.log('2. Select your NetQuest project');
      console.log('3. Go to SQL Editor');
      console.log('4. Create a new query');
      console.log('5. Open this file: admin-backend/migrations/001_create_admin_tables.sql');
      console.log('6. Copy the entire contents');
      console.log('7. Paste into Supabase SQL Editor');
      console.log('8. Click "Run"\n');
      process.exit(0);
    }

    console.log('✅ Database initialization completed successfully!');
    console.log('✅ Admin tables created');
    console.log('✅ Indexes created');
    console.log('✅ Profile table updated with admin fields\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message || error);
    console.log('\n📋 Manual migration steps:');
    console.log('\n1. Go to: https://app.supabase.com/');
    console.log('2. Select your NetQuest project');
    console.log('3. Go to SQL Editor');
    console.log('4. Create a new query');
    console.log('5. Open: admin-backend/migrations/001_create_admin_tables.sql');
    console.log('6. Copy and paste into SQL Editor');
    console.log('7. Click Run\n');
    process.exit(1);
  }
}

initDatabase();

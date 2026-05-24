import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initDatabase() {
  try {
    console.log('🔄 Starting database initialization...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/001_create_admin_tables.sql');

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Executing migration SQL...');

    // Execute the migration
    const { error } = await supabase.rpc('exec', {
      sql_string: sql
    }).catch(async () => {
      // If exec RPC doesn't work, try direct execution
      // Split by semicolon and execute each statement
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        const { error } = await supabase.rpc('exec', { sql_string: statement });
        if (error) throw error;
      }

      return { error: null };
    });

    if (error) {
      // Try alternative approach: use pg connection directly
      console.log('📝 Using alternative migration method...');

      const { createPool } = await import('pg');
      const pool = createPool({
        connectionString: `${supabaseUrl.replace('https://', 'postgresql://')}?sslmode=require`,
        password: supabaseKey,
      });

      const client = await pool.connect();
      try {
        await client.query(sql);
        await client.end();
        await pool.end();
      } catch (err) {
        throw err;
      }
    }

    console.log('✅ Database initialization completed successfully!');
    console.log('✅ Admin tables created');
    console.log('✅ Indexes created');
    console.log('✅ Profile table updated');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Database initialization failed:');
    console.error(error.message || error);
    process.exit(1);
  }
}

initDatabase();

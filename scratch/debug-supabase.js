const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';

console.log('URL:', supabaseUrl);
console.log('Secret Key exists:', !!supabaseSecretKey);
console.log('Secret Key starts with:', supabaseSecretKey.substring(0, 10));

const supabase = createClient(supabaseUrl, supabaseSecretKey);

async function test() {
  console.log('Testing connection...');
  const { data, error } = await supabase.from('posts').select('id').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Data:', data);
  }
}

test();

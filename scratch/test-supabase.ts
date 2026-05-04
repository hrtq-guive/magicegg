import { supabaseAdmin } from './lib/supabase-admin';

async function testSupabase() {
  console.log('Testing Supabase Admin connection...');
  try {
    const { data, error } = await supabaseAdmin.from('posts').select('count').limit(1);
    if (error) {
      console.error('Supabase Error:', error);
    } else {
      console.log('Supabase Connection Successful! Found data:', data);
    }
  } catch (err) {
    console.error('Connection failed:', err);
  }
}

testSupabase();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pcajzumjzoerzjnssjpt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYWp6dW1qem9lcnpqbnNzanB0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc3MjUyNSwiZXhwIjoyMDkzMzQ4NTI1fQ.J5w38MhKUgULNCGn89UhBKZJ9xN-ySVedidxRozpVmY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking egg_keys...');
  const { data: keys, error: keysError } = await supabase.from('egg_keys').select('*').limit(1);
  if (keysError) console.error('egg_keys error:', keysError.message);
  else {
    console.log('egg_keys exists!');
    if (keys.length > 0) console.log('egg_keys columns:', Object.keys(keys[0]));
    else console.log('egg_keys is empty');
  }

  console.log('Checking egg_participants...');
  const { data: participants, error: partError } = await supabase.from('egg_participants').select('*').limit(1);
  if (partError) console.error('egg_participants error:', partError.message);
  else {
    console.log('egg_participants exists!');
    if (participants.length > 0) console.log('egg_participants columns:', Object.keys(participants[0]));
    else console.log('egg_participants is empty');
  }
}

checkTables();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkParticipants(eggId) {
  console.log(`Checking participants for egg: ${eggId}`);
  
  const { data: egg, error: eggError } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('id', eggId)
    .single();
    
  if (eggError) {
    console.error('Egg not found:', eggError);
    return;
  }
  
  console.log('Egg found:', {
    id: egg.id,
    unlock_type: egg.unlock_type,
    unlock_value: egg.unlock_value
  });
  
  const { data: participants, error: pError } = await supabaseAdmin
    .from('egg_participants')
    .select('*')
    .eq('post_id', eggId);
    
  if (pError) {
    console.error('Error fetching participants:', pError);
    return;
  }
  
  console.log(`Found ${participants.length} participants:`);
  participants.forEach(p => {
    console.log(`- ${p.email}: verified=${p.is_verified}, active=${p.last_active}, token=${p.token}`);
  });
}

const eggId = 'bm3ucx';
checkParticipants(eggId);

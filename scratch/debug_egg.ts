import { supabaseAdmin } from './lib/supabase-admin';

async function debug() {
  const eggId = '6mu37v';
  console.log(`Checking egg: ${eggId}`);

  const { data: egg, error: eggError } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('id', eggId)
    .single();

  if (eggError) {
    console.error('Egg error:', eggError);
    return;
  }
  console.log('Egg found:', egg.unlock_type, egg.unlock_value);

  const { data: participants, error: pError } = await supabaseAdmin
    .from('egg_participants')
    .select('*')
    .eq('post_id', eggId);

  if (pError) {
    console.error('Participants error:', pError);
    return;
  }
  console.log('Participants:', participants.length);
  participants.forEach(p => {
    console.log(`- ${p.email}: verified=${p.is_verified}, last_active=${p.last_active}`);
  });
}

debug();

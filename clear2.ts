
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase.from('render_jobs').update({ orchestration_state: 'failed' }).eq('orchestration_state', 'queued').neq('id', '0354c9a4-07dd-4ada-a918-9fae8da99361');
  console.log('Cleared old queued jobs', error || 'Success');
})();


import { supabase } from '@/lib/db';

export async function getApiKey(provider: string, envVarName?: string): Promise<string | undefined> {
  // First check env var if provided
  if (envVarName && process.env[envVarName]) {
    return process.env[envVarName];
  }

  try {
    const { data: keyData } = await supabase
      .from('settings')
      .select('api_key')
      .eq('provider', provider)
      .is('user_id', null)
      .single();

    // The query without user_id if the above fails, since in upload_keys we didn't specify user_id!
    if (keyData?.api_key) {
      return keyData.api_key;
    }
  } catch (err) {}

  try {
    const { data: keyData } = await supabase
      .from('settings')
      .select('api_key')
      .eq('provider', provider)
      .single();
      
    if (keyData?.api_key) {
      return keyData.api_key;
    }
  } catch(err) {}

  return undefined;
}

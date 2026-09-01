const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://agafustlankeieewtvck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODExMjEyOSwiZXhwIjoyMTAzNjg4MTI5fQ.L_owY5SAFbdKPu5uT0YJA7BIstKCJuRQg77NY4zKIGA'
);

const keys = [
  { provider: 'api_openai', api_key: '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', is_active: true },
  { provider: 'api_gemini', api_key: 'AQ.Ab8RN6JErJZ7gKdQHPn0Vjcm2Xzb7Lt8g53knhbJviYcF9F0HA', is_active: true },
  { provider: 'api_openrouter', api_key: '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', is_active: true },
  { provider: 'api_grok', api_key: 'xai-a3tZ53wv6fcJFwUAjEnipIcTTHKTX9see5IcPS8DvzZDT83r6AbehpzaqClrNdp0rQ4Ziqm3aJCGLPOR', is_active: true },
  { provider: 'api_deepseek', api_key: 'sk-63763ddcb1814db7b48d7f0111985cfd', is_active: true },
  { provider: 'api_groq', api_key: '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', is_active: true },
  { provider: 'api_cerebras', api_key: 'csk-3n8fmyy9kr4nhhxmr2rx8882hdnvkwt9c32p48mr3f4jxk5f', is_active: true },
  { provider: 'api_mistral', api_key: 'gf9ljNgLE5rkXJmIzRPrJngTSwZKCEvU', is_active: true },
  { provider: 'api_github_models', api_key: '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', is_active: true },
  { provider: 'api_pexels', api_key: 'CL3vMv8uecy3CSopY3UudhJ6ZiSF6NaeT5sqdBbfc7OdlGpAhPvCIYLy', is_active: true },
  { provider: 'api_pixabay', api_key: '56980861-d15ab2801db27206ba14dc6ef', is_active: true },
  { provider: 'api_deepgram', api_key: 'ccf821a027aacb1bf937a3cfe90c18bbebd51bf3', is_active: true },
  { provider: 'api_elevenlabs', api_key: 'sk_96581c0ed526464c1f1a1f5d7cfbcc42938a81e2d0cff201', is_active: true },
  { provider: 'api_anthropic', api_key: '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', is_active: true },
  { provider: 'api_suno', api_key: 'sk-45188d4a2b6054ecd7f6be22f3d902c62e96432a51677c81', is_active: true }
];

async function run() {
  const { data: all } = await supabase.from('settings').select('id');
  if (all && all.length) {
     const ids = all.map(row => row.id);
     await supabase.from('settings').delete().in('id', ids);
  }
  const { data, error } = await supabase.from('settings').insert(keys);
  if (error) {
    console.error('Error inserting:', error.message);
  } else {
    console.log('Successfully inserted all keys with api_ prefix');
  }
}
run();

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://agafustlankeieewtvck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODExMjEyOSwiZXhwIjoyMTAzNjg4MTI5fQ.L_owY5SAFbdKPu5uT0YJA7BIstKCJuRQg77NY4zKIGA'
);

async function main() {
  const content = fs.readFileSync('C:\\Users\\vigilare\\Downloads\\settings_rows.csv', 'utf-8');
  const lines = content.trim().split('\n').slice(1);
  const rows = lines.map(line => {
    const parts = line.split(',');
    return {
      id: parts[0],
      provider: parts[2],
      api_key: parts[3],
      is_active: parts[4] === 'true',
      priority: parseInt(parts[5], 10),
      created_at: parts[6],
      updated_at: parts[7]
    };
  });

  const { data, error } = await supabase.from('settings').upsert(rows);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Successfully uploaded', rows.length, 'keys to Supabase!');
  }
}
main();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://agafustlankeieewtvck.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnYWZ1c3RsYW5rZWllZXd0dmNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODExMjEyOSwiZXhwIjoyMTAzNjg4MTI5fQ.L_owY5SAFbdKPu5uT0YJA7BIstKCJuRQg77NY4zKIGA';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  console.log('Creating admin user...');
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@prostudio.com',
    password: 'password123',
    email_confirm: true
  });

  if (error) {
    console.error('Error creating user:', error.message);
  } else {
    console.log('Successfully created default user!');
    console.log('Email: admin@prostudio.com');
    console.log('Password: password123');
    console.log('User ID:', data.user.id);
  }
}

createAdminUser();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createAdminUser() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: 'admin@clipped.ai',
    password: 'admin',
    email_confirm: true
  });

  if (error) {
    console.error("Error creating user:", error);
  } else {
    console.log("Success! User created:", data.user.id);
  }
}

createAdminUser();

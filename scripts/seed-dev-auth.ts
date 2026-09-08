import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

const rootDir = path.resolve(__dirname, '..')
const envLocalPath = path.join(rootDir, '.env.local')
const envPath = path.join(rootDir, '.env')

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath })
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const isProduction = process.env.NODE_ENV === 'production'
if (isProduction || process.env.ENABLE_DEV_DEFAULT_USER !== 'true') {
  throw new Error(
    'Refusing to seed the default user. Set ENABLE_DEV_DEFAULT_USER=true in a non-production environment.',
  )
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.',
  )
}

const email = process.env.DEV_DEFAULT_USER_EMAIL || 'admin@prostudio.com'
const password = process.env.DEV_DEFAULT_USER_PASSWORD || 'admin'
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function seedDefaultUser() {
  const existing = await supabase.auth.admin.getUserByEmail(email)
  if (existing.error && existing.error.status !== 404) {
    throw existing.error
  }

  let userId = existing.data.user?.id
  if (userId) {
    const updated = await supabase.auth.admin.updateUserById(userId, {
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'Studio Admin', role: 'admin' },
    })
    if (updated.error) throw updated.error
  } else {
    const created = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: 'Studio Admin', role: 'admin' },
    })
    if (created.error || !created.data.user) {
      throw created.error || new Error('Supabase did not return the created user.')
    }
    userId = created.data.user.id
  }

  const profile = await supabase.from('users').upsert({
    id: userId,
    email,
    name: 'Studio Admin',
    tier: 'enterprise',
  })
  if (profile.error) throw profile.error

  console.log(`Default development user ready: ${email}`)
}

seedDefaultUser().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
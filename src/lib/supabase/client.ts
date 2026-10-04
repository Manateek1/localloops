import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const expectedProjectRef = import.meta.env.VITE_SUPABASE_PROJECT_REF

function isExpectedProject() {
  if (!supabaseUrl || !expectedProjectRef) return false
  try {
    return new URL(supabaseUrl).hostname.split('.')[0] === expectedProjectRef
  } catch {
    return false
  }
}

// Public event discovery can run without Supabase. Account actions require all three LocalLoops
// settings, including the expected project ref, so another product's Supabase URL cannot be used by mistake.
// Only a publishable key belongs in this browser client; never use a secret/service key here.
export const supabaseClient: SupabaseClient<Database> | null =
  supabaseUrl && publishableKey && isExpectedProject()
    ? createClient<Database>(supabaseUrl, publishableKey)
    : null

export const isSupabaseConfigured = supabaseClient !== null

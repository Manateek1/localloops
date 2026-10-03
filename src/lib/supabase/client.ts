import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Keeping this nullable lets the local demo run without a Supabase project.
// Only a publishable key belongs in this browser client; never use a secret/service key here.
export const supabaseClient: SupabaseClient<Database> | null =
  supabaseUrl && publishableKey
    ? createClient<Database>(supabaseUrl, publishableKey)
    : null

export const isSupabaseConfigured = supabaseClient !== null

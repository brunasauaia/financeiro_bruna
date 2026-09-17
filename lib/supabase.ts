import { createClient } from '@supabase/supabase-js'

// Fallbacks only exist so `next build` succeeds before env vars are configured.
// At runtime the real values must be set in .env.local.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseKey)

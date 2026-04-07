import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://supabase.com/dashboard/project/ogmrzbtxylazkffnbvyk/settings/api-keys'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbXJ6YnR4eWxhemtmZm5idnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODI1MjQsImV4cCI6MjA5MTE1ODUyNH0.ZZdxM-dYXBEIIu9_TXBqXkQcM_cGF2tEzji-X0A5ukg'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

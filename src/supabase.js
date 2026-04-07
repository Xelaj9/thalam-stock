import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ogmrzbtxylazkffnbvyk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbXJ6YnR4eWxhemtmZm5idnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODI1MjQsImV4cCI6MjA5MTE1ODUyNH0.ZZdxM-dYXBEIIu9_TXBqXkQcM_cGF2tEzji-X0A5ukg'
)

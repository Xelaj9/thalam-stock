import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ogmrzbtxylazkffnbvyk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nbXJ6YnR4eWxhemtmZm5idnlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NjkwODEsImV4cCI6MjA2NTQ0NTA4MX0.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
)
import { createClient } from '@supabase/supabase-js';

// Hardcoded for Expo Go compatibility
const supabaseUrl = 'https://qimrsnytbfsjpisvdudq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbXJzbnl0YmZzanBpc3ZkdWRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxNTQxNDUsImV4cCI6MjA4NTczMDE0NX0.zxO_io4FLCwCXCudmET0Zj47RH8jwCxF-p1tcJuJidM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export { supabaseUrl, supabaseAnonKey };

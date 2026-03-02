// TEMPORARY SCRIPT: Used for testing manual database inserts against Supabase to debug RLS/constraint issues.
// TODO: Find and eliminate this script later if no longer needed.
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'dev@nxtup.test',
    password: 'password123'
  });
  if (authError) { console.error("Auth error", authError); return; }

  const { data: workspaces } = await supabase.from('workspaces').select('id').limit(1);
  const workspaceId = workspaces[0].id;

  const { data, error } = await supabase.from('task_lists').insert({
    workspace_id: workspaceId,
    group_id: null,
    type: 'other',
    title: 'Test List',
    sort_order: Math.floor(Date.now() / 1000)
  }).select('*');
  console.log("Insert result:", { data, error });
}
test();

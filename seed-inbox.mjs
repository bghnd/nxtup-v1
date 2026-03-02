// TEMPORARY SCRIPT: Used to seed initial 'Inbox' lists for workspaces during development/testing.
// TODO: Find and eliminate this script once workspace initialization is fully handled by the backend or migrations.
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: 'dev@nxtup.test',
        password: 'password123'
    });
    if (authError) {
        console.error('Auth err', authError);
        return;
    }

    const { data: workspaces } = await supabase.from('workspaces').select('id');
    if (!workspaces) return;

    for (const ws of workspaces) {
        const { data: inboxes } = await supabase
            .from('task_lists')
            .select('id')
            .eq('workspace_id', ws.id)
            .eq('type', 'inbox');

        if (!inboxes || inboxes.length === 0) {
            console.log('Adding Inbox to workspace', ws.id);
            const { error } = await supabase.from('task_lists').insert({
                workspace_id: ws.id,
                group_id: null,
                type: 'inbox',
                title: 'Inbox',
                sort_order: Math.floor(Date.now() / 1000)
            });
            if (error) console.error(error);
        } else {
            console.log('Inbox exists for', ws.id);
        }
    }
}
run();

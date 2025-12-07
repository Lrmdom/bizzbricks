// app/utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase(supabaseUrl = import.meta.env.VITE_SUPABASE_URL, supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY) {
    if (supabaseInstance) {
        return supabaseInstance;
    }

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase environment variables');
        throw new Error('Supabase configuration is missing');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    return supabaseInstance;
}
export function getSupabaseAdmin(supabaseUrl = import.meta.env.VITE_SUPABASE_URL, supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    if (supabaseInstance) {
        return supabaseInstance;
    }

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase environment variables');
        throw new Error('Supabase configuration is missing');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    return supabaseInstance;
}

export const supabase = getSupabase();
export const supabaseAdmin = getSupabaseAdmin();
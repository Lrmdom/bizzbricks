// app/utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase(supabaseUrl = "https://oamykovdfnfoktuvhdhg.supabase.co", supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hbXlrb3ZkZm5mb2t0dXZoZGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwMjMyMjUsImV4cCI6MjA3NTU5OTIyNX0.N-3S5PwvVBUp3PPbPeoSA-zE5QRJdGu6lhkTAnzUDi4") {
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
export function getSupabaseAdmin(supabaseUrl = "https://oamykovdfnfoktuvhdhg.supabase.co", supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hbXlrb3ZkZm5mb2t0dXZoZGhnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDAyMzIyNSwiZXhwIjoyMDc1NTk5MjI1fQ.EOEmCmGrFZElDDPxwEgriV5dMxjuZ4OWfnpdwesrCwM") {
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
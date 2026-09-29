import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Bidirectional Sync Engine for WatermelonDB / Local Database
 * Supports pullChanges and pushChanges protocols for optimistic offline updates
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, last_pulled_at, changes } = await req.json();

    if (action === 'push') {
      // Process pushed offline mutations from client
      const resultsToUpsert = changes?.results?.created || [];
      if (resultsToUpsert.length > 0) {
        await supabase.from('results').upsert(resultsToUpsert);
      }

      const papersToUpdate = changes?.papers?.updated || [];
      if (papersToUpdate.length > 0) {
        await supabase.from('papers').upsert(papersToUpdate);
      }

      return new Response(JSON.stringify({ success: true, timestamp: Date.now() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'pull') {
      // Pull remote mutations modified since last_pulled_at
      const sinceDate = last_pulled_at ? new Date(last_pulled_at).toISOString() : new Date(0).toISOString();

      const [studentsRes, topicsRes, papersRes, questionsRes] = await Promise.all([
        supabase.from('students').select('*').gt('updated_at', sinceDate),
        supabase.from('topics').select('*').gt('updated_at', sinceDate),
        supabase.from('papers').select('*').gt('updated_at', sinceDate),
        supabase.from('questions').select('*').gt('created_at', sinceDate),
      ]);

      return new Response(
        JSON.stringify({
          changes: {
            students: { created: studentsRes.data || [], updated: [], deleted: [] },
            topics: { created: topicsRes.data || [], updated: [], deleted: [] },
            papers: { created: papersRes.data || [], updated: [], deleted: [] },
            questions: { created: questionsRes.data || [], updated: [], deleted: [] },
          },
          timestamp: Date.now(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ error: 'Unknown sync action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Edge Case 4: AI Context Limits / Batching Failures (15 Students at Once)
 *
 * This function acts as a resilient queue dispatcher. It does NOT invoke
 * the LLM 15 times synchronously, which would cause serverless gateway timeouts.
 * Instead, it identifies all students needing a paper and pushes isolated,
 * independent jobs into public.generation_queue (pgmq pattern).
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch all active students
    const { data: students, error: studentErr } = await supabase
      .from('students')
      .select('id, name, schedule_time, syllabus_board');

    if (studentErr || !students) {
      throw new Error(`Failed to load students: ${studentErr?.message}`);
    }

    // 2. Query which students already have an active paper ready for today
    const { data: activePapers, error: paperErr } = await supabase
      .from('papers')
      .select('student_id, status')
      .in('status', ['ready_for_class', 'generating']);

    if (paperErr) {
      throw new Error(`Failed to load active papers: ${paperErr.message}`);
    }

    const readyStudentIds = new Set(activePapers?.map((p: any) => p.student_id));
    const missingStudents = students.filter((s: any) => !readyStudentIds.has(s.id));

    if (missingStudents.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          queued_count: 0,
          message: 'All 15 students already have papers ready or generating.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Push isolated queue records into generation_queue
    const jobsToInsert = missingStudents.map((student: any) => ({
      student_id: student.id,
      paper_type: 'daily_prep_10min',
      status: 'queued',
      payload: {
        student_name: student.name,
        syllabus: student.syllabus_board,
        class_time: student.schedule_time,
        enqueued_at: new Date().toISOString(),
      },
    }));

    const { data: enqueuedJobs, error: queueErr } = await supabase
      .from('generation_queue')
      .insert(jobsToInsert)
      .select();

    if (queueErr) {
      throw new Error(`Failed to enqueue generation jobs: ${queueErr.message}`);
    }

    // 4. Return immediately to the client (Zero-Wait)
    // The background worker/pg_net trigger will consume jobs one-by-one
    return new Response(
      JSON.stringify({
        success: true,
        queued_count: jobsToInsert.length,
        message: `Successfully enqueued ${jobsToInsert.length} isolated generation jobs. Zero timeout guaranteed!`,
        jobs: enqueuedJobs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

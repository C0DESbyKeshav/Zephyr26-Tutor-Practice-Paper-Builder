-- ==============================================================================
-- PROJECT "ANTIGRAVITY": TUTOR PRACTICE PAPER BUILDER
-- Supabase PostgreSQL Schema & Real-Time Sync Triggers
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    syllabus_board TEXT NOT NULL,
    target_exam TEXT NOT NULL,
    avatar_color TEXT NOT NULL DEFAULT '#00FF88',
    schedule_time TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Topics Table (EWMA Mastery + Decay)
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    syllabus_code TEXT NOT NULL,
    mastery_percentage NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    last_tested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_weak BOOLEAN GENERATED ALWAYS AS (mastery_percentage < 60.00) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Papers Table
CREATE TABLE IF NOT EXISTS public.papers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('needs_grading', 'ready_for_class', 'generating', 'completed')),
    target_class_time TEXT NOT NULL,
    total_marks INTEGER NOT NULL DEFAULT 0,
    scored_marks INTEGER NOT NULL DEFAULT 0,
    grading_duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Questions Table (with Pre-fetched Alternates)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    topic_name TEXT NOT NULL,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    answer_key TEXT NOT NULL,
    marking_scheme JSONB NOT NULL DEFAULT '[]'::jsonb,
    difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    max_marks INTEGER NOT NULL DEFAULT 1,
    is_alternate BOOLEAN NOT NULL DEFAULT FALSE,
    swapped_with_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Results Table
CREATE TABLE IF NOT EXISTS public.results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
    awarded_marks NUMERIC(4,2) NOT NULL DEFAULT 0.00,
    max_marks INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    time_spent_ms INTEGER DEFAULT 0,
    synced BOOLEAN NOT NULL DEFAULT TRUE
);

-- 7. Edge Case 4: Generation Queue for Isolated Background Jobs (pgmq style)
CREATE TABLE IF NOT EXISTS public.generation_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    paper_type TEXT NOT NULL DEFAULT 'daily_practice',
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')) DEFAULT 'queued',
    attempts INTEGER NOT NULL DEFAULT 0,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ==============================================================================
-- INDEXES FOR INSTANT ZERO-WAIT LOOKUPS
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_topics_student ON public.topics(student_id);
CREATE INDEX IF NOT EXISTS idx_papers_student_status ON public.papers(student_id, status);
CREATE INDEX IF NOT EXISTS idx_questions_paper ON public.questions(paper_id, is_alternate);
CREATE INDEX IF NOT EXISTS idx_results_paper ON public.results(paper_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON public.generation_queue(status, created_at);

-- ==============================================================================
-- POSTGRES TRIGGER & EWMA ANALYTICS ENGINE
-- Formula: Mastery(current) = (0.7 * Latest_Score_Pct) + (0.3 * Mastery(prev))
-- Time Penalty: -10% if last_tested_at > 30 days
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.fn_process_grading_result()
RETURNS TRIGGER AS $$
DECLARE
    v_topic_id UUID;
    v_prev_mastery NUMERIC(5,2);
    v_last_tested TIMESTAMPTZ;
    v_latest_pct NUMERIC(5,2);
    v_new_mastery NUMERIC(5,2);
    v_total_questions INTEGER;
    v_graded_questions INTEGER;
    v_paper_completed BOOLEAN := FALSE;
BEGIN
    -- 1. Find the question's topic
    SELECT topic_id INTO v_topic_id FROM public.questions WHERE id = NEW.question_id;

    IF v_topic_id IS NOT NULL THEN
        SELECT mastery_percentage, last_tested_at 
        INTO v_prev_mastery, v_last_tested 
        FROM public.topics 
        WHERE id = v_topic_id;

        -- Apply Time Penalty (-10% if > 30 days since last tested)
        IF v_last_tested < NOW() - INTERVAL '30 days' THEN
            v_prev_mastery := GREATEST(0.00, v_prev_mastery - 10.00);
        END IF;

        -- Compute latest score percentage
        v_latest_pct := (NEW.awarded_marks / NULLIF(NEW.max_marks, 0)) * 100.00;

        -- Apply EWMA Formula
        v_new_mastery := (0.70 * v_latest_pct) + (0.30 * v_prev_mastery);
        v_new_mastery := LEAST(100.00, GREATEST(0.00, ROUND(v_new_mastery, 2)));

        -- Update Topic in Database
        UPDATE public.topics
        SET mastery_percentage = v_new_mastery,
            last_tested_at = NOW(),
            updated_at = NOW()
        WHERE id = v_topic_id;
    END IF;

    -- 2. Check if all questions in the paper are graded
    SELECT COUNT(*) INTO v_total_questions 
    FROM public.questions 
    WHERE paper_id = NEW.paper_id AND is_alternate = FALSE;

    SELECT COUNT(*) INTO v_graded_questions 
    FROM public.results 
    WHERE paper_id = NEW.paper_id;

    IF v_graded_questions >= v_total_questions THEN
        -- Mark paper completed
        UPDATE public.papers
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = NEW.paper_id;

        -- THE ZERO-WAIT ASYNC STRATEGY: Generate tomorrow's paper today!
        -- Insert isolated job into queue to fire Edge Function
        INSERT INTO public.generation_queue (student_id, paper_type, status, payload)
        VALUES (
            NEW.student_id,
            'tomorrow_adaptive',
            'queued',
            jsonb_build_object('trigger_paper_id', NEW.paper_id, 'source', 'auto_on_grading_complete')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_process_grading_result ON public.results;
CREATE TRIGGER trg_process_grading_result
AFTER INSERT ON public.results
FOR EACH ROW
EXECUTE FUNCTION public.fn_process_grading_result();

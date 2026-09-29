export type SyllabusBoard = 
  | 'IB DP Math AA' 
  | 'Cambridge IGCSE' 
  | 'AP Calculus BC' 
  | 'CBSE Class 10/12' 
  | 'A-Level Physics' 
  | 'AP Physics C' 
  | 'General STEM';

export type PaperStatus = 'needs_grading' | 'ready_for_class' | 'generating' | 'completed';

export interface Student {
  id: string;
  name: string;
  grade: string;
  syllabus_board: SyllabusBoard;
  target_exam: string;
  avatar_color: string;
  schedule_time: string; // e.g. "08:30 AM"
  notes?: string;
  created_at: number;
  updated_at: number;
}

export interface Topic {
  id: string;
  student_id: string;
  name: string;
  syllabus_code: string;
  mastery_percentage: number; // 0 - 100 EWMA
  last_tested_at: number; // Unix timestamp ms
  is_weak: boolean; // < 60% flags "Needs Intervention"
  created_at: number;
  updated_at: number;
}

export interface MarkingStep {
  step_number: number;
  description: string;
  marks: number;
}

export interface Question {
  id: string;
  paper_id: string;
  topic_id: string;
  topic_name: string;
  question_number: number;
  question_text: string;
  answer_key: string;
  marking_scheme: string[]; // Steps breakdown
  difficulty: 1 | 2 | 3 | 4 | 5; // 1-2 weak intervention, 4-5 challenge
  max_marks: number;
  is_alternate: boolean; // True if this is a pre-fetched alternate question
  swapped_with_id?: string;
  order_index: number;
}

export interface Paper {
  id: string;
  student_id: string;
  title: string;
  status: PaperStatus;
  target_class_time: string;
  total_marks: number;
  scored_marks: number;
  grading_duration_seconds?: number;
  created_at: number;
  updated_at: number;
}

export interface Result {
  id: string;
  question_id: string;
  student_id: string;
  paper_id: string;
  awarded_marks: number;
  max_marks: number;
  is_correct: boolean;
  graded_at: number;
  time_spent_ms?: number;
  synced: boolean;
}

export interface UndoAction {
  id: string;
  questionId: string;
  paperId: string;
  studentId: string;
  cardIndex: number;
  awardedMarks: number;
  maxMarks: number;
  previousScoredMarks: number;
  resultId: string;
  timestamp: number;
}

export interface SyncQueueItem {
  id: string;
  table_name: 'results' | 'papers' | 'questions' | 'topics' | 'students';
  record_id: string;
  action: 'insert' | 'update' | 'delete';
  payload: Record<string, any>;
  attempts: number;
  created_at: number;
}

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncedAt: number | null;
  isSyncing: boolean;
}

export interface AICreatedQuestion {
  question_text: string;
  topic_name: string;
  topic_id?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  max_marks: number;
  answer_key: string;
  marking_scheme: string[];
  is_alternate?: boolean;
}

export interface AIPaperGenerationResponse {
  paper_title: string;
  student_id: string;
  questions: AICreatedQuestion[];
  alternate_questions: AICreatedQuestion[];
}

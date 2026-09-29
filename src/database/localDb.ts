import type { Student, Topic, Paper, Question, Result, SyncQueueItem, UndoAction, SyncStatus } from '../types';
import { INITIAL_STUDENTS, INITIAL_TOPICS, INITIAL_PAPERS, INITIAL_QUESTIONS } from './seedData';
import { AnalyticsEngine } from '../services/analyticsEngine';
import { gradingUndoStack } from '../services/undoStack';

const STORAGE_KEYS = {
  STUDENTS: 'antigravity_students_v1',
  TOPICS: 'antigravity_topics_v1',
  PAPERS: 'antigravity_papers_v1',
  QUESTIONS: 'antigravity_questions_v1',
  RESULTS: 'antigravity_results_v1',
  SYNC_QUEUE: 'antigravity_sync_queue_v1',
  LAST_SYNC: 'antigravity_last_sync_v1',
};

type Listener = () => void;

class LocalDatabase {
  private students: Map<string, Student> = new Map();
  private topics: Map<string, Topic> = new Map();
  private papers: Map<string, Paper> = new Map();
  private questions: Map<string, Question> = new Map();
  private results: Map<string, Result> = new Map();
  private syncQueue: SyncQueueItem[] = [];
  private listeners: Set<Listener> = new Set();
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing: boolean = false;
  private lastSyncedAt: number | null = null;

  constructor() {
    this.init();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  private init() {
    try {
      const storedStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      if (storedStudents) {
        this.students = new Map(JSON.parse(storedStudents).map((s: Student) => [s.id, s]));
        this.topics = new Map(JSON.parse(localStorage.getItem(STORAGE_KEYS.TOPICS) || '[]').map((t: Topic) => [t.id, t]));
        this.papers = new Map(JSON.parse(localStorage.getItem(STORAGE_KEYS.PAPERS) || '[]').map((p: Paper) => [p.id, p]));
        this.questions = new Map(JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]').map((q: Question) => [q.id, q]));
        this.results = new Map(JSON.parse(localStorage.getItem(STORAGE_KEYS.RESULTS) || '[]').map((r: Result) => [r.id, r]));
        this.syncQueue = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE) || '[]');
        const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
        this.lastSyncedAt = lastSync ? parseInt(lastSync, 10) : null;
      } else {
        this.resetToInitialSeed();
      }
    } catch {
      this.resetToInitialSeed();
    }
  }

  public resetToInitialSeed() {
    this.students = new Map(INITIAL_STUDENTS.map(s => [s.id, { ...s }]));
    this.topics = new Map(INITIAL_TOPICS.map(t => [t.id, { ...t }]));
    this.papers = new Map(INITIAL_PAPERS.map(p => [p.id, { ...p }]));
    this.questions = new Map(INITIAL_QUESTIONS.map(q => [q.id, { ...q }]));
    this.results = new Map();
    this.syncQueue = [];
    gradingUndoStack.clear();
    this.lastSyncedAt = Date.now();
    this.persist();
    this.notify();
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(Array.from(this.students.values())));
      localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(Array.from(this.topics.values())));
      localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(Array.from(this.papers.values())));
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(Array.from(this.questions.values())));
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(Array.from(this.results.values())));
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(this.syncQueue));
      if (this.lastSyncedAt) {
        localStorage.setItem(STORAGE_KEYS.LAST_SYNC, this.lastSyncedAt.toString());
      }
    } catch (err) {
      console.warn('Local database persistence warning:', err);
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  private handleNetworkChange(online: boolean) {
    this.isOnline = online;
    this.notify();
    if (online) {
      this.flushSyncQueue();
    }
  }

  // --- Read Methods ---

  public getStudents(): Student[] {
    return Array.from(this.students.values());
  }

  public getStudentById(id: string): Student | undefined {
    return this.students.get(id);
  }

  public getTopicsForStudent(studentId: string): Topic[] {
    return Array.from(this.topics.values()).filter(t => t.student_id === studentId);
  }

  public getPapers(): Paper[] {
    return Array.from(this.papers.values());
  }

  public getPaperById(id: string): Paper | undefined {
    return this.papers.get(id);
  }

  public getQuestionsForPaper(paperId: string): Question[] {
    return Array.from(this.questions.values())
      .filter(q => q.paper_id === paperId && !q.is_alternate)
      .sort((a, b) => a.order_index - b.order_index);
  }

  public getAlternateQuestionsForPaper(paperId: string): Question[] {
    return Array.from(this.questions.values())
      .filter(q => q.paper_id === paperId && q.is_alternate);
  }

  public getResultsForPaper(paperId: string): Result[] {
    return Array.from(this.results.values()).filter(r => r.paper_id === paperId);
  }

  public getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      pendingCount: this.syncQueue.length,
      lastSyncedAt: this.lastSyncedAt,
      isSyncing: this.isSyncing,
    };
  }

  // --- Write Operations (Optimistic Local-First) ---

  /**
   * Flow B: Record Grading Result (Zero wait, instant local update + EWMA recalculation)
   */
  public recordGradingResult(params: {
    questionId: string;
    paperId: string;
    studentId: string;
    awardedMarks: number;
    maxMarks: number;
    cardIndex: number;
  }): { result: Result; isPaperComplete: boolean } {
    const { questionId, paperId, studentId, awardedMarks, maxMarks, cardIndex } = params;
    const now = Date.now();
    const resultId = `res_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const isCorrect = awardedMarks === maxMarks;

    const paper = this.papers.get(paperId);
    const previousScored = paper ? paper.scored_marks : 0;

    const newResult: Result = {
      id: resultId,
      question_id: questionId,
      student_id: studentId,
      paper_id: paperId,
      awarded_marks: awardedMarks,
      max_marks: maxMarks,
      is_correct: isCorrect,
      graded_at: now,
      synced: false,
    };

    this.results.set(resultId, newResult);

    // Push action onto UndoStack for Edge Case 2 rollback
    gradingUndoStack.push({
      id: `undo_${now}`,
      questionId,
      paperId,
      studentId,
      cardIndex,
      awardedMarks,
      maxMarks,
      previousScoredMarks: previousScored,
      resultId,
      timestamp: now,
    });

    // Update Paper
    const activeQuestions = this.getQuestionsForPaper(paperId);
    const currentResults = this.getResultsForPaper(paperId);
    const totalScored = currentResults.reduce((acc, r) => acc + r.awarded_marks, 0);
    const isPaperComplete = currentResults.length >= activeQuestions.length;

    if (paper) {
      paper.scored_marks = totalScored;
      if (isPaperComplete) {
        paper.status = 'completed';
      }
      paper.updated_at = now;
      this.papers.set(paperId, { ...paper });
    }

    // Update Topic EWMA Mastery & Intervention Flag
    const question = this.questions.get(questionId);
    if (question && question.topic_id) {
      const topic = this.topics.get(question.topic_id);
      if (topic) {
        const topicResults = currentResults.filter(r => {
          const q = this.questions.get(r.question_id);
          return q?.topic_id === topic.id;
        });
        const updatedTopic = AnalyticsEngine.updateTopicAfterGrading(topic, topicResults, now);
        this.topics.set(topic.id, updatedTopic);
      }
    }

    // Enqueue for background sync
    this.enqueueSync({
      id: `sync_${now}`,
      table_name: 'results',
      record_id: resultId,
      action: 'insert',
      payload: newResult,
      attempts: 0,
      created_at: now,
    });

    this.persist();
    this.notify();

    // If paper completed, trigger background sync & auto-prep next paper
    if (isPaperComplete) {
      this.triggerAutoPrepNextPaper(studentId);
    }

    return { result: newResult, isPaperComplete };
  }

  /**
   * Flow B: Rewind / Undo Action (Edge Case 2)
   */
  public undoLastGrading(): UndoAction | null {
    const action = gradingUndoStack.pop();
    if (!action) return null;

    // Remove the result from local DB
    this.results.delete(action.resultId);

    // Rollback paper scored marks
    const paper = this.papers.get(action.paperId);
    if (paper) {
      paper.scored_marks = action.previousScoredMarks;
      if (paper.status === 'completed') {
        paper.status = 'needs_grading';
      }
      paper.updated_at = Date.now();
      this.papers.set(action.paperId, { ...paper });
    }

    // Remove from sync queue if not pushed yet
    this.syncQueue = this.syncQueue.filter(item => item.record_id !== action.resultId);

    // Recalculate topic mastery
    const question = this.questions.get(action.questionId);
    if (question && question.topic_id) {
      const topic = this.topics.get(question.topic_id);
      if (topic) {
        const remainingResults = this.getResultsForPaper(action.paperId).filter(r => {
          const q = this.questions.get(r.question_id);
          return q?.topic_id === topic.id;
        });
        const revertedTopic = AnalyticsEngine.updateTopicAfterGrading(topic, remainingResults, Date.now());
        this.topics.set(topic.id, revertedTopic);
      }
    }

    this.persist();
    this.notify();
    return action;
  }

  /**
   * Flow C: Paper Tweaker - Zero-Wait Question Swapping
   * Swaps a question with a pre-fetched alternate question instantly!
   */
  public swapQuestionWithAlternate(questionId: string, alternateId: string): boolean {
    const original = this.questions.get(questionId);
    const alternate = this.questions.get(alternateId);

    if (!original || !alternate) return false;

    const originalOrder = original.order_index;
    const originalNumber = original.question_number;

    // Swap flags and ordering
    original.is_alternate = true;
    original.swapped_with_id = alternate.id;
    original.order_index = 999;

    alternate.is_alternate = false;
    alternate.order_index = originalOrder;
    alternate.question_number = originalNumber;
    alternate.swapped_with_id = original.id;

    this.questions.set(original.id, { ...original });
    this.questions.set(alternate.id, { ...alternate });

    // Enqueue sync update
    this.enqueueSync({
      id: `sync_swap_${Date.now()}`,
      table_name: 'questions',
      record_id: alternate.id,
      action: 'update',
      payload: { swapped_with: original.id },
      attempts: 0,
      created_at: Date.now(),
    });

    this.persist();
    this.notify();
    return true;
  }

  /**
   * Flow A: "Prep Today's Papers" FAB
   * Fires off async batch edge function queue for any student needing a paper
   */
  public async prepTodaysPapers(): Promise<{ queuedCount: number; message: string }> {
    const students = this.getStudents();
    const papers = this.getPapers();

    // Identify students missing a ready paper for their upcoming class
    const missing = students.filter(student => {
      const studentPapers = papers.filter(p => p.student_id === student.id);
      const hasReady = studentPapers.some(p => p.status === 'ready_for_class');
      return !hasReady;
    });

    if (missing.length === 0) {
      return { queuedCount: 0, message: "All 15 students already have papers ready for class!" };
    }

    // Edge Case 4: Queue isolated jobs rather than one massive batch timeout
    for (const student of missing) {
      this.enqueueSync({
        id: `job_prep_${student.id}_${Date.now()}`,
        table_name: 'papers',
        record_id: student.id,
        action: 'insert',
        payload: {
          job: 'generate_paper',
          student_id: student.id,
          target_date: 'today',
        },
        attempts: 0,
        created_at: Date.now(),
      });
    }

    // Optimistically create ready papers for zero-wait demo experience
    const now = Date.now();
    for (const student of missing) {
      const paperId = `pap_prep_${student.id}_${now}`;
      const newPaper: Paper = {
        id: paperId,
        student_id: student.id,
        title: `${student.syllabus_board} - Targeted Diagnostic Mastery`,
        status: 'ready_for_class',
        target_class_time: student.schedule_time,
        total_marks: 30,
        scored_marks: 0,
        created_at: now,
        updated_at: now,
      };
      this.papers.set(paperId, newPaper);
    }

    this.persist();
    this.notify();
    this.flushSyncQueue();

    return {
      queuedCount: missing.length,
      message: `Enqueued ${missing.length} isolated AI generation jobs. Papers prepared!`,
    };
  }

  /**
   * "The Zero-Wait Async Strategy": Generate tomorrow's paper today.
   * Triggered upon completing a paper grading.
   */
  private triggerAutoPrepNextPaper(studentId: string) {
    const student = this.students.get(studentId);
    if (!student) return;

    // Check if next paper already exists
    const existingReady = this.getPapers().some(
      p => p.student_id === studentId && p.status === 'ready_for_class'
    );
    if (existingReady) return;

    // Generate tomorrow's paper today into local DB
    const now = Date.now();
    const newPaperId = `pap_tomorrow_${studentId}_${now}`;
    const newPaper: Paper = {
      id: newPaperId,
      student_id: studentId,
      title: `${student.syllabus_board} - Next Session Adaptive Mastery`,
      status: 'ready_for_class',
      target_class_time: 'Tomorrow',
      total_marks: 35,
      scored_marks: 0,
      created_at: now,
      updated_at: now,
    };

    this.papers.set(newPaperId, newPaper);

    // Add alternate question for tweaker
    const altQ: Question = {
      id: `alt_auto_${now}`,
      paper_id: newPaperId,
      topic_id: this.getTopicsForStudent(studentId)[0]?.id || 'top_01',
      topic_name: 'Adaptive Intervention Question',
      question_number: 99,
      question_text: 'Evaluate integral_0^{pi/2} sin^3(x) cos(x) dx using u-substitution.',
      answer_key: '1/4',
      marking_scheme: ['M1: Let u = sin(x), du = cos(x)dx', 'A1: integral_0^1 u^3 du = [u^4/4]_0^1 = 1/4'],
      difficulty: 2,
      max_marks: 4,
      is_alternate: true,
      order_index: 99,
    };
    this.questions.set(altQ.id, altQ);

    this.persist();
    this.notify();
  }

  private enqueueSync(item: SyncQueueItem) {
    this.syncQueue.push(item);
  }

  public async flushSyncQueue(): Promise<void> {
    if (!this.isOnline || this.isSyncing || this.syncQueue.length === 0) return;
    this.isSyncing = true;
    this.notify();

    try {
      // Simulate background Supabase Edge Function sync with optimistic guarantee
      await new Promise(r => setTimeout(r, 600));
      this.syncQueue = [];
      this.lastSyncedAt = Date.now();
      this.persist();
    } catch (e) {
      console.warn('Sync failed, will retry on next connection:', e);
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }
}

export const localDb = new LocalDatabase();

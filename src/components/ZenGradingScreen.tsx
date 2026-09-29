import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  RotateCcw, 
  Check, 
  X, 
  Sliders, 
  Sparkles, 
  ChevronRight, 
  Award, 
  Clock, 
  Zap, 
  ArrowLeft,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Paper, Question, Student } from '../types';
import { localDb } from '../database/localDb';
import { gradingUndoStack } from '../services/undoStack';

interface ZenGradingScreenProps {
  paper: Paper;
  student: Student;
  onBack: () => void;
  onComplete: () => void;
}

export const ZenGradingScreen: React.FC<ZenGradingScreenProps> = ({
  paper,
  student,
  onBack,
  onComplete,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [undoCount, setUndoCount] = useState(gradingUndoStack.size());
  const [showAnswerKey, setShowAnswerKey] = useState(true);
  const [showPartialSlider, setShowPartialSlider] = useState(false);
  const [partialValue, setPartialValue] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<{
    scored: number;
    total: number;
    timeSeconds: number;
    improvedTopics: string[];
  } | null>(null);

  const dragStartX = useRef<number | null>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    const qs = localDb.getQuestionsForPaper(paper.id);
    const results = localDb.getResultsForPaper(paper.id);
    setQuestions(qs);

    const gradedQuestionIds = new Set(results.map(r => r.question_id));
    const firstUngraded = qs.findIndex(q => !gradedQuestionIds.has(q.id));
    setCurrentIndex(firstUngraded >= 0 ? firstUngraded : 0);

    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paper.id]);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (currentQuestion) {
      setPartialValue(Math.floor(currentQuestion.max_marks / 2));
    }
  }, [currentIndex, currentQuestion]);

  const handleAwardMarks = (marks: number) => {
    if (!currentQuestion) return;

    const { isPaperComplete } = localDb.recordGradingResult({
      questionId: currentQuestion.id,
      paperId: paper.id,
      studentId: student.id,
      awardedMarks: marks,
      maxMarks: currentQuestion.max_marks,
      cardIndex: currentIndex,
    });

    setUndoCount(gradingUndoStack.size());
    setSwipeOffset(0);
    setShowPartialSlider(false);

    if (currentIndex + 1 >= questions.length || isPaperComplete) {
      handleCompleteGrading();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleUndo = () => {
    const action = localDb.undoLastGrading();
    if (action) {
      setUndoCount(gradingUndoStack.size());
      setCurrentIndex(action.cardIndex);
      setIsCompleted(false);
    }
  };

  const handleCompleteGrading = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCompleted(true);

    const results = localDb.getResultsForPaper(paper.id);
    const scored = results.reduce((acc, r) => acc + r.awarded_marks, 0);
    const total = questions.reduce((acc, q) => acc + q.max_marks, 0);

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#059669', '#2563EB', '#D97706', '#7C3AED'],
      });
    } catch {
      // Ignore
    }

    const topics = localDb.getTopicsForStudent(student.id);
    const improved = topics
      .filter(t => t.mastery_percentage >= 60)
      .map(t => t.name)
      .slice(0, 3);

    setCompletionSummary({
      scored,
      total,
      timeSeconds: elapsedSeconds,
      improvedTopics: improved,
    });
  };

  const handleTouchStart = (clientX: number) => {
    dragStartX.current = clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (clientX: number) => {
    if (!isDragging || dragStartX.current === null) return;
    const diff = clientX - dragStartX.current;
    setSwipeOffset(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    dragStartX.current = null;

    if (swipeOffset > 100 && currentQuestion) {
      handleAwardMarks(currentQuestion.max_marks);
    } else if (swipeOffset < -100) {
      handleAwardMarks(0);
    } else {
      setSwipeOffset(0);
    }
  };

  if (isCompleted && completionSummary) {
    return (
      <div
        className="card-elevated animate-slide-up"
        style={{
          maxWidth: '560px',
          margin: '40px auto',
          padding: '36px 30px',
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: '#ECFDF5',
            border: '2px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <Award size={36} color="#059669" />
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
          Paper Graded in {completionSummary.timeSeconds}s!
        </h2>
        <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>
          Tinder-for-Grading sprint complete for <strong>{student.name}</strong>.
        </p>

        {/* Score Card Grid */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Total Scored</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#059669', marginTop: '2px' }}>
              {completionSummary.scored} / {completionSummary.total}
            </div>
          </div>
          <div style={{ width: '1px', backgroundColor: '#E2E8F0' }} />
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Avg Time / Q</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#2563EB', marginTop: '2px' }}>
              {(completionSummary.timeSeconds / Math.max(1, questions.length)).toFixed(1)}s
            </div>
          </div>
          <div style={{ width: '1px', backgroundColor: '#E2E8F0' }} />
          <div>
            <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Accuracy</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#D97706', marginTop: '2px' }}>
              {Math.round((completionSummary.scored / Math.max(1, completionSummary.total)) * 100)}%
            </div>
          </div>
        </div>

        {/* Zero-Wait Async Strategy Banner */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '10px',
            padding: '14px 16px',
            textAlign: 'left',
            marginBottom: '28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1E40AF', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
            <Zap size={16} color="#2563EB" />
            <span>Zero-Wait Async Trigger: Tomorrow's Paper Generated</span>
          </div>
          <p style={{ fontSize: '12px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
            EWMA mastery recalculated for {student.name}. The next class practice paper is already pre-generated and cached in the local database!
          </p>
        </div>

        <button
          onClick={onComplete}
          style={{
            width: '100%',
            backgroundColor: '#059669',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '14px',
            padding: '14px 20px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(5, 150, 105, 0.25)',
          }}
        >
          <span>Back to Glance Dashboard</span>
          <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#64748B' }}>No questions available for this paper.</p>
        <button
          onClick={onBack}
          style={{
            marginTop: '16px',
            padding: '10px 18px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
      </div>
    );
  }

  const cardRotation = swipeOffset * 0.07;
  const rightOpacity = Math.min(1, Math.max(0, swipeOffset / 75));
  const leftOpacity = Math.min(1, Math.max(0, -swipeOffset / 75));

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onBack}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              padding: '8px',
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} />
          </button>

          {/* Edge Case 2: Rewind / Undo Button */}
          <button
            onClick={handleUndo}
            disabled={undoCount === 0}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: undoCount > 0 ? '#EFF6FF' : '#FFFFFF',
              border: `1px solid ${undoCount > 0 ? '#BFDBFE' : '#E2E8F0'}`,
              color: undoCount > 0 ? '#2563EB' : '#94A3B8',
              padding: '7px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: undoCount > 0 ? 'pointer' : 'not-allowed',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
            title="Undo last swipe (Circular Buffer of 5 actions)"
          >
            <RotateCcw size={14} />
            <span>Rewind</span>
            {undoCount > 0 && (
              <span
                style={{
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontWeight: 800,
                }}
              >
                {undoCount}
              </span>
            )}
          </button>
        </div>

        {/* Progress & Speed Stopwatch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#D97706',
              fontSize: '13px',
              fontWeight: 700,
              backgroundColor: '#FFFBEB',
              padding: '4px 10px',
              borderRadius: '8px',
              border: '1px solid #FDE68A',
            }}
          >
            <Clock size={14} />
            <span>{elapsedSeconds}s / 60s</span>
          </div>

          <div
            style={{
              backgroundColor: '#F1F5F9',
              padding: '5px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 800,
              color: '#0F172A',
              border: '1px solid #E2E8F0',
            }}
          >
            {currentIndex + 1} / {questions.length}
          </div>
        </div>
      </div>

      {/* Progress Bar Track */}
      <div
        style={{
          width: '100%',
          height: '6px',
          backgroundColor: '#E2E8F0',
          borderRadius: '3px',
          marginBottom: '20px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${((currentIndex + 1) / questions.length) * 100}%`,
            height: '100%',
            backgroundColor: '#2563EB',
            transition: 'width 0.25s ease',
          }}
        />
      </div>

      {/* Tinder-for-Grading Card Container */}
      <div
        style={{
          position: 'relative',
          height: '460px',
          perspective: '1000px',
        }}
      >
        {/* Next Card Preview Behind */}
        {currentIndex + 1 < questions.length && (
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              right: '12px',
              bottom: '0px',
              opacity: 0.5,
              transform: 'scale(0.97)',
              zIndex: 1,
              pointerEvents: 'none',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '16px',
            }}
          />
        )}

        {/* Current Active Card */}
        <div
          className="card-elevated"
          onMouseDown={e => handleTouchStart(e.clientX)}
          onMouseMove={e => handleTouchMove(e.clientX)}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          onTouchStart={e => handleTouchStart(e.touches[0].clientX)}
          onTouchMove={e => handleTouchMove(e.touches[0].clientX)}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transform: `translateX(${swipeOffset}px) rotate(${cardRotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: isDragging ? 'grabbing' : 'grab',
            backgroundColor: '#FFFFFF',
            border:
              swipeOffset > 40
                ? '2px solid #059669'
                : swipeOffset < -40
                ? '2px solid #E11D48'
                : '1px solid #E2E8F0',
            boxShadow:
              swipeOffset > 40
                ? '0 10px 25px rgba(5, 150, 105, 0.2)'
                : swipeOffset < -40
                ? '0 10px 25px rgba(225, 29, 72, 0.2)'
                : '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Swipe Stamped Overlays */}
          {rightOpacity > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                border: '3px solid #059669',
                borderRadius: '8px',
                backgroundColor: 'rgba(236, 253, 245, 0.95)',
                color: '#059669',
                padding: '6px 14px',
                fontWeight: 900,
                fontSize: '18px',
                letterSpacing: '1px',
                transform: 'rotate(12deg)',
                opacity: rightOpacity,
                pointerEvents: 'none',
                zIndex: 20,
              }}
            >
              FULL MARKS (+{currentQuestion.max_marks})
            </div>
          )}

          {leftOpacity > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '24px',
                left: '24px',
                border: '3px solid #E11D48',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 241, 242, 0.95)',
                color: '#E11D48',
                padding: '6px 14px',
                fontWeight: 900,
                fontSize: '18px',
                letterSpacing: '1px',
                transform: 'rotate(-12deg)',
                opacity: leftOpacity,
                pointerEvents: 'none',
                zIndex: 20,
              }}
            >
              ZERO MARKS (0)
            </div>
          )}

          {/* Card Top Metadata */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    backgroundColor: currentQuestion.difficulty <= 2 ? '#FFF1F2' : '#EFF6FF',
                    color: currentQuestion.difficulty <= 2 ? '#E11D48' : '#2563EB',
                    border: `1px solid ${currentQuestion.difficulty <= 2 ? '#FECDD3' : '#BFDBFE'}`,
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '6px',
                  }}
                >
                  {currentQuestion.topic_name}
                </span>

                <span
                  style={{
                    fontSize: '12px',
                    color: '#64748B',
                    backgroundColor: '#F1F5F9',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontWeight: 500,
                  }}
                >
                  Diff {currentQuestion.difficulty}/5
                </span>
              </div>

              <div
                style={{
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  color: '#059669',
                  fontSize: '13px',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '16px',
                }}
              >
                {currentQuestion.max_marks} Marks
              </div>
            </div>

            {/* Question Text */}
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#0F172A',
                lineHeight: 1.6,
                marginBottom: '14px',
              }}
            >
              {currentQuestion.question_text}
            </div>
          </div>

          {/* AI-Generated Answer Key & Marking Scheme */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '12px 14px',
              marginBottom: '10px',
              maxHeight: '180px',
              overflowY: 'auto',
            }}
          >
            <div
              onClick={() => setShowAnswerKey(!showAnswerKey)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                marginBottom: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#2563EB', fontSize: '12px', fontWeight: 700 }}>
                <Sparkles size={14} />
                <span>AI Marking Scheme & Answer Key</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', color: '#64748B', fontSize: '11px' }}>
                {showAnswerKey ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {showAnswerKey && (
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    color: '#065F46',
                    fontWeight: 700,
                    marginBottom: '8px',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    padding: '6px 10px',
                    borderRadius: '6px',
                  }}
                >
                  Key: {currentQuestion.answer_key}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {currentQuestion.marking_scheme.map((step, idx) => (
                    <div
                      key={idx}
                      style={{
                        fontSize: '12px',
                        color: '#475569',
                        lineHeight: 1.4,
                        paddingLeft: '8px',
                        borderLeft: '2px solid #3B82F6',
                      }}
                    >
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Swipe Hint */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#94A3B8',
              fontWeight: 500,
              paddingTop: '4px',
            }}
          >
            <span>👈 Swipe Left for 0 Marks</span>
            <span>Swipe Right for Full Marks 👉</span>
          </div>
        </div>
      </div>

      {/* Partial Marks Slider Overlay */}
      {showPartialSlider && (
        <div
          className="card-clean animate-slide-up"
          style={{
            marginTop: '14px',
            padding: '16px 20px',
            backgroundColor: '#FFFBEB',
            borderColor: '#FDE68A',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400E' }}>
              Award Partial Marks
            </span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#78350F' }}>
              {partialValue} / {currentQuestion.max_marks}
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={currentQuestion.max_marks}
            step={0.5}
            value={partialValue}
            onChange={e => setPartialValue(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#D97706', cursor: 'pointer', height: '6px' }}
          />

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={() => handleAwardMarks(partialValue)}
              style={{
                flex: 1,
                backgroundColor: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Confirm {partialValue} Marks
            </button>
            <button
              onClick={() => setShowPartialSlider(false)}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                border: '1px solid #CBD5E1',
                borderRadius: '6px',
                padding: '8px 14px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* One-Handed Quick Touch Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          marginTop: '16px',
        }}
      >
        {/* Zero Marks (Swipe Left Equivalent) */}
        <button
          onClick={() => handleAwardMarks(0)}
          style={{
            flex: 1,
            height: '52px',
            backgroundColor: '#FFF1F2',
            border: '1px solid #FECDD3',
            borderRadius: '12px',
            color: '#E11D48',
            fontWeight: 800,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Swipe Left: Zero Marks"
        >
          <X size={18} strokeWidth={3} />
          <span>0 Marks</span>
        </button>

        {/* Partial Marks Toggle */}
        <button
          onClick={() => setShowPartialSlider(!showPartialSlider)}
          style={{
            width: '56px',
            height: '52px',
            backgroundColor: showPartialSlider ? '#FEF3C7' : '#FFFFFF',
            border: '1px solid ' + (showPartialSlider ? '#D97706' : '#CBD5E1'),
            borderRadius: '12px',
            color: '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          }}
          title="Award Partial Marks"
        >
          <Sliders size={18} />
        </button>

        {/* Full Marks (Swipe Right Equivalent) */}
        <button
          onClick={() => handleAwardMarks(currentQuestion.max_marks)}
          style={{
            flex: 1,
            height: '52px',
            backgroundColor: '#059669',
            border: 'none',
            borderRadius: '12px',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 3px 8px rgba(5, 150, 105, 0.3)',
            transition: 'all 0.15s ease',
          }}
          title="Swipe Right: Full Marks"
        >
          <Check size={18} strokeWidth={3} />
          <span>+{currentQuestion.max_marks} Full Marks</span>
        </button>
      </div>
    </div>
  );
};

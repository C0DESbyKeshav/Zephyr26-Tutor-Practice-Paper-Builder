import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  RotateCcw, 
  Check, 
  X, 
  Sliders, 
  Award, 
  Clock,
  ChevronDown,
  ChevronUp,
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
  const [completionSummary, setCompletionSummary] = useState<{
    scored: number;
    total: number;
    timeSeconds: number;
  } | null>(null);

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
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#58CC02', '#1CB0F6', '#FF9600', '#CE82FF'],
      });
    } catch {
      // Ignore
    }

    setCompletionSummary({
      scored,
      total,
      timeSeconds: elapsedSeconds,
    });
  };

  if (isCompleted && completionSummary) {
    return (
      <div
        className="duo-card animate-pop-in"
        style={{
          maxWidth: '480px',
          margin: '40px auto',
          padding: '36px 28px',
          textAlign: 'center',
          backgroundColor: '#FFFFFF',
        }}
      >
        <div
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '24px',
            backgroundColor: '#D7FFB8',
            color: '#58CC02',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 4px 0 #A3E635',
          }}
        >
          <Award size={44} />
        </div>

        <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#23272E', marginBottom: '8px' }}>
          Awesome Job! 🎉
        </h2>
        <p style={{ color: '#6B7280', fontSize: '15px', fontWeight: 500, marginBottom: '24px' }}>
          Graded {questions.length} questions for <strong>{student.name}</strong> in {completionSummary.timeSeconds}s!
        </p>

        {/* Big Score Summary Box */}
        <div
          style={{
            backgroundColor: '#F7F9FA',
            border: '2px solid #E5E7EB',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-around',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
              Final Score
            </div>
            <div style={{ fontSize: '26px', fontWeight: 900, color: '#58CC02', marginTop: '2px' }}>
              {completionSummary.scored} / {completionSummary.total}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748B' }}>
              {completionSummary.total > 0 ? Math.round((completionSummary.scored / completionSummary.total) * 100) : 0}% Accuracy
            </div>
          </div>

          <div style={{ width: '2px', backgroundColor: '#E5E7EB' }} />

          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>
              Suggested Next Paper
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#1CB0F6', marginTop: '6px' }}>
              Auto-Prepared ✨
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#10B981' }}>
              Weak-Topic Focused
            </div>
          </div>
        </div>

        {/* Weak topic reinforcement highlight */}
        <div
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '14px',
            padding: '12px 14px',
            marginBottom: '20px',
            textAlign: 'left',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#1D4ED8', marginBottom: '2px' }}>
            🎯 Adaptive Next Paper Ready for Class:
          </div>
          <div style={{ fontSize: '12px', color: '#3B82F6' }}>
            Topic mastery has been recalculated via EWMA. A fresh practice paper calibrated to persistent weak areas has been placed in {student.name}'s profile.
          </div>
        </div>

        <button
          onClick={onComplete}
          className="btn-duo btn-duo-green"
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '16px',
            borderRadius: '20px',
          }}
        >
          <span>View Student & Next Paper</span>
        </button>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <p style={{ color: '#6B7280' }}>No questions found.</p>
        <button onClick={onBack} className="btn-duo btn-duo-white" style={{ marginTop: '12px' }}>
          Go Back
        </button>
      </div>
    );
  }

  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div style={{ maxWidth: '580px', margin: '0 auto', padding: '20px 16px' }}>
      {/* Top Header: Clean Duolingo Progress Bar + Exit + Undo */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={onBack}
          className="btn-duo btn-duo-white"
          style={{
            padding: '8px 12px',
            borderRadius: '14px',
            color: '#6B7280',
          }}
          title="Exit Grading"
        >
          <X size={18} />
        </button>

        {/* Chunky Duolingo Progress Bar */}
        <div style={{ flex: 1 }}>
          <div className="duo-progress-bar">
            <div className="duo-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        {/* Friendly Undo Button */}
        <button
          onClick={handleUndo}
          disabled={undoCount === 0}
          className={`btn-duo ${undoCount > 0 ? 'btn-duo-blue' : 'btn-duo-white'}`}
          style={{
            padding: '8px 14px',
            fontSize: '13px',
            borderRadius: '14px',
            opacity: undoCount > 0 ? 1 : 0.4,
            cursor: undoCount > 0 ? 'pointer' : 'not-allowed',
          }}
          title="Undo last mark"
        >
          <RotateCcw size={14} />
          <span>Undo</span>
        </button>

        {/* Speed Timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: '#FFFBEB',
            color: '#D97706',
            fontSize: '13px',
            fontWeight: 800,
            padding: '6px 10px',
            borderRadius: '12px',
            border: '2px solid #FDE68A',
          }}
        >
          <Clock size={14} />
          <span>{elapsedSeconds}s</span>
        </div>
      </div>

      {/* Direct Question Jump Bar */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '14px',
        }}
      >
        {questions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setCurrentIndex(idx)}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 800,
              borderRadius: '10px',
              border: 'none',
              backgroundColor: idx === currentIndex ? '#1CB0F6' : '#E2E8F0',
              color: idx === currentIndex ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Q{idx + 1} ({q.max_marks}p)
          </button>
        ))}
      </div>

      {/* Main Question Card (Clean, Big Typography, Easy to Understand) */}
      <div
        className="duo-card animate-pop-in"
        style={{
          padding: '24px 22px',
          backgroundColor: '#FFFFFF',
          marginBottom: '16px',
        }}
      >
        {/* Topic Tag & Question # */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <span
            style={{
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              fontSize: '12px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '10px',
              border: '1px solid #BFDBFE',
            }}
          >
            Question {currentIndex + 1} of {questions.length} • {currentQuestion.topic_name}
          </span>

          <span
            style={{
              backgroundColor: '#F0FDF4',
              color: '#16A34A',
              fontSize: '12px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '10px',
              border: '1px solid #BBF7D0',
            }}
          >
            Worth {currentQuestion.max_marks} Points
          </span>
        </div>

        {/* Question Text */}
        <div
          style={{
            fontSize: '17px',
            fontWeight: 700,
            color: '#23272E',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}
        >
          {currentQuestion.question_text}
        </div>

        {/* Clear Answer Box */}
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: '2px solid #BBF7D0',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '8px',
          }}
        >
          <div
            onClick={() => setShowAnswerKey(!showAnswerKey)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              marginBottom: showAnswerKey ? '10px' : '0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontWeight: 800, fontSize: '13px' }}>
              <Check size={16} color="#16A34A" strokeWidth={3} />
              <span>Correct Answer & Marking Guide</span>
            </div>
            <div style={{ color: '#166534' }}>
              {showAnswerKey ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>

          {showAnswerKey && (
            <div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 800,
                  color: '#14532D',
                  backgroundColor: '#FFFFFF',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid #86EFAC',
                  marginBottom: '10px',
                }}
              >
                Key: {currentQuestion.answer_key}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {currentQuestion.marking_scheme.map((step, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: '13px',
                      color: '#374151',
                      lineHeight: 1.4,
                      paddingLeft: '8px',
                      borderLeft: '3px solid #58CC02',
                    }}
                  >
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Partial Marks Slider Box (Simple & Visual) */}
      {showPartialSlider && (
        <div
          className="duo-card animate-pop-in"
          style={{
            padding: '16px 20px',
            backgroundColor: '#FFFBEB',
            borderColor: '#FDE68A',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, color: '#92400E' }}>
              Choose Points to Award
            </span>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#78350F' }}>
              {partialValue} of {currentQuestion.max_marks} pts
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={currentQuestion.max_marks}
            step={0.5}
            value={partialValue}
            onChange={e => setPartialValue(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#FF9600', cursor: 'pointer', height: '8px' }}
          />

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={() => handleAwardMarks(partialValue)}
              className="btn-duo btn-duo-yellow"
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '14px',
                borderRadius: '12px',
              }}
            >
              Confirm {partialValue} Points
            </button>
            <button
              onClick={() => setShowPartialSlider(false)}
              className="btn-duo btn-duo-white"
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                borderRadius: '12px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quick 1-Tap Mark Entry Pills (Instant Scoring) */}
      <div style={{ marginTop: '16px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748B' }}>
            Quick 1-Tap Score (0 to {currentQuestion.max_marks} pts):
          </span>
          <span style={{ fontSize: '11px', color: '#94A3B8' }}>
            Tap score to award & advance
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {Array.from({ length: currentQuestion.max_marks + 1 }, (_, i) => i).map(mark => {
            const isFull = mark === currentQuestion.max_marks;
            const isZero = mark === 0;
            return (
              <button
                key={mark}
                onClick={() => handleAwardMarks(mark)}
                className="btn-duo"
                style={{
                  flex: 1,
                  height: '42px',
                  fontSize: '14px',
                  fontWeight: 900,
                  borderRadius: '12px',
                  backgroundColor: isFull ? '#F0FDF4' : isZero ? '#FEF2F2' : '#FFFFFF',
                  color: isFull ? '#16A34A' : isZero ? '#DC2626' : '#1E293B',
                  border: isFull ? '2px solid #86EFAC' : isZero ? '2px solid #FECACA' : '2px solid #E2E8F0',
                  boxShadow: 'none',
                }}
              >
                {mark}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3 Big, Friendly, Intuitive Action Buttons (Duolingo Style) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: '12px',
          marginTop: '10px',
        }}
      >
        {/* Wrong Button */}
        <button
          onClick={() => handleAwardMarks(0)}
          className="btn-duo btn-duo-red"
          style={{
            height: '60px',
            fontSize: '16px',
            borderRadius: '18px',
          }}
        >
          <X size={22} strokeWidth={3} />
          <span>Wrong (0)</span>
        </button>

        {/* Half / Custom Points Button */}
        <button
          onClick={() => setShowPartialSlider(!showPartialSlider)}
          className="btn-duo btn-duo-white"
          style={{
            height: '60px',
            width: '60px',
            borderRadius: '18px',
            color: '#FF9600',
            borderColor: showPartialSlider ? '#FF9600' : '#E5E7EB',
          }}
          title="Give partial marks"
        >
          <Sliders size={22} />
        </button>

        {/* Correct Button */}
        <button
          onClick={() => handleAwardMarks(currentQuestion.max_marks)}
          className="btn-duo btn-duo-green"
          style={{
            height: '60px',
            fontSize: '16px',
            borderRadius: '18px',
          }}
        >
          <Check size={22} strokeWidth={3} />
          <span>Correct (+{currentQuestion.max_marks})</span>
        </button>
      </div>
    </div>
  );
};

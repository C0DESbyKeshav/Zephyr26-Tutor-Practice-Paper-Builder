import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  Zap, 
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { Student, Topic, Paper, Question } from '../types';
import { localDb } from '../database/localDb';
import { RadarChart } from './RadarChart';
import { PaperPrintModal } from './PaperPrintModal';

interface StudentRadarScreenProps {
  student: Student;
  onBack: () => void;
  onGradePaper?: (paper: Paper) => void;
}

export const StudentRadarScreen: React.FC<StudentRadarScreenProps> = ({
  student,
  onBack,
  onGradePaper,
}) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [activePaper, setActivePaper] = useState<Paper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [alternatePool, setAlternatePool] = useState<Question[]>([]);
  const [swappedQuestionId, setSwappedQuestionId] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  const loadData = () => {
    const studentTopics = localDb.getTopicsForStudent(student.id);
    const studentPapers = localDb.getPapers().filter(p => p.student_id === student.id);
    setTopics(studentTopics);

    if (studentTopics.length > 0 && !selectedTopic) {
      const sorted = [...studentTopics].sort((a, b) => a.mastery_percentage - b.mastery_percentage);
      setSelectedTopic(sorted[0]);
    }

    const paper = studentPapers.find(p => p.status === 'ready_for_class') || studentPapers[0];
    if (paper) {
      setActivePaper(paper);
      setQuestions(localDb.getQuestionsForPaper(paper.id));
      setAlternatePool(localDb.getAlternateQuestionsForPaper(paper.id));
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = localDb.subscribe(loadData);
    return unsubscribe;
  }, [student.id]);

  const handleSwapQuestion = (questionId: string) => {
    if (alternatePool.length === 0) {
      alert('All alternate questions have already been used for this paper!');
      return;
    }

    const alternate = alternatePool[0];
    const success = localDb.swapQuestionWithAlternate(questionId, alternate.id);

    if (success) {
      setSwappedQuestionId(alternate.id);
      setTimeout(() => setSwappedQuestionId(null), 2500);
      loadData();
    }
  };

  const avgMastery = topics.length > 0
    ? Math.round(topics.reduce((acc, t) => acc + t.mastery_percentage, 0) / topics.length)
    : 0;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>
      {/* Friendly Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            className="btn-duo btn-duo-white"
            style={{
              padding: '8px 12px',
              borderRadius: '14px',
              color: '#4B5563',
            }}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#23272E', margin: 0 }}>
                {student.name}
              </h2>
              <span
                style={{
                  backgroundColor: '#EBF5FF',
                  color: '#1CB0F6',
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '10px',
                }}
              >
                {student.syllabus_board}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontWeight: 500, marginTop: '2px' }}>
              {student.grade} • Class Time: <strong>{student.schedule_time}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activePaper && (
            <button
              onClick={() => setShowPrintModal(true)}
              className="btn-duo btn-duo-blue"
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                borderRadius: '14px',
              }}
            >
              <Printer size={16} />
              <span>Print Paper</span>
            </button>
          )}

          {activePaper && activePaper.status === 'needs_grading' && onGradePaper && (
            <button
              onClick={() => onGradePaper(activePaper)}
              className="btn-duo btn-duo-red"
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                borderRadius: '14px',
              }}
            >
              <Zap size={16} />
              <span>Grade Paper</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Friendly Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Left Column: Topic Mastery Overview */}
        <div className="duo-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#23272E', margin: 0 }}>
              Topic Mastery
            </h3>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 800,
                color: avgMastery >= 60 ? '#58CC02' : '#FF9600',
                backgroundColor: avgMastery >= 60 ? '#D7FFB8' : '#FFEBD1',
                padding: '3px 10px',
                borderRadius: '10px',
              }}
            >
              Average {avgMastery}%
            </span>
          </div>

          {/* Clean Radar */}
          <RadarChart
            topics={topics}
            size={320}
            onSelectTopic={t => setSelectedTopic(t)}
            selectedTopicId={selectedTopic?.id}
          />

          {/* Simple Visual Topic List */}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topics.map(t => {
              const isWeak = t.mastery_percentage < 60;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTopic(t)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: selectedTopic?.id === t.id ? '#F0F9FF' : '#F9FAFB',
                    border: selectedTopic?.id === t.id ? '2px solid #BAE6FD' : '1px solid #E5E7EB',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isWeak ? (
                      <AlertCircle size={15} color="#FF4B4B" />
                    ) : (
                      <CheckCircle2 size={15} color="#58CC02" />
                    )}
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#23272E' }}>
                      {t.name}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: isWeak ? '#FF4B4B' : '#58CC02',
                    }}
                  >
                    {t.mastery_percentage}% {isWeak ? '(Needs Help)' : '(Good)'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Practice Paper & Simple Swap */}
        <div className="duo-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#23272E', margin: 0 }}>
                Practice Paper Questions
              </h3>
              <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                Don't like a question? Tap Swap to change it.
              </p>
            </div>

            <span
              style={{
                backgroundColor: '#EFF6FF',
                color: '#1CB0F6',
                fontSize: '11px',
                fontWeight: 800,
                padding: '4px 8px',
                borderRadius: '8px',
              }}
            >
              {alternatePool.length} Alternates Ready
            </span>
          </div>

          {/* Toast when swapped */}
          {swappedQuestionId && (
            <div
              className="animate-pop-in duo-card"
              style={{
                backgroundColor: '#F0FDF4',
                borderColor: '#BBF7D0',
                padding: '10px 14px',
                marginBottom: '12px',
                color: '#16A34A',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Question swapped with a fresh one!</span>
            </div>
          )}

          {/* Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="duo-card"
                style={{
                  padding: '14px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        backgroundColor: '#23272E',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '2px 7px',
                        borderRadius: '6px',
                      }}
                    >
                      #{idx + 1}
                    </span>

                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#4B5563' }}>
                      {q.topic_name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#58CC02' }}>
                      {q.max_marks} pts
                    </span>

                    {/* Simple Swap Button */}
                    <button
                      onClick={() => handleSwapQuestion(q.id)}
                      disabled={alternatePool.length === 0}
                      className="btn-duo btn-duo-white"
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        borderRadius: '10px',
                        color: '#1CB0F6',
                        borderColor: '#BAE6FD',
                      }}
                    >
                      <RefreshCw size={11} />
                      <span>Swap</span>
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '14px', fontWeight: 500, color: '#23272E', lineHeight: 1.5, margin: 0 }}>
                  {q.question_text}
                </p>

                <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700, marginTop: '8px' }}>
                  Answer: {q.answer_key}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showPrintModal && activePaper && (
        <PaperPrintModal
          paper={activePaper}
          student={student}
          questions={questions}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};

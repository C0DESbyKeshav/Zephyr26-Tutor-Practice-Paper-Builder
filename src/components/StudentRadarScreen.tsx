import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Zap, 
  RefreshCw
} from 'lucide-react';
import type { Student, Topic, Paper, Question } from '../types';
import { localDb } from '../database/localDb';
import { RadarChart } from './RadarChart';
import { AnalyticsEngine } from '../services/analyticsEngine';
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
      alert('All pre-fetched alternate questions have already been used for this paper!');
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

  const weakTopics = topics.filter(t => t.mastery_percentage < 60);

  return (
    <div style={{ maxWidth: '1020px', margin: '0 auto', padding: '24px 20px' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
          paddingBottom: '20px',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          >
            <ArrowLeft size={16} />
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>
                {student.name}
              </h2>
              <span
                style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1D4ED8',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {student.syllabus_board}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
              {student.grade} • Target: <strong>{student.target_exam}</strong> • Class Slot: <strong>{student.schedule_time}</strong>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {activePaper && (
            <button
              onClick={() => setShowPrintModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                color: '#334155',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
              }}
              title="Print Clean Practice Paper Sheet"
            >
              <Printer size={15} />
              <span>Print Paper</span>
            </button>
          )}

          {activePaper && activePaper.status === 'needs_grading' && onGradePaper && (
            <button
              onClick={() => onGradePaper(activePaper)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#E11D48',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(225, 29, 72, 0.3)',
              }}
            >
              <Zap size={14} />
              <span>Zen Grade Now</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Radar Chart + Analytics on Left, Paper Tweaker on Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(340px, 440px) 1fr',
          gap: '24px',
        }}
      >
        {/* Left Column: Hexagon Radar Chart & EWMA Decay Inspector */}
        <div className="card-clean" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
              6-Topic Mastery Radar
            </h3>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                color: avgMastery >= 70 ? '#059669' : '#D97706',
                backgroundColor: avgMastery >= 70 ? '#ECFDF5' : '#FFFBEB',
                border: '1px solid ' + (avgMastery >= 70 ? '#A7F3D0' : '#FDE68A'),
                padding: '3px 8px',
                borderRadius: '6px',
              }}
            >
              Avg {avgMastery}%
            </span>
          </div>

          <RadarChart
            topics={topics}
            size={360}
            onSelectTopic={t => setSelectedTopic(t)}
            selectedTopicId={selectedTopic?.id}
          />

          {/* Topic Detail & EWMA Decay Inspector Card */}
          {selectedTopic && (
            <div
              style={{
                marginTop: '20px',
                backgroundColor: '#F8FAFC',
                border: `1px solid ${selectedTopic.mastery_percentage < 60 ? '#FECDD3' : '#BFDBFE'}`,
                borderRadius: '10px',
                padding: '14px 16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  {selectedTopic.name}
                </div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    color: selectedTopic.mastery_percentage < 60 ? '#E11D48' : '#059669',
                  }}
                >
                  {selectedTopic.mastery_percentage}%
                </div>
              </div>

              {(() => {
                const { decayApplied, daysSinceTested } = AnalyticsEngine.applyTimeDecay(
                  selectedTopic.mastery_percentage,
                  selectedTopic.last_tested_at
                );

                return (
                  <div style={{ fontSize: '12px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} color="#D97706" />
                      <span>Last tested <strong>{daysSinceTested} days ago</strong></span>
                      {decayApplied && (
                        <span style={{ color: '#E11D48', fontWeight: 700 }}>
                          (-10% Decay Applied)
                        </span>
                      )}
                    </div>

                    {selectedTopic.mastery_percentage < 60 ? (
                      <div style={{ color: '#BE123C', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <AlertTriangle size={13} />
                        <span>Needs Intervention: 60% prompt priority locked to Diff 1-2</span>
                      </div>
                    ) : (
                      <div style={{ color: '#065F46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={13} />
                        <span>Mastered: 40% prompt challenge locked to Diff 4-5</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right Column: Paper Tweaker with Instant Question Swapping */}
        <div className="card-clean" style={{ padding: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                Paper Tweaker: Zero-Wait Swap
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B' }}>
                Dislike a question? Click Swap to replace it instantly from the local DB.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
                padding: '4px 10px',
                borderRadius: '12px',
                color: '#1D4ED8',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Zap size={12} />
              <span>{alternatePool.length} Pre-fetched Alternates</span>
            </div>
          </div>

          {/* Toast Notification when a question is swapped */}
          {swappedQuestionId && (
            <div
              className="animate-slide-up"
              style={{
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12px',
                color: '#065F46',
                fontWeight: 700,
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckCircle2 size={15} color="#059669" />
              <span>Question swapped instantly with pre-fetched alternate! 0ms latency.</span>
            </div>
          )}

          {/* Question List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '540px', overflowY: 'auto' }}>
            {questions.map((q, idx) => {
              const isWeakTopic = weakTopics.some(w => w.name === q.topic_name);
              const isRecentlySwapped = swappedQuestionId === q.id;

              return (
                <div
                  key={q.id}
                  style={{
                    backgroundColor: isRecentlySwapped ? '#ECFDF5' : '#FFFFFF',
                    border: isRecentlySwapped ? '1px solid #A7F3D0' : '1px solid #E2E8F0',
                    borderRadius: '10px',
                    padding: '14px',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          backgroundColor: '#0F172A',
                          color: '#FFFFFF',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '4px',
                        }}
                      >
                        Q{idx + 1}
                      </span>

                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: isWeakTopic ? '#E11D48' : '#2563EB',
                          backgroundColor: isWeakTopic ? '#FFF1F2' : '#EFF6FF',
                          border: `1px solid ${isWeakTopic ? '#FECDD3' : '#BFDBFE'}`,
                          padding: '2px 7px',
                          borderRadius: '4px',
                        }}
                      >
                        {q.topic_name}
                      </span>

                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>
                        Diff {q.difficulty}/5
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#059669' }}>
                        {q.max_marks}m
                      </span>

                      <button
                        onClick={() => handleSwapQuestion(q.id)}
                        disabled={alternatePool.length === 0}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          color: '#1D4ED8',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: alternatePool.length > 0 ? 'pointer' : 'not-allowed',
                          opacity: alternatePool.length > 0 ? 1 : 0.4,
                        }}
                        title="Click to swap with pre-fetched alternate question"
                      >
                        <RefreshCw size={11} />
                        <span>Swap</span>
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '14px', color: '#0F172A', lineHeight: 1.5, marginBottom: '6px' }}>
                    {q.question_text}
                  </p>

                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Answer Key: <strong style={{ color: '#059669' }}>{q.answer_key}</strong>
                  </div>
                </div>
              );
            })}
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

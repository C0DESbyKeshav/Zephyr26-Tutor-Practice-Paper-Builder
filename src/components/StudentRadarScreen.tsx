import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Printer, 
  Zap, 
  RefreshCw,
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Edit3,
  Award,
  History
} from 'lucide-react';
import type { Student, Topic, Paper, Question } from '../types';
import { localDb } from '../database/localDb';
import { RadarChart } from './RadarChart';
import { PaperPrintModal } from './PaperPrintModal';
import { StudentProfileModal } from './StudentProfileModal';
import { AIPaperGeneratorModal } from './AIPaperGeneratorModal';

interface StudentRadarScreenProps {
  student: Student;
  onBack: () => void;
  onGradePaper?: (paper: Paper) => void;
}

export const StudentRadarScreen: React.FC<StudentRadarScreenProps> = ({
  student: initialStudent,
  onBack,
  onGradePaper,
}) => {
  const [currentStudent, setCurrentStudent] = useState<Student>(initialStudent);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [studentPapers, setStudentPapers] = useState<Paper[]>([]);
  const [activePaper, setActivePaper] = useState<Paper | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [alternatePool, setAlternatePool] = useState<Question[]>([]);
  const [swappedQuestionId, setSwappedQuestionId] = useState<string | null>(null);
  
  // Modals
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showAIGeneratorModal, setShowAIGeneratorModal] = useState<boolean>(false);
  const [aiGeneratorWeakFocus, setAiGeneratorWeakFocus] = useState<boolean>(false);

  // Tab: 'practice' | 'history'
  const [activeTab, setActiveTab] = useState<'practice' | 'history'>('practice');

  const loadData = () => {
    const updatedStudent = localDb.getStudentById(currentStudent.id) || currentStudent;
    setCurrentStudent(updatedStudent);

    const studentTopics = localDb.getTopicsForStudent(currentStudent.id);
    const papers = localDb.getPapers().filter(p => p.student_id === currentStudent.id);
    setTopics(studentTopics);
    setStudentPapers(papers);

    if (studentTopics.length > 0 && !selectedTopic) {
      const sorted = [...studentTopics].sort((a, b) => a.mastery_percentage - b.mastery_percentage);
      setSelectedTopic(sorted[0]);
    }

    // Default active paper: priority to ready_for_class, then needs_grading, then first available
    const paper = activePaper
      ? papers.find(p => p.id === activePaper.id) || papers[0]
      : (papers.find(p => p.status === 'ready_for_class') || papers.find(p => p.status === 'needs_grading') || papers[0]);

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
  }, [currentStudent.id]);

  const handleSelectPaper = (paper: Paper) => {
    setActivePaper(paper);
    setQuestions(localDb.getQuestionsForPaper(paper.id));
    setAlternatePool(localDb.getAlternateQuestionsForPaper(paper.id));
  };

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

  const handleAutoGenerateWeakPaper = () => {
    const newPaper = localDb.triggerAutoPrepNextPaper(currentStudent.id);
    if (newPaper) {
      setActivePaper(newPaper);
      setQuestions(localDb.getQuestionsForPaper(newPaper.id));
      setAlternatePool(localDb.getAlternateQuestionsForPaper(newPaper.id));
    } else {
      // Open modal pre-configured for weak focus
      setAiGeneratorWeakFocus(true);
      setShowAIGeneratorModal(true);
    }
  };

  const weakTopics = topics.filter(t => t.mastery_percentage < 60);
  const avgMastery = topics.length > 0
    ? Math.round(topics.reduce((acc, t) => acc + t.mastery_percentage, 0) / topics.length)
    : 0;

  const studentHistory = localDb.getStudentHistory(currentStudent.id);

  return (
    <div style={{ maxWidth: '940px', margin: '0 auto', padding: '24px 16px 80px' }}>
      {/* Top Header: Back + Student Info + Action Buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#23272E', margin: 0 }}>
                {currentStudent.name}
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
                {currentStudent.syllabus_board}
              </span>
              <button
                onClick={() => setShowProfileModal(true)}
                className="btn-duo btn-duo-white"
                style={{
                  padding: '3px 8px',
                  fontSize: '11px',
                  borderRadius: '8px',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Edit3 size={12} />
                <span>Edit Profile</span>
              </button>
            </div>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontWeight: 500, marginTop: '2px' }}>
              {currentStudent.grade} • Target: <strong>{currentStudent.target_exam}</strong> • Schedule: <strong>{currentStudent.schedule_time}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* AI Generator Button */}
          <button
            onClick={() => {
              setAiGeneratorWeakFocus(false);
              setShowAIGeneratorModal(true);
            }}
            className="btn-duo btn-duo-green"
            style={{
              padding: '10px 14px',
              fontSize: '13px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={16} />
            <span>Generate AI Paper</span>
          </button>

          {/* Print Button */}
          {activePaper && (
            <button
              onClick={() => setShowPrintModal(true)}
              className="btn-duo btn-duo-blue"
              style={{
                padding: '10px 14px',
                fontSize: '13px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Printer size={16} />
              <span>Print</span>
            </button>
          )}

          {/* Quick Marks Entry / Grade Button (Accessible for ANY Paper) */}
          {activePaper && onGradePaper && (
            <button
              onClick={() => onGradePaper(activePaper)}
              className={`btn-duo ${activePaper.status === 'needs_grading' ? 'btn-duo-red' : 'btn-duo-yellow'}`}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Zap size={16} />
              <span>{activePaper.status === 'needs_grading' ? 'Grade Paper' : 'Enter Marks'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 🎯 Automated Suggested Next Paper Banner (Weak-Topic Focus) */}
      <div
        className="duo-card animate-pop-in"
        style={{
          padding: '16px 20px',
          backgroundColor: '#EFF6FF',
          borderColor: '#BFDBFE',
          borderRadius: '18px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                backgroundColor: '#1CB0F6',
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: 900,
                padding: '2px 8px',
                borderRadius: '6px',
                textTransform: 'uppercase',
              }}
            >
              Suggested Next Paper
            </span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
              Adaptive Weak-Topic Focus
            </span>
          </div>

          <p style={{ fontSize: '13px', color: '#334155', margin: 0, lineHeight: 1.4 }}>
            {weakTopics.length > 0 ? (
              <>
                Identified {weakTopics.length} persistent weak topic{weakTopics.length > 1 ? 's' : ''}:{' '}
                <strong>{weakTopics.map(t => `${t.name} (${t.mastery_percentage}%)`).join(', ')}</strong>.
                Next paper allocates 70% questions to these areas at foundational/core difficulty to build mastery.
              </>
            ) : (
              <>
                Solid mastery across all topics (Average {avgMastery}%). Next paper will test challenge/exam-level problems for retention.
              </>
            )}
          </p>
        </div>

        <button
          onClick={handleAutoGenerateWeakPaper}
          className="btn-duo btn-duo-blue"
          style={{
            padding: '10px 18px',
            fontSize: '13px',
            borderRadius: '14px',
            fontWeight: 800,
            whiteSpace: 'nowrap',
          }}
        >
          <Sparkles size={15} />
          <span>Auto-Prepare Next Paper</span>
        </button>
      </div>

      {/* Tabs: Active Practice Paper vs Historical Performance */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('practice')}
          className="btn-duo"
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 800,
            backgroundColor: activeTab === 'practice' ? '#23272E' : '#FFFFFF',
            color: activeTab === 'practice' ? '#FFFFFF' : '#4B5563',
            border: activeTab === 'practice' ? '2px solid #23272E' : '2px solid #E5E7EB',
          }}
        >
          Practice Paper & Questions
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className="btn-duo"
          style={{
            padding: '8px 16px',
            borderRadius: '12px',
            fontSize: '13px',
            fontWeight: 800,
            backgroundColor: activeTab === 'history' ? '#23272E' : '#FFFFFF',
            color: activeTab === 'history' ? '#FFFFFF' : '#4B5563',
            border: activeTab === 'history' ? '2px solid #23272E' : '2px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <History size={15} />
          <span>Historical Test Performance ({studentHistory.length})</span>
        </button>
      </div>

      {activeTab === 'practice' ? (
        /* Main Two-Column Layout */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Left Column: Topic Mastery Radar & Weak Topics List */}
          <div className="duo-card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#23272E', margin: 0 }}>
                  Topic Mastery Overview
                </h3>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                  EWMA mastery with 30-day time decay penalty
                </p>
              </div>

              <div
                style={{
                  backgroundColor: avgMastery >= 60 ? '#F0FDF4' : '#FEF2F2',
                  border: `2px solid ${avgMastery >= 60 ? '#BBF7D0' : '#FECACA'}`,
                  borderRadius: '12px',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Award size={15} color={avgMastery >= 60 ? '#16A34A' : '#DC2626'} />
                <span style={{ fontSize: '13px', fontWeight: 900, color: avgMastery >= 60 ? '#16A34A' : '#DC2626' }}>
                  {avgMastery}% Avg
                </span>
              </div>
            </div>

            {/* Radar Chart Component */}
            <div style={{ margin: '10px 0 20px 0' }}>
              <RadarChart
                topics={topics}
                selectedTopicId={selectedTopic?.id}
                onSelectTopic={setSelectedTopic}
              />
            </div>

            {/* Topic Breakdown Bars with Intervention Flags */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#374151', marginBottom: '2px' }}>
                Syllabus Topics Covered ({topics.length}):
              </div>

              {topics.map(t => {
                const isWeak = t.mastery_percentage < 60;
                const isSelected = selectedTopic?.id === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTopic(t)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? '#EFF6FF' : isWeak ? '#FFF5F5' : '#F9FAFB',
                      border: isSelected ? '2px solid #1CB0F6' : isWeak ? '1px solid #FECACA' : '1px solid #E5E7EB',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isWeak ? (
                        <AlertCircle size={15} color="#FF4B4B" />
                      ) : (
                        <CheckCircle2 size={15} color="#58CC02" />
                      )}
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#23272E', display: 'block' }}>
                          {t.name}
                        </span>
                        <span style={{ fontSize: '11px', color: '#6B7280' }}>
                          {t.syllabus_code}
                        </span>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: isWeak ? '#FF4B4B' : '#58CC02',
                      }}
                    >
                      {t.mastery_percentage}% {isWeak ? '(Needs Help)' : '(Solid)'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Practice Paper & Simple Swap */}
          <div className="duo-card" style={{ padding: '22px' }}>
            {/* Paper Switcher if multiple papers exist */}
            {studentPapers.length > 1 && (
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '14px' }}>
                {studentPapers.map((p, idx) => {
                  const isCurrent = activePaper?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleSelectPaper(p)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 800,
                        borderRadius: '10px',
                        border: isCurrent ? '2px solid #1CB0F6' : '1px solid #E2E8F0',
                        backgroundColor: isCurrent ? '#EFF6FF' : '#FFFFFF',
                        color: isCurrent ? '#1D4ED8' : '#64748B',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Paper {idx + 1}: {p.status === 'completed' ? 'Graded' : p.status === 'needs_grading' ? 'Needs Grading' : 'Ready'}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#23272E', margin: 0 }}>
                  {activePaper?.title || 'Practice Paper Questions'}
                </h3>
                <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                  {questions.length} questions • Total {activePaper?.total_marks || 0} pts • Tap Swap to replace
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
                <span>Question swapped with an alternate from pool!</span>
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

                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '6px',
                          backgroundColor: q.difficulty <= 2 ? '#F0FDF4' : q.difficulty === 3 ? '#EFF6FF' : '#FEF3C7',
                          color: q.difficulty <= 2 ? '#16A34A' : q.difficulty === 3 ? '#1D4ED8' : '#D97706',
                        }}
                      >
                        Diff {q.difficulty}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#58CC02' }}>
                        {q.max_marks} pts
                      </span>

                      {/* Swap Button */}
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
                    Answer Key: {q.answer_key}
                  </div>

                  {/* Marking Scheme Preview */}
                  {q.marking_scheme && q.marking_scheme.length > 0 && (
                    <div style={{ marginTop: '8px', borderTop: '1px dashed #E5E7EB', paddingTop: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#6B7280' }}>
                        Marking Scheme:
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                        {q.marking_scheme.map((step, sIdx) => (
                          <span key={sIdx} style={{ fontSize: '11px', color: '#4B5563', paddingLeft: '6px', borderLeft: '2px solid #58CC02' }}>
                            {step}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Historical Test Performance View */
        <div className="duo-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#1E293B', margin: 0 }}>
                Historical Test Performance & Weak Topics Log
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
                Track student progress over time across all administered test papers
              </p>
            </div>
          </div>

          {/* Weak Topics Callout */}
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: weakTopics.length > 0 ? '#FEF2F2' : '#F0FDF4',
              borderRadius: '14px',
              border: `1px solid ${weakTopics.length > 0 ? '#FECACA' : '#BBF7D0'}`,
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 800, color: weakTopics.length > 0 ? '#DC2626' : '#16A34A', marginBottom: '4px' }}>
              {weakTopics.length > 0 ? '⚠️ Persistent Areas Needing Intervention:' : '✅ No Critical Weaknesses Detected'}
            </div>
            {weakTopics.length > 0 ? (
              <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '13px', color: '#7F1D1D' }}>
                {weakTopics.map(t => (
                  <li key={t.id}>
                    <strong>{t.name}</strong> — {t.mastery_percentage}% mastery (Historical performance flags this for revision)
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, fontSize: '13px', color: '#14532D' }}>
                Student is performing above 60% on all covered syllabus topics.
              </p>
            )}
          </div>

          {/* Past Papers List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {studentHistory.map(item => (
              <div
                key={item.paper.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  borderRadius: '14px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: item.paper.status === 'completed' ? '#DCFCE7' : '#FEF3C7',
                        color: item.paper.status === 'completed' ? '#15803D' : '#B45309',
                      }}
                    >
                      {item.paper.status === 'completed' ? 'Graded' : item.paper.status}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                      {item.paper.title}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Class Time: {item.paper.target_class_time} • {item.results.length} questions evaluated
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: item.scorePercent >= 60 ? '#10B981' : '#EF4444' }}>
                      {item.paper.scored_marks} / {item.paper.total_marks} ({item.scorePercent}%)
                    </div>
                    <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                      Recorded Score
                    </div>
                  </div>

                  {onGradePaper && (
                    <button
                      onClick={() => onGradePaper(item.paper)}
                      className="btn-duo btn-duo-white"
                      style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '10px' }}
                    >
                      Re-Grade / View
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && activePaper && (
        <PaperPrintModal
          paper={activePaper}
          student={currentStudent}
          questions={questions}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* Edit Profile Modal */}
      {showProfileModal && (
        <StudentProfileModal
          student={currentStudent}
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onSaved={(updated) => {
            setCurrentStudent(updated);
            loadData();
          }}
        />
      )}

      {/* AI Practice Paper Generator Modal */}
      {showAIGeneratorModal && (
        <AIPaperGeneratorModal
          student={currentStudent}
          isOpen={showAIGeneratorModal}
          onClose={() => setShowAIGeneratorModal(false)}
          initialWeakFocus={aiGeneratorWeakFocus}
          onPaperGenerated={(newPaper) => {
            setActivePaper(newPaper);
            setQuestions(localDb.getQuestionsForPaper(newPaper.id));
            setAlternatePool(localDb.getAlternateQuestionsForPaper(newPaper.id));
          }}
        />
      )}
    </div>
  );
};

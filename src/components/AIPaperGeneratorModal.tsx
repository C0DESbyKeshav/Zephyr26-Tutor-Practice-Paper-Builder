import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  BookOpen
} from 'lucide-react';
import type { Student, Paper, Question } from '../types';
import { localDb } from '../database/localDb';
import { AIPaperGenerator } from '../services/aiGenerator';

interface AIPaperGeneratorModalProps {
  student: Student;
  isOpen: boolean;
  onClose: () => void;
  onPaperGenerated: (paper: Paper) => void;
  initialWeakFocus?: boolean;
}

export const AIPaperGeneratorModal: React.FC<AIPaperGeneratorModalProps> = ({
  student,
  isOpen,
  onClose,
  onPaperGenerated,
  initialWeakFocus = false,
}) => {
  const topics = localDb.getTopicsForStudent(student.id);
  const weakTopics = topics.filter(t => t.mastery_percentage < 60);

  const [paperTitle, setPaperTitle] = useState(
    initialWeakFocus && weakTopics.length > 0
      ? `${student.syllabus_board} - Next Session Weak-Topic Mastery`
      : `${student.syllabus_board} - Practice Paper`
  );
  const [questionCount, setQuestionCount] = useState<number>(6);
  const [selectedDifficulty, setSelectedDifficulty] = useState<1 | 2 | 3 | 4 | 5 | 'adaptive'>('adaptive');
  const [focusOnWeakTopics, setFocusOnWeakTopics] = useState<boolean>(initialWeakFocus);
  
  // Selected topic IDs
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(
    initialWeakFocus && weakTopics.length > 0
      ? weakTopics.map(t => t.id)
      : topics.map(t => t.id)
  );

  // Live Generated Preview State
  const [generatedResult, setGeneratedResult] = useState<{
    paper: Omit<Paper, 'id' | 'created_at' | 'updated_at'>;
    questions: Omit<Question, 'id' | 'paper_id'>[];
  } | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [expandedQuestionIdx, setExpandedQuestionIdx] = useState<number | null>(0);

  if (!isOpen) return null;

  const handleToggleTopic = (topicId: string) => {
    setSelectedTopicIds(prev =>
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setGeneratedResult(null);

    const filteredTopics = topics.filter(t => selectedTopicIds.includes(t.id));
    const activeTopics = filteredTopics.length > 0 ? filteredTopics : topics;

    setTimeout(() => {
      const result = AIPaperGenerator.generatePaper({
        student,
        topics: activeTopics,
        questionCount,
        calibratedDifficulty: selectedDifficulty,
        focusOnWeakTopics,
        customTitle: paperTitle,
      });

      setGeneratedResult(result);
      setIsGenerating(false);
      setExpandedQuestionIdx(0);
    }, 450);
  };

  const handleSaveAndConfirm = () => {
    if (!generatedResult) return;
    const newPaper = localDb.createPaperWithQuestions(
      generatedResult.paper,
      generatedResult.questions
    );
    onPaperGenerated(newPaper);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="duo-card animate-slide-up"
        style={{
          backgroundColor: '#FFFFFF',
          maxWidth: '720px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 25px 30px -5px rgba(0, 0, 0, 0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '2px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#FAFCFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: '#1CB0F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#1E293B', margin: 0 }}>
                AI Practice Paper Generator
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                Calibrate by topic and difficulty with marking schemes for {student.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-duo btn-duo-white"
            style={{ padding: '6px', borderRadius: '12px', color: '#64748B' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls: Title & Question Count */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                Practice Paper Title
              </label>
              <input
                type="text"
                value={paperTitle}
                onChange={e => setPaperTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '14px',
                  borderRadius: '12px',
                  border: '2px solid #E2E8F0',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                Question Count
              </label>
              <select
                value={questionCount}
                onChange={e => setQuestionCount(parseInt(e.target.value, 10))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '14px',
                  borderRadius: '12px',
                  border: '2px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              >
                <option value={4}>4 Questions (Quick 15-min)</option>
                <option value={6}>6 Questions (Standard 30-min)</option>
                <option value={8}>8 Questions (Full 45-min)</option>
                <option value={10}>10 Questions (Mock Exam)</option>
              </select>
            </div>
          </div>

          {/* Calibrated Difficulty Selection */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 800, color: '#334155' }}>
                Calibrate Difficulty Level
              </label>
              <span style={{ fontSize: '12px', color: '#64748B' }}>
                {selectedDifficulty === 'adaptive' ? 'Adaptive: Easy for weak topics, challenging for strong topics' : `Fixed Level ${selectedDifficulty}`}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
              {[
                { value: 'adaptive', label: 'Adaptive' },
                { value: 1, label: 'L1: Foundational' },
                { value: 2, label: 'L2: Core' },
                { value: 3, label: 'L3: Exam Prep' },
                { value: 4, label: 'L4: Advanced' },
                { value: 5, label: 'L5: Challenge' },
              ].map(opt => {
                const isSelected = selectedDifficulty === opt.value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => setSelectedDifficulty(opt.value as any)}
                    className="btn-duo"
                    style={{
                      padding: '8px 4px',
                      fontSize: '12px',
                      fontWeight: 800,
                      borderRadius: '12px',
                      backgroundColor: isSelected ? '#1CB0F6' : '#F8FAFC',
                      color: isSelected ? '#FFFFFF' : '#475569',
                      border: isSelected ? '2px solid #0284C7' : '2px solid #E2E8F0',
                      boxShadow: isSelected ? '0 3px 0 #0284C7' : 'none',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Topic Selection & Weak-Topic Toggle */}
          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} color="#58CC02" />
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#1E293B' }}>
                  Select Syllabus Topics
                </span>
              </div>

              {/* Weak-Topic Focus Toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 800, color: '#DC2626' }}>
                <input
                  type="checkbox"
                  checked={focusOnWeakTopics}
                  onChange={e => {
                    const checked = e.target.checked;
                    setFocusOnWeakTopics(checked);
                    if (checked && weakTopics.length > 0) {
                      setSelectedTopicIds(weakTopics.map(t => t.id));
                    }
                  }}
                  style={{ accentColor: '#EF4444', cursor: 'pointer' }}
                />
                Focus heavily on persistent weak topics (70% weight)
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
              {topics.map(t => {
                const isSelected = selectedTopicIds.includes(t.id);
                const isWeak = t.mastery_percentage < 60;

                return (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTopic(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      border: isSelected ? '2px solid #93C5FD' : '1px solid #E2E8F0',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent div
                      style={{ accentColor: '#1CB0F6', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.name}
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: isWeak ? '#EF4444' : '#10B981' }}>
                        {t.mastery_percentage}% {isWeak ? '(Weak Area)' : '(Solid)'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trigger Generate Button */}
          {!generatedResult && (
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="btn-duo btn-duo-green"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 900,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Sparkles size={18} />
              <span>{isGenerating ? 'Synthesizing Calibrated Questions...' : 'Generate Practice Paper with Marking Schemes'}</span>
            </button>
          )}

          {/* Generated Questions Preview */}
          {generatedResult && (
            <div className="animate-pop-in" style={{ borderTop: '2px solid #F1F5F9', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#1E293B', margin: 0 }}>
                    Preview: {generatedResult.questions.filter(q => !q.is_alternate).length} Questions Generated
                  </h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                    Total {generatedResult.paper.total_marks} Marks • Includes {generatedResult.questions.filter(q => q.is_alternate).length} Alternates for swapping
                  </p>
                </div>

                <button
                  onClick={handleGenerate}
                  className="btn-duo btn-duo-white"
                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '10px' }}
                >
                  Regenerate
                </button>
              </div>

              {/* Questions Accordion */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                {generatedResult.questions.map((q, idx) => {
                  const isExpanded = expandedQuestionIdx === idx;
                  return (
                    <div
                      key={idx}
                      style={{
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: q.is_alternate ? '#FFFBEB' : '#FFFFFF',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        onClick={() => setExpandedQuestionIdx(isExpanded ? null : idx)}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          backgroundColor: isExpanded ? '#F8FAFC' : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: q.is_alternate ? '#FEF3C7' : '#EFF6FF',
                              color: q.is_alternate ? '#D97706' : '#1D4ED8',
                            }}
                          >
                            {q.is_alternate ? 'Alt Question' : `Q${q.question_number}`}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                            {q.topic_name}
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>
                            (Diff: {q.difficulty} • {q.max_marks} pts)
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '12px 14px', borderTop: '1px solid #F1F5F9' }}>
                          <p style={{ fontSize: '13px', color: '#334155', fontWeight: 600, margin: '0 0 10px 0' }}>
                            {q.question_text}
                          </p>

                          {/* Answer Key */}
                          <div
                            style={{
                              backgroundColor: '#F0FDF4',
                              border: '1px solid #BBF7D0',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              marginBottom: '8px',
                              fontSize: '12px',
                              fontWeight: 800,
                              color: '#166534',
                            }}
                          >
                            Key: {q.answer_key}
                          </div>

                          {/* Marking Scheme */}
                          <div style={{ fontSize: '12px', color: '#475569' }}>
                            <span style={{ fontWeight: 800, display: 'block', marginBottom: '4px' }}>
                              Marking Scheme ({q.max_marks} marks total):
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              {q.marking_scheme.map((step, sIdx) => (
                                <div key={sIdx} style={{ paddingLeft: '8px', borderLeft: '2px solid #58CC02' }}>
                                  {step}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '2px solid #F1F5F9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FAFCFF',
          }}
        >
          <button
            onClick={onClose}
            className="btn-duo btn-duo-white"
            style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '13px' }}
          >
            Cancel
          </button>

          {generatedResult && (
            <button
              onClick={handleSaveAndConfirm}
              className="btn-duo btn-duo-green"
              style={{
                padding: '10px 22px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>Save & Ready for Class</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

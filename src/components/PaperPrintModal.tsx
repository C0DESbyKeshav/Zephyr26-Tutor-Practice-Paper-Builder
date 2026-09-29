import React from 'react';
import { X, Printer } from 'lucide-react';
import type { Paper, Student, Question } from '../types';

interface PaperPrintModalProps {
  paper: Paper;
  student: Student;
  questions: Question[];
  onClose: () => void;
}

export const PaperPrintModal: React.FC<PaperPrintModalProps> = ({
  paper,
  student,
  questions,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="card-elevated animate-slide-up"
        style={{
          width: '100%',
          maxWidth: '800px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          color: '#1E293B',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Modal Toolbar (Hidden during print) */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            borderBottom: '1px solid #1E293B',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Printer size={18} color="#10B981" />
            <span style={{ fontWeight: 700, fontSize: '14px' }}>
              Print Practice Paper Preview
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Printer size={15} />
              <span>Print to PDF / Paper</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Paper Document Content */}
        <div
          style={{
            padding: '36px 40px',
            overflowY: 'auto',
            backgroundColor: '#FFFFFF',
            color: '#0F172A',
            fontFamily: 'serif',
          }}
        >
          {/* Header Block */}
          <div
            style={{
              borderBottom: '2px solid #0F172A',
              paddingBottom: '16px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {paper.title}
                </h1>
                <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>
                  Curriculum: <strong>{student.syllabus_board}</strong> | Grade: {student.grade}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>
                  Target Exam: {student.target_exam}
                </div>
                <div style={{ fontSize: '13px', color: '#64748B', marginTop: '2px' }}>
                  Time Allowed: <strong>45 Minutes</strong>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px dashed #CBD5E1',
                fontSize: '13px',
              }}
            >
              <div>Candidate Name: <strong>{student.name}</strong></div>
              <div>Class Schedule: <strong>{student.schedule_time}</strong></div>
              <div>Total Marks: <strong>{paper.total_marks} Marks</strong></div>
            </div>
          </div>

          {/* Instructions */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '6px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#334155',
              marginBottom: '28px',
            }}
          >
            <strong>Instructions to Candidates:</strong> Answer all questions. Write your answers in the spaces provided or on separate working sheets. Show all necessary working; method marks will be awarded for correct steps.
          </div>

          {/* Questions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {questions.map((q, idx) => (
              <div key={q.id} style={{ pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700 }}>
                    Question {idx + 1}
                    <span style={{ fontSize: '12px', fontWeight: 400, color: '#64748B', marginLeft: '8px' }}>
                      [{q.topic_name}]
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>
                    [{q.max_marks} marks]
                  </div>
                </div>

                <div style={{ fontSize: '15px', lineHeight: 1.6, color: '#1E293B', marginBottom: '16px' }}>
                  {q.question_text}
                </div>

                {/* Workspace lines for student writing */}
                <div
                  style={{
                    height: '70px',
                    border: '1px dashed #E2E8F0',
                    borderRadius: '4px',
                    backgroundColor: '#FAFAFA',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: '40px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#94A3B8',
            }}
          >
            <span>Project Antigravity • Tutor Practice Paper Builder</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
};

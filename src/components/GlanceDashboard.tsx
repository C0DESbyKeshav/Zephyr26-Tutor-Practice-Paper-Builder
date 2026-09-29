import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Sparkles, 
  Zap, 
  ChevronRight, 
  Search, 
  CheckCircle2, 
  FileText
} from 'lucide-react';
import type { Student, Paper } from '../types';
import { localDb } from '../database/localDb';
import { OfflinePill } from './OfflinePill';
import { SupabaseService } from '../services/supabaseClient';

interface GlanceDashboardProps {
  onSelectStudent: (student: Student) => void;
  onStartGrading: (paper: Paper, student: Student) => void;
}

export const GlanceDashboard: React.FC<GlanceDashboardProps> = ({
  onSelectStudent,
  onStartGrading,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'needs_grading' | 'ready'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPrepping, setIsPrepping] = useState(false);
  const [prepNotification, setPrepNotification] = useState<string | null>(null);

  // 10-Minute Window live ticker countdown
  const [windowSecondsLeft, setWindowSecondsLeft] = useState(468);

  const loadData = () => {
    setStudents(localDb.getStudents());
    setPapers(localDb.getPapers());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = localDb.subscribe(loadData);
    return unsubscribe;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setWindowSecondsLeft(prev => (prev > 0 ? prev - 1 : 600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}m ${secs.toString().padStart(2, '0')}s`;
  };

  const handlePrepTodaysPapers = async () => {
    setIsPrepping(true);
    const result = await localDb.prepTodaysPapers();
    SupabaseService.prepTodaysPapersBatch();

    setPrepNotification(result.message);
    setIsPrepping(false);

    setTimeout(() => {
      setPrepNotification(null);
    }, 4000);
  };

  const getStudentPaper = (studentId: string) => {
    const studentPapers = papers.filter(p => p.student_id === studentId);
    return (
      studentPapers.find(p => p.status === 'needs_grading') ||
      studentPapers.find(p => p.status === 'ready_for_class') ||
      studentPapers[0]
    );
  };

  const filteredStudents = students.filter(student => {
    const paper = getStudentPaper(student.id);
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.syllabus_board.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'needs_grading') {
      return paper && paper.status === 'needs_grading';
    }
    if (filterMode === 'ready') {
      return paper && paper.status === 'ready_for_class';
    }
    return true;
  });

  const needsGradingCount = papers.filter(p => p.status === 'needs_grading').length;
  const readyForClassCount = papers.filter(p => p.status === 'ready_for_class').length;

  // Cheerful avatar colors for students
  const avatarColors = [
    '#1CB0F6', '#58CC02', '#FF9600', '#CE82FF', '#FF4B4B', 
    '#2B70C9', '#00CD9C', '#FF86D0', '#E5A500', '#10B981'
  ];

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '24px 16px 120px' }}>
      {/* Friendly Top Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '16px',
              backgroundColor: '#58CC02',
              boxShadow: '0 4px 0 #46A302',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <Zap size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#23272E', margin: 0 }}>
              Tutor Practice
            </h1>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0, fontWeight: 500 }}>
              Today's Classes & Papers
            </p>
          </div>
        </div>

        <OfflinePill />
      </header>

      {/* 2 Big Friendly Goal Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Next Class Timer */}
        <div
          className="duo-card"
          style={{
            padding: '18px 20px',
            backgroundColor: '#FFFBEB',
            borderColor: '#FDE68A',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '16px',
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={26} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>
              Next Class In
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#78350F' }}>
              {formatCountdown(windowSecondsLeft)}
            </div>
          </div>
        </div>

        {/* Papers to Grade Summary */}
        <div
          className="duo-card duo-card-interactive"
          onClick={() => setFilterMode('needs_grading')}
          style={{
            padding: '18px 20px',
            backgroundColor: needsGradingCount > 0 ? '#FFF1F2' : '#F0FDF4',
            borderColor: needsGradingCount > 0 ? '#FECDD3' : '#BBF7D0',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '16px',
              backgroundColor: needsGradingCount > 0 ? '#FFE4E6' : '#DCFCE7',
              color: needsGradingCount > 0 ? '#E11D48' : '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {needsGradingCount > 0 ? (
              <FileText size={26} strokeWidth={2.5} />
            ) : (
              <CheckCircle2 size={26} strokeWidth={2.5} />
            )}
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: needsGradingCount > 0 ? '#9F1239' : '#166534', textTransform: 'uppercase' }}>
              {needsGradingCount > 0 ? 'Papers to Grade' : 'All Graded!'}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: needsGradingCount > 0 ? '#881337' : '#14532D' }}>
              {needsGradingCount > 0 ? `${needsGradingCount} Waiting` : 'All Done 🎉'}
            </div>
          </div>
        </div>
      </div>

      {/* Cheerful Alert Toast when FAB triggered */}
      {prepNotification && (
        <div
          className="animate-pop-in duo-card"
          style={{
            backgroundColor: '#F0F9FF',
            borderColor: '#BAE6FD',
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#0369A1',
            fontWeight: 700,
            fontSize: '14px',
          }}
        >
          <Sparkles size={18} color="#0284C7" />
          <span>{prepNotification}</span>
        </div>
      )}

      {/* Filter Tabs & Search */}
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
        {/* Simple Chunky Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setFilterMode('all')}
            className={`btn-duo ${filterMode === 'all' ? 'btn-duo-blue' : 'btn-duo-white'}`}
            style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '14px' }}
          >
            All ({students.length})
          </button>

          <button
            onClick={() => setFilterMode('needs_grading')}
            className={`btn-duo ${filterMode === 'needs_grading' ? 'btn-duo-red' : 'btn-duo-white'}`}
            style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '14px' }}
          >
            To Grade ({needsGradingCount})
          </button>

          <button
            onClick={() => setFilterMode('ready')}
            className={`btn-duo ${filterMode === 'ready' ? 'btn-duo-green' : 'btn-duo-white'}`}
            style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '14px' }}
          >
            Ready ({readyForClassCount})
          </button>
        </div>

        {/* Clean Friendly Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            border: '2px solid #E5E7EB',
            borderRadius: '16px',
            padding: '8px 14px',
            gap: '8px',
          }}
        >
          <Search size={16} color="#9CA3AF" />
          <input
            type="text"
            placeholder="Search student..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              fontWeight: 500,
              color: '#23272E',
              width: '150px',
            }}
          />
        </div>
      </div>

      {/* Student List (Clean, Big, Friendly) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {filteredStudents.map((student, idx) => {
          const paper = getStudentPaper(student.id);
          const isNeedsGrading = paper?.status === 'needs_grading';
          const avatarBg = avatarColors[idx % avatarColors.length];

          const initials = student.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2);

          return (
            <div
              key={student.id}
              className="duo-card duo-card-interactive"
              style={{
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                borderLeft: isNeedsGrading ? '6px solid #FF4B4B' : '6px solid #58CC02',
              }}
            >
              {/* Left Column: Avatar + Student Bio */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 300px' }}>
                {/* Cheerful Avatar */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '16px',
                    backgroundColor: avatarBg,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '17px',
                    fontWeight: 900,
                    boxShadow: '0 3px 0 rgba(0, 0, 0, 0.15)',
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>

                {/* Details */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '17px', fontWeight: 800, color: '#23272E' }}>
                      {student.name}
                    </span>
                    <span
                      style={{
                        backgroundColor: '#F3F4F6',
                        color: '#4B5563',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '8px',
                      }}
                    >
                      {student.grade}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#6B7280', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 700, color: '#1CB0F6' }}>🕒 {student.schedule_time}</span>
                    <span>•</span>
                    <span>{student.syllabus_board}</span>
                  </div>

                  <div style={{ marginTop: '5px' }}>
                    {isNeedsGrading ? (
                      <span
                        style={{
                          backgroundColor: '#FFF1F2',
                          color: '#E11D48',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          border: '1px solid #FECDD3',
                        }}
                      >
                        🔴 Paper waiting to be graded
                      </span>
                    ) : (
                      <span
                        style={{
                          backgroundColor: '#F0FDF4',
                          color: '#16A34A',
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          border: '1px solid #BBF7D0',
                        }}
                      >
                        🟢 Practice paper ready for class
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Clear, High-Contrast Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isNeedsGrading && paper && (
                  <button
                    onClick={() => onStartGrading(paper, student)}
                    className="btn-duo btn-duo-red"
                    style={{
                      padding: '10px 18px',
                      fontSize: '14px',
                    }}
                  >
                    <Zap size={16} />
                    <span>Grade Paper</span>
                  </button>
                )}

                <button
                  onClick={() => onSelectStudent(student)}
                  className="btn-duo btn-duo-white"
                  style={{
                    padding: '10px 16px',
                    fontSize: '14px',
                  }}
                >
                  <span>View Student</span>
                  <ChevronRight size={16} color="#9CA3AF" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Button (FAB): "Prepare All Papers" */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 100,
        }}
      >
        <button
          onClick={handlePrepTodaysPapers}
          disabled={isPrepping}
          className="btn-duo btn-duo-green"
          style={{
            padding: '16px 26px',
            fontSize: '16px',
            borderRadius: '24px',
            boxShadow: '0 8px 20px rgba(88, 204, 2, 0.4), 0 4px 0 #46A302',
          }}
        >
          <Sparkles size={20} />
          <span>{isPrepping ? 'Preparing...' : '✨ Prepare All Papers'}</span>
        </button>
      </div>
    </div>
  );
};

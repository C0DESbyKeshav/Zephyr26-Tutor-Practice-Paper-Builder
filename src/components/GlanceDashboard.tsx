import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Sparkles, 
  Zap, 
  ChevronRight, 
  Search, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Users
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

  // 10-Minute Window live ticker countdown (e.g. 07:42 left in current interval)
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
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Flow A: "Prep Today's Papers" FAB tap handler
  const handlePrepTodaysPapers = async () => {
    setIsPrepping(true);
    const result = await localDb.prepTodaysPapers();
    SupabaseService.prepTodaysPapersBatch();

    setPrepNotification(result.message);
    setIsPrepping(false);

    setTimeout(() => {
      setPrepNotification(null);
    }, 4500);
  };

  const getStudentPaper = (studentId: string) => {
    const studentPapers = papers.filter(p => p.student_id === studentId);
    return (
      studentPapers.find(p => p.status === 'needs_grading') ||
      studentPapers.find(p => p.status === 'ready_for_class') ||
      studentPapers[0]
    );
  };

  const getWeakTopicName = (studentId: string) => {
    const topics = localDb.getTopicsForStudent(studentId);
    const weak = topics.find(t => t.mastery_percentage < 60);
    return weak ? `${weak.name} (${weak.mastery_percentage}%)` : null;
  };

  const filteredStudents = students.filter(student => {
    const paper = getStudentPaper(student.id);
    const matchesSearch =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.syllabus_board.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.grade.toLowerCase().includes(searchQuery.toLowerCase());

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

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', padding: '28px 20px 120px' }}>
      {/* Top Header Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          paddingBottom: '24px',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.25)',
            }}
          >
            <Zap size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px' }}>
                Antigravity Tutor
              </h1>
              <span
                style={{
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #BFDBFE',
                }}
              >
                Zero-Wait Engine
              </span>
            </div>
            <p style={{ color: '#64748B', fontSize: '13px', marginTop: '2px' }}>
              Adaptive Practice Paper Generator • 10-Minute Classroom Window
            </p>
          </div>
        </div>

        {/* Sync Status & Reset Pill */}
        <OfflinePill />
      </header>

      {/* 4 Stat Overview Cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* 1. 10-Minute Window Urgency Card */}
        <div
          className="card-clean"
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
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#D97706',
              flexShrink: 0,
            }}
          >
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              10-Min Class Window
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#78350F', fontFamily: 'monospace', marginTop: '2px' }}>
              {formatCountdown(windowSecondsLeft)}
            </div>
          </div>
        </div>

        {/* 2. Needs Grading Card */}
        <div
          className="card-clean"
          onClick={() => setFilterMode('needs_grading')}
          style={{
            padding: '18px 20px',
            backgroundColor: '#FFF1F2',
            borderColor: '#FECDD3',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#FFE4E6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E11D48',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9F1239', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Needs Grading (🔴)
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#881337', marginTop: '2px' }}>
              {needsGradingCount} Papers
            </div>
          </div>
        </div>

        {/* 3. Ready for Class Card */}
        <div
          className="card-clean"
          onClick={() => setFilterMode('ready')}
          style={{
            padding: '18px 20px',
            backgroundColor: '#ECFDF5',
            borderColor: '#A7F3D0',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#D1FAE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ready for Class (🟢)
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#064E3B', marginTop: '2px' }}>
              {readyForClassCount} Ready
            </div>
          </div>
        </div>

        {/* 4. Active Students Card */}
        <div
          className="card-clean"
          onClick={() => setFilterMode('all')}
          style={{
            padding: '18px 20px',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              backgroundColor: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3B82F6',
              flexShrink: 0,
            }}
          >
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Students
            </div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', marginTop: '2px' }}>
              {students.length} Enrolled
            </div>
          </div>
        </div>
      </section>

      {/* Toast Notification when FAB is triggered */}
      {prepNotification && (
        <div
          className="animate-slide-up"
          style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '10px',
            padding: '12px 18px',
            marginBottom: '20px',
            color: '#1E40AF',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Sparkles size={16} color="#2563EB" />
          <span>{prepNotification}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setFilterMode('all')}
            style={{
              backgroundColor: filterMode === 'all' ? '#0F172A' : '#FFFFFF',
              color: filterMode === 'all' ? '#FFFFFF' : '#475569',
              border: '1px solid ' + (filterMode === 'all' ? '#0F172A' : '#E2E8F0'),
              padding: '7px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            All Students ({students.length})
          </button>

          <button
            onClick={() => setFilterMode('needs_grading')}
            style={{
              backgroundColor: filterMode === 'needs_grading' ? '#E11D48' : '#FFFFFF',
              color: filterMode === 'needs_grading' ? '#FFFFFF' : '#475569',
              border: '1px solid ' + (filterMode === 'needs_grading' ? '#E11D48' : '#E2E8F0'),
              padding: '7px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: filterMode === 'needs_grading' ? '#FFFFFF' : '#E11D48',
              }}
            />
            <span>Needs Grading ({needsGradingCount})</span>
          </button>

          <button
            onClick={() => setFilterMode('ready')}
            style={{
              backgroundColor: filterMode === 'ready' ? '#059669' : '#FFFFFF',
              color: filterMode === 'ready' ? '#FFFFFF' : '#475569',
              border: '1px solid ' + (filterMode === 'ready' ? '#059669' : '#E2E8F0'),
              padding: '7px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: filterMode === 'ready' ? '#FFFFFF' : '#059669',
              }}
            />
            <span>Ready for Class ({readyForClassCount})</span>
          </button>
        </div>

        {/* Search Input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '20px',
            padding: '6px 14px',
            gap: '8px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
          }}
        >
          <Search size={15} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search student or board..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#0F172A',
              fontSize: '13px',
              outline: 'none',
              width: '180px',
            }}
          />
        </div>
      </div>

      {/* Flow A: Chronological Timeline of 15 Students */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredStudents.map((student, idx) => {
          const paper = getStudentPaper(student.id);
          const isNeedsGrading = paper?.status === 'needs_grading';
          const isReady = paper?.status === 'ready_for_class';
          const weakTopicAlert = getWeakTopicName(student.id);

          return (
            <div
              key={student.id}
              className="card-clean"
              style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                borderLeft: `4px solid ${isNeedsGrading ? '#E11D48' : isReady ? '#059669' : '#CBD5E1'}`,
              }}
            >
              {/* Left Column: Time Slot + Status Dot + Student Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 400px' }}>
                {/* Time Slot Pill */}
                <div
                  style={{
                    backgroundColor: '#F1F5F9',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    minWidth: '82px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                    {student.schedule_time}
                  </div>
                  <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600, marginTop: '2px' }}>
                    Slot #{idx + 1}
                  </div>
                </div>

                {/* Status Dot */}
                <div>
                  {isNeedsGrading ? (
                    <span className="status-dot status-dot-red" title="Paper waiting for grading" />
                  ) : (
                    <span className="status-dot status-dot-green" title="Paper ready for class" />
                  )}
                </div>

                {/* Student Details */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                      {student.name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 600,
                      }}
                    >
                      {student.grade}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 600,
                        border: '1px solid #DBEAFE',
                      }}
                    >
                      {student.syllabus_board}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>Target: <strong>{student.target_exam}</strong></span>
                    {weakTopicAlert && (
                      <span
                        style={{
                          backgroundColor: '#FFF1F2',
                          color: '#BE123C',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #FECDD3',
                        }}
                      >
                        Needs Intervention: {weakTopicAlert}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Clear Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isNeedsGrading && paper && (
                  <button
                    onClick={() => onStartGrading(paper, student)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#E11D48',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '9px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(225, 29, 72, 0.3)',
                    }}
                  >
                    <Zap size={14} />
                    <span>Zen Grade (10 Qs)</span>
                  </button>
                )}

                <button
                  onClick={() => onSelectStudent(student)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#334155',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <TrendingUp size={14} color="#2563EB" />
                  <span>Radar & Tweaker</span>
                  <ChevronRight size={14} color="#94A3B8" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Action Button (FAB): "Prep Today's Papers" */}
      <div
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 100,
        }}
      >
        <button
          onClick={handlePrepTodaysPapers}
          disabled={isPrepping}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '28px',
            padding: '14px 24px',
            fontSize: '14px',
            fontWeight: 800,
            cursor: isPrepping ? 'not-allowed' : 'pointer',
            boxShadow: '0 10px 25px -3px rgba(37, 99, 235, 0.4)',
            transition: 'all 0.15s ease',
          }}
        >
          <Sparkles size={18} />
          <span>{isPrepping ? 'Enqueuing 15 Jobs...' : "Prep Today's Papers"}</span>
        </button>
      </div>
    </div>
  );
};

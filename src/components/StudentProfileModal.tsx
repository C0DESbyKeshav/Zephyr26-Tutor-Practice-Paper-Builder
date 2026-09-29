import React, { useState } from 'react';
import { X, Plus, Trash2, BookOpen, Clock, Award, GraduationCap } from 'lucide-react';
import type { Student, SyllabusBoard } from '../types';
import { localDb } from '../database/localDb';

interface StudentProfileModalProps {
  student?: Student | null; // If null/undefined => Create mode, otherwise Edit mode
  isOpen: boolean;
  onClose: () => void;
  onSaved: (student: Student) => void;
}

const AVAILABLE_BOARDS: SyllabusBoard[] = [
  'IB DP Math AA',
  'Cambridge IGCSE',
  'AP Calculus BC',
  'CBSE Class 10/12',
  'A-Level Physics',
  'AP Physics C',
  'General STEM',
];

const DEFAULT_AVATARS = [
  '#1CB0F6', '#58CC02', '#FF9600', '#CE82FF', '#FF4B4B',
  '#2B70C9', '#00CD9C', '#FF86D0', '#E5A500', '#10B981',
];

export const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  isOpen,
  onClose,
  onSaved,
}) => {
  const isEdit = !!student;

  const [name, setName] = useState(student?.name || '');
  const [grade, setGrade] = useState(student?.grade || 'Grade 11');
  const [syllabusBoard, setSyllabusBoard] = useState<SyllabusBoard>(
    student?.syllabus_board || 'IB DP Math AA'
  );
  const [targetExam, setTargetExam] = useState(student?.target_exam || 'Board Exam 2026');
  const [scheduleTime, setScheduleTime] = useState(student?.schedule_time || '09:00 AM');
  const [avatarColor, setAvatarColor] = useState(
    student?.avatar_color || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)]
  );

  // Topics management
  const existingTopics = student ? localDb.getTopicsForStudent(student.id) : [];
  const [topicsList, setTopicsList] = useState<{ id?: string; name: string; syllabus_code: string; mastery: number }[]>(
    existingTopics.length > 0
      ? existingTopics.map(t => ({ id: t.id, name: t.name, syllabus_code: t.syllabus_code, mastery: t.mastery_percentage }))
      : [
          { name: 'Core Principles & Algebra', syllabus_code: 'TOP-01', mastery: 75 },
          { name: 'Functions & Graphs', syllabus_code: 'TOP-02', mastery: 60 },
          { name: 'Calculus Applications', syllabus_code: 'TOP-03', mastery: 45 },
        ]
  );
  const [newTopicName, setNewTopicName] = useState('');

  if (!isOpen) return null;

  const handleAddTopic = () => {
    if (!newTopicName.trim()) return;
    setTopicsList(prev => [
      ...prev,
      {
        name: newTopicName.trim(),
        syllabus_code: `TOP-${String(prev.length + 1).padStart(2, '0')}`,
        mastery: 65,
      },
    ]);
    setNewTopicName('');
  };

  const handleRemoveTopic = (index: number) => {
    const toRemove = topicsList[index];
    if (toRemove.id) {
      localDb.deleteTopic(toRemove.id);
    }
    setTopicsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a student name.');
      return;
    }

    if (isEdit && student) {
      const updated: Student = {
        ...student,
        name: name.trim(),
        grade: grade.trim(),
        syllabus_board: syllabusBoard,
        target_exam: targetExam.trim(),
        schedule_time: scheduleTime.trim(),
        avatar_color: avatarColor,
      };
      localDb.updateStudent(updated);

      // Check for newly added topics
      topicsList.forEach(t => {
        if (!t.id) {
          localDb.addTopic(student.id, t.name, t.syllabus_code, t.mastery);
        }
      });

      onSaved(updated);
    } else {
      const created = localDb.createStudent(
        {
          name: name.trim(),
          grade: grade.trim(),
          syllabus_board: syllabusBoard,
          target_exam: targetExam.trim(),
          schedule_time: scheduleTime.trim(),
          avatar_color: avatarColor,
        },
        topicsList.map(t => ({
          name: t.name,
          syllabus_code: t.syllabus_code,
          initialMastery: t.mastery,
        }))
      );
      onSaved(created);
    }

    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
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
          maxWidth: '560px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '2px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: avatarColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: '18px',
              }}
            >
              {name ? name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#1E293B', margin: 0 }}>
                {isEdit ? 'Edit Student Profile' : 'Add New Student'}
              </h2>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                Configure class, syllabus topics, and schedule
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

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Student Name */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
              Student Full Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Alex Johnson"
              value={name}
              onChange={e => setName(e.target.value)}
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

          {/* Grade & Schedule Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                <GraduationCap size={15} color="#58CC02" />
                Grade / Class
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Grade 11, Year 12"
                value={grade}
                onChange={e => setGrade(e.target.value)}
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                <Clock size={15} color="#1CB0F6" />
                Class Schedule Time
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 09:30 AM"
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
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
          </div>

          {/* Syllabus Board & Target Exam Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                <BookOpen size={15} color="#FF9600" />
                Syllabus / Board
              </label>
              <select
                value={syllabusBoard}
                onChange={e => setSyllabusBoard(e.target.value as SyllabusBoard)}
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
                {AVAILABLE_BOARDS.map(b => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                <Award size={15} color="#CE82FF" />
                Target Exam
              </label>
              <input
                type="text"
                required
                placeholder="e.g. IB May 2026, AP Exam"
                value={targetExam}
                onChange={e => setTargetExam(e.target.value)}
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
          </div>

          {/* Avatar Color Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
              Badge Color
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {DEFAULT_AVATARS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAvatarColor(color)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: color,
                    border: avatarColor === color ? '3px solid #1E293B' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Syllabus Topics Covered */}
          <div style={{ borderTop: '2px solid #F1F5F9', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div>
                <label style={{ fontSize: '14px', fontWeight: 900, color: '#1E293B', display: 'block' }}>
                  Syllabus Topics Covered
                </label>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  Practice papers and diagnostics will calibrate to these topics
                </p>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#58CC02' }}>
                {topicsList.length} Topics
              </span>
            </div>

            {/* List of topics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px', maxHeight: '180px', overflowY: 'auto' }}>
              {topicsList.map((topic, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#64748B',
                        backgroundColor: '#E2E8F0',
                        padding: '2px 6px',
                        borderRadius: '6px',
                      }}
                    >
                      {topic.syllabus_code}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>
                      {topic.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: topic.mastery < 60 ? '#EF4444' : '#10B981',
                      }}
                    >
                      {topic.mastery}%
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTopic(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94A3B8',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                      title="Remove topic"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new topic inline */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Add topic (e.g. Complex Numbers, Kinematics)"
                value={newTopicName}
                onChange={e => setNewTopicName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTopic();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  borderRadius: '10px',
                  border: '2px solid #E2E8F0',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleAddTopic}
                className="btn-duo btn-duo-green"
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                }}
              >
                <Plus size={16} />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div
            style={{
              borderTop: '2px solid #F1F5F9',
              paddingTop: '16px',
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn-duo btn-duo-white"
              style={{ padding: '10px 18px', borderRadius: '12px', fontSize: '14px' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-duo btn-duo-green"
              style={{ padding: '10px 22px', borderRadius: '12px', fontSize: '14px' }}
            >
              {isEdit ? 'Save Changes' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

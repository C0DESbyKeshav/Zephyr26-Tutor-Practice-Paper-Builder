import React, { useState } from 'react';
import { GlanceDashboard } from './components/GlanceDashboard';
import { ZenGradingScreen } from './components/ZenGradingScreen';
import { StudentRadarScreen } from './components/StudentRadarScreen';
import type { Student, Paper } from './types';
import './styles/index.css';

type ActiveView = 
  | { type: 'dashboard' }
  | { type: 'grading'; paper: Paper; student: Student }
  | { type: 'radar'; student: Student };

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>({ type: 'dashboard' });

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', color: '#0F172A' }}>
      {activeView.type === 'dashboard' && (
        <GlanceDashboard
          onSelectStudent={(student) => setActiveView({ type: 'radar', student })}
          onStartGrading={(paper, student) => setActiveView({ type: 'grading', paper, student })}
        />
      )}

      {activeView.type === 'grading' && (
        <ZenGradingScreen
          paper={activeView.paper}
          student={activeView.student}
          onBack={() => setActiveView({ type: 'dashboard' })}
          onComplete={() => setActiveView({ type: 'dashboard' })}
        />
      )}

      {activeView.type === 'radar' && (
        <StudentRadarScreen
          student={activeView.student}
          onBack={() => setActiveView({ type: 'dashboard' })}
          onGradePaper={(paper) => setActiveView({ type: 'grading', paper, student: activeView.student })}
        />
      )}
    </div>
  );
};

export default App;

import React from 'react';
import type { Topic } from '../types';
import { AnalyticsEngine } from '../services/analyticsEngine';
import { AlertCircle, Clock } from 'lucide-react';

interface RadarChartProps {
  topics: Topic[];
  size?: number;
  onSelectTopic?: (topic: Topic) => void;
  selectedTopicId?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  topics,
  size = 380,
  onSelectTopic,
  selectedTopicId,
}) => {
  const displayTopics = topics.slice(0, 6);
  const numSides = 6;
  const center = size / 2;
  const radius = size * 0.36;

  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const getCoordinates = (index: number, valueRatio: number) => {
    const angle = (Math.PI * 2 * index) / numSides - Math.PI / 2;
    const r = radius * valueRatio;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y, angle };
  };

  const getLevelPolygonPoints = (level: number) => {
    return Array.from({ length: numSides })
      .map((_, i) => {
        const { x, y } = getCoordinates(i, level);
        return `${x},${y}`;
      })
      .join(' ');
  };

  const dataPoints = displayTopics.map((topic, i) => {
    const { adjustedMastery } = AnalyticsEngine.applyTimeDecay(topic.mastery_percentage, topic.last_tested_at);
    const valueRatio = Math.max(0.05, Math.min(1.0, adjustedMastery / 100));
    return {
      topic,
      mastery: adjustedMastery,
      coords: getCoordinates(i, valueRatio),
      vertexCoords: getCoordinates(i, 1.0),
    };
  });

  const polygonPath = dataPoints.map(p => `${p.coords.x},${p.coords.y}`).join(' ');

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="radarFillLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Background Hexagon Rings */}
        {levels.map((level, idx) => {
          const isInterventionRing = level === 0.6;
          return (
            <polygon
              key={`ring-${idx}`}
              points={getLevelPolygonPoints(level)}
              fill={isInterventionRing ? 'rgba(225, 29, 72, 0.03)' : 'transparent'}
              stroke={isInterventionRing ? '#E11D48' : '#CBD5E1'}
              strokeWidth={isInterventionRing ? 1.5 : 1}
              strokeDasharray={isInterventionRing ? '4,4' : undefined}
            />
          );
        })}

        {/* Spokes */}
        {Array.from({ length: numSides }).map((_, i) => {
          const { x, y } = getCoordinates(i, 1.0);
          return (
            <line
              key={`spoke-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#E2E8F0"
              strokeWidth={1}
            />
          );
        })}

        {/* 60% Intervention Threshold Label */}
        <text
          x={center + 6}
          y={center - radius * 0.6 + 12}
          fill="#E11D48"
          fontSize="9"
          fontWeight="800"
          letterSpacing="0.5px"
        >
          60% INTERVENTION THRESHOLD
        </text>

        {/* Student Data Polygon */}
        {dataPoints.length > 2 && (
          <polygon
            points={polygonPath}
            fill="url(#radarFillLight)"
            stroke="#2563EB"
            strokeWidth={2.5}
            style={{ transition: 'all 0.4s ease-out' }}
          />
        )}

        {/* Interactive Node Points */}
        {dataPoints.map((point, i) => {
          const isSelected = selectedTopicId === point.topic.id;
          const isWeak = point.mastery < 60;
          const { decayApplied } = AnalyticsEngine.applyTimeDecay(
            point.topic.mastery_percentage,
            point.topic.last_tested_at
          );

          return (
            <g
              key={`point-${i}`}
              onClick={() => onSelectTopic && onSelectTopic(point.topic)}
              style={{ cursor: 'pointer' }}
            >
              {isSelected && (
                <circle
                  cx={point.coords.x}
                  cy={point.coords.y}
                  r={8}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth={2}
                  opacity={0.7}
                />
              )}

              <circle
                cx={point.coords.x}
                cy={point.coords.y}
                r={isSelected ? 6 : 4.5}
                fill={isWeak ? '#E11D48' : decayApplied ? '#D97706' : '#059669'}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>

      {/* Topic Label Cards around the Hexagon */}
      {dataPoints.map((point, i) => {
        const isWeak = point.mastery < 60;
        const { decayApplied, daysSinceTested } = AnalyticsEngine.applyTimeDecay(
          point.topic.mastery_percentage,
          point.topic.last_tested_at
        );
        const isSelected = selectedTopicId === point.topic.id;

        const angle = (Math.PI * 2 * i) / numSides - Math.PI / 2;
        const labelDistance = radius + 38;
        const lx = center + labelDistance * Math.cos(angle);
        const ly = center + labelDistance * Math.sin(angle);

        return (
          <div
            key={`label-${i}`}
            onClick={() => onSelectTopic && onSelectTopic(point.topic)}
            style={{
              position: 'absolute',
              left: `${lx}px`,
              top: `${ly}px`,
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              cursor: 'pointer',
              zIndex: 10,
              backgroundColor: '#FFFFFF',
              border: `1px solid ${
                isSelected
                  ? '#2563EB'
                  : isWeak
                  ? '#FECDD3'
                  : '#CBD5E1'
              }`,
              borderRadius: '8px',
              padding: '4px 8px',
              maxWidth: '125px',
              boxShadow: isSelected
                ? '0 4px 10px rgba(37, 99, 235, 0.2)'
                : '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: isSelected ? '#2563EB' : '#0F172A',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {point.topic.name}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                marginTop: '2px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: isWeak ? '#E11D48' : '#059669',
                }}
              >
                {point.mastery}%
              </span>

              {isWeak && <AlertCircle size={10} color="#E11D48" />}
              {decayApplied && (
                <span title={`Tested ${daysSinceTested}d ago (-10% decay)`} style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <Clock size={10} color="#D97706" />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

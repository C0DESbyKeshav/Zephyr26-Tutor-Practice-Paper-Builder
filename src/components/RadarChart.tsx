import React from 'react';
import type { Topic } from '../types';
import { AnalyticsEngine } from '../services/analyticsEngine';


interface RadarChartProps {
  topics: Topic[];
  size?: number;
  onSelectTopic?: (topic: Topic) => void;
  selectedTopicId?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  topics,
  size = 360,
  onSelectTopic,
  selectedTopicId,
}) => {
  const displayTopics = topics.slice(0, 6);
  const numSides = 6;
  const center = size / 2;
  const radius = size * 0.35;

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
    const valueRatio = Math.max(0.1, Math.min(1.0, adjustedMastery / 100));
    return {
      topic,
      mastery: adjustedMastery,
      coords: getCoordinates(i, valueRatio),
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
          <linearGradient id="duoRadarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1CB0F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#58CC02" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Hexagon Rings */}
        {levels.map((level, idx) => {
          const isTargetRing = level === 0.6;
          return (
            <polygon
              key={`ring-${idx}`}
              points={getLevelPolygonPoints(level)}
              fill={isTargetRing ? 'rgba(255, 75, 75, 0.04)' : 'transparent'}
              stroke={isTargetRing ? '#FF4B4B' : '#E5E7EB'}
              strokeWidth={isTargetRing ? 2 : 1}
              strokeDasharray={isTargetRing ? '4,4' : undefined}
            />
          );
        })}

        {/* Center Spokes */}
        {Array.from({ length: numSides }).map((_, i) => {
          const { x, y } = getCoordinates(i, 1.0);
          return (
            <line
              key={`spoke-${i}`}
              x1={center}
              y1={center}
              x2={x}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
          );
        })}

        {/* 60% Target Text */}
        <text
          x={center + 6}
          y={center - radius * 0.6 + 12}
          fill="#FF4B4B"
          fontSize="10"
          fontWeight="800"
          letterSpacing="0.5px"
        >
          60% TARGET
        </text>

        {/* Filled Student Polygon */}
        {dataPoints.length > 2 && (
          <polygon
            points={polygonPath}
            fill="url(#duoRadarGradient)"
            stroke="#1CB0F6"
            strokeWidth={3}
            style={{ transition: 'all 0.3s ease-out' }}
          />
        )}

        {/* Interactive Data Dots */}
        {dataPoints.map((point, i) => {
          const isSelected = selectedTopicId === point.topic.id;
          const isWeak = point.mastery < 60;

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
                  r={10}
                  fill="none"
                  stroke="#1CB0F6"
                  strokeWidth={3}
                />
              )}

              <circle
                cx={point.coords.x}
                cy={point.coords.y}
                r={isSelected ? 6 : 5}
                fill={isWeak ? '#FF4B4B' : '#58CC02'}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>

      {/* Clean Topic Pills around the Hexagon */}
      {dataPoints.map((point, i) => {
        const isWeak = point.mastery < 60;
        const isSelected = selectedTopicId === point.topic.id;

        const angle = (Math.PI * 2 * i) / numSides - Math.PI / 2;
        const labelDistance = radius + 36;
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
              border: `2px solid ${
                isSelected
                  ? '#1CB0F6'
                  : isWeak
                  ? '#FFDFE0'
                  : '#E5E7EB'
              }`,
              borderRadius: '12px',
              padding: '4px 8px',
              maxWidth: '120px',
              boxShadow: isSelected
                ? '0 3px 0 #1899D6'
                : '0 2px 0 rgba(0, 0, 0, 0.05)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: isSelected ? '#1CB0F6' : '#23272E',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {point.topic.name}
            </div>

            <div
              style={{
                fontSize: '12px',
                fontWeight: 900,
                color: isWeak ? '#FF4B4B' : '#58CC02',
              }}
            >
              {point.mastery}%
            </div>
          </div>
        );
      })}
    </div>
  );
};

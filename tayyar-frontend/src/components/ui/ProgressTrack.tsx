import React from 'react';
import './ProgressTrack.css';

interface ProgressTrackProps {
  total: number;
  current: number;
}

export const ProgressTrack: React.FC<ProgressTrackProps> = ({ total, current }) => {
  return (
    <div className="progress-track">
      {Array.from({ length: total }).map((_, i) => (
        <div 
          key={i} 
          className={`progress-step ${i < current ? 'completed' : i === current ? 'active' : ''}`}
        />
      ))}
    </div>
  );
};

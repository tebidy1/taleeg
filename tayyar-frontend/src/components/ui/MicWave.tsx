import React from 'react';
import './MicWave.css';

interface MicWaveProps {
  isActive: boolean;
}

export const MicWave: React.FC<MicWaveProps> = ({ isActive }) => {
  return (
    <div className={`mic-wave-container ${isActive ? 'active' : ''}`}>
      <div className="mic-icon">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="22"></line>
          <line x1="8" y1="22" x2="16" y2="22"></line>
        </svg>
      </div>
      {isActive && (
        <div className="waves">
          <div className="wave wave-1"></div>
          <div className="wave wave-2"></div>
          <div className="wave wave-3"></div>
        </div>
      )}
    </div>
  );
};

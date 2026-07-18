import React from 'react';
import './Header.css';

interface HeaderProps {
  points?: number;
  streak?: number;
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ points, streak, showBack, onBack }) => {
  return (
    <header className="header">
      {showBack ? (
        <button className="header-back" onClick={onBack}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ) : (
        <div className="header-logo">طيّار</div>
      )}
      
      <div className="header-stats">
        {streak !== undefined && (
          <div className="stat-pill flame">
            <span>🔥</span> {streak}
          </div>
        )}
        {points !== undefined && (
          <div className="stat-pill pulse">
            <span>⭐</span> {points}
          </div>
        )}
      </div>
    </header>
  );
};

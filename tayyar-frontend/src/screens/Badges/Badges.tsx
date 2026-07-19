import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getBadges, getCurrentStreak, getTotalPoints, getPilotRank } from '../../lib/missionProgress';
import './Badges.css';

export const Badges: React.FC = () => {
  const navigate = useNavigate();
  const badges = getBadges();
  const earnedCount = badges.filter(b => b.earned).length;
  const streak = getCurrentStreak();
  const points = getTotalPoints();
  const rank = getPilotRank();

  return (
    <div className="badges-screen fade-in">
      <header className="badges-header">
        <button className="badges-back" onClick={() => navigate('/')} aria-label="العودة">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
        <div className="badges-header-title">شاراتي</div>
        <div style={{ width: 22 }} />
      </header>

      <div className="badges-content">
        {/* Pilot card */}
        <div className="rank-card">
          <div className="rank-icon">🪪</div>
          <div className="rank-info">
            <div className="rank-title">{rank}</div>
            <div className="rank-stats">
              <span>⭐ {points} نقطة</span>
              <span>·</span>
              <span>🔥 سلسلة {streak} {streak === 1 ? 'يوم' : 'أيام'}</span>
            </div>
          </div>
        </div>

        {/* Badge count */}
        <div className="badges-count">
          <span className="badges-count-num">{earnedCount}</span>
          <span className="badges-count-of"> / {badges.length} شارة</span>
        </div>

        {/* Grid */}
        <div className="badges-grid">
          {badges.map(badge => (
            <div key={badge.id} className={`badge-item ${badge.earned ? 'earned' : 'locked'}`}>
              <div className="badge-item-icon">
                {badge.earned ? badge.icon : '🔒'}
              </div>
              <div className="badge-item-name">{badge.name_ar}</div>
              <div className="badge-item-desc">{badge.desc_ar}</div>
              {badge.earned && <div className="badge-item-glow" />}
            </div>
          ))}
        </div>

        {earnedCount === badges.length && (
          <div className="badges-complete">
            🏆 أكملت كل الشارات — أنت كابتن حقيقي!
          </div>
        )}
      </div>
    </div>
  );
};

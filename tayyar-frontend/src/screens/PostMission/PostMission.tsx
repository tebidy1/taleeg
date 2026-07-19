import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import {
  fetchMissions, markMissionCompleted, getNextMissionId,
  addPoints, recordTodaySession, getCurrentStreak,
  recordBestSessionSentences,
  type MissionListItem,
} from '../../lib/missionProgress';
import './PostMission.css';

interface SessionResult {
  duration: number;
  points: number;
  badge?: string | null;
  exchanges?: number;
  studentSentences?: number;
  missionId?: string | null;
  heroWord?: string | null;
}

export const PostMission: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showConfetti, setShowConfetti] = useState(false);
  const [nextMission, setNextMission] = useState<MissionListItem | null>(null);
  const [arcComplete, setArcComplete] = useState(false);

  const result: SessionResult = location.state || {
    duration: 300, points: 120, badge: 'First Flight 🛫', studentSentences: 12,
  };

  const minutes = Math.floor(result.duration / 60);
  const seconds = result.duration % 60;
  const sentences = result.studentSentences ?? result.exchanges ?? 0;

  const profile = (() => { try { return JSON.parse(localStorage.getItem('student_profile') || '{}'); } catch { return {}; } })();
  const studentName = profile?.name || 'الطالب';

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(true), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (result.missionId) markMissionCompleted(result.missionId);
    addPoints(result.points);
    recordTodaySession();
    recordBestSessionSentences(sentences);
    fetchMissions()
      .then(missions => {
        const next = getNextMissionId(missions);
        if (next) setNextMission(missions.find(m => m.id === next) || null);
        else setArcComplete(true);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleWhatsAppShare = () => {
    const streak = getCurrentStreak();
    const text = `🌟 ${studentName} أتمّ درسًا في تطبيق طيّار!\n🎤 قال ${sentences} جملة إنجليزية\n⭐ +${result.points} نقطة${streak > 0 ? `\n🔥 السلسلة: ${streak} ${streak === 1 ? 'يوم' : 'أيام'} متتالية` : ''}\n\n✈️ طيّار — المحادثة الإنجليزية الحقيقية`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="post-mission-screen fade-in">
      {showConfetti && <ConfettiOverlay />}

      <div className="post-mission-content">
        {/* Trophy */}
        <div className="trophy-section scale-in">
          <div className="trophy-emoji">🏆</div>
          <h1 className="result-title">أحسنت، {studentName}!</h1>
          <p className="result-subtitle">أتممت مهمتك بنجاح</p>
        </div>

        {/* Stats */}
        <div className="stats-grid slide-up">
          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-number">{minutes}:{seconds.toString().padStart(2,'0')}</div>
            <div className="stat-label">وقت المهمة</div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-icon">🎤</div>
            <div className="stat-number">{sentences}</div>
            <div className="stat-label">جملة إنجليزية قلتها</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-number">+{result.points}</div>
            <div className="stat-label">نقاط مكتسبة</div>
          </div>
        </div>

        {/* Badge */}
        {result.badge && (
          <div className="badge-section slide-up">
            <div className="badge-card">
              <div className="badge-new-label">شارة جديدة!</div>
              <div className="badge-icon">🛫</div>
              <div className="badge-name">{result.badge}</div>
              <div className="badge-desc">أتممت مهمتك الأولى — طيار مبتدئ!</div>
            </div>
          </div>
        )}

        {/* Hero Word */}
        {result.heroWord && (
          <div className="hero-word-section slide-up">
            <h3>كلمة اليوم البطلة 🦸</h3>
            <div className="hero-word">
              <span className="word-en">{result.heroWord}</span>
            </div>
          </div>
        )}

        {/* Next mission cliffhanger */}
        {arcComplete ? (
          <div className="next-mission-teaser slide-up">
            <p className="teaser-badge">🏆 أكملت الرحلة كاملة!</p>
            <p className="teaser-hint">أنت الآن مسافر حقيقي — كل الدروس الخمسة خلفك.</p>
          </div>
        ) : nextMission ? (
          <div className="next-mission-teaser slide-up">
            <p className="teaser-label">ما الذي ينتظرك غداً؟</p>
            <p className="teaser-title">{nextMission.title_ar}</p>
            {nextMission.teaser_ar && (
              <p className="teaser-hook">"{nextMission.teaser_ar}"</p>
            )}
          </div>
        ) : null}

        {/* Actions */}
        <div className="action-buttons slide-up">
          {nextMission && (
            <Button fullWidth size="lg" onClick={() => navigate(`/mission?mission=${nextMission.id}`)}>
              ✈️ التالي: {nextMission.title_ar}
            </Button>
          )}
          <Button fullWidth size={nextMission ? 'md' : 'lg'} variant={nextMission ? 'secondary' : 'primary'} onClick={() => navigate('/')}>
            🏠 العودة للرئيسية
          </Button>
          {/* WhatsApp share — parent accountability loop */}
          <button className="share-btn" onClick={handleWhatsAppShare}>
            📲 شارك إنجاز {studentName} مع الأهل
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfettiOverlay: React.FC = () => (
  <div className="confetti-container" aria-hidden="true">
    {Array.from({ length: 20 }).map((_, i) => (
      <div
        key={i}
        className="confetti-piece"
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 1}s`,
          backgroundColor: ['#F5A623','#2ECC71','#1E5BA8','#FF6B6B','#FFD166'][i % 5]
        }}
      />
    ))}
  </div>
);

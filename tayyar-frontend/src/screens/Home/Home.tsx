import React, { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  fetchMissions, getCompletedMissionIds, getNextMissionId,
  getTotalPoints, getCurrentStreak, getWeekProgress, isTodayDone,
  getPilotRank, getBadges,
  type MissionListItem, type DayProgress,
} from '../../lib/missionProgress';
import './Home.css';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [missionsError, setMissionsError] = useState(false);
  const [weekProgress, setWeekProgress] = useState<DayProgress[]>([]);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [todayDone, setTodayDone] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState(0);
  const [rank, setRank] = useState('');

  React.useEffect(() => {
    if (!localStorage.getItem('onboarding_completed')) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    fetchMissions()
      .then(list => { setMissions(list); setCompletedIds(getCompletedMissionIds()); })
      .catch(() => setMissionsError(true));
    const s = getCurrentStreak();
    setPoints(getTotalPoints());
    setStreak(s);
    setWeekProgress(getWeekProgress());
    setTodayDone(isTodayDone());
    setEarnedBadges(getBadges().filter(b => b.earned).length);
    setRank(getPilotRank());
  }, []);

  const nextMissionId = getNextMissionId(missions);

  const profileStr = localStorage.getItem('student_profile');
  const profile = profileStr ? JSON.parse(profileStr) : null;
  const greetingName = profile?.name || 'طارق';

  // Streak warning: has a streak and hasn't practiced today yet
  const showStreakWarning = streak > 0 && !todayDone;

  return (
    <div className="home-screen fade-in">
      <Header points={points} streak={streak} />

      {/* ── Streak-at-risk banner ── */}
      {showStreakWarning && (
        <div className="streak-warning">
          <span className="streak-warning-icon">🔥</span>
          <span className="streak-warning-text">
            سلسلتك <strong>{streak} {streak === 1 ? 'يوم' : 'أيام'}</strong> ستنكسر الليلة — تدرّب الآن!
          </span>
        </div>
      )}

      <main className="home-content">
        <section className="welcome-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="greeting">مرحباً، {greetingName} 👋</h1>
            <p className="subtitle">{rank}</p>
          </div>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => {
              localStorage.removeItem('onboarding_completed');
              navigate('/onboarding', { replace: true });
            }}
          >
            👤 تعديل الملف
          </Button>
        </section>

        <section className="mission-section slide-up">
          {missionsError ? (
            <Card className="mission-card">
              <p className="mission-desc" style={{ textAlign: 'center' }}>تعذّر تحميل الدروس — تحقق من الاتصال بالخادم.</p>
            </Card>
          ) : missions.length === 0 ? (
            <Card className="mission-card">
              <p className="mission-desc" style={{ textAlign: 'center' }}>جاري تحميل رحلتك...</p>
            </Card>
          ) : (
            <>
              {missions.filter(m => m.id === nextMissionId).map(m => (
                <Card key={m.id} className="mission-card" hoverable>
                  <div className="mission-badge">✈️ الدرس {m.order}</div>
                  <h2 className="mission-title">{m.title_ar}</h2>
                  <Button fullWidth size="lg" onClick={() => navigate(`/mission?mission=${m.id}`)}>
                    🎤 ابدأ المهمة الآن
                  </Button>
                </Card>
              ))}

              {/* Vertical S-Shape Journey Map */}
              <div className="journey-map vertical">
                <div className="journey-track">
                  {missions.map((m, i) => {
                    const done  = completedIds.includes(m.id);
                    const isNext = m.id === nextMissionId;
                    
                    // S-shape offset using a sine wave
                    const offset = Math.sin(i * 0.9) * 65; 
                    const prevOffset = i > 0 ? Math.sin((i - 1) * 0.9) * 65 : 0;
                    
                    return (
                      <React.Fragment key={m.id}>
                        {i > 0 && (
                          <svg className="journey-line-svg" width="180" height="50">
                            <path 
                              d={`M ${90 + prevOffset} 0 C ${90 + prevOffset} 25, ${90 + offset} 25, ${90 + offset} 50`} 
                              stroke={completedIds.includes(missions[i - 1].id) ? '#27AE60' : '#E5E7EB'} 
                              strokeWidth="8" 
                              fill="none" 
                              strokeLinecap="round"
                            />
                          </svg>
                        )}
                        <button
                          className={`journey-stop ${done ? 'done' : ''} ${isNext ? 'next' : ''}`}
                          onClick={() => navigate(`/mission?mission=${m.id}`)}
                          title={m.title_ar}
                          style={{ transform: `translateX(${offset}px)` }}
                        >
                          <span className="journey-dot">{done ? '✓' : isNext ? '✈️' : m.order}</span>
                          <span className="journey-label">{m.title_ar}</span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </section>

        <section className="progress-section slide-up">
          <div className="progress-header">
            <h3>تقدمك في هذا الأسبوع 🔥</h3>
            <button className="badges-link" onClick={() => navigate('/badges')}>
              🏅 {earnedBadges} شارة
            </button>
          </div>
          <div className="days-track">
            {weekProgress.map(({ day, done, isToday }) => (
              <div key={day} className={`day-item ${done ? 'completed' : ''} ${isToday ? 'today' : ''}`}>
                <div className="day-circle">{done ? '✓' : isToday ? '•' : ''}</div>
                <span className="day-name">{day}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

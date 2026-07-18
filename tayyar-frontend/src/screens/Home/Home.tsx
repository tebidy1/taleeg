import React, { useEffect, useState } from 'react';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { fetchMissions, getCompletedMissionIds, getNextMissionId, type MissionListItem } from '../../lib/missionProgress';
import './Home.css';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<MissionListItem[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [missionsError, setMissionsError] = useState(false);

  React.useEffect(() => {
    if (!localStorage.getItem('onboarding_completed')) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    fetchMissions()
      .then(list => { setMissions(list); setCompletedIds(getCompletedMissionIds()); })
      .catch(() => setMissionsError(true));
  }, []);

  const nextMissionId = getNextMissionId(missions);

  // Read student name from profile if available
  const profileStr = localStorage.getItem('student_profile');
  const profile = profileStr ? JSON.parse(profileStr) : null;
  const greetingName = profile?.name || 'طارق';

  return (
    <div className="home-screen fade-in">
      <Header points={1250} streak={3} />

      <main className="home-content">
        <section className="welcome-section">
          <h1 className="greeting">مرحباً، {greetingName} 👋</h1>
          <p className="subtitle">مستعد لمهمة اليوم؟</p>
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

              <div className="mission-list">
                {missions.map(m => {
                  const done = completedIds.includes(m.id);
                  const isNext = m.id === nextMissionId;
                  return (
                    <button
                      key={m.id}
                      className={`mission-list-item ${done ? 'done' : ''} ${isNext ? 'next' : ''}`}
                      onClick={() => navigate(`/mission?mission=${m.id}`)}
                    >
                      <span className="mission-list-order">{done ? '✓' : m.order}</span>
                      <span className="mission-list-title">{m.title_ar}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className="progress-section slide-up">
          <h3>تقدمك في هذا الأسبوع 🔥</h3>
          <div className="days-track">
            {['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس'].map((day, i) => (
              <div key={day} className={`day-item ${i < 3 ? 'completed' : i === 3 ? 'today' : ''}`}>
                <div className="day-circle">{i < 3 ? '✓' : i === 3 ? '•' : ''}</div>
                <span className="day-name">{day}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

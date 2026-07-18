import React from 'react';

interface ProgressIndicatorsProps {
  timeElapsed: number;      // بالثواني
  totalTime?: number;       // 420 ثانية = 7 دقائق
  currentPhase: string;
  currentExchange?: number;
  totalExchanges?: number;  // 5 افتراضياً
  completedExchanges: number;
  pronunciationScore?: number; // 0-100
}

// ids match the server orchestrator's phases (detectCurrentPhase)
const phases = [
  { id: 'flash_open', label: 'انطلاق', aliases: ['ice_break'] },
  { id: 'quick_review', label: 'مراجعة سريعة', aliases: [] },
  { id: 'warmup', label: 'إحماء', aliases: [] },
  { id: 'mission', label: 'المهمة الرئيسية', aliases: [] },
  { id: 'multi_context', label: 'تطبيقات متعددة', aliases: [] },
  { id: 'victory_close', label: 'الختام', aliases: ['debrief', 'reward', 'end'] }
];

export const ProgressIndicators: React.FC<ProgressIndicatorsProps> = ({
  timeElapsed,
  totalTime = 420,
  currentPhase,
  completedExchanges,
  totalExchanges = 5,
  pronunciationScore
}) => {
  const currentIndex = phases.findIndex(p => p.id === currentPhase || p.aliases.includes(currentPhase));
  
  const getTimeColor = () => {
    if (timeElapsed < 240) return '#4CAF50'; // green < 4 mins
    if (timeElapsed < 360) return '#FF9800'; // orange < 6 mins
    return '#f44336'; // red >= 6 mins
  };
  const timeRatio = Math.min(timeElapsed / totalTime, 1);
  const m = Math.floor(timeElapsed / 60).toString().padStart(2, '0');
  const s = (timeElapsed % 60).toString().padStart(2, '0');
  const tm = Math.floor(totalTime / 60).toString().padStart(2, '0');
  const ts = (totalTime % 60).toString().padStart(2, '0');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', margin: '15px 0', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '12px' }}>
      
      {/* TimeBar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
          <span>الوقت</span>
          <span>{m}:{s} / {tm}:{ts}</span>
        </div>
        <div style={{ height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${timeRatio * 100}%`, backgroundColor: getTimeColor(), transition: 'all 1s linear' }} />
        </div>
      </div>

      {/* PhaseTracker */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
          {phases.map((p, i) => (
            <div 
              key={p.id} 
              title={p.label}
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: i <= currentIndex ? '#4CAF50' : '#ddd',
                boxShadow: i === currentIndex ? '0 0 0 4px rgba(76, 175, 80, 0.3)' : 'none',
                transform: i === currentIndex ? 'scale(1.2)' : 'scale(1)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#666', fontWeight: 'bold' }}>
          المرحلة: {phases[currentIndex > -1 ? currentIndex : 0]?.label || ''}
        </div>
      </div>

      {/* ExchangeTracker */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#666' }}>التبادلات:</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {Array.from({ length: totalExchanges }).map((_, i) => (
            <span key={i} style={{ color: i < completedExchanges ? '#2196F3' : '#ccc', fontSize: '16px' }}>
              {i < completedExchanges ? '●' : '○'}
            </span>
          ))}
        </div>
      </div>

      {/* PronunciationBar — only when a REAL score exists (no fake numbers for kids) */}
      {typeof pronunciationScore === 'number' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            <span>درجة النطق</span>
            <span>{pronunciationScore}%</span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pronunciationScore}%`, backgroundColor: '#9C27B0', transition: 'width 0.5s ease' }} />
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import './Onboarding.css';

interface Props {
  onNext: (profile: any) => void;
}

export const OnboardingProfile: React.FC<Props> = ({ onNext }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [grade, setGrade] = useState('');
  const [motivation, setMotivation] = useState('');

  const isFormValid = name.trim() !== '' && age !== '' && grade !== '' && motivation !== '';

  const handleSubmit = () => {
    if (isFormValid) {
      onNext({ name, age, grade, motivation });
    }
  };

  return (
    <div className="onboarding-container profile-bg">
      <h2 style={{ fontSize: '24px', color: '#1E5BA8', marginBottom: '8px' }}>إعداد الملف الشخصي</h2>
      <p style={{ color: '#6C757D', marginBottom: '32px' }}>لنتعرف عليك أكثر لنجعل تجربتك أفضل</p>

      <div className="profile-form">
        <div className="input-group">
          <label>ما اسمك يا بطل؟</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="اسمك الأول" 
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
          <div className="input-group" style={{ flex: 1 }}>
            <label>العمر</label>
            <input 
              type="number" 
              className="input-field" 
              placeholder="مثال: 12" 
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <div className="input-group" style={{ flex: 1 }}>
            <label>الصف الدراسي</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="مثال: السادس" 
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </div>
        </div>

        <div className="input-group" style={{ marginTop: '16px' }}>
          <label>لماذا تريد تعلم الإنجليزية؟</label>
          <div className="motivation-options">
            <div 
              className={`motivation-card ${motivation === 'travel' ? 'selected' : ''}`}
              onClick={() => setMotivation('travel')}
            >
              <div className="motivation-icon">🌍</div>
              <div className="motivation-text">للسفر</div>
            </div>
            <div 
              className={`motivation-card ${motivation === 'gaming' ? 'selected' : ''}`}
              onClick={() => setMotivation('gaming')}
            >
              <div className="motivation-icon">🎮</div>
              <div className="motivation-text">للألعاب</div>
            </div>
            <div 
              className={`motivation-card ${motivation === 'school' ? 'selected' : ''}`}
              onClick={() => setMotivation('school')}
            >
              <div className="motivation-icon">📚</div>
              <div className="motivation-text">للمدرسة</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <Button 
            onClick={handleSubmit} 
            variant="primary" 
            disabled={!isFormValid}
            style={{ width: '100%' }}
          >
            اكتمل الإعداد ←
          </Button>
        </div>
      </div>
    </div>
  );
};

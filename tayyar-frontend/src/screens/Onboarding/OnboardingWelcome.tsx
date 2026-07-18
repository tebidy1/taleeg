import React from 'react';
import { Button } from '../../components/ui/Button';
import './Onboarding.css';

interface Props {
  onNext: () => void;
}

export const OnboardingWelcome: React.FC<Props> = ({ onNext }) => {
  return (
    <div className="onboarding-container">
      <div className="welcome-logo">✈️</div>
      <h1 className="welcome-title">مرحباً يا بطل!</h1>
      <p className="welcome-subtitle">
        أنت على بعد 7 دقائق<br/>
        من أول محادثة إنجليزية<br/>
        حقيقية في حياتك
      </p>

      <div className="welcome-features">
        <div className="feature-item">
          <span>❌</span> لا تحتاج خبرة سابقة
        </div>
        <div className="feature-item">
          <span>⏱️</span> 7 دقائق فقط يومياً
        </div>
        <div className="feature-item">
          <span>🌍</span> رحلة سفر ممتعة
        </div>
      </div>

      <Button onClick={onNext} variant="primary" style={{ width: '100%', maxWidth: '300px' }}>
        لنبدأ المغامرة ←
      </Button>
    </div>
  );
};

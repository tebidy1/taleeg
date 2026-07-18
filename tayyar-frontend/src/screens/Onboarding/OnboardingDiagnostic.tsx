import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { MicWave } from '../../components/ui/MicWave';
import './Onboarding.css';

interface Props {
  onNext: () => void;
}

const PHRASES = [
  "Hello",
  "Thank you",
  "I am [your name]"
];

export const OnboardingDiagnostic: React.FC<Props> = ({ onNext }) => {
  const [step, setStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (step < PHRASES.length) {
      // Simulate the listening process for each step
      setIsListening(true);
      const timer = setTimeout(() => {
        setIsListening(false);
        if (step === PHRASES.length - 1) {
          setIsDone(true);
        } else {
          setStep((prev) => prev + 1);
        }
      }, 3000); // 3 seconds per phrase simulation
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <div className="onboarding-container diagnostic-bg">
      <div className="diagnostic-header">
        <h2>اختبار الميكروفون</h2>
        <p>قل الكلمات التالية بصوت واضح</p>
      </div>

      <div className="diagnostic-prompt">
        {isDone ? "رائع! صوتك واضح جداً 🎉" : `"${PHRASES[step]}"`}
      </div>

      <div className="diagnostic-mic-area">
        <MicWave isActive={isListening && !isDone} />
      </div>

      <div style={{ height: '60px' }}>
        {isDone ? (
          <Button onClick={onNext} variant="primary" style={{ width: '100%', maxWidth: '300px' }}>
            الخطوة التالية ←
          </Button>
        ) : (
          <p style={{ color: '#6C757D', fontSize: '14px' }}>نستمع إليك الآن...</p>
        )}
      </div>
    </div>
  );
};

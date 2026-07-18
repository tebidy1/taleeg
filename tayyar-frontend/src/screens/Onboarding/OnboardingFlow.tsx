import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingDiagnostic } from './OnboardingDiagnostic';
import { OnboardingProfile } from './OnboardingProfile';

export const OnboardingFlow: React.FC = () => {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const handleNextStep = () => {
    setStep(prev => prev + 1);
  };

  const handleComplete = (profileData: any) => {
    // Save to localStorage
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('student_profile', JSON.stringify(profileData));
    
    // Redirect to Home
    navigate('/');
  };

  return (
    <div className="onboarding-flow-wrapper" dir="rtl">
      {step === 1 && <OnboardingWelcome onNext={handleNextStep} />}
      {step === 2 && <OnboardingDiagnostic onNext={handleNextStep} />}
      {step === 3 && <OnboardingProfile onNext={handleComplete} />}
    </div>
  );
};

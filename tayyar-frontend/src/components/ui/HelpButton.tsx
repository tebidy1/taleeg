import React, { useState } from 'react';
import { API_BASE } from '../../config';

interface HelpButtonProps {
  sessionId: string;
  onPress?: (count: number) => void; // callback اختياري لإخبار المكوّن الأب
}

const styles = {
    base: {
        border: 'none', borderRadius: '12px', padding: '10px 20px',
        fontSize: '16px', cursor: 'pointer', fontWeight: 'bold',
        transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', gap: '8px'
    },
    normal: { backgroundColor: '#4CAF50', color: 'white' },
    warning: { backgroundColor: '#FF9800', color: 'white', animation: 'pulse 1s infinite' },
    urgent: { backgroundColor: '#f44336', color: 'white', animation: 'shake 0.5s' },
};

export const HelpButton: React.FC<HelpButtonProps> = ({ sessionId, onPress }) => {
  const [pressCount, setPressCount] = useState(0);
  const [isSending, setIsSending] = useState(false);

  const handlePress = async () => {
    if (isSending || pressCount >= 3) return;
    const newCount = pressCount + 1;
    setPressCount(newCount);
    onPress?.(newCount);
    setIsSending(true);
    try {
      await fetch(`${API_BASE}/api/sessions/${sessionId}/help-press`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pressCount: newCount })
      });
    } catch (e) {
      console.error('Failed to send help press', e);
    } finally {
      setIsSending(false);
    }
  };

  const getStyle = () => {
    if (pressCount === 0) return { ...styles.base, ...styles.normal };
    if (pressCount === 1) return { ...styles.base, ...styles.warning };
    return { ...styles.base, ...styles.urgent };
  };

  const getLabel = () => {
    if (pressCount === 0) return '💡 مساعدة';
    if (pressCount === 1) return '⚠️ تلميح (١)';
    if (pressCount === 2) return '🆘 إجابة (٢)';
    return '⏭️ سؤال جديد (٣)';
  };

  return (
    <button style={getStyle()} onClick={handlePress} disabled={isSending || pressCount >= 3}>
      {getLabel()}
    </button>
  );
};

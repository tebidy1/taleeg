/**
 * AI Speaking Tutor — Data Schema
 * Level 1 (CEFR A1 → A1+)
 * 
 * This is the COMPLETE data structure for the MVP.
 * All other features build on top of these types.
 */

// ============================================================
// CORE ENTITIES
// ============================================================

export interface Student {
  id: string;
  name: string;
  age: number;
  grade: number; // 7, 8, 9 (متوسط) or 10, 11, 12 (ثانوي)
  cefr_level: CEFRLevel;
  start_date: Date;
  current_phase: 1 | 2 | 3; // Level 1 has 3 phases
  
  // Engagement stats
  total_sessions: number;
  current_streak: number;
  longest_streak: number;
  total_minutes_spoken: number;
  total_words_spoken: number;
  total_points: number;
  
  // Learning data
  vocabulary: VocabularyItem[];
  patterns: PatternMastery[];
  pronunciation_map: PronunciationMap;
  badges: string[];
  
  // Engagement profile (learned over time)
  engagement_profile: EngagementProfile;
  
  // Current state
  current_mission_id: string | null;
  last_session_date: Date | null;
  last_session_id: string | null;
}

export type CEFRLevel = "A1" | "A1+" | "A2" | "A2+" | "B1";

// ============================================================
// VOCABULARY (with Spaced Repetition)
// ============================================================

export interface VocabularyItem {
  id: string;
  word: string;
  translation: string; // Arabic
  pattern_id: string; // which pattern it belongs to
  phoneme_focus: string[]; // which phonemes it practices
  context_examples: string[];
  cefr_level: CEFRLevel;
  
  // SRS data
  first_learned: Date;
  last_reviewed: Date | null;
  next_review: Date;
  interval_days: number;
  ease_factor: number; // starts at 2.5
  review_count: number;
  performance_history: ReviewRecord[];
  
  // Mastery
  mastery_level: 0 | 1 | 2 | 3 | 4 | 5;
  pronunciation_accuracy: number; // 0-1
  production_accuracy: number; // 0-1 (using in new sentences)
}

export interface ReviewRecord {
  date: Date;
  score: number; // 0-1
  context: string; // which mission
  response_type: "recognition" | "recall" | "production";
}

// ============================================================
// PATTERNS (Sentence Patterns)
// ============================================================

export interface SentencePattern {
  id: string;
  pattern: string; // "I would like {noun}"
  translation: string;
  slots: PatternSlot[];
  variations: {
    question?: string;
    negative?: string;
    polite?: string;
  };
  cefr_level: CEFRLevel;
  phase: 1 | 2 | 3; // when introduced
  related_patterns: string[];
  teaching_order: number; // 1 = first pattern to teach
}

export interface PatternSlot {
  name: string; // "noun"
  type: "noun" | "verb" | "adjective" | "number" | "place";
  examples: string[];
}

export interface PatternMastery {
  pattern_id: string;
  // 5 stages of mastery (from the teaching methodology)
  recognition_level: number; // 0-5
  substitution_level: number;
  expansion_level: number;
  production_level: number;
  transformation_level: number;
  
  times_used_correctly: number;
  times_used_incorrectly: number;
  last_used: Date | null;
  contexts_used_in: string[];
}

// ============================================================
// PRONUNCIATION
// ============================================================

export interface PronunciationMap {
  phonemes: Record<string, PhonemeRecord>;
  weak_phonemes: string[]; // sorted by priority
  strong_phonemes: string[];
  
  // Higher-level skills
  sentence_stress_accuracy: number;
  intonation_accuracy: number;
  connected_speech_accuracy: number;
}

export interface PhonemeRecord {
  phoneme: string; // "/p/"
  examples: string[]; // ["pen", "apple"]
  arabic_confusion: string; // "confused with /b/"
  attempts: number;
  correct_count: number;
  accuracy: number; // 0-1
  trend: "improving" | "stable" | "declining";
  last_practiced: Date | null;
  practice_count: number;
  hint: string; // tip for the student
}

// ============================================================
// MISSIONS
// ============================================================

export interface Mission {
  id: string;
  title: string;
  title_ar: string;
  narrative: string; // story setup
  context: MissionContext;
  cefr_level: CEFRLevel;
  phase: 1 | 2 | 3;
  order: number; // 1 = first mission
  
  // Learning objectives
  target_patterns: string[]; // pattern IDs
  target_vocabulary: string[]; // vocabulary IDs
  target_phonemes: string[];
  
  // Scenario
  ai_character: AICharacter;
  scenario_flow: ScenarioStep[];
  
  // Adaptation
  adaptation_rules: {
    hint_threshold_seconds: number;
    max_exchanges: number;
    simplify_on_failure_count: number;
  };
  
  // Rewards
  base_points: number;
  available_badges: string[];
}

export type MissionContext = "airport" | "airplane" | "hotel" | "restaurant" | "shopping";

export interface AICharacter {
  name: string;
  role: string;
  personality: string;
  greeting: string;
}

export interface ScenarioStep {
  step_number: number;
  ai_says: string;
  expected_student_response: string;
  hint: string;
  simplification: string; // if student struggles
  target_pattern: string;
  target_vocabulary: string[];
}

// ============================================================
// SESSIONS
// ============================================================

export interface Session {
  id: string;
  student_id: string;
  mission_id: string;
  start_time: Date;
  end_time: Date | null;
  duration_seconds: number;
  
  // Performance
  exchanges: SessionExchange[];
  total_points: number;
  badge_earned: string | null;
  
  // Analysis
  pronunciation_scores: PronunciationScore[];
  patterns_used: PatternUsage[];
  new_vocabulary: string[];
  reviewed_vocabulary: string[];
  
  // Emotional state
  engagement_level: "low" | "medium" | "high";
  frustration_detected: boolean;
  
  // Artifacts
  audio_recording_url: string | null;
  transcript: string;
  
  // Debrief
  hero_word: string | null; // student's chosen word
  mood_emoji: "😎" | "😊" | "😐" | "😰" | null;
}

export interface SessionExchange {
  exchange_number: number;
  ai_message: string;
  student_message: string;
  timestamp: Date;
  duration_seconds: number;
  hint_used: boolean;
  pronunciation_score: number | null;
  pattern_used: string | null;
  success: boolean;
}

export interface PronunciationScore {
  word: string;
  phoneme_scores: Record<string, number>;
  overall_accuracy: number;
  issues: string[];
}

export interface PatternUsage {
  pattern_id: string;
  used_correctly: boolean;
  context: string;
}

// ============================================================
// ENGAGEMENT PROFILE
// ============================================================

export interface EngagementProfile {
  preferred_contexts: MissionContext[];
  preferred_praise_style: "specific" | "general";
  hint_sensitivity: "low" | "medium" | "high";
  session_length_preference: number; // in minutes
  best_time_of_day: "morning" | "afternoon" | "evening";
  motivation_type: "achievement" | "social" | "exploration";
}

// ============================================================
// BADGES
// ============================================================

export interface Badge {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  icon: string;
  criteria: BadgeCriteria;
}

export interface BadgeCriteria {
  type: "pronunciation" | "fluency" | "streak" | "vocabulary" | "independence" | "completion";
  threshold: number;
  scope: "session" | "weekly" | "total";
}

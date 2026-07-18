/**
 * AI Speaking Tutor — Data Schema
 * Level 1 (CEFR A1 → A1+)
 *
 * This is the COMPLETE data structure for the MVP.
 * All other features build on top of these types.
 */
export interface Student {
    id: string;
    name: string;
    age: number;
    grade: number;
    cefr_level: CEFRLevel;
    start_date: Date;
    current_phase: 1 | 2 | 3;
    total_sessions: number;
    current_streak: number;
    longest_streak: number;
    total_minutes_spoken: number;
    total_words_spoken: number;
    total_points: number;
    vocabulary: VocabularyItem[];
    patterns: PatternMastery[];
    pronunciation_map: PronunciationMap;
    badges: string[];
    engagement_profile: EngagementProfile;
    current_mission_id: string | null;
    last_session_date: Date | null;
    last_session_id: string | null;
}
export type CEFRLevel = "A1" | "A1+" | "A2" | "A2+" | "B1";
export interface VocabularyItem {
    id: string;
    word: string;
    translation: string;
    pattern_id: string;
    phoneme_focus: string[];
    context_examples: string[];
    cefr_level: CEFRLevel;
    first_learned: Date;
    last_reviewed: Date | null;
    next_review: Date;
    interval_days: number;
    ease_factor: number;
    review_count: number;
    performance_history: ReviewRecord[];
    mastery_level: 0 | 1 | 2 | 3 | 4 | 5;
    pronunciation_accuracy: number;
    production_accuracy: number;
}
export interface ReviewRecord {
    date: Date;
    score: number;
    context: string;
    response_type: "recognition" | "recall" | "production";
}
export interface SentencePattern {
    id: string;
    pattern: string;
    translation: string;
    slots: PatternSlot[];
    variations: {
        question?: string;
        negative?: string;
        polite?: string;
    };
    cefr_level: CEFRLevel;
    phase: 1 | 2 | 3;
    related_patterns: string[];
    teaching_order: number;
}
export interface PatternSlot {
    name: string;
    type: "noun" | "verb" | "adjective" | "number" | "place";
    examples: string[];
}
export interface PatternMastery {
    pattern_id: string;
    recognition_level: number;
    substitution_level: number;
    expansion_level: number;
    production_level: number;
    transformation_level: number;
    times_used_correctly: number;
    times_used_incorrectly: number;
    last_used: Date | null;
    contexts_used_in: string[];
}
export interface PronunciationMap {
    phonemes: Record<string, PhonemeRecord>;
    weak_phonemes: string[];
    strong_phonemes: string[];
    sentence_stress_accuracy: number;
    intonation_accuracy: number;
    connected_speech_accuracy: number;
}
export interface PhonemeRecord {
    phoneme: string;
    examples: string[];
    arabic_confusion: string;
    attempts: number;
    correct_count: number;
    accuracy: number;
    trend: "improving" | "stable" | "declining";
    last_practiced: Date | null;
    practice_count: number;
    hint: string;
}
export interface Mission {
    id: string;
    title: string;
    title_ar: string;
    narrative: string;
    context: MissionContext;
    cefr_level: CEFRLevel;
    phase: 1 | 2 | 3;
    order: number;
    target_patterns: string[];
    target_vocabulary: string[];
    target_phonemes: string[];
    ai_character: AICharacter;
    scenario_flow: ScenarioStep[];
    adaptation_rules: {
        hint_threshold_seconds: number;
        max_exchanges: number;
        simplify_on_failure_count: number;
    };
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
    simplification: string;
    target_pattern: string;
    target_vocabulary: string[];
}
export interface Session {
    id: string;
    student_id: string;
    mission_id: string;
    start_time: Date;
    end_time: Date | null;
    duration_seconds: number;
    exchanges: SessionExchange[];
    total_points: number;
    badge_earned: string | null;
    pronunciation_scores: PronunciationScore[];
    patterns_used: PatternUsage[];
    new_vocabulary: string[];
    reviewed_vocabulary: string[];
    engagement_level: "low" | "medium" | "high";
    frustration_detected: boolean;
    audio_recording_url: string | null;
    transcript: string;
    hero_word: string | null;
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
export interface EngagementProfile {
    preferred_contexts: MissionContext[];
    preferred_praise_style: "specific" | "general";
    hint_sensitivity: "low" | "medium" | "high";
    session_length_preference: number;
    best_time_of_day: "morning" | "afternoon" | "evening";
    motivation_type: "achievement" | "social" | "exploration";
}
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
//# sourceMappingURL=index.d.ts.map
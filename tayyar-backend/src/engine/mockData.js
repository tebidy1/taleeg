"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMockStudent = getMockStudent;
exports.getMockMission = getMockMission;
const index_1 = require("../types/index");
function getMockStudent() {
    return {
        id: "student_123",
        name: "Faisal",
        age: 12,
        grade: 7,
        cefr_level: "A1",
        start_date: new Date(),
        current_phase: 0,
        total_sessions: 0,
        current_streak: 0,
        longest_streak: 0,
        total_minutes_spoken: 0,
        total_words_spoken: 0,
        total_points: 0,
        vocabulary: [],
        patterns: [],
        pronunciation_map: {
            phonemes: {
                "/p/": {
                    phoneme: "/p/",
                    examples: ["passport", "please"],
                    arabic_confusion: "confused with /b/",
                    attempts: 0,
                    correct_count: 0,
                    accuracy: 0.5,
                    trend: "stable",
                    last_practiced: null,
                    practice_count: 0,
                    hint: "Bite your lips and blow air."
                },
                "/v/": {
                    phoneme: "/v/",
                    examples: ["window", "very"],
                    arabic_confusion: "confused with /f/ or /w/",
                    attempts: 0,
                    correct_count: 0,
                    accuracy: 0.6,
                    trend: "stable",
                    last_practiced: null,
                    practice_count: 0,
                    hint: "Top teeth on bottom lip."
                }
            },
            weak_phonemes: ["/p/", "/v/"],
            strong_phonemes: [],
            sentence_stress_accuracy: 0.5,
            intonation_accuracy: 0.5,
            connected_speech_accuracy: 0.5
        },
        badges: [],
        engagement_profile: {
            preferred_contexts: ["airport"],
            preferred_praise_style: "specific",
            hint_sensitivity: "medium",
            session_length_preference: 7,
            best_time_of_day: "afternoon",
            motivation_type: "exploration"
        },
        current_mission_id: "mission_00_first_words",
        last_session_date: null,
        last_session_id: null
    };
}
function getMockMission() {
    return {
        id: "mission_00_first_words",
        title: "First Words — Meet Captain English",
        title_ar: "أول كلمات — تعرّف على كابتن إنجلش",
        narrative: "أنت ستتعرف على كابتن إنجلش لأول مرة. درس التأسيس.",
        context: "classroom",
        cefr_level: "A0",
        phase: 0,
        order: 0,
        target_patterns: ["pat_000_greeting"],
        target_vocabulary: ["hello", "my name", "nice to meet you", "I am"],
        target_phonemes: ["/h/", "/l/"],
        ai_character: {
            name: "Captain English",
            role: "English coach",
            personality: "Warm, encouraging, patient Arabic-speaking coach",
            greeting: "أهلاً وسهلاً! أنا كابتن إنجلش. Ready to learn your first English words?"
        },
        scenario_flow: [{
                step_number: 1,
                ai_says: "أهلاً وسهلاً! أنا كابتن إنجلش. Let's say: Hello, I am [your name]",
                expected_student_response: "Hello, I am [name]",
                hint: "قل: Hello, I am...",
                simplification: "Just say: Hello!",
                target_pattern: "pat_000_greeting",
                target_vocabulary: ["hello", "I am"]
            }],
        adaptation_rules: {
            hint_threshold_seconds: 2,
            max_exchanges: 5,
            simplify_on_failure_count: 2
        },
        base_points: 50,
        available_badges: ["First Words"]
    };
}
//# sourceMappingURL=mockData.js.map
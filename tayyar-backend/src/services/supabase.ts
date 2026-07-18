import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Initialize client only if we have credentials
export const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey) 
    : null;

if (!supabase) {
    console.warn("Supabase credentials missing. Running with mock data for MVP.");
}

// Mock Database for MVP when Supabase is not configured
const mockDB = {
    students: new Map<string, any>(),
    sessions: new Map<string, any>(),
};

// Insert a default test student if empty
mockDB.students.set("student_test_1", {
    id: "student_test_1",
    name: "طارق",
    age: 12,
    grade: 7,
    cefr_level: "A1",
    current_phase: 1,
    total_sessions: 3,
    current_streak: 2,
    longest_streak: 2,
    total_points: 1250,
    total_minutes_spoken: 15,
    total_words_spoken: 120,
    vocabulary: [],
    patterns: [],
    pronunciation_map: {
        phonemes: {},
        weak_phonemes: ["/p/", "/v/"],
        strong_phonemes: ["/b/", "/f/"],
        sentence_stress_accuracy: 0.8,
        intonation_accuracy: 0.7,
        connected_speech_accuracy: 0.6
    },
    badges: ["First Flight"],
    engagement_profile: {
        preferred_contexts: ["airport", "food"],
        preferred_praise_style: "specific",
        hint_sensitivity: "medium",
        session_length_preference: 5,
        best_time_of_day: "evening",
        motivation_type: "achievement"
    },
    current_mission_id: "mission_01_airport",
    last_session_date: new Date()
});

export const getStudentFromDB = async (id: string) => {
    if (supabase) {
        const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
        if (error) throw error;
        return data;
    }
    return mockDB.students.get(id);
};

export const saveSessionToDB = async (sessionData: any) => {
    if (supabase) {
        const { data, error } = await supabase.from('sessions').insert([sessionData]).select();
        if (error) throw error;
        return data[0];
    }
    const id = "sess_" + Date.now();
    mockDB.sessions.set(id, { id, ...sessionData });
    return mockDB.sessions.get(id);
};

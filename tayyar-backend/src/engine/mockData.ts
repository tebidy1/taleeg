import { Student, Mission } from "../types/index";

export function getMockStudent(): Student {
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
        current_mission_id: "mission_01_voice_gate",
        last_session_date: null,
        last_session_id: null
    };
}

// ── Free-trial mission registry (الرحلة الأولى: الرياض ← دبي) ─────────────
// The captain persona and teaching protocols live in layer1_core_persona.md;
// each mission's full script is the matching layer2_missions/*.md file.
// These objects carry only the overview metadata the core prompt needs.

const CAPTAIN = {
    name: "الكابتن",
    role: "رفيق الرحلة والطيار",
    personality: "طاقة عالية، رفيق مغامرة لا مُقيّم، عيبه المحبب أنه يتلعثم أحياناً فيصححه الطالب",
    greeting: "طيران طيّار يرحب بالبطل! الرحلة إلى دبي جاهزة للإقلاع."
};

const DEFAULT_ADAPTATION = { hint_threshold_seconds: 2, max_exchanges: 6, simplify_on_failure_count: 2 };

const MISSIONS: Record<string, Mission> = {
    mission_01_voice_gate: {
        id: "mission_01_voice_gate",
        title: "The Voice Gate", title_ar: "البوابة الصوتية",
        narrative: "اختير الطالب لمهمة في دبي، ومعه مغلف ذهبي مقفل. عليه عبور بوابة صعود صوتية تفتح فقط لمن يعرّف بنفسه بالإنجليزية بطلاقة بلا توقف.",
        context: "airport", cefr_level: "A1", phase: 1, order: 1,
        target_patterns: ["pat_001_intro_chain"],
        target_vocabulary: ["Hi I'm [name]", "I'm from [city]", "Nice to meet you"],
        target_phonemes: ["/h/", "/f/"],
        ai_character: CAPTAIN, scenario_flow: [],
        adaptation_rules: DEFAULT_ADAPTATION, base_points: 50, available_badges: ["المتكلم"],
    },
    mission_02_last_seat: {
        id: "mission_02_last_seat",
        title: "The Last Window Seat", title_ar: "آخر مقعد نافذة",
        narrative: "في المطار، بقي مقعد نافذة واحد وعائلة تنافس عليه. الموظف سامي يعطيه لأول من يطلبه بالصيغة المهذبة الصحيحة.",
        context: "airport", cefr_level: "A1", phase: 1, order: 2,
        target_patterns: ["pat_002_polite_request"],
        target_vocabulary: ["Can I have ... please?", "Excuse me?", "Here you go"],
        target_phonemes: ["/v/", "/p/"],
        ai_character: CAPTAIN, scenario_flow: [],
        adaptation_rules: DEFAULT_ADAPTATION, base_points: 50, available_badges: ["صائد المقاعد"],
    },
    mission_03_secret_weapon: {
        id: "mission_03_secret_weapon",
        title: "The Secret Weapon", title_ar: "السلاح السري",
        narrative: "فوق الغيم، المضيفة ليزا تسأل بسرعة بالإنجليزية. الرهان ليس أن يفهم الطالب كل كلمة، بل ألا يتجمد أبداً — يتعلم أدوات إصلاح التواصل.",
        context: "airplane", cefr_level: "A1", phase: 1, order: 3,
        target_patterns: ["pat_003_repair"],
        target_vocabulary: ["Sorry?", "Can you say that again, please?", "Can you speak slowly, please?"],
        target_phonemes: ["/s/", "/θ/"],
        ai_character: CAPTAIN, scenario_flow: [],
        adaptation_rules: DEFAULT_ADAPTATION, base_points: 60, available_badges: ["اللي ما يتجمد"],
    },
    mission_04_alone_in_dubai: {
        id: "mission_04_alone_in_dubai",
        title: "Alone in Dubai", title_ar: "وحدك في دبي",
        narrative: "أول يوم في دبي. الطالب هو الدليل والكابتن يعتمد عليه. عليه أن يوصلهما للفندق بالسؤال عن الطريق والتعامل مع السائق.",
        context: "shopping", cefr_level: "A2", phase: 1, order: 4,
        target_patterns: ["pat_004_navigate"],
        target_vocabulary: ["Excuse me, where is the [place]?", "How much is it?", "Thank you so much!"],
        target_phonemes: ["/w/", "/tʃ/"],
        ai_character: CAPTAIN, scenario_flow: [],
        adaptation_rules: DEFAULT_ADAPTATION, base_points: 60, available_badges: ["الدليل"],
    },
    mission_05_cafe_beginning: {
        id: "mission_05_cafe_beginning",
        title: "Café Beginning", title_ar: "مقهى البداية",
        narrative: "درس الزعيم: محادثة كاملة متصلة مع أم فهد في المقهى تدمج كل ما تعلمه الطالب. الكابتن شبه صامت — الطالب يثبت أنه صار مسافراً.",
        context: "restaurant", cefr_level: "A2", phase: 1, order: 5,
        target_patterns: ["pat_001_intro_chain", "pat_002_polite_request", "pat_003_repair", "pat_004_navigate"],
        target_vocabulary: ["(مراجعة — لا جديد)"],
        target_phonemes: [],
        ai_character: CAPTAIN, scenario_flow: [],
        adaptation_rules: DEFAULT_ADAPTATION, base_points: 100, available_badges: ["مسافر دبي"],
    },
};

export const FREE_TRIAL_ORDER = [
    "mission_01_voice_gate",
    "mission_02_last_seat",
    "mission_03_secret_weapon",
    "mission_04_alone_in_dubai",
    "mission_05_cafe_beginning",
];

/** Get a mission by id; falls back to the first free-trial mission. */
export function getMockMission(missionId?: string): Mission {
    if (missionId && MISSIONS[missionId]) return MISSIONS[missionId];
    return MISSIONS[FREE_TRIAL_ORDER[0]];
}

const MISSION_TEASERS: Record<string, string> = {
    mission_01_voice_gate:    "مقعد واحد تبقّى بجانب النافذة... وعائلة تنافسك عليه! من سيصل أولاً للموظف سامي؟",
    mission_02_last_seat:     "الطائرة أقلعت — فجأة المضيفة تنهمر عليك بأسئلة بالإنجليزية ولا تتوقف. هل لديك السلاح السري؟",
    mission_03_secret_weapon: "لأوّل مرة ستكون وحدك في دبي. الكابتن يتوه... وأنت الدليل. الجميع ينتظرك.",
    mission_04_alone_in_dubai:"المهمة الأخيرة — مقهى دبي، أم فهد، ومحادثة كاملة وحدك من أوّلها لآخرها. هل صرت مسافراً حقيقياً؟",
};

export function listMissions(): { id: string; title_ar: string; order: number; teaser_ar?: string }[] {
    return FREE_TRIAL_ORDER.map(id => ({
        id, title_ar: MISSIONS[id].title_ar, order: MISSIONS[id].order,
        teaser_ar: MISSION_TEASERS[id],
    }));
}

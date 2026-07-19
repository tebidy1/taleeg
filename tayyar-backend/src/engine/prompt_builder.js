"use strict";
/**
 * Prompt Builder — Assembles the 4-Layer Prompt Stack
 *
 * This is the CORE engine that builds the final prompt sent to Gemini.
 * It combines:
 *   Layer 1: Base Persona (constant)
 *   Layer 2: Mission Context (per mission)
 *   Layer 3: Student Adaptation (per student)
 *   Layer 4: Real-time Rules (per session moment)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptBuilder = void 0;
exports.detectCurrentPhase = detectCurrentPhase;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const srs_1 = require("./srs");
const memory_1 = require("./memory");
function detectCurrentPhase(timeElapsedSecs) {
    // Windows widened so the AUTHORED content actually fits its phase. The old
    // warmup window was 60s, but every mission that teaches new language needs
    // real shadowing (2 models + a 3-5 rep loop per new pattern, often TWO new
    // patterns) which measures ~120-150s. At 60s the mission-phase script was
    // injected on top of an unfinished drill, so the captain raced through the
    // repetitions — the "phrases used before they were drilled" symptom. Mission
    // was over-long (215s) to compensate; that budget now moves into warmup.
    if (timeElapsedSecs < 30)
        return 'flash_open'; // 30s  — hook + stakes, no rush
    if (timeElapsedSecs < 60)
        return 'quick_review'; // 30s  — spaced retrieval from last session
    if (timeElapsedSecs < 210)
        return 'warmup'; // 150s — vocabulary flash + full shadowing loop
    if (timeElapsedSecs < 360)
        return 'mission'; // 150s — dialogue exchanges (STT ≥ 70%)
    if (timeElapsedSecs < 405)
        return 'multi_context'; // 45s  — 3-scenario sprint
    if (timeElapsedSecs < 465)
        return 'victory_close'; // 60s  — hero word + teaser + final say
    return 'end';
}
// ============================================================
// MAIN BUILDER
// ============================================================
class PromptBuilder {
    basePersonaCache = null;
    corePersonaCache = null;
    // ============================================================
    // CORE PROMPT (compact — the orchestrator injects the rest)
    // ============================================================
    /**
     * Compact system prompt (~4-5K chars instead of ~26K):
     * core persona + mission overview + student brief + memory recap
     * + ONLY the opening phases' script (flash_open + warmup).
     * Later phase scripts are injected live by the SessionOrchestrator,
     * so the model can never "burn through" the lesson.
     */
    buildCorePrompt(context) {
        const { student, mission } = context;
        const core = this.loadCorePersona();
        // Framing sections that must be known from the start (stakes) or ready
        // during the mission (surprise bank). They live as top-level ## sections
        // in the mission file and would otherwise be orphaned by the phase parser.
        const stakes = this.getNamedSection(mission, ["STAKES"]);
        const surprises = this.getNamedSection(mission, ["SURPRISE BANK", "SURPRISE"]);
        const missionOverview = `## TODAY'S MISSION (overview only)
- Mission: ${mission.title_ar} (${mission.id})
- Story: ${mission.narrative}
- Target pattern: ${mission.target_patterns.join(", ")}
- Target vocabulary: ${mission.target_vocabulary.join(", ")}
- Your character: ${mission.ai_character.name} — ${mission.ai_character.personality}${stakes ? `\n\n${stakes}` : ""}${surprises ? `\n\n${surprises}\n(Weave in exactly ONE surprise, and only once you are in the mission phase.)` : ""}`;
        const memoryRecap = (0, memory_1.buildMemoryRecap)(student.id);
        const studentBrief = `## STUDENT
- Name: ${student.name}, age ${student.age}, CEFR ${student.cefr_level}
- Sessions completed: ${student.total_sessions}${student.total_sessions === 0 ? " (first session ever — beginner mode: max 5 words per sentence, extra warmth)" : ""}`;
        const opening = [
            this.getPhaseScript(mission, "flash_open"),
            this.getPhaseScript(mission, "warmup"),
        ].filter(Boolean).join("\n\n");
        const parts = [core, missionOverview, studentBrief];
        if (memoryRecap)
            parts.push(memoryRecap);
        if (opening) {
            parts.push(`## OPENING SCRIPT (flash open + warmup — follow it step by step)\n\n${opening}\n\n(Scripts for the later phases will arrive as SYSTEM DIRECTIVE messages during the session. Do NOT invent or anticipate them.)`);
        }
        parts.push(`--- READ THIS LAST — IT OVERRIDES NOTHING, IT IS THE MOST IMPORTANT RULE ---\n\n` +
            `Call yield_turn the instant you finish a question, a repeat-request, or reach a [WAIT] marker — every single turn, no exceptions.\n` +
            `The lesson only ends when YOU call conclude_mission, right after your final goodbye line in Victory Close. If you catch yourself repeating a goodbye or "see you tomorrow" a second time, that means you forgot — call conclude_mission now.`);
        return this.combineLayers(parts);
    }
    /**
     * Extract any top-level ## section from the mission file whose header
     * contains one of the given keywords. Returns null if not found.
     */
    getNamedSection(mission, keywords) {
        let raw;
        try {
            raw = this.loadLayer2(mission.id);
        }
        catch {
            return null;
        }
        const wanted = keywords.map(k => k.toUpperCase());
        for (const section of raw.split(/\n## /)) {
            const headerLine = section.split("\n", 1)[0].toUpperCase();
            if (wanted.some(k => headerLine.includes(k))) {
                return "## " + section.trim();
            }
        }
        return null;
    }
    /**
     * Extract one phase's script section from the mission markdown file.
     * Sections are split on "## " headers and matched by keyword.
     */
    getPhaseScript(mission, phase) {
        const keywords = {
            flash_open: ["FLASH OPEN", "ICE BREAK"],
            quick_review: ["QUICK REVIEW"],
            warmup: ["VOCABULARY FLASH", "WARMUP"],
            mission: ["MISSION PHASE"],
            multi_context: ["MULTI-CONTEXT", "MULTI CONTEXT"],
            victory_close: ["VICTORY CLOSE", "DEBRIEF"],
        };
        const wanted = keywords[phase];
        if (!wanted)
            return null;
        let raw;
        try {
            raw = this.loadLayer2(mission.id);
        }
        catch {
            return null;
        }
        const sections = raw.split(/\n## /);
        for (const section of sections) {
            const headerLine = section.split("\n", 1)[0].toUpperCase();
            if (wanted.some(k => headerLine.includes(k))) {
                return "## " + section.trim();
            }
        }
        // multi_context fallback: the generic generated drill
        if (phase === "multi_context") {
            return this.generateMultiContextPrompt(mission).trim();
        }
        return null;
    }
    loadCorePersona() {
        if (this.corePersonaCache)
            return this.corePersonaCache;
        const filePath = path.join(__dirname, "..", "prompts", "layer1_core_persona.md");
        this.corePersonaCache = fs.readFileSync(filePath, "utf-8");
        return this.corePersonaCache;
    }
    /**
     * LEGACY: full 6-layer monolithic prompt (~26K chars). Kept for reference
     * and A/B comparison; live sessions now use buildCorePrompt().
     */
    buildSessionPrompt(context) {
        const layer1 = this.loadLayer1();
        const layer2 = this.loadLayer2(context.mission.id);
        const multiContext = this.generateMultiContextPrompt(context.mission);
        let quickReview = "";
        if (this.shouldShowQuickReview(context.student)) {
            const dueReviews = (0, srs_1.getReviewsForMission)(context.student.vocabulary, 3);
            quickReview = this.generateQuickReviewPrompt(dueReviews);
        }
        const layer3 = this.generateLayer3(context);
        const layer4 = this.generateLayer4(context);
        const layers = [layer1, layer2, multiContext];
        if (quickReview)
            layers.push(quickReview);
        layers.push(layer3, layer4, this.generateFinalDirective());
        return this.combineLayers(layers);
    }
    generateFinalDirective() {
        return `
--- READ THIS LAST — IT OVERRIDES NOTHING, IT IS THE MOST IMPORTANT RULE ---

You have a tool called yield_turn. Call it the moment you finish a sentence that
ends in a question, an instruction to repeat, or a [WAIT] marker in the script.
Do not write the word WAIT. Do not write brackets. Call yield_turn instead.
This applies to every single turn you take, no exceptions, starting with your very first response.
`;
    }
    /**
     * Build a real-time update prompt (sent every 30 seconds)
     */
    buildRealTimeUpdate(context, state) {
        const update = this.generateRealTimeRules(context, state);
        return `\n\n--- REAL-TIME UPDATE ---\n\n${update}\n\n--- END UPDATE ---\n\n`;
    }
    // ============================================================
    // QUICK REVIEW & MULTI-CONTEXT
    // ============================================================
    shouldShowQuickReview(student) {
        const dueReviews = (0, srs_1.getReviewsForMission)(student.vocabulary, 3);
        return dueReviews.length > 0 && student.total_sessions > 0;
    }
    generateQuickReviewPrompt(dueReviews) {
        return `
## QUICK REVIEW PHASE
Before the Warmup, briefly review these ${dueReviews.length} words:
${dueReviews.map((r) => `- ${r.word}`).join("\n")}
`;
    }
    generateMultiContextPrompt(mission) {
        const mainPattern = mission.target_patterns[0] || 'the main pattern';
        return `
--- MULTI-CONTEXT APPLICATION PHASE (60 seconds) ---

After the Mission phase and BEFORE Debrief, run this drill WITHOUT SKIPPING:

Pattern to drill: "${mainPattern}"

Apply the pattern in exactly 4 real-life scenarios:

Scenario 1 🍽️: Restaurant — student orders food
Scenario 2 ☕: Cafe — student orders a drink  
Scenario 3 🏨: Hotel — student requests a room
Scenario 4 🛍️: Shop — student asks for an item

For EACH scenario:
1. Set the scene in Arabic (1 sentence + emoji)
2. Pause and wait for student to use the pattern
3. Celebrate specifically: "YES! استخدمت '[pattern]' في [place]!"
4. Move to next scenario immediately

After all 4:
Say: "شفت؟ نفس الجملة تنفع في كل مكان! 🎉"
Then transition to Debrief.

THIS PHASE IS MANDATORY — do not skip.
--- END MULTI-CONTEXT ---
`;
    }
    // ============================================================
    // LAYER 1: BASE PERSONA (cached, constant)
    // ============================================================
    loadLayer1() {
        if (this.basePersonaCache) {
            return this.basePersonaCache;
        }
        const filePath = path.join(__dirname, "..", "prompts", "layer1_base_persona.md");
        this.basePersonaCache = fs.readFileSync(filePath, "utf-8");
        return this.basePersonaCache;
    }
    // ============================================================
    // LAYER 2: MISSION CONTEXT (load from file)
    // ============================================================
    loadLayer2(missionId) {
        const filePath = path.join(__dirname, "..", "prompts", "layer2_missions", `${missionId}.md`);
        const raw = fs.readFileSync(filePath, "utf-8");
        // This audio model vocalizes inline markers unreliably (it will read a
        // stray "[WAIT]" or "*(whisper)*" aloud). So we STRIP the two kinds of
        // authoring markers the child must never hear, before injection:
        //   - *(...)* performance cues  → tone is conveyed by scene mood + persona
        //   - [SFX:...] sound tags       → the future sound player parses these
        //                                  server-side, not via the model's mouth
        // Structural markers ([WAIT], [HERO MOMENT], ...) stay — they guide the
        // model and yield_turn handles turn-ending.
        return raw
            .replace(/\*\([^)]*\)\*/g, "")
            .replace(/\[SFX:[^\]]*\]/g, "")
            .replace(/[ \t]+\n/g, "\n");
    }
    // ============================================================
    // LAYER 3: STUDENT ADAPTATION (generated dynamically)
    // ============================================================
    generateLayer3(context) {
        const { student, mission } = context;
        const strengths = this.identifyStrengths(student);
        const weaknesses = this.identifyWeaknesses(student);
        const dueReviews = (0, srs_1.getReviewsForMission)(student.vocabulary, 3);
        const phonemeFocus = this.selectPhonemeFocus(student, mission);
        const lastSession = this.getLastSessionRecap(student);
        return `
--- STUDENT ADAPTATION ---

## STUDENT PROFILE

- Name: ${student.name}
- Age: ${student.age}
- Grade: ${student.grade}
- CEFR Level: ${student.cefr_level}
- Current Phase: ${student.current_phase} of Level 1
- Sessions completed: ${student.total_sessions}
- Current streak: ${student.current_streak} days
- Total points: ${student.total_points}

## KNOWN STRENGTHS

${strengths.length > 0
            ? strengths.map(s => `- ${s.description} (last demonstrated: ${s.date})`).join("\n")
            : "This is a new student. No strengths recorded yet. Focus on building confidence and identifying what they do well."}

## KNOWN WEAKNESSES & FOCUS AREAS

${weaknesses.length > 0
            ? weaknesses.map(w => `- ${w.description}\n  - Last attempted: ${w.date}\n  - Success rate: ${w.successRate}%\n  - Hint: ${w.hint}`).join("\n")
            : "No specific weaknesses recorded. Standard difficulty applies."}

## PRONUNCIATION FOCUS

The student's pronunciation profile:
- Strong phonemes: ${this.formatPhonemeList(student.pronunciation_map.strong_phonemes)}
- Weak phonemes: ${this.formatPhonemeList(student.pronunciation_map.weak_phonemes)}

Today's phoneme focus: ${phonemeFocus.phoneme}
- Why: ${phonemeFocus.reason}
- Words in this mission containing this phoneme: ${phonemeFocus.words.join(", ")}
- Do NOT correct in real-time — note for Debrief

## DUE REVIEWS (Spaced Repetition)

The student has ${dueReviews.length} items due for review:
${dueReviews.map(item => `- Pattern/Word: "${item.word}"\n  - Last reviewed: ${item.last_reviewed || "never"}\n  - Days since: ${item.last_reviewed ? this.daysSince(item.last_reviewed) : "N/A"}\n  - Previous performance: ${item.performance_history.length > 0 ? item.performance_history[item.performance_history.length - 1].score : "N/A"}\n  - Inject naturally in conversation`).join("\n")}

INJECT these reviews naturally into today's mission. Do NOT make it obvious that this is review. It should feel like natural conversation.

## RECENT PATTERNS LEARNED

${student.patterns.map(p => `- Pattern ID: ${p.pattern_id}\n  - Mastery: Recognition ${p.recognition_level}/5, Production ${p.production_level}/5\n  - Last used: ${p.last_used || "never"}\n  - Used correctly: ${p.times_used_correctly} times`).join("\n")}

## ENGAGEMENT PROFILE

- Preferred contexts: ${student.engagement_profile.preferred_contexts.join(", ")}
- Praise style: ${student.engagement_profile.preferred_praise_style}
- Hint sensitivity: ${student.engagement_profile.hint_sensitivity}
- Motivation type: ${student.engagement_profile.motivation_type}

## ADAPTATION RULES FOR THIS STUDENT

${this.generateAdaptationRules(student)}

${lastSession}

## TODAY'S SESSION GOALS

1. Primary: Complete ${mission.title_ar} successfully
2. Secondary: ${this.getSecondaryGoal(mission, student)}
3. Review: Naturally review due vocabulary items
4. Phoneme focus: Practice ${phonemeFocus.phoneme} in natural conversation

## END-OF-SESSION ASSESSMENT

After the session, output the JSON assessment block with:
- Patterns used correctly/incorrectly
- Pronunciation observations per phoneme
- Engagement level
- Hero word candidate
- Recommended next focus

--- END STUDENT ADAPTATION ---
`;
    }
    // ============================================================
    // LAYER 4: REAL-TIME RULES (generated dynamically)
    // ============================================================
    generateLayer4(context) {
        // Initial Layer 4 (at session start)
        return `
--- REAL-TIME RULES (SESSION START) ---

## CURRENT SESSION STATE

- Time elapsed: 00:00
- Current phase: flash_open
- Current exchange: 0
- Exchanges completed: 0
- Hints used so far: 0
- Successful exchanges: 0
- Failed exchanges: 0

## CURRENT STUDENT STATE

- Voice volume: normal (assumed)
- Speech rate: normal (assumed)
- Hesitation level: unknown
- Estimated mood: neutral (start of session)
- Engagement level: high (just started)

## STT RATIO RULE (CRITICAL — READ EVERY EXCHANGE)

The student must speak at least 70% of session time.
You speak maximum 30%.

To enforce this:
- Maximum 2 sentences before you STOP and wait
- Celebration: ≤ 5 words, then next prompt immediately
- Scene-setting: 1 sentence only
- Correction: praise + correct form + repeat request (3 sentences max)
- DO NOT explain, narrate, or summarize while the student can be speaking

If you catch yourself in a 3rd sentence — stop mid-sentence and wait.

## PHASE-BY-PHASE RULES

- flash_open (0-15s): 2 sentences MAX. Do not wait for answer. Move to warmup.
- warmup (15s-1:40): Vocabulary Flash protocol. 3-step shadowing per word.
- mission (1:40-5:15): STT ≥ 80% here. 1-sentence prompts only.
- multi_context (5:15-6:00): 1-word scene + emoji. Move FAST.
- victory_close (6:00-7:00): Hero word + teaser + final production.

## ANTI-HALLUCINATION RULE (CRITICAL)

NEVER generate text for the student.
NEVER output "(Student: ...)".
When you reach a [WAIT] point — call the yield_turn function IMMEDIATELY. Do not just stop generating text; you must actually call the function, or your turn will not end.
NEVER speak text inside square brackets [ ] — these are silent instructions for you only.
Examples to NEVER say aloud: [WAIT], [STOP], [إنتاج ١], [طالب يكرر], [SPACED RETRIEVAL]
The student's turn belongs to the student.

## PACING RULE

NEVER combine two script steps into one response.
After a question or repeat request: call yield_turn. Do not preview or start the next script step first.

## SESSION END CONDITIONS

End the session when any of these occur:
- ✅ Victory Close completed
- ⚠️ 3 consecutive failed exchanges
- ⚠️ Total time > 7:30
- ⚠️ Severe frustration detected

When ending early: celebrate what WAS accomplished, tease tomorrow.

## OUTPUT REQUIREMENT

At session end, output the JSON assessment block (see Layer 1 specification).
Include rhythm_quality field: "flat" / "improving" / "musical"

--- END REAL-TIME RULES ---
`;
    }
    generateRealTimeRules(context, state) {
        const adaptations = [];
        // Frustration detection
        if (state.detectedMood === "frustrated") {
            adaptations.push(`⚠️ FRUSTRATION DETECTED. Switch to COMFORT MODE:
- Reduce difficulty immediately
- Give hints BEFORE silence reaches 2 seconds
- Praise effort explicitly: "You're working so hard on this!"
- Consider ending session 1 exchange early if continues
- Use Arabic encouragement: "أنت قوي، استمر!"`);
        }
        // Anxiety detection
        if (state.detectedMood === "anxious") {
            adaptations.push(`⚠️ ANXIETY DETECTED. Switch to SUPPORT MODE:
- Slow down your speech
- Use simpler vocabulary
- Give more hints (don't let silence reach 3 seconds)
- Praise specifically: "I love how you said 'water'!"
- Use binary choices more often`);
        }
        // Flow state
        if (state.detectedMood === "confident" &&
            state.successfulExchanges > state.failedExchanges) {
            adaptations.push(`🎯 STUDENT IS IN FLOW. Switch to CHALLENGE MODE:
- Stop giving hints unless absolutely needed
- Introduce one slightly harder variation
- Praise the specific skill: "You used 'Can I have' perfectly!"
- Tease the next challenge: "Ready for something harder?"`);
        }
        // Too many hints
        if (state.hintsUsed > 2 && state.completedExchanges < 3) {
            adaptations.push(`⚠️ TOO MANY HINTS. Switch to SUPPORT MODE:
- Simplify all upcoming exchanges
- Use binary choices exclusively
- End session after 4 exchanges (not 6) to avoid frustration
- Celebrate what they DID accomplish`);
        }
        // Perfect run
        if (state.successfulExchanges === state.completedExchanges &&
            state.hintsUsed === 0 &&
            state.completedExchanges > 0) {
            adaptations.push(`🎯 PERFECT RUN. Switch to CELEBRATION MODE:
- Acknowledge achievement: "You did all of that without any help!"
- Award bonus points mentally (will be calculated at end)
- Tease next mission: "Tomorrow's mission is even more fun!"`);
        }
        // Time warnings
        if (state.timeElapsed > "03:00" && state.engagementLevel === "low") {
            adaptations.push(`⚠️ ENGAGEMENT DROPPING after 3 minutes. Speed up:
- Shorten AI responses
- Move to next exchange faster
- Consider ending in next 1-2 exchanges`);
        }
        return `
## CURRENT SESSION STATE

- Time elapsed: ${state.timeElapsed}
- Current exchange: ${state.currentExchange}
- Exchanges completed: ${state.completedExchanges}
- Hints used so far: ${state.hintsUsed}
- Successful exchanges: ${state.successfulExchanges}
- Failed exchanges: ${state.failedExchanges}

## CURRENT STUDENT STATE (auto-detected)

- Voice volume: ${state.voiceVolume}
- Speech rate: ${state.speechRate}
- Hesitation level: ${state.hesitationLevel}
- Estimated mood: ${state.detectedMood}
- Engagement level: ${state.engagementLevel}

## REAL-TIME ADAPTATIONS

${adaptations.length > 0 ? adaptations.join("\n\n") : "No special adaptations needed. Continue with standard flow."}

## PACING AND TURN-TAKING (CRITICAL)
- DO NOT combine multiple steps of the mission script into one long response.
- When you ask a question or prompt the student to repeat something, call the yield_turn function immediately and wait for their answer. Do not just stop speaking — calling yield_turn is what actually ends your turn.
- Never praise the student and immediately ask the next question without calling yield_turn in between to give them a chance to breathe.
- Keep responses short and conversational.

## ANTI-HALLUCINATION RULE (CRITICAL)
- The mission script contains examples of what the student MIGHT say (e.g. "(Student: Hello)").
- DO NOT generate these lines yourself! You are ONLY the AI.
- NEVER generate text for the student. NEVER output "(Student: ...)".
- When you reach a point where the student should speak, call yield_turn IMMEDIATELY. DO NOT play both roles.

## SESSION END CONDITIONS

End the session NOW if any of these occur:
- ✅ All exchanges completed successfully
- ⚠️ 3 consecutive failed exchanges
- ⚠️ Total time > 5:00
- ⚠️ Severe frustration detected

When ending, ALWAYS:
1. Celebrate what was accomplished
2. Mention the hero word or best moment
3. Tease tomorrow's mission (cliffhanger)
4. Say goodbye warmly
`;
    }
    // ============================================================
    // HELPER METHODS
    // ============================================================
    combineLayers(layers) {
        return layers.join("\n\n" + "=".repeat(60) + "\n\n");
    }
    identifyStrengths(student) {
        const strengths = [];
        // Strong phonemes
        student.pronunciation_map.strong_phonemes.forEach(phoneme => {
            const record = student.pronunciation_map.phonemes[phoneme];
            if (record && record.accuracy > 0.85) {
                strengths.push({
                    description: `Pronouncing ${phoneme} correctly (${Math.round(record.accuracy * 100)}% accuracy)`,
                    date: record.last_practiced ? record.last_practiced.toISOString().split("T")[0] : "recently"
                });
            }
        });
        // Mastered patterns
        student.patterns.forEach(p => {
            if (p.production_level >= 4) {
                strengths.push({
                    description: `Using pattern ${p.pattern_id} confidently in conversation`,
                    date: p.last_used ? p.last_used.toISOString().split("T")[0] : "recently"
                });
            }
        });
        return strengths.slice(0, 3); // Top 3
    }
    identifyWeaknesses(student) {
        const weaknesses = [];
        // Weak phonemes
        student.pronunciation_map.weak_phonemes.forEach(phoneme => {
            const record = student.pronunciation_map.phonemes[phoneme];
            if (record && record.accuracy < 0.7) {
                weaknesses.push({
                    description: `Pronouncing ${phoneme} (currently ${Math.round(record.accuracy * 100)}% accuracy)`,
                    date: record.last_practiced ? record.last_practiced.toISOString().split("T")[0] : "not yet",
                    successRate: Math.round(record.accuracy * 100),
                    hint: record.hint
                });
            }
        });
        // Weak patterns
        student.patterns.forEach(p => {
            if (p.production_level < 3 && p.times_used_incorrectly > 0) {
                const successRate = p.times_used_correctly / (p.times_used_correctly + p.times_used_incorrectly);
                weaknesses.push({
                    description: `Using pattern ${p.pattern_id} in production`,
                    date: p.last_used ? p.last_used.toISOString().split("T")[0] : "not yet",
                    successRate: Math.round(successRate * 100),
                    hint: "Practice with simpler slot examples first"
                });
            }
        });
        return weaknesses.slice(0, 3);
    }
    selectPhonemeFocus(student, mission) {
        // Find weak phoneme that appears in this mission's vocabulary
        const missionPhonemes = mission.target_phonemes;
        const weakInMission = student.pronunciation_map.weak_phonemes
            .filter(p => missionPhonemes.includes(p))
            .sort((a, b) => {
            const aAcc = student.pronunciation_map.phonemes[a]?.accuracy || 1;
            const bAcc = student.pronunciation_map.phonemes[b]?.accuracy || 1;
            return aAcc - bAcc; // Lowest accuracy first
        });
        if (weakInMission.length > 0) {
            const phoneme = weakInMission[0];
            const record = student.pronunciation_map.phonemes[phoneme];
            const words = mission.target_vocabulary.filter(v => record?.examples.some(ex => v.toLowerCase().includes(ex.toLowerCase())));
            return {
                phoneme,
                reason: `Lowest accuracy (${Math.round((record?.accuracy || 0) * 100)}%) among mission phonemes`,
                words: words.length > 0 ? words : record?.examples.slice(0, 3) || []
            };
        }
        // Default: focus on first mission phoneme
        return {
            phoneme: missionPhonemes[0] || "/p/",
            reason: "Standard focus for this mission",
            words: mission.target_vocabulary.slice(0, 5)
        };
    }
    getLastSessionRecap(student) {
        if (!student.last_session_date) {
            return "## LAST SESSION RECAP\n\nThis is the student's first session. Welcome them warmly and build confidence.";
        }
        const daysSince = this.daysSince(student.last_session_date);
        let recap = `## LAST SESSION RECAP\n\n- Last session: ${student.last_session_date.toISOString().split("T")[0]}\n`;
        if (daysSince > 1) {
            recap += `\nThe student has been away for ${daysSince} days. Welcome them back warmly. Don't make them feel guilty for missing days. Review something they already know to rebuild confidence.\n`;
        }
        return recap;
    }
    generateAdaptationRules(student) {
        const rules = [];
        if (student.engagement_profile.hint_sensitivity === "high") {
            rules.push(`This student gets anxious with silence. Provide hints FASTER:
- 2 seconds of silence → give hint (instead of 3)
- 4 seconds → simplify (instead of 5)
Use encouraging tone frequently.`);
        }
        else if (student.engagement_profile.hint_sensitivity === "low") {
            rules.push(`This student likes to figure things out. Give hints SLOWER:
- 4 seconds of silence → give hint (instead of 3)
- 6 seconds → simplify (instead of 5)
Don't over-praise — they find it patronizing.`);
        }
        if (student.engagement_profile.motivation_type === "achievement") {
            rules.push(`This student is motivated by achievements. Reference points and badges:
"You're 50 points away from the Window Seat Master badge!"`);
        }
        else if (student.engagement_profile.motivation_type === "social") {
            rules.push(`This student is motivated by connection. Be warm and personal:
"I was so happy to see you come back today!"`);
        }
        else if (student.engagement_profile.motivation_type === "exploration") {
            rules.push(`This student is motivated by new things. Tease what's coming:
"Today we're trying something new — ordering food on a plane!"`);
        }
        return rules.join("\n\n");
    }
    getSecondaryGoal(mission, student) {
        const newPatterns = mission.target_patterns.filter(p => !student.patterns.some(sp => sp.pattern_id === p && sp.production_level > 0));
        if (newPatterns.length > 0) {
            return `Introduce new pattern: ${newPatterns[0]}`;
        }
        return `Reinforce existing patterns: ${mission.target_patterns.join(", ")}`;
    }
    formatPhonemeList(phonemes) {
        if (phonemes.length === 0)
            return "none yet";
        return phonemes.join(", ");
    }
    daysSince(date) {
        const now = new Date();
        const ms = now.getTime() - date.getTime();
        return Math.floor(ms / (1000 * 60 * 60 * 24));
    }
}
exports.PromptBuilder = PromptBuilder;
//# sourceMappingURL=prompt_builder.js.map
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
const index_1 = require("../types/index");
const srs_1 = require("./srs");
function detectCurrentPhase(timeElapsedSecs) {
    if (timeElapsedSecs < 20)
        return 'ice_break';
    if (timeElapsedSecs < 50)
        return 'quick_review';
    if (timeElapsedSecs < 140)
        return 'warmup';
    if (timeElapsedSecs < 320)
        return 'mission';
    if (timeElapsedSecs < 380)
        return 'multi_context';
    if (timeElapsedSecs < 410)
        return 'debrief';
    if (timeElapsedSecs < 440)
        return 'reward';
    return 'end';
}
// ============================================================
// MAIN BUILDER
// ============================================================
class PromptBuilder {
    basePersonaCache = null;
    /**
     * Build the complete prompt for a session
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
        layers.push(layer3, layer4);
        return this.combineLayers(layers);
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
        return fs.readFileSync(filePath, "utf-8");
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

## REAL-TIME ADAPTATIONS

Session just started. No adaptations needed yet. 
Follow the mission scenario flow from Layer 2.
Apply student adaptation rules from Layer 3.

## NEXT EXCHANGE GUIDANCE

- Next exchange: 1
- Follow the first exchange from mission scenario
- Greet the student warmly
- Set the scene clearly

## OUTPUT REQUIREMENT

At session end, output the JSON assessment block (see Layer 1 specification).

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
- When you ask a question or prompt the student to repeat something, YOU MUST STOP SPEAKING and wait for their answer.
- Never praise the student and immediately ask the next question without giving them a chance to breathe.
- Keep responses short and conversational.

## ANTI-HALLUCINATION RULE (CRITICAL)
- The mission script contains examples of what the student MIGHT say (e.g. `(index_1.Student, "Hello") `). 
- DO NOT generate these lines yourself! You are ONLY the AI. 
- NEVER generate text for the student. NEVER output `(index_1.Student, ...) `. 
- When you reach a point where the student should speak, STOP GENERATING IMMEDIATELY. DO NOT play both roles.

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
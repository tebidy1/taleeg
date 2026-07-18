/**
 * Session Orchestrator — "the maestro".
 *
 * The model can't track time, can't hold a 26K-char script, and can't adapt
 * without live signals. This class owns the real clock and lesson state on the
 * server and steers the model with small injected directives:
 *
 *   - phase tracking via detectCurrentPhase() (was dead code)
 *   - 30s real-time state updates via buildRealTimeUpdate() (was dead code)
 *   - per-phase script injection (so the model never sees future phases)
 *   - victory-close directive near the end, forced shutdown at the hard cap
 *   - transcript logging + post-session summarization into student memory
 *
 * Injection rules that matter:
 *   turnComplete:false  → context update only, does NOT trigger generation
 *   turnComplete:true   → actively prompts the model to speak (used only for
 *                         wrap-up, and only while the model is idle)
 */

import { WebSocket } from "ws";
import { PromptBuilder, detectCurrentPhase } from "./prompt_builder";
import { logSessionEvent, readSessionTranscript, saveSessionSummary } from "./memory";
import { Student, Mission } from "../types/index";

const TICK_MS = 5000;
const REALTIME_UPDATE_EVERY_S = 30;
const HARD_CAP_S = 480;   // 8:00 — force close (cost guard + peak-end rule)
const WRAP_NUDGE_S = 390; // 6:30 — actively nudge toward victory close
const STUCK_AFTER_MS = 12000; // silence both sides for 12s after a turn → nudge

type Mood = "confident" | "happy" | "neutral" | "anxious" | "frustrated";

// Longest English run in a mixed AR/EN string — the phrase the child repeats.
function extractEnglishPhrase(text: string): string | null {
    const matches = text.match(/[A-Za-z][A-Za-z0-9 ,.'!?-]{2,}/g);
    if (!matches) return null;
    const best = matches.map(s => s.replace(/\s+/g, " ").trim()).sort((a, b) => b.length - a.length)[0];
    return best && best.length >= 4 ? best : null;
}

// Which word to visually stress (the "music" cue). Heuristic: the longest
// content word, skipping short function words. Good enough for A1 phrases.
const FUNCTION_WORDS = new Set(["the", "a", "an", "is", "it", "to", "of", "and", "you", "i", "am", "can", "please", "that", "this", "your", "my", "here", "where", "how", "much", "again"]);
function stressSpan(phrase: string): string | null {
    const words = phrase.replace(/[.,!?]/g, "").split(/\s+/).filter(Boolean);
    let best = "";
    for (const w of words) {
        if (!FUNCTION_WORDS.has(w.toLowerCase()) && w.length > best.length) best = w;
    }
    return best.length >= 3 ? best : null;
}

interface OrchestratorOpts {
    sessionId: string;
    ws: WebSocket;
    geminiSession: any;
    student: Student;
    mission: Mission;
    promptBuilder: PromptBuilder;
    onForceEnd: (reason: string) => void;
}

export class SessionOrchestrator {
    private readonly o: OrchestratorOpts;
    private startTime = Date.now();          // effective start (shifts forward on pause)
    private timer: ReturnType<typeof setInterval> | null = null;

    private phase = "flash_open";
    private injectedPhases = new Set<string>(["flash_open", "warmup", "quick_review"]); // in initial prompt
    private lastRealtimeUpdateS = 0;
    private wrapNudgeSent = false;
    private ended = false;

    // pause state — during pause, elapsedSeconds() is frozen so neither the
    // hard cap nor the phase clock advances while the child is away.
    private paused = false;
    private pausedAt = 0;

    // Stuck-turn detection: the model sometimes yields mid-narration and then
    // just waits, with the child having no idea it was their cue. If the
    // captain has been silent AND the student has been silent for STUCK_AFTER_MS
    // after a turn_complete, we nudge the captain to continue.
    private lastTurnCompleteAt = 0;
    private stuckNudgeSent = false;

    // live signals
    private modelSpeaking = false;
    private userSpokeSinceTurnComplete = false;
    private lastUserTranscriptAt = 0;

    // target-phrase extraction (drives the phrase card)
    private aiTurnText = "";
    private lastEmittedPhrase = "";

    // counters (drive honest UI + realtime updates)
    completedExchanges = 0;
    hintsUsed = 0;
    studentSentences = 0;   // honest "you said N English sentences" counter

    constructor(opts: OrchestratorOpts) {
        this.o = opts;
    }

    start() {
        this.timer = setInterval(() => this.tick(), TICK_MS);
        this.log({ type: "session_start", studentId: this.o.student.id, missionId: this.o.mission.id });
    }

    elapsedSeconds(): number {
        const now = this.paused ? this.pausedAt : Date.now();
        return Math.floor((now - this.startTime) / 1000);
    }

    notePause() {
        if (this.paused || this.ended) return;
        this.paused = true;
        this.pausedAt = Date.now();
        this.log({ type: "pause" });
        console.log(`⏸  Session paused at ${this.elapsedSeconds()}s`);
    }

    noteResume() {
        if (!this.paused || this.ended) return;
        // Shift start forward by the paused duration so wall-clock progression
        // (phase transitions, hard cap, wrap nudge) all resume from where
        // they were, not where the wall would say.
        const pausedFor = Date.now() - this.pausedAt;
        this.startTime += pausedFor;
        this.paused = false;
        this.pausedAt = 0;
        this.log({ type: "resume", paused_ms: pausedFor });
        console.log(`▶️  Session resumed (was paused ${Math.round(pausedFor/1000)}s)`);
    }

    isPaused(): boolean { return this.paused; }

    // ── Event intake (called from sessions.ts) ─────────────────────────

    noteAudioChunk() { this.modelSpeaking = true; }

    noteAiTranscript(text: string) {
        this.log({ type: "ai_transcript", text });
        // Server-authoritative target phrase for the card: accumulate the
        // captain's turn and, during teaching phases only, surface the longest
        // English run. Phase-gating keeps incidental opening English off the card.
        this.aiTurnText += text;
        if (this.isTeachingPhase()) {
            const phrase = extractEnglishPhrase(this.aiTurnText);
            if (phrase && phrase !== this.lastEmittedPhrase) {
                this.lastEmittedPhrase = phrase;
                this.sendToClient({ type: "target_phrase", phrase, stress: stressSpan(phrase) });
            }
        }
    }

    /**
     * Client signaled the student finished their (manually-triggered) turn.
     * Input transcription is off, so we can no longer count "English words"
     * from the STT — every completed student turn counts as one attempt.
     */
    noteUserTurnEnd() {
        this.log({ type: "user_turn_end" });
        this.userSpokeSinceTurnComplete = true;
        this.studentSentences++;
        this.aiTurnText = "";  // next captain turn is a fresh utterance
        this.lastUserTranscriptAt = Date.now();
        // student spoke → we're no longer stuck; reset the nudge latch
        this.lastTurnCompleteAt = 0;
        this.stuckNudgeSent = false;
    }

    private isTeachingPhase(): boolean {
        return this.phase === "warmup" || this.phase === "mission" || this.phase === "multi_context";
    }

    noteTurnComplete() {
        this.modelSpeaking = false;
        this.log({ type: "turn_complete" });
        if (this.userSpokeSinceTurnComplete) {
            this.completedExchanges++;
            this.userSpokeSinceTurnComplete = false;
            this.sendToClient({ type: "progress", completedExchanges: this.completedExchanges });
            this.lastTurnCompleteAt = 0;   // real exchange completed, not stuck
            this.stuckNudgeSent = false;
        } else {
            // Captain finished a turn but the student has not spoken since —
            // start the "stuck" watch. If nothing happens in 12s, tick() nudges.
            this.lastTurnCompleteAt = Date.now();
            this.stuckNudgeSent = false;
        }
    }

    noteInterrupted() {
        this.modelSpeaking = false;
        this.log({ type: "interrupted" });
    }

    noteHelpPress(pressCount: number) {
        this.hintsUsed = Math.max(this.hintsUsed, pressCount);
        this.log({ type: "help_press", pressCount });
    }

    /**
     * The model called conclude_mission — it has delivered its closing goodbye.
     * Phase progression here is otherwise 100% wall-clock (detectCurrentPhase),
     * so a conversation that wraps up faster than the fixed per-phase seconds
     * assume would otherwise sit in limbo: the model repeats "see you
     * tomorrow" while the clock hasn't reached the victory_close threshold
     * yet, and nothing ends the session until the 8:00 hard cap. This signal
     * decouples "the content is actually done" from "the clock says so".
     */
    noteConcludeMission() {
        if (this.ended) return;
        this.log({ type: "conclude_mission_signal" });
        if (this.phase !== "victory_close" && this.phase !== "end") {
            this.phase = "victory_close";
            this.sendToClient({ type: "phase", phase: "victory_close", elapsed: this.elapsedSeconds() });
        }
        this.endSession("mission_complete");
    }

    // ── The clock ──────────────────────────────────────────────────────

    private tick() {
        if (this.ended || this.paused) return;
        const elapsed = this.elapsedSeconds();

        // 1) hard cap — protect cost and the child's attention span
        if (elapsed >= HARD_CAP_S) {
            this.endSession("time_limit");
            return;
        }

        // 2) phase transitions
        const newPhase = detectCurrentPhase(elapsed);
        if (newPhase !== this.phase) {
            this.phase = newPhase;
            this.onPhaseChange(newPhase);
        }

        // 3) wrap-up nudge (active, only when the model is idle)
        if (!this.wrapNudgeSent && elapsed >= WRAP_NUDGE_S && !this.modelSpeaking) {
            this.wrapNudgeSent = true;
            this.injectDirective(
                "TIME IS UP. Move to Victory Close NOW: ask for the hero word, one-sentence celebration, one-sentence teaser for tomorrow, final production of today's sentence, then say goodbye warmly. Keep each turn short.",
                true
            );
        }

        // 3b) stuck-turn nudge — the captain finished but nobody spoke, and
        //     it's been 12s. Almost certainly a mid-narration yield. Push it
        //     to resume the story instead of leaving the child confused.
        if (
            this.lastTurnCompleteAt > 0 &&
            !this.stuckNudgeSent &&
            !this.modelSpeaking &&
            Date.now() - this.lastTurnCompleteAt >= STUCK_AFTER_MS
        ) {
            this.stuckNudgeSent = true;
            this.log({ type: "stuck_nudge" });
            console.log(`👋 Stuck-turn nudge (silent for ${STUCK_AFTER_MS/1000}s)`);
            this.injectDirective(
                "You yielded but nothing was expected from the student here — this looks like a mid-narration pause. Continue the story/explanation from where you stopped. Do NOT ask the student to repeat what they said, do NOT re-greet, just resume the script naturally.",
                true
            );
        }

        // 4) periodic real-time state update (silent — context only).
        //    NEVER inject while the captain is mid-utterance. Even a
        //    turnComplete:false context push can make the Live model abandon
        //    its current narration (the reported "captain stops mid-sentence"
        //    bug). We defer rather than drop: lastRealtimeUpdateS is only
        //    advanced when we actually inject, so the moment the model goes
        //    idle the next tick fires the (now slightly overdue) update.
        if (
            !this.modelSpeaking &&
            elapsed - this.lastRealtimeUpdateS >= REALTIME_UPDATE_EVERY_S
        ) {
            this.lastRealtimeUpdateS = elapsed;
            this.injectRealtimeUpdate(elapsed);
        }
    }

    private onPhaseChange(phase: string) {
        this.log({ type: "phase_change", phase });
        this.sendToClient({ type: "phase", phase, elapsed: this.elapsedSeconds() });
        // leaving a teaching phase → clear the card so a stale phrase doesn't linger
        if (!this.isTeachingPhase()) {
            this.lastEmittedPhrase = "";
            this.sendToClient({ type: "target_phrase", phrase: null });
        }

        if (phase === "end") {
            if (!this.wrapNudgeSent) {
                this.wrapNudgeSent = true;
                this.injectDirective(
                    "The session is over. Say a single short warm goodbye sentence now and stop.",
                    !this.modelSpeaking
                );
            }
            return;
        }

        // inject this phase's script — the model has never seen it before
        if (!this.injectedPhases.has(phase)) {
            this.injectedPhases.add(phase);
            const script = this.o.promptBuilder.getPhaseScript(this.o.mission, phase);
            if (script) {
                this.injectDirective(
                    `NEXT PHASE SCRIPT (${phase}). Finish your current step first, then transition smoothly into this script. Do not announce the transition.\n\n${script}`,
                    false
                );
            }
        }
    }

    private injectRealtimeUpdate(elapsed: number) {
        const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
        const ss = String(elapsed % 60).padStart(2, "0");
        const state = {
            timeElapsed: `${mm}:${ss}`,
            currentExchange: this.completedExchanges + 1,
            completedExchanges: this.completedExchanges,
            hintsUsed: this.hintsUsed,
            successfulExchanges: this.completedExchanges, // refined scoring comes with real assessment
            failedExchanges: 0,
            detectedMood: this.estimateMood(),
            engagementLevel: this.estimateEngagement(elapsed),
            voiceVolume: "normal" as const,
            speechRate: "normal" as const,
            hesitationLevel: this.estimateHesitation(),
        };
        const update = this.o.promptBuilder.buildRealTimeUpdate(
            { student: this.o.student, mission: this.o.mission, sessionStartTime: new Date(this.startTime) },
            state
        );
        this.injectContext(update);
    }

    // ── Rule-based signal estimation (v1 — good enough to activate the
    //     COMFORT/CHALLENGE modes that were dead code) ──────────────────

    private estimateMood(): Mood {
        // With input transcription disabled we have no student text to read
        // distress signals from, so mood is inferred from hint usage and pace.
        if (this.hintsUsed >= 3) return "frustrated";
        if (this.hintsUsed >= 1) return "anxious";
        const silentFor = this.lastUserTranscriptAt
            ? (Date.now() - this.lastUserTranscriptAt) / 1000 : 999;
        if (this.studentSentences >= 4 && silentFor < 20 && this.hintsUsed === 0) return "confident";
        return "neutral";
    }

    private estimateEngagement(elapsed: number): "high" | "medium" | "low" {
        if (this.lastUserTranscriptAt === 0) return elapsed > 60 ? "low" : "high";
        const silentFor = (Date.now() - this.lastUserTranscriptAt) / 1000;
        if (silentFor > 60) return "low";
        if (silentFor < 20) return "high";
        return "medium";
    }

    private estimateHesitation(): "low" | "medium" | "high" {
        if (this.hintsUsed >= 2) return "high";
        if (this.hintsUsed === 1) return "medium";
        return "low";
    }

    // ── Injection plumbing ─────────────────────────────────────────────

    /** Add to model context without triggering generation. */
    private injectContext(text: string) {
        try {
            this.o.geminiSession.sendClientContent({
                turns: [{ role: "user", parts: [{ text }] }],
                turnComplete: false,
            });
        } catch (e: any) {
            console.error("orchestrator: context injection failed:", e?.message);
        }
    }

    /** Directive; active=true prompts the model to respond immediately. */
    private injectDirective(text: string, active: boolean) {
        try {
            this.o.geminiSession.sendClientContent({
                turns: [{ role: "user", parts: [{ text: `SYSTEM DIRECTIVE: ${text}` }] }],
                turnComplete: active,
            });
            this.log({ type: "directive", active, preview: text.slice(0, 80) });
        } catch (e: any) {
            console.error("orchestrator: directive injection failed:", e?.message);
        }
    }

    private sendToClient(payload: Record<string, unknown>) {
        if (this.o.ws.readyState === WebSocket.OPEN) {
            this.o.ws.send(JSON.stringify(payload));
        }
    }

    private log(event: Record<string, unknown>) {
        logSessionEvent(this.o.sessionId, event);
    }

    // ── Shutdown + memory loop ─────────────────────────────────────────

    endSession(reason: string) {
        if (this.ended) return;
        this.ended = true;
        this.log({ type: "session_end", reason, elapsed: this.elapsedSeconds() });
        this.sendToClient({
            type: "session_end",
            reason,
            completedExchanges: this.completedExchanges,
            studentSentences: this.studentSentences,
            durationSeconds: this.elapsedSeconds(),
        });
        this.o.onForceEnd(reason);
        this.dispose();
    }

    dispose() {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        this.ended = true;
    }

    /** Fire-and-forget after the connection closes: summarize → memory file. */
    async finalize() {
        const transcript = readSessionTranscript(this.o.sessionId);
        if (!transcript || transcript.split("\n").length < 4) {
            console.log("🧠 Session too short to summarize — skipping memory write");
            return;
        }
        const { summarizeSessionTranscript } = await import("../services/gemini");
        const parsed = await summarizeSessionTranscript(transcript);
        if (!parsed) return;
        saveSessionSummary(this.o.student.id, {
            session_id: this.o.sessionId,
            date: new Date(this.startTime).toISOString(),
            duration_seconds: this.elapsedSeconds(),
            summary: parsed.summary || "",
            personal_facts: Array.isArray(parsed.personal_facts) ? parsed.personal_facts : [],
            words_practiced: Array.isArray(parsed.words_practiced) ? parsed.words_practiced : [],
            words_struggled: Array.isArray(parsed.words_struggled) ? parsed.words_struggled : [],
            best_moment: parsed.best_moment || "",
            engagement: parsed.engagement || "medium",
            recommended_next_focus: parsed.recommended_next_focus || "",
            cliffhanger_seed: parsed.cliffhanger_seed || "",
        });
    }
}

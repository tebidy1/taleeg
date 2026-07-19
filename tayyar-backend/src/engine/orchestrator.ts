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
const WRAP_NUDGE_S = 435; // 7:15 — actively nudge toward victory close (30s into
                          //        the widened victory_close window @ 405s, so the
                          //        natural phase injection gets to run first)
// A captain turn that genuinely asks for a student response (contains a repeat
// cue / question): if the child stays silent this long, gently nudge.
const STUCK_AFTER_MS = 12000;
// A captain turn that was pure narration ending in a dramatic pause (no cue for
// the child): resume the story after just a short beat, so the intro doesn't
// dead-air for 12s waiting for a "turn" the child was never asked to take.
const NARRATION_BEAT_MS = 2500;

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
    // Cleanly close the child's open realtime-input activity on the wire
    // (forward activityEnd to Gemini + tell the client to drop its mic) BEFORE
    // the orchestrator takes the floor with an active directive. sessions.ts
    // owns the actual `micOpen` wire state; this is how the maestro asks it to
    // close so a directive is never spliced into an open audio turn.
    closeMicActivity: () => void;
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
    // True between `activityEnd` (student stopped talking) and the next
    // serverContent.turnComplete from Gemini. Any sendClientContent with
    // turnComplete:false during this window puts Gemini into "user is still
    // talking" mode and the model never responds — the session freezes.
    private userTurnPending = false;
    // Mirror of the wire's realtime-input activity: true from `activity_start`
    // (mic opened, child may be streaming audio) to `activity_end`. While this
    // is open, ANY sendClientContent — turnComplete false OR true — is spliced
    // into an open audio turn and drops the Live connection (the reported
    // "انقطع الاتصال" mid-intro). canInject() gates silent injections on it;
    // active directives close the activity first (closeMicActivity).
    private micOpen = false;
    // Whether the captain's last completed turn actually expects a student turn
    // (it contained a repeat cue / question). Drives BOTH the mic gate on the
    // client (expect_input) and the resume threshold: a real cue waits
    // STUCK_AFTER_MS for the child; a dramatic beat resumes after NARRATION_BEAT_MS.
    private awaitingStudent = false;

    // Phase-change script that couldn't be sent because canInject() was false
    // (model mid-utterance, or a student turn is awaiting model response).
    // Flushed from tick() the next time the pipeline is idle.
    private pendingPhaseInjection: { phase: string; text: string } | null = null;

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
        // The resume watch uses wall-clock; without this it would read the whole
        // paused span as "silence" and fire the instant we come back. Restart it.
        if (this.lastTurnCompleteAt > 0) this.lastTurnCompleteAt = Date.now();
        this.log({ type: "resume", paused_ms: pausedFor });
        console.log(`▶️  Session resumed (was paused ${Math.round(pausedFor/1000)}s)`);
    }

    isPaused(): boolean { return this.paused; }

    // ── Event intake (called from sessions.ts) ─────────────────────────

    noteAudioChunk() { this.modelSpeaking = true; }

    // The child's mic opened/closed on the wire (activity_start / activity_end).
    // Keeps canInject() honest: a silent, open mic is NOT a safe moment to inject.
    noteMicOpen()   { this.micOpen = true; }
    noteMicClosed() { this.micOpen = false; }

    noteAiTranscript(text: string) {
        this.log({ type: "ai_transcript", text });
        // Server-authoritative target phrase for the card: accumulate the
        // captain's turn and, during teaching phases only, surface the longest
        // English run. Phase-gating keeps incidental opening English off the card.
        this.aiTurnText += text;
        if (this.isTeachingPhase()) {
            // Strip any bracketed tokens ([WAIT], [HERO MOMENT], ...) before
            // extraction — the audio model sometimes voices them, and their
            // Latin letters would otherwise surface as a bogus target phrase
            // ("WAIT") on the card.
            const clean = this.aiTurnText.replace(/\[[^\]]*\]/g, " ");
            const phrase = extractEnglishPhrase(clean);
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
        this.userTurnPending = true;
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

    // Correction cues straight from the CORRECTIONS formulas in the core
    // persona ("تقصد: [correct]", "بس بنطق: ...", "ركّز: [word]"). These are
    // high-precision — they appear when the captain is fixing a word or sound
    // and virtually never in praise. We bias toward "correct": only a clear
    // correction marker downgrades the pulse, so we never demoralize a child
    // with a false "retry".
    private static readonly CORRECTION_MARKERS = ["تقصد", "بنطق", "ركّز", "ركز"];

    private detectTurnFeedback(captainText: string): "correct" | "retry" {
        return SessionOrchestrator.CORRECTION_MARKERS.some(m => captainText.includes(m))
            ? "retry" : "correct";
    }

    // Does this captain turn actually hand the floor to the child? A repeat
    // request ("كرّر"), an explicit "say/repeat", or a question mark means yes.
    // Pure scene-setting (the FLASH OPEN hook, a "شف الطابور!" beat) means no —
    // the [WAIT] there is a dramatic pause, not a cue. We bias toward "expects":
    // a false positive only makes the beat a little slower; a false negative
    // would skip a real student turn, which is far worse.
    private static readonly INPUT_CUES = [
        "كرّر", "كرر", "ردّد", "ردد", "قول", "أعد",
        "repeat", "say it", "your turn", "can you say", "now you",
    ];
    private turnExpectsStudentInput(text: string): boolean {
        if (text.includes("?") || text.includes("؟")) return true;
        const t = text.toLowerCase();
        return SessionOrchestrator.INPUT_CUES.some(c => t.includes(c.toLowerCase()));
    }

    noteTurnComplete() {
        this.modelSpeaking = false;
        this.userTurnPending = false;
        this.log({ type: "turn_complete" });

        if (this.userSpokeSinceTurnComplete) {
            this.completedExchanges++;
            this.userSpokeSinceTurnComplete = false;
            this.sendToClient({ type: "progress", completedExchanges: this.completedExchanges });
            // The captain just responded to a student attempt. Read its OWN
            // transcript (already streaming, zero added cost) for correction
            // markers and tell the UI whether to resolve the "heard" pulse into
            // a ✓ (accepted) or a gentle retry cue. The frontend can't judge
            // pronunciation itself (input transcription is off), so this
            // server-side signal is the only honest source for the ✓.
            const feedback = this.detectTurnFeedback(this.aiTurnText);
            this.sendToClient({ type: "turn_feedback", result: feedback });
            this.log({ type: "turn_feedback", result: feedback });
        }

        // Decide — from the captain's OWN just-finished words — whether the next
        // beat belongs to the child. This drives the client's mic gate
        // (expect_input) so the mic never opens during narration, and sets the
        // resume threshold below. Content-driven, so it stays correct even when
        // the wall-clock phase and the actual dialogue drift apart.
        const expects = this.turnExpectsStudentInput(this.aiTurnText);
        this.awaitingStudent = expects;
        this.sendToClient({ type: "expect_input", value: expects });
        this.log({ type: "turn_complete_expect", expects });
        this.lastTurnCompleteAt = Date.now();
        this.stuckNudgeSent = false;

        // Fresh slate for the next captain turn's phrase + cue detection.
        this.aiTurnText = "";
    }

    noteInterrupted() {
        this.modelSpeaking = false;
        this.userTurnPending = false;
        this.log({ type: "interrupted" });
    }

    noteHelpPress(pressCount: number) {
        this.hintsUsed = Math.max(this.hintsUsed, pressCount);
        this.log({ type: "help_press", pressCount });
    }

    /**
     * HELP button pressed (arrives over HTTP, out of band). Route it through
     * the maestro's injection path so it closes any open mic activity first —
     * the raw sendClientContent it used to do bypassed that gate and could drop
     * the connection exactly when the child (mic open) asked for help.
     */
    injectHelp(instruction: string) {
        this.injectDirective(instruction, true);
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

        // 1b) flush a deferred phase script if the pipeline is finally idle.
        //     Injecting turnComplete:false during a pending user turn strands
        //     Gemini in "user is still talking" mode → hard freeze.
        if (this.pendingPhaseInjection && this.canInject()) {
            const { text } = this.pendingPhaseInjection;
            this.pendingPhaseInjection = null;
            this.injectDirective(text, false);
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

        // 3b) resume watch. Two very different silences after a captain turn:
        //     • narration beat (no student cue) → resume the story after a short
        //       dramatic pause, so the intro never dead-airs.
        //     • real cue, child silent → wait longer, then gently encourage —
        //       never skip a turn the child was actually asked to take.
        const resumeThreshold = this.awaitingStudent ? STUCK_AFTER_MS : NARRATION_BEAT_MS;
        if (
            this.lastTurnCompleteAt > 0 &&
            !this.stuckNudgeSent &&
            !this.modelSpeaking &&
            Date.now() - this.lastTurnCompleteAt >= resumeThreshold
        ) {
            this.stuckNudgeSent = true;
            if (this.awaitingStudent) {
                this.log({ type: "stuck_nudge" });
                console.log(`👋 Student silent for ${STUCK_AFTER_MS/1000}s — encourage`);
                this.injectDirective(
                    "You asked the student to speak but they've gone quiet. Gently encourage them or offer a tiny hint (the first word or two), then wait again. Do NOT skip ahead or answer for them.",
                    true
                );
            } else {
                this.log({ type: "narration_beat" });
                console.log(`🎬 Narration beat (${NARRATION_BEAT_MS}ms) — resume story`);
                this.injectDirective(
                    "That pause was a dramatic beat, not a student cue — nothing was asked of the child. Continue your narration from exactly where you stopped. Do NOT re-greet and do NOT ask the student to repeat anything; just flow into the next line of the script.",
                    true
                );
            }
        }

        // 4) periodic real-time state update (silent — context only).
        //    NEVER inject while the captain is mid-utterance OR while a
        //    student turn is awaiting response. Any turnComplete:false push
        //    in those windows either makes the Live model abandon its current
        //    narration (mid-utterance case) or strands Gemini in "user is
        //    still talking" mode (userTurnPending case — the same class of
        //    freeze that stopped the mission-phase transition).
        //    We defer rather than drop: lastRealtimeUpdateS is only advanced
        //    when we actually inject, so the moment the pipeline goes idle
        //    the next tick fires the (now slightly overdue) update.
        if (
            this.canInject() &&
            elapsed - this.lastRealtimeUpdateS >= REALTIME_UPDATE_EVERY_S
        ) {
            this.lastRealtimeUpdateS = elapsed;
            this.injectRealtimeUpdate(elapsed);
        }
    }

    /**
     * True when it is safe to sendClientContent(turnComplete:false) — i.e.
     * the model isn't mid-utterance, no student turn is awaiting response, AND
     * the child's mic activity isn't open on the wire. Violating any of the
     * three hangs or drops the session (see the micOpen field note).
     */
    private canInject(): boolean {
        return !this.modelSpeaking && !this.userTurnPending && !this.micOpen;
    }

    /**
     * Close the child's dangling realtime-input activity (if open) before an
     * active directive takes the floor. Without this, sendClientContent
     * (turnComplete:true) is spliced into an open audio turn and Gemini drops
     * the connection. Idempotent: sessions.ts guards its own wire state too.
     */
    private closeMicActivity() {
        if (!this.micOpen) return;
        this.micOpen = false;
        this.o.closeMicActivity();
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

        // inject this phase's script — the model has never seen it before.
        // If the pipeline isn't idle (model mid-utterance, or a student turn
        // still awaiting response), DEFER: sending turnComplete:false right
        // on top of an activityEnd freezes the session. tick() flushes.
        if (!this.injectedPhases.has(phase)) {
            this.injectedPhases.add(phase);
            const script = this.o.promptBuilder.getPhaseScript(this.o.mission, phase);
            if (script) {
                const text = `NEXT PHASE SCRIPT (${phase}). Finish your current step first, then transition smoothly into this script. Do not announce the transition.\n\n${script}`;
                if (this.canInject()) {
                    this.injectDirective(text, false);
                } else {
                    this.pendingPhaseInjection = { phase, text };
                    this.log({ type: "phase_inject_deferred", phase });
                }
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
        // An active directive takes the floor with turnComplete:true. If the
        // child's mic activity is still open on the wire, splicing this into it
        // corrupts the Live stream and drops the connection — so close the
        // dangling activity first. (Silent, non-active directives are gated by
        // canInject() at the call sites instead.)
        if (active && this.micOpen) this.closeMicActivity();
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
            heroWord: this.lastEmittedPhrase || null,
        });
        // Stop ticking immediately, but DEFER the socket teardown. onForceEnd
        // closes the WebSocket, and closing it synchronously right after
        // sendToClient can drop the un-flushed session_end frame — stranding
        // the UI on the stamp screen with no navigation (the reported "end
        // screen stays forever" bug). 300ms lets the frame flush; it is
        // invisible to the child and costs nothing.
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        setTimeout(() => this.o.onForceEnd(reason), 300);
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

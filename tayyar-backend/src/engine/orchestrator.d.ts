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
import { PromptBuilder } from "./prompt_builder";
import { Student, Mission } from "../types/index";
interface OrchestratorOpts {
    sessionId: string;
    ws: WebSocket;
    geminiSession: any;
    student: Student;
    mission: Mission;
    promptBuilder: PromptBuilder;
    onForceEnd: (reason: string) => void;
    closeMicActivity: () => void;
}
export declare class SessionOrchestrator {
    private readonly o;
    private startTime;
    private timer;
    private phase;
    private injectedPhases;
    private lastRealtimeUpdateS;
    private wrapNudgeSent;
    private ended;
    private paused;
    private pausedAt;
    private lastTurnCompleteAt;
    private stuckNudgeSent;
    private modelSpeaking;
    private userSpokeSinceTurnComplete;
    private lastUserTranscriptAt;
    private userTurnPending;
    private micOpen;
    private awaitingStudent;
    private pendingPhaseInjection;
    private aiTurnText;
    private lastEmittedPhrase;
    completedExchanges: number;
    hintsUsed: number;
    studentSentences: number;
    constructor(opts: OrchestratorOpts);
    start(): void;
    elapsedSeconds(): number;
    notePause(): void;
    noteResume(): void;
    isPaused(): boolean;
    noteAudioChunk(): void;
    noteMicOpen(): void;
    noteMicClosed(): void;
    noteAiTranscript(text: string): void;
    /**
     * Client signaled the student finished their (manually-triggered) turn.
     * Input transcription is off, so we can no longer count "English words"
     * from the STT — every completed student turn counts as one attempt.
     */
    noteUserTurnEnd(): void;
    private isTeachingPhase;
    private static readonly CORRECTION_MARKERS;
    private detectTurnFeedback;
    private static readonly INPUT_CUES;
    private turnExpectsStudentInput;
    noteTurnComplete(): void;
    noteInterrupted(): void;
    noteHelpPress(pressCount: number): void;
    /**
     * HELP button pressed (arrives over HTTP, out of band). Route it through
     * the maestro's injection path so it closes any open mic activity first —
     * the raw sendClientContent it used to do bypassed that gate and could drop
     * the connection exactly when the child (mic open) asked for help.
     */
    injectHelp(instruction: string): void;
    /**
     * The model called conclude_mission — it has delivered its closing goodbye.
     * Phase progression here is otherwise 100% wall-clock (detectCurrentPhase),
     * so a conversation that wraps up faster than the fixed per-phase seconds
     * assume would otherwise sit in limbo: the model repeats "see you
     * tomorrow" while the clock hasn't reached the victory_close threshold
     * yet, and nothing ends the session until the 8:00 hard cap. This signal
     * decouples "the content is actually done" from "the clock says so".
     */
    noteConcludeMission(): void;
    private tick;
    /**
     * True when it is safe to sendClientContent(turnComplete:false) — i.e.
     * the model isn't mid-utterance, no student turn is awaiting response, AND
     * the child's mic activity isn't open on the wire. Violating any of the
     * three hangs or drops the session (see the micOpen field note).
     */
    private canInject;
    /**
     * Close the child's dangling realtime-input activity (if open) before an
     * active directive takes the floor. Without this, sendClientContent
     * (turnComplete:true) is spliced into an open audio turn and Gemini drops
     * the connection. Idempotent: sessions.ts guards its own wire state too.
     */
    private closeMicActivity;
    private onPhaseChange;
    private injectRealtimeUpdate;
    private estimateMood;
    private estimateEngagement;
    private estimateHesitation;
    /** Add to model context without triggering generation. */
    private injectContext;
    /** Directive; active=true prompts the model to respond immediately. */
    private injectDirective;
    private sendToClient;
    private log;
    endSession(reason: string): void;
    dispose(): void;
    /** Fire-and-forget after the connection closes: summarize → memory file. */
    finalize(): Promise<void>;
}
export {};
//# sourceMappingURL=orchestrator.d.ts.map
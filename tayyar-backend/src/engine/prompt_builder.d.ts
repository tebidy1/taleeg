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
import { Student, Mission } from "../types/index";
export interface PromptBuildContext {
    student: Student;
    mission: Mission;
    sessionStartTime: Date;
    realTimeState?: RealTimeState;
}
export interface RealTimeState {
    timeElapsed: string;
    currentExchange: number;
    completedExchanges: number;
    hintsUsed: number;
    successfulExchanges: number;
    failedExchanges: number;
    detectedMood: "confident" | "happy" | "neutral" | "anxious" | "frustrated";
    engagementLevel: "high" | "medium" | "low";
    voiceVolume: "low" | "normal" | "high";
    speechRate: "slow" | "normal" | "fast";
    hesitationLevel: "low" | "medium" | "high";
}
export declare function detectCurrentPhase(timeElapsedSecs: number): string;
export declare class PromptBuilder {
    private basePersonaCache;
    private corePersonaCache;
    /**
     * Compact system prompt (~4-5K chars instead of ~26K):
     * core persona + mission overview + student brief + memory recap
     * + ONLY the opening phases' script (flash_open + warmup).
     * Later phase scripts are injected live by the SessionOrchestrator,
     * so the model can never "burn through" the lesson.
     */
    buildCorePrompt(context: PromptBuildContext): string;
    /**
     * Extract any top-level ## section from the mission file whose header
     * contains one of the given keywords. Returns null if not found.
     */
    getNamedSection(mission: Mission, keywords: string[]): string | null;
    /**
     * Extract one phase's script section from the mission markdown file.
     * Sections are split on "## " headers and matched by keyword.
     */
    getPhaseScript(mission: Mission, phase: string): string | null;
    private loadCorePersona;
    /**
     * LEGACY: full 6-layer monolithic prompt (~26K chars). Kept for reference
     * and A/B comparison; live sessions now use buildCorePrompt().
     */
    buildSessionPrompt(context: PromptBuildContext): string;
    private generateFinalDirective;
    /**
     * Build a real-time update prompt (sent every 30 seconds)
     */
    buildRealTimeUpdate(context: PromptBuildContext, state: RealTimeState): string;
    private shouldShowQuickReview;
    private generateQuickReviewPrompt;
    private generateMultiContextPrompt;
    private loadLayer1;
    private loadLayer2;
    private generateLayer3;
    private generateLayer4;
    private generateRealTimeRules;
    private combineLayers;
    private identifyStrengths;
    private identifyWeaknesses;
    private selectPhonemeFocus;
    private getLastSessionRecap;
    private generateAdaptationRules;
    private getSecondaryGoal;
    private formatPhonemeList;
    private daysSince;
}
//# sourceMappingURL=prompt_builder.d.ts.map
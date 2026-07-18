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
interface PromptBuildContext {
    student: Student;
    mission: Mission;
    sessionStartTime: Date;
    realTimeState?: RealTimeState;
}
interface RealTimeState {
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
    /**
     * Build the complete prompt for a session
     */
    buildSessionPrompt(context: PromptBuildContext): string;
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
export {};
//# sourceMappingURL=prompt_builder.d.ts.map
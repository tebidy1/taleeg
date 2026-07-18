/**
 * Progression Engine — Manages Level 1 Learning Sequence
 *
 * Ensures the student progresses through missions in the CORRECT ORDER
 * with the CORRECT DIFFICULTY. This is the "scaffolding" that makes
 * the app feel easy at start and gradually more challenging.
 */
import { Student } from "../schema/types";
export declare const LEVEL_1_PROGRESSION: {
    phase_0: {
        duration_days: number;
        missions: string[];
        patterns_introduced: string[];
        new_phonemes_focus: never[];
        goal: string;
        success_criteria: {
            missions_completed: number;
            patterns_used_without_hint: number;
            engagement_level: "medium";
            streak_days: number;
        };
    };
    phase_1: {
        duration_days: number;
        missions: string[];
        patterns_introduced: string[];
        new_phonemes_focus: string[];
        goal: string;
        success_criteria: {
            missions_completed: number;
            patterns_used_without_hint: number;
            engagement_level: "medium";
            streak_days: number;
        };
    };
    phase_2: {
        duration_days: number;
        missions: string[];
        patterns_introduced: string[];
        new_phonemes_focus: string[];
        goal: string;
        success_criteria: {
            missions_completed: number;
            patterns_used_without_hint: number;
            engagement_level: "medium";
            streak_days: number;
        };
    };
    phase_3: {
        duration_days: number;
        missions: string[];
        patterns_introduced: string[];
        new_phonemes_focus: string[];
        goal: string;
        success_criteria: {
            missions_completed: number;
            patterns_used_without_hint: number;
            engagement_level: "high";
            streak_days: number;
        };
    };
};
export declare function getNextMission(student: Student): string | null;
export declare function canAccessMission(student: Student, missionId: string): {
    allowed: boolean;
    reason: string;
};
export declare function shouldAdvancePhase(student: Student): {
    advance: boolean;
    nextPhase: 1 | 2 | 3 | null;
    reason: string;
};
export declare function getDifficultyMultiplier(student: Student): number;
export declare function shouldOfferReviewSession(student: Student): {
    offer: boolean;
    reason: string;
    reviewMissions: string[];
};
export declare function checkLevel2Readiness(student: Student): {
    ready: boolean;
    criteria: Array<{
        name: string;
        met: boolean;
        value: string;
        required: string;
    }>;
    recommendation: string;
};
export declare function planNextSession(student: Student): {
    sessionType: "new_mission" | "review" | "celebration";
    missionId: string | null;
    reason: string;
    estimatedDuration: number;
};
export declare function getMissionDifficulty(missionId: string, student: Student): {
    level: "very_easy" | "easy" | "medium" | "hard" | "very_hard";
    description: string;
    adjustments: string[];
};
//# sourceMappingURL=progression.d.ts.map
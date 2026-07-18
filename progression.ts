/**
 * Progression Engine — Manages Level 1 Learning Sequence
 * 
 * Ensures the student progresses through missions in the CORRECT ORDER
 * with the CORRECT DIFFICULTY. This is the "scaffolding" that makes
 * the app feel easy at start and gradually more challenging.
 */

import { Student, Mission, CEFRLevel } from "../schema/types";

// ============================================================
// LEVEL 1 PROGRESSION MAP
// ============================================================

export const LEVEL_1_PROGRESSION = {
  // Phase 1: Introduction (Days 1-7)
  // Goal: Build confidence, introduce 2 patterns
  phase_1: {
    duration_days: 7,
    missions: ["mission_01_airport", "mission_02_airplane"],
    patterns_introduced: ["pat_001", "pat_002"],
    new_phonemes_focus: ["/p/", "/v/"],
    goal: "Build basic confidence. Student can greet and make simple requests.",
    success_criteria: {
      missions_completed: 2,
      patterns_used_without_hint: 1,
      engagement_level: "medium" as const,
      streak_days: 3,
    },
  },

  // Phase 2: Building (Days 8-14)
  // Goal: Introduce 2 new patterns, review old ones
  phase_2: {
    duration_days: 7,
    missions: ["mission_03_hotel", "mission_04_restaurant"],
    patterns_introduced: ["pat_003", "pat_004"],
    new_phonemes_focus: ["/r/", "/ŋ/"],
    goal: "Student can ask questions and request items in new contexts.",
    success_criteria: {
      missions_completed: 4,
      patterns_used_without_hint: 3,
      engagement_level: "medium" as const,
      streak_days: 7,
    },
  },

  // Phase 3: Consolidation (Days 15-21)
  // Goal: Introduce final pattern, test mastery
  phase_3: {
    duration_days: 7,
    missions: ["mission_05_shopping"],
    patterns_introduced: ["pat_005"],
    new_phonemes_focus: ["/θ/"],
    goal: "Student can use all 5 patterns in conversation. Ready for Level 2.",
    success_criteria: {
      missions_completed: 5,
      patterns_used_without_hint: 4,
      engagement_level: "high" as const,
      streak_days: 14,
    },
  },
};

// ============================================================
// MISSION UNLOCK LOGIC
// ============================================================

export function getNextMission(student: Student): string | null {
  const completedMissions = getCompletedMissions(student);
  const currentPhase = student.current_phase;

  const phaseMissions = LEVEL_1_PROGRESSION[`phase_${currentPhase}`].missions;

  // Find first mission in current phase not completed
  for (const missionId of phaseMissions) {
    if (!completedMissions.includes(missionId)) {
      return missionId;
    }
  }

  // All missions in current phase completed — advance to next phase
  if (currentPhase < 3) {
    return LEVEL_1_PROGRESSION[`phase_${currentPhase + 1}`].missions[0];
  }

  // All Level 1 missions completed
  return null;
}

export function canAccessMission(
  student: Student,
  missionId: string
): { allowed: boolean; reason: string } {
  const completedMissions = getCompletedMissions(student);
  const missionOrder = [
    "mission_01_airport",
    "mission_02_airplane",
    "mission_03_hotel",
    "mission_04_restaurant",
    "mission_05_shopping",
  ];

  const missionIndex = missionOrder.indexOf(missionId);
  if (missionIndex === -1) {
    return { allowed: false, reason: "Invalid mission ID" };
  }

  // First mission always accessible
  if (missionIndex === 0) {
    return { allowed: true, reason: "First mission — always accessible" };
  }

  // Check if previous mission completed
  const previousMission = missionOrder[missionIndex - 1];
  if (!completedMissions.includes(previousMission)) {
    return {
      allowed: false,
      reason: `Complete "${previousMission}" first`,
    };
  }

  return { allowed: true, reason: "Prerequisites met" };
}

// ============================================================
// PHASE ADVANCEMENT
// ============================================================

export function shouldAdvancePhase(student: Student): {
  advance: boolean;
  nextPhase: 1 | 2 | 3 | null;
  reason: string;
} {
  const currentPhase = student.current_phase;
  const phaseData = LEVEL_1_PROGRESSION[`phase_${currentPhase}`];
  const criteria = phaseData.success_criteria;

  const completedMissions = getCompletedMissions(student);
  const phaseMissionsCompleted = phaseData.missions.filter(m =>
    completedMissions.includes(m)
  ).length;

  // Check all criteria
  if (phaseMissionsCompleted < criteria.missions_completed) {
    return {
      advance: false,
      nextPhase: null,
      reason: `Complete ${criteria.missions_completed - phaseMissionsCompleted} more mission(s)`,
    };
  }

  if (student.current_streak < criteria.streak_days) {
    return {
      advance: false,
      nextPhase: null,
      reason: `Maintain ${criteria.streak_days} day streak (current: ${student.current_streak})`,
    };
  }

  // Criteria met — advance
  if (currentPhase < 3) {
    return {
      advance: true,
      nextPhase: (currentPhase + 1) as 2 | 3,
      reason: `Phase ${currentPhase} completed! Moving to Phase ${currentPhase + 1}`,
    };
  }

  // Phase 3 completed — Level 1 done
  return {
    advance: true,
    nextPhase: null,
    reason: "Level 1 completed! Ready for Level 2.",
  };
}

// ============================================================
// DIFFICULTY ADJUSTMENT
// ============================================================

export function getDifficultyMultiplier(student: Student): number {
  // Adjust difficulty based on student performance
  const baseDifficulty = 1.0;

  // Recent struggles → easier
  if (student.current_streak === 0) {
    return 0.8; // Coming back after break — easier
  }

  // High mastery → slightly harder
  const masteredPatterns = student.patterns.filter(
    p => p.production_level >= 4
  ).length;

  if (masteredPatterns >= 3) {
    return 1.1; // Slightly harder
  }

  return baseDifficulty;
}

// ============================================================
// REVIEW SESSION GENERATOR
// ============================================================

export function shouldOfferReviewSession(student: Student): {
  offer: boolean;
  reason: string;
  reviewMissions: string[];
} {
  // Offer review if:
  // 1. Coming back after 2+ days break
  // 2. Failed last session
  // 3. About to enter new phase

  const daysSinceLastSession = student.last_session_date
    ? Math.floor(
        (Date.now() - student.last_session_date.getTime()) / (1000 * 60 * 60 * 24)
      )
    : 0;

  if (daysSinceLastSession >= 3) {
    const completedMissions = getCompletedMissions(student);
    return {
      offer: true,
      reason: `Welcome back! It's been ${daysSinceLastSession} days. Let's review before continuing.`,
      reviewMissions: completedMissions.slice(-2), // Last 2 completed missions
    };
  }

  // Check if entering new phase soon
  const phaseCheck = shouldAdvancePhase(student);
  if (phaseCheck.advance && phaseCheck.nextPhase) {
    const completedMissions = getCompletedMissions(student);
    return {
      offer: true,
      reason: "Great progress! Let's do a quick review before moving to the next phase.",
      reviewMissions: completedMissions.slice(-2),
    };
  }

  return {
    offer: false,
    reason: "Continue with next mission",
    reviewMissions: [],
  };
}

// ============================================================
// LEVEL 2 READINESS CHECK
// ============================================================

export function checkLevel2Readiness(student: Student): {
  ready: boolean;
  criteria: Array<{ name: string; met: boolean; value: string; required: string }>;
  recommendation: string;
} {
  const completedMissions = getCompletedMissions(student);

  const criteria = [
    {
      name: "All missions completed",
      met: completedMissions.length >= 5,
      value: `${completedMissions.length}/5`,
      required: "5/5",
    },
    {
      name: "Patterns used without hints",
      met: student.patterns.filter(p => p.production_level >= 4).length >= 4,
      value: `${student.patterns.filter(p => p.production_level >= 4).length}/5 patterns mastered`,
      required: "4/5 patterns mastered",
    },
    {
      name: "Overall pronunciation accuracy",
      met: getAveragePronunciationAccuracy(student) > 0.7,
      value: `${Math.round(getAveragePronunciationAccuracy(student) * 100)}%`,
      required: ">70%",
    },
    {
      name: "Consistency (streak)",
      met: student.longest_streak >= 14,
      value: `${student.longest_streak} days longest streak`,
      required: "14+ days",
    },
    {
      name: "Total sessions",
      met: student.total_sessions >= 15,
      value: `${student.total_sessions} sessions`,
      required: "15+ sessions",
    },
  ];

  const allMet = criteria.every(c => c.met);

  let recommendation = "";
  if (allMet) {
    recommendation = "🎉 Ready for Level 2! Student can now handle longer conversations and more complex patterns.";
  } else {
    const failedCount = criteria.filter(c => !c.met).length;
    recommendation = `${failedCount} criteria not yet met. Continue with review sessions and practice. Estimated time to readiness: ${estimateTimeToReadiness(student, criteria)} days.`;
  }

  return {
    ready: allMet,
    criteria,
    recommendation,
  };
}

// ============================================================
// SESSION PLANNER
// ============================================================

export function planNextSession(student: Student): {
  sessionType: "new_mission" | "review" | "celebration";
  missionId: string | null;
  reason: string;
  estimatedDuration: number;
} {
  // Check for celebration (Level 2 readiness)
  if (student.total_sessions > 0) {
    const readiness = checkLevel2Readiness(student);
    if (readiness.ready) {
      return {
        sessionType: "celebration",
        missionId: null,
        reason: "Level 1 completed! Celebration session.",
        estimatedDuration: 300, // 5 minutes celebration
      };
    }
  }

  // Check for review session
  const reviewCheck = shouldOfferReviewSession(student);
  if (reviewCheck.offer) {
    return {
      sessionType: "review",
      missionId: reviewCheck.reviewMissions[0] || null,
      reason: reviewCheck.reason,
      estimatedDuration: 420, // 7 minutes
    };
  }

  // Default: next mission
  const nextMission = getNextMission(student);
  if (nextMission) {
    return {
      sessionType: "new_mission",
      missionId: nextMission,
      reason: "Continue progression with next mission",
      estimatedDuration: 420, // 7 minutes
    };
  }

  // All missions done but not ready for Level 2
  return {
    sessionType: "review",
    missionId: "mission_05_shopping",
    reason: "Continue practicing until Level 2 criteria met",
    estimatedDuration: 420,
  };
}

// ============================================================
// HELPERS
// ============================================================

function getCompletedMissions(student: Student): string[] {
  // This would query the database for completed missions
  // For now, return based on current_mission_id
  const missionOrder = [
    "mission_01_airport",
    "mission_02_airplane",
    "mission_03_hotel",
    "mission_04_restaurant",
    "mission_05_shopping",
  ];

  const currentIndex = student.current_mission_id
    ? missionOrder.indexOf(student.current_mission_id)
    : -1;

  if (currentIndex <= 0) return [];
  return missionOrder.slice(0, currentIndex);
}

function getAveragePronunciationAccuracy(student: Student): number {
  const phonemes = Object.values(student.pronunciation_map.phonemes);
  if (phonemes.length === 0) return 0;
  return phonemes.reduce((sum, p) => sum + p.accuracy, 0) / phonemes.length;
}

function estimateTimeToReadiness(
  student: Student,
  criteria: Array<{ met: boolean }>
): number {
  const failedCount = criteria.filter(c => !c.met).length;
  // Rough estimate: 3 days per failed criterion
  return failedCount * 3;
}

// ============================================================
// MISSION DIFFICULTY DESCRIPTOR
// ============================================================

export function getMissionDifficulty(
  missionId: string,
  student: Student
): {
  level: "very_easy" | "easy" | "medium" | "hard" | "very_hard";
  description: string;
  adjustments: string[];
} {
  const missionOrder = [
    "mission_01_airport",
    "mission_02_airplane",
    "mission_03_hotel",
    "mission_04_restaurant",
    "mission_05_shopping",
  ];

  const missionIndex = missionOrder.indexOf(missionId);
  const completedCount = getCompletedMissions(student).length;
  const difficultyMultiplier = getDifficultyMultiplier(student);

  const baseDifficulty = missionIndex + 1;
  const adjustedDifficulty = baseDifficulty * difficultyMultiplier;

  const adjustments: string[] = [];

  if (difficultyMultiplier < 1) {
    adjustments.push("Provide more hints (returning after break)");
  }
  if (difficultyMultiplier > 1) {
    adjustments.push("Reduce hints (student is progressing well)");
  }

  let level: "very_easy" | "easy" | "medium" | "hard" | "very_hard";
  let description: string;

  if (adjustedDifficulty <= 1.2) {
    level = "very_easy";
    description = "Confidence building — heavy hints, simple exchanges";
  } else if (adjustedDifficulty <= 2.2) {
    level = "easy";
    description = "Guided practice — moderate hints, 6 exchanges";
  } else if (adjustedDifficulty <= 3.2) {
    level = "medium";
    description = "Independent practice — minimal hints, new patterns";
  } else if (adjustedDifficulty <= 4.2) {
    level = "hard";
    description = "Skill consolidation — no hints unless stuck, multiple patterns";
  } else {
    level = "very_hard";
    description = "Mastery test — graduation criteria, all patterns";
  }

  return { level, description, adjustments };
}

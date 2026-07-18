/**
 * SRS Engine — Spaced Repetition System
 * Modified SM-2 Algorithm for Children's Vocabulary Learning
 * 
 * Key adaptations for children:
 * - Faster initial progression (kids learn fast)
 * - Gentler penalty for failures (preserve confidence)
 * - Context-aware reviews (inject into stories, not isolated quizzes)
 */

import { VocabularyItem, PatternMastery, ReviewRecord } from "../types/index";

// ============================================================
// CONFIGURATION
// ============================================================

const SRS_CONFIG = {
  // Initial values for new items
  INITIAL_INTERVAL: 1, // 1 day
  INITIAL_EASE_FACTOR: 2.5,

  // Performance thresholds (0-1)
  MASTERY_THRESHOLD: 0.85, // score >= 0.85 = "good"
  PASSING_THRESHOLD: 0.5, // score >= 0.5 = "ok"
  // score < 0.5 = "fail"

  // Ease factor bounds
  MIN_EASE_FACTOR: 1.3,
  MAX_EASE_FACTOR: 3.0,

  // Interval bounds (in days)
  MIN_INTERVAL: 1,
  MAX_INTERVAL: 60, // max 2 months between reviews

  // Mastery levels
  MASTERY_LEVELS: {
    NEW: 0, // just learned
    LEARNING: 1, // 1-2 successful reviews
    FAMILIAR: 2, // 3-4 successful reviews
    PRACTICED: 3, // 5+ successful reviews, stable
    MASTERED: 4, // 7+ successful reviews, high ease factor
    FLUENT: 5, // used in production (free conversation) 3+ times
  },
};

// ============================================================
// CORE SRS ALGORITHM
// ============================================================

/**
 * Update a vocabulary item after a review
 * @param item - The vocabulary item being reviewed
 * @param performanceScore - 0 to 1 (how well did they do?)
 * @param context - In which mission was it reviewed?
 * @param responseType - How were they tested?
 * @returns Updated vocabulary item
 */
export function reviewVocabularyItem(
  item: VocabularyItem,
  performanceScore: number,
  context: string,
  responseType: "recognition" | "recall" | "production"
): VocabularyItem {
  const now = new Date();
  const record: ReviewRecord = {
    date: now,
    score: performanceScore,
    context,
    response_type: responseType,
  };

  // Calculate new interval and ease factor
  let newInterval: number;
  let newEaseFactor: number = item.ease_factor;

  if (performanceScore >= SRS_CONFIG.MASTERY_THRESHOLD) {
    // GOOD response — increase interval
    newInterval = Math.round(item.interval_days * item.ease_factor);
    newEaseFactor = Math.min(
      SRS_CONFIG.MAX_EASE_FACTOR,
      item.ease_factor + 0.1
    );
  } else if (performanceScore >= SRS_CONFIG.PASSING_THRESHOLD) {
    // OK response — slight decrease, but keep progressing
    newInterval = Math.max(
      SRS_CONFIG.MIN_INTERVAL,
      Math.round(item.interval_days * 0.8)
    );
    newEaseFactor = Math.max(
      SRS_CONFIG.MIN_EASE_FACTOR,
      item.ease_factor - 0.15
    );
  } else {
    // FAILED response — reset to short interval
    newInterval = SRS_CONFIG.MIN_INTERVAL;
    newEaseFactor = Math.max(
      SRS_CONFIG.MIN_EASE_FACTOR,
      item.ease_factor - 0.3
    );
  }

  // Apply bounds
  newInterval = Math.min(SRS_CONFIG.MAX_INTERVAL, newInterval);
  newInterval = Math.max(SRS_CONFIG.MIN_INTERVAL, newInterval);

  // Calculate next review date
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + newInterval);

  // Update mastery level
  const newMasteryLevel = calculateMasteryLevel(
    item.review_count + 1,
    item.mastery_level,
    performanceScore,
    responseType
  );

  // Update pronunciation/production accuracy
  const newPronunciationAccuracy =
    responseType === "recognition" || responseType === "recall"
      ? (item.pronunciation_accuracy * item.review_count + performanceScore) /
        (item.review_count + 1)
      : item.pronunciation_accuracy;

  const newProductionAccuracy =
    responseType === "production"
      ? (item.production_accuracy * item.review_count + performanceScore) /
        (item.review_count + 1)
      : item.production_accuracy;

  return {
    ...item,
    last_reviewed: now,
    next_review: nextReview,
    interval_days: newInterval,
    ease_factor: newEaseFactor,
    review_count: item.review_count + 1,
    performance_history: [...item.performance_history, record],
    mastery_level: newMasteryLevel,
    pronunciation_accuracy: newPronunciationAccuracy,
    production_accuracy: newProductionAccuracy,
  };
}

// ============================================================
// MASTERY LEVEL CALCULATION
// ============================================================

function calculateMasteryLevel(
  totalReviews: number,
  currentLevel: number,
  lastScore: number,
  responseType: "recognition" | "recall" | "production"
): 0 | 1 | 2 | 3 | 4 | 5 {
  // Don't decrease mastery level on a single failure
  if (lastScore < SRS_CONFIG.PASSING_THRESHOLD) {
    return currentLevel; // stay at current level
  }

  // Production responses can jump levels faster
  const productionBonus = responseType === "production" ? 1 : 0;

  if (totalReviews >= 7 && lastScore >= SRS_CONFIG.MASTERY_THRESHOLD) {
    // Check for FLUENT level (level 5) — requires production
    if (responseType === "production" && currentLevel >= 4) {
      return 5;
    }
    return 4;
  }
  if (totalReviews >= 5 && lastScore >= SRS_CONFIG.MASTERY_THRESHOLD) {
    return Math.max(currentLevel, (3 + productionBonus) as 3 | 4);
  }
  if (totalReviews >= 3 && lastScore >= SRS_CONFIG.MASTERY_THRESHOLD) {
    return Math.max(currentLevel, (2 + productionBonus) as 2 | 3);
  }
  if (totalReviews >= 1 && lastScore >= SRS_CONFIG.PASSING_THRESHOLD) {
    return Math.max(currentLevel, 1);
  }
  return currentLevel;
}

// ============================================================
// DUE REVIEWS — What needs to be reviewed today?
// ============================================================

export function getDueReviews(
  vocabulary: VocabularyItem[],
  currentDate: Date = new Date()
): VocabularyItem[] {
  return vocabulary
    .filter((item) => {
      // Due if next_review date has passed
      const isDue = new Date(item.next_review) <= currentDate;
      // Also due if it's been way too long (overdue)
      const isOverdue =
        item.last_reviewed &&
        daysBetween(item.last_reviewed, currentDate) >
          item.interval_days * 2;

      return isDue || isOverdue;
    })
    .sort((a, b) => {
      // Priority: most overdue first
      const aOverdue = daysBetween(a.next_review, currentDate);
      const bOverdue = daysBetween(b.next_review, currentDate);
      return bOverdue - aOverdue;
    });
}

// ============================================================
// PATTERN MASTERY UPDATES
// ============================================================

export function updatePatternMastery(
  mastery: PatternMastery,
  stage: "recognition" | "substitution" | "expansion" | "production" | "transformation",
  success: boolean,
  context: string
): PatternMastery {
  const now = new Date();
  const stageMap = {
    recognition: "recognition_level",
    substitution: "substitution_level",
    expansion: "expansion_level",
    production: "production_level",
    transformation: "transformation_level",
  } as const;

  const levelKey = stageMap[stage];
  const currentLevel = mastery[levelKey];

  const updatedMastery: PatternMastery = {
    ...mastery,
    last_used: now,
    contexts_used_in: mastery.contexts_used_in.includes(context)
      ? mastery.contexts_used_in
      : [...mastery.contexts_used_in, context],
    times_used_correctly: success
      ? mastery.times_used_correctly + 1
      : mastery.times_used_correctly,
    times_used_incorrectly: success
      ? mastery.times_used_incorrectly
      : mastery.times_used_incorrectly + 1,
  };

  // Update the specific stage level
  if (success && currentLevel < 5) {
    updatedMastery[levelKey] = currentLevel + 1 as typeof currentLevel;
  }

  return updatedMastery;
}

// ============================================================
// INJECTION HELPER — Which reviews to inject in next mission?
// ============================================================

export function getReviewsForMission(
  vocabulary: VocabularyItem[],
  maxReviews: number = 3
): VocabularyItem[] {
  const due = getDueReviews(vocabulary);

  // Prioritize:
  // 1. Items in "learning" stage (mastery 1-2) — need reinforcement
  // 2. Items that are overdue
  // 3. Items that failed last review

  const learning = due.filter(
    (item) =>
      item.mastery_level === 1 ||
      item.mastery_level === 2
  );
  const overdue = due.filter((item) => item.mastery_level >= 3);
  const failed = due.filter((item) => {
    const lastReview = item.performance_history[item.performance_history.length - 1];
    return lastReview && lastReview.score < SRS_CONFIG.PASSING_THRESHOLD;
  });

  // Combine with priority
  const prioritized = [
    ...failed.slice(0, 1), // max 1 failed item
    ...learning.slice(0, 2), // max 2 learning items
    ...overdue.slice(0, maxReviews - 3), // fill rest with overdue
  ];

  return prioritized.slice(0, maxReviews);
}

// ============================================================
// HELPERS
// ============================================================

function daysBetween(date1: Date, date2: Date): number {
  const ms = Math.abs(date2.getTime() - date1.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/**
 * Create a new vocabulary item when student first encounters a word
 */
export function createNewVocabularyItem(
  word: string,
  patternId: string,
  phonemeFocus: string[]
): VocabularyItem {
  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + SRS_CONFIG.INITIAL_INTERVAL);

  return {
    id: `voc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    word,
    translation: "", // to be filled
    pattern_id: patternId,
    phoneme_focus: phonemeFocus,
    context_examples: [],
    cefr_level: "A1",
    first_learned: now,
    last_reviewed: null,
    next_review: nextReview,
    interval_days: SRS_CONFIG.INITIAL_INTERVAL,
    ease_factor: SRS_CONFIG.INITIAL_EASE_FACTOR,
    review_count: 0,
    performance_history: [],
    mastery_level: 0,
    pronunciation_accuracy: 0,
    production_accuracy: 0,
  };
}

/**
 * Get overall student progress summary
 */
export function getStudentProgress(vocabulary: VocabularyItem[]) {
  const total = vocabulary.length;
  if (total === 0) {
    return {
      total_words: 0,
      mastered_words: 0,
      learning_words: 0,
      new_words: 0,
      average_accuracy: 0,
      mastery_percentage: 0,
    };
  }

  const mastered = vocabulary.filter((v) => v.mastery_level >= 4).length;
  const learning = vocabulary.filter(
    (v) => v.mastery_level >= 1 && v.mastery_level < 4
  ).length;
  const newWords = vocabulary.filter((v) => v.mastery_level === 0).length;

  const reviewedItems = vocabulary.filter((v) => v.review_count > 0);
  const avgAccuracy =
    reviewedItems.length > 0
      ? reviewedItems.reduce((sum, v) => sum + v.pronunciation_accuracy, 0) /
        reviewedItems.length
      : 0;

  return {
    total_words: total,
    mastered_words: mastered,
    learning_words: learning,
    new_words: newWords,
    average_accuracy: avgAccuracy,
    mastery_percentage: (mastered / total) * 100,
  };
}

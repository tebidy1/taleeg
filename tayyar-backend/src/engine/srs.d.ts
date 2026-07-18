/**
 * SRS Engine — Spaced Repetition System
 * Modified SM-2 Algorithm for Children's Vocabulary Learning
 *
 * Key adaptations for children:
 * - Faster initial progression (kids learn fast)
 * - Gentler penalty for failures (preserve confidence)
 * - Context-aware reviews (inject into stories, not isolated quizzes)
 */
import { VocabularyItem, PatternMastery } from "../types/index";
/**
 * Update a vocabulary item after a review
 * @param item - The vocabulary item being reviewed
 * @param performanceScore - 0 to 1 (how well did they do?)
 * @param context - In which mission was it reviewed?
 * @param responseType - How were they tested?
 * @returns Updated vocabulary item
 */
export declare function reviewVocabularyItem(item: VocabularyItem, performanceScore: number, context: string, responseType: "recognition" | "recall" | "production"): VocabularyItem;
export declare function getDueReviews(vocabulary: VocabularyItem[], currentDate?: Date): VocabularyItem[];
export declare function updatePatternMastery(mastery: PatternMastery, stage: "recognition" | "substitution" | "expansion" | "production" | "transformation", success: boolean, context: string): PatternMastery;
export declare function getReviewsForMission(vocabulary: VocabularyItem[], maxReviews?: number): VocabularyItem[];
/**
 * Create a new vocabulary item when student first encounters a word
 */
export declare function createNewVocabularyItem(word: string, patternId: string, phonemeFocus: string[]): VocabularyItem;
/**
 * Get overall student progress summary
 */
export declare function getStudentProgress(vocabulary: VocabularyItem[]): {
    total_words: number;
    mastered_words: number;
    learning_words: number;
    new_words: number;
    average_accuracy: number;
    mastery_percentage: number;
};
//# sourceMappingURL=srs.d.ts.map
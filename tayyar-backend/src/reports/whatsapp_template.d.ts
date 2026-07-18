/**
 * WhatsApp Report Generator
 *
 * Generates daily and weekly reports for parents.
 * Reports are sent via WhatsApp (more effective than email in Saudi market).
 *
 * Format: Plain text + emojis (WhatsApp-friendly)
 * Length: Optimized for mobile reading
 * Tone: Warm, encouraging, specific (not generic)
 */
import { Student, Session } from "../schema/types";
export declare function generateDailyReport(student: Student, session: Session): string;
export declare function generateWeeklyReport(student: Student, weekSessions: Session[]): string;
export declare function generateCelebrationMessage(student: Student, achievement: string): string;
export declare function generateReengagementMessage(student: Student, daysMissed: number): string;
//# sourceMappingURL=whatsapp_template.d.ts.map
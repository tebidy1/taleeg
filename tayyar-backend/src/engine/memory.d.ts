/**
 * Memory Engine — file-backed for the MVP (Supabase creds are empty in .env).
 *
 * Two stores, both under tayyar-backend/data/:
 *   logs/sessions/{sessionId}.jsonl  — raw per-event transcript log (append-only)
 *   data/memory/{studentId}.json     — rolling summaries produced after each session
 *
 * The next session's prompt reads the memory file so the Captain can say
 * "How is your cat Loulou?" — the daily-loop feature the product is built on.
 */
export interface SessionSummary {
    session_id: string;
    date: string;
    duration_seconds: number;
    summary: string;
    personal_facts: string[];
    words_practiced: string[];
    words_struggled: string[];
    best_moment: string;
    engagement: "high" | "medium" | "low";
    recommended_next_focus: string;
    cliffhanger_seed: string;
}
export interface StudentMemory {
    student_id: string;
    personal_facts: string[];
    sessions: SessionSummary[];
}
export declare function logSessionEvent(sessionId: string, event: Record<string, unknown>): void;
/** Rebuild a readable "AI: ... / Student: ..." transcript from the jsonl log. */
export declare function readSessionTranscript(sessionId: string): string;
export declare function loadStudentMemory(studentId: string): StudentMemory | null;
export declare function saveSessionSummary(studentId: string, summary: SessionSummary): void;
/** Short Arabic recap block injected into the next session's prompt. */
export declare function buildMemoryRecap(studentId: string): string;
//# sourceMappingURL=memory.d.ts.map
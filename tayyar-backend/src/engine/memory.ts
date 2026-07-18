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

import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..", "..");
const SESSION_LOG_DIR = path.join(ROOT, "logs", "sessions");
const MEMORY_DIR = path.join(ROOT, "data", "memory");
const MAX_STORED_SESSIONS = 20;

export interface SessionSummary {
    session_id: string;
    date: string; // ISO
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
    personal_facts: string[]; // deduplicated across sessions
    sessions: SessionSummary[]; // newest first
}

function ensureDir(dir: string) {
    fs.mkdirSync(dir, { recursive: true });
}

// ── Raw transcript logging ──────────────────────────────────────────────

export function logSessionEvent(sessionId: string, event: Record<string, unknown>) {
    try {
        ensureDir(SESSION_LOG_DIR);
        const line = JSON.stringify({ t: new Date().toISOString(), ...event }) + "\n";
        fs.appendFileSync(path.join(SESSION_LOG_DIR, `${sessionId}.jsonl`), line, "utf-8");
    } catch (e: any) {
        console.error("memory: failed to log event:", e?.message);
    }
}

/** Rebuild a readable "AI: ... / Student: ..." transcript from the jsonl log. */
export function readSessionTranscript(sessionId: string): string {
    const file = path.join(SESSION_LOG_DIR, `${sessionId}.jsonl`);
    if (!fs.existsSync(file)) return "";
    const lines = fs.readFileSync(file, "utf-8").split("\n").filter(Boolean);
    const out: string[] = [];
    let aiBuffer = "";
    for (const line of lines) {
        try {
            const ev = JSON.parse(line);
            if (ev.type === "ai_transcript") {
                aiBuffer += ev.text;
            } else if (ev.type === "turn_complete") {
                if (aiBuffer.trim()) out.push(`AI: ${aiBuffer.trim()}`);
                aiBuffer = "";
            } else if (ev.type === "user_turn_end") {
                // Input transcription is off; we log only that the student
                // took a turn (not the words). This is enough for the memory
                // summarizer to infer engagement and pace from the AI side.
                if (aiBuffer.trim()) { out.push(`AI: ${aiBuffer.trim()}`); aiBuffer = ""; }
                out.push("Student: [spoke]");
            }
        } catch { /* skip malformed line */ }
    }
    if (aiBuffer.trim()) out.push(`AI: ${aiBuffer.trim()}`);
    return out.join("\n");
}

// ── Student memory (summaries) ──────────────────────────────────────────

export function loadStudentMemory(studentId: string): StudentMemory | null {
    const file = path.join(MEMORY_DIR, `${studentId}.json`);
    if (!fs.existsSync(file)) return null;
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    } catch {
        return null;
    }
}

export function saveSessionSummary(studentId: string, summary: SessionSummary) {
    ensureDir(MEMORY_DIR);
    const existing = loadStudentMemory(studentId) || {
        student_id: studentId,
        personal_facts: [],
        sessions: [],
    };
    existing.sessions.unshift(summary);
    existing.sessions = existing.sessions.slice(0, MAX_STORED_SESSIONS);
    // merge + dedupe personal facts
    const facts = new Set(existing.personal_facts);
    for (const f of summary.personal_facts || []) {
        if (f && typeof f === "string") facts.add(f.trim());
    }
    existing.personal_facts = [...facts].slice(0, 40);
    fs.writeFileSync(
        path.join(MEMORY_DIR, `${studentId}.json`),
        JSON.stringify(existing, null, 2),
        "utf-8"
    );
    console.log(`🧠 Memory saved for ${studentId} (${existing.sessions.length} sessions on record)`);
}

/** Short Arabic recap block injected into the next session's prompt. */
export function buildMemoryRecap(studentId: string): string {
    const mem = loadStudentMemory(studentId);
    if (!mem || mem.sessions.length === 0) return "";
    const last = mem.sessions[0];
    const parts: string[] = ["## WHAT YOU REMEMBER ABOUT THIS STUDENT"];
    if (mem.personal_facts.length > 0) {
        parts.push(`Personal facts (use ONE naturally to reconnect, don't list them): ${mem.personal_facts.join(" | ")}`);
    }
    parts.push(`Last session (${last.date.slice(0, 10)}): ${last.summary}`);
    if (last.words_struggled?.length) {
        parts.push(`Struggled with: ${last.words_struggled.join(", ")} — weave ONE of these back in for review.`);
    }
    if (last.cliffhanger_seed) {
        parts.push(`Opening hook you planned: ${last.cliffhanger_seed}`);
    }
    if (last.recommended_next_focus) {
        parts.push(`Focus today: ${last.recommended_next_focus}`);
    }
    return parts.join("\n");
}

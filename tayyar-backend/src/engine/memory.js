"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logSessionEvent = logSessionEvent;
exports.readSessionTranscript = readSessionTranscript;
exports.loadStudentMemory = loadStudentMemory;
exports.saveSessionSummary = saveSessionSummary;
exports.buildMemoryRecap = buildMemoryRecap;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ROOT = path.join(__dirname, "..", "..");
const SESSION_LOG_DIR = path.join(ROOT, "logs", "sessions");
const MEMORY_DIR = path.join(ROOT, "data", "memory");
const MAX_STORED_SESSIONS = 20;
function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}
// ── Raw transcript logging ──────────────────────────────────────────────
function logSessionEvent(sessionId, event) {
    try {
        ensureDir(SESSION_LOG_DIR);
        const line = JSON.stringify({ t: new Date().toISOString(), ...event }) + "\n";
        fs.appendFileSync(path.join(SESSION_LOG_DIR, `${sessionId}.jsonl`), line, "utf-8");
    }
    catch (e) {
        console.error("memory: failed to log event:", e?.message);
    }
}
/** Rebuild a readable "AI: ... / Student: ..." transcript from the jsonl log. */
function readSessionTranscript(sessionId) {
    const file = path.join(SESSION_LOG_DIR, `${sessionId}.jsonl`);
    if (!fs.existsSync(file))
        return "";
    const lines = fs.readFileSync(file, "utf-8").split("\n").filter(Boolean);
    const out = [];
    let aiBuffer = "";
    for (const line of lines) {
        try {
            const ev = JSON.parse(line);
            if (ev.type === "ai_transcript") {
                aiBuffer += ev.text;
            }
            else if (ev.type === "turn_complete") {
                if (aiBuffer.trim())
                    out.push(`AI: ${aiBuffer.trim()}`);
                aiBuffer = "";
            }
            else if (ev.type === "user_turn_end") {
                // Input transcription is off; we log only that the student
                // took a turn (not the words). This is enough for the memory
                // summarizer to infer engagement and pace from the AI side.
                if (aiBuffer.trim()) {
                    out.push(`AI: ${aiBuffer.trim()}`);
                    aiBuffer = "";
                }
                out.push("Student: [spoke]");
            }
        }
        catch { /* skip malformed line */ }
    }
    if (aiBuffer.trim())
        out.push(`AI: ${aiBuffer.trim()}`);
    return out.join("\n");
}
// ── Student memory (summaries) ──────────────────────────────────────────
function loadStudentMemory(studentId) {
    const file = path.join(MEMORY_DIR, `${studentId}.json`);
    if (!fs.existsSync(file))
        return null;
    try {
        return JSON.parse(fs.readFileSync(file, "utf-8"));
    }
    catch {
        return null;
    }
}
function saveSessionSummary(studentId, summary) {
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
        if (f && typeof f === "string")
            facts.add(f.trim());
    }
    existing.personal_facts = [...facts].slice(0, 40);
    fs.writeFileSync(path.join(MEMORY_DIR, `${studentId}.json`), JSON.stringify(existing, null, 2), "utf-8");
    console.log(`🧠 Memory saved for ${studentId} (${existing.sessions.length} sessions on record)`);
}
/** Short Arabic recap block injected into the next session's prompt. */
function buildMemoryRecap(studentId) {
    const mem = loadStudentMemory(studentId);
    if (!mem || mem.sessions.length === 0)
        return "";
    const last = mem.sessions[0];
    const parts = ["## WHAT YOU REMEMBER ABOUT THIS STUDENT"];
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
//# sourceMappingURL=memory.js.map
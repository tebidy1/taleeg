"use strict";
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
exports.setupSessionsWebSocket = setupSessionsWebSocket;
const express_1 = require("express");
const ws_1 = require("ws");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const router = (0, express_1.Router)();
const activeSessions = new Map();
const prompt_builder_1 = require("../engine/prompt_builder");
const mockData_1 = require("../engine/mockData");
router.post('/start', async (req, res) => {
    const { studentId } = req.body;
    const sessionId = "sess_" + Math.random().toString(36).substr(2, 9);
    res.json({ sessionId, studentId });
});
router.post('/:sessionId/help-press', async (req, res) => {
    const { sessionId } = req.params;
    const { pressCount } = req.body;
    const geminiSession = activeSessions.get(sessionId);
    if (!geminiSession) {
        return res.status(404).json({ error: 'Session not found or not active' });
    }
    let instruction = "";
    if (pressCount === 1) {
        instruction = "The student pressed the HELP button (1st time). Give them a gentle hint starting with 'تحب أساعدك؟ جرّب: [first 2 words]'.";
    }
    else if (pressCount === 2) {
        instruction = "The student pressed the HELP button (2nd time). Give them the full answer: 'الجواب: [full answer]. كرّر معي:'";
    }
    else {
        instruction = "The student pressed the HELP button (3rd time). Say: 'ما عليك! ننتقل لسؤال أسهل.' and skip to the next exchange.";
    }
    try {
        geminiSession.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: `SYSTEM DIRECTIVE: ${instruction}` }] }],
            turnComplete: true
        });
        res.json({ success: true });
    }
    catch (e) {
        res.status(500).json({ error: 'Failed to send instruction to Gemini' });
    }
});
router.get('/:sessionId/mode', async (req, res) => {
    const { sessionId } = req.params;
    const student = (0, mockData_1.getMockStudent)(); // مستقبلاً: من Supabase
    let mode;
    let reason;
    if (student.total_sessions < 3) {
        mode = 'beginner';
        reason = `New student (${student.total_sessions} sessions)`;
    }
    else if (student.total_sessions >= 10) {
        mode = 'advanced';
        reason = `Experienced student (${student.total_sessions} sessions)`;
    }
    else {
        mode = 'standard';
        reason = `Regular student (${student.total_sessions} sessions)`;
    }
    res.json({ mode, reason });
});
function setupSessionsWebSocket(wss) {
    wss.on('connection', async (ws, req) => {
        console.log(`✅ New WS connection: ${req.url}`);
        const builder = new prompt_builder_1.PromptBuilder();
        const context = {
            student: (0, mockData_1.getMockStudent)(),
            mission: (0, mockData_1.getMockMission)(),
            sessionStartTime: new Date()
        };
        const systemPrompt = builder.buildSessionPrompt(context);
        console.log(`📝 Prompt ready (${systemPrompt.length} chars)`);
        let geminiSession = null;
        let currentSessionId = null;
        try {
            const { createGeminiSession } = await import('../services/gemini');
            geminiSession = await createGeminiSession(systemPrompt, {
                onOpen: () => {
                    console.log("🟢 Gemini Live session OPEN");
                    if (ws.readyState === ws_1.WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'status', status: 'connected' }));
                    }
                },
                onMessage: (message) => {
                    if (ws.readyState !== ws_1.WebSocket.OPEN)
                        return;
                    try {
                        const sc = message.serverContent;
                        if (!sc)
                            return;
                        if (sc.interrupted) {
                            ws.send(JSON.stringify({ type: 'interrupted' }));
                            return;
                        }
                        // Audio chunks from the model
                        if (sc.modelTurn?.parts) {
                            for (const part of sc.modelTurn.parts) {
                                if (part.inlineData?.data) {
                                    ws.send(JSON.stringify({
                                        type: 'audio',
                                        data: part.inlineData.data
                                    }));
                                }
                            }
                        }
                        // Streaming AI transcript chunk (accumulate on frontend)
                        if (sc.outputTranscription?.text) {
                            console.log(`🤖 AI chunk: "${sc.outputTranscription.text}"`);
                            ws.send(JSON.stringify({
                                type: 'transcript',
                                speaker: 'ai',
                                text: sc.outputTranscription.text
                            }));
                        }
                        // User's speech — arrives as a complete utterance
                        if (sc.inputTranscription?.text) {
                            console.log(`🎤 User said: "${sc.inputTranscription.text}"`);
                            ws.send(JSON.stringify({
                                type: 'transcript',
                                speaker: 'user',
                                text: sc.inputTranscription.text
                            }));
                        }
                        // AI turn complete — tell frontend to finalize the bubble
                        if (sc.turnComplete) {
                            console.log('✅ AI turn complete');
                            ws.send(JSON.stringify({ type: 'turn_complete' }));
                        }
                    }
                    catch (e) {
                        console.error("Error processing Gemini message:", e);
                    }
                },
                onError: (e) => {
                    console.error("🔴 Gemini error:", e?.message || e);
                    if (ws.readyState === ws_1.WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Gemini connection error' }));
                    }
                },
                onClose: (e) => {
                    console.log("🔴 Gemini closed:", e?.code, e?.reason);
                    if (ws.readyState === ws_1.WebSocket.OPEN) {
                        ws.close();
                    }
                }
            });
            console.log("🟢 Gemini session created — waiting for audio");
            // 🔥 START TRIGGER — session is already open after await, 300ms is safety only
            setTimeout(() => {
                if (geminiSession && ws.readyState === ws_1.WebSocket.OPEN) {
                    geminiSession.sendClientContent({
                        turns: [{
                                role: 'user',
                                parts: [{ text: "SESSION_START: The student has connected and is ready. Begin the Ice Breaker phase NOW. Greet the student warmly — start in Arabic first for safety, then English. Do NOT wait for the student to speak first. You must initiate." }]
                            }],
                        turnComplete: true
                    });
                    console.log("🚀 START trigger sent to Gemini (300ms after open)");
                }
            }, 300);
        }
        catch (e) {
            console.error("❌ Gemini connect failed:", e?.message || e);
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: `Gemini failed: ${e?.message || 'unknown'}`
                }));
            }
        }
        // Handle messages from frontend
        ws.on('message', (data) => {
            try {
                const msgStr = data.toString('utf-8');
                const parsed = JSON.parse(msgStr);
                if (parsed.type === 'start_session') {
                    console.log('📩 Session start:', parsed.studentId, parsed.sessionId);
                    if (parsed.sessionId) {
                        currentSessionId = parsed.sessionId;
                        activeSessions.set(currentSessionId, geminiSession);
                    }
                    return;
                }
                if (parsed.type === 'audio' && parsed.data && geminiSession) {
                    geminiSession.sendRealtimeInput({
                        audio: {
                            mimeType: parsed.mimeType || 'audio/pcm;rate=16000',
                            data: parsed.data // base64 PCM data
                        }
                    });
                    return;
                }
            }
            catch {
                // Not JSON — raw binary audio from frontend
                if (geminiSession && data.length > 0) {
                    const base64Audio = data.toString('base64');
                    geminiSession.sendRealtimeInput({
                        audio: {
                            mimeType: 'audio/pcm;rate=16000',
                            data: base64Audio
                        }
                    });
                }
            }
        });
        ws.on('close', () => {
            console.log("🔌 Client disconnected");
            if (currentSessionId) {
                activeSessions.delete(currentSessionId);
            }
            if (geminiSession) {
                try {
                    geminiSession.close();
                }
                catch { }
            }
        });
        ws.on('error', (e) => {
            console.error("WS error:", e.message);
        });
    });
}
exports.default = router;
//# sourceMappingURL=sessions.js.map
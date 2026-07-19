"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSessionsWebSocket = setupSessionsWebSocket;
const express_1 = require("express");
const ws_1 = require("ws");
const router = (0, express_1.Router)();
const activeSessions = new Map();
const prompt_builder_1 = require("../engine/prompt_builder");
const orchestrator_1 = require("../engine/orchestrator");
const mockData_1 = require("../engine/mockData");
const memory_1 = require("../engine/memory");
// List the free-trial missions (for the picker / testing)
router.get('/missions', async (_req, res) => {
    res.json({ missions: (0, mockData_1.listMissions)() });
});
router.post('/start', async (req, res) => {
    const { studentId } = req.body;
    const sessionId = "sess_" + Math.random().toString(36).substr(2, 9);
    res.json({ sessionId, studentId });
});
router.post('/:sessionId/help-press', async (req, res) => {
    const { sessionId } = req.params;
    const { pressCount } = req.body;
    const entry = activeSessions.get(sessionId);
    if (!entry) {
        return res.status(404).json({ error: 'Session not found or not active' });
    }
    entry.orchestrator.noteHelpPress(pressCount);
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
        // Route through the maestro (not a raw sendClientContent): it closes any
        // open mic activity first, so pressing HELP mid-turn can't drop the Live
        // connection the way a bare content injection would.
        entry.orchestrator.injectHelp(instruction);
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
        // URL: /ws/sessions/{id}/live?mission={missionId}
        const [pathPart, queryPart] = (req.url || '').split('?');
        const urlSessionId = pathPart.split('/').filter(Boolean)[2] || `sess_${Date.now()}`;
        const qp = new URLSearchParams(queryPart || '');
        const missionId = qp.get('mission') || undefined;
        const studentName = qp.get('name') || '';
        const motivation = qp.get('motivation') || '';
        const builder = new prompt_builder_1.PromptBuilder();
        const student = (0, mockData_1.getMockStudent)();
        // Override mock values with actual student profile data from the frontend
        if (studentName) {
            student.name = studentName;
            // Generate a safe, unique ID based on the name so we don't load Faisal's memory
            const safeName = studentName.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_');
            student.id = `student_${safeName}`;
        }
        if (motivation)
            student.engagement_profile.motivation_type = motivation;
        const mission = (0, mockData_1.getMockMission)(missionId);
        console.log(`🎯 Mission: ${mission.id} (${mission.title_ar})`);
        const context = { student, mission, sessionStartTime: new Date() };
        const systemPrompt = builder.buildCorePrompt(context);
        console.log(`📝 Core prompt ready (${systemPrompt.length} chars — was ~26K monolith)`);
        let geminiSession = null;
        let orchestrator = null;
        let currentSessionId = urlSessionId;
        // Two-level mic state:
        //   micOpen     — the CLIENT intends a turn (activity_start..activity_end).
        //   activityLive — an activityStart has actually been forwarded to Gemini,
        //                  i.e. real audio is flowing. This is the wire-critical
        //                  state: a client-content injection is only unsafe while
        //                  THIS is open, and activityEnd is only valid after it.
        // We defer activityStart to Gemini until the first audio frame, so a turn
        // where the child never makes a sound (or the pane has no mic) never
        // creates an empty activityStart/activityEnd pair — that pairing fails
        // Gemini's precondition check and drops the session (code 1007).
        let micOpen = false;
        let activityLive = false;
        // Forward one audio frame, opening the Gemini activity lazily on the first
        // frame of a turn.
        const forwardAudio = (b64, mimeType = 'audio/pcm;rate=16000') => {
            if (!micOpen || !geminiSession)
                return;
            if (!activityLive) {
                activityLive = true;
                try {
                    geminiSession.sendRealtimeInput({ activityStart: {} });
                }
                catch { }
                orchestrator?.noteMicOpen();
            }
            try {
                geminiSession.sendRealtimeInput({ audio: { mimeType, data: b64 } });
            }
            catch { }
        };
        // Close the Gemini activity if (and only if) one is actually open. Safe to
        // call redundantly.
        const endActivity = () => {
            if (!activityLive)
                return;
            activityLive = false;
            if (geminiSession) {
                try {
                    geminiSession.sendRealtimeInput({ activityEnd: {} });
                }
                catch { }
            }
            orchestrator?.noteMicClosed();
        };
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
                        // Model explicitly signaled it's done talking (yield_turn tool call).
                        // This is far more reliable than trusting the model to stop on its own
                        // when it reads a "[WAIT]" marker in the script text.
                        if (message.toolCall?.functionCalls) {
                            for (const call of message.toolCall.functionCalls) {
                                if (call.name === 'yield_turn' || call.name === 'conclude_mission') {
                                    if (call.name === 'conclude_mission') {
                                        console.log('🏁 conclude_mission called — ending session now (content-driven, not clock-driven)');
                                        orchestrator?.noteConcludeMission();
                                    }
                                    else {
                                        console.log('🛑 yield_turn called — model is ending its turn');
                                    }
                                    // SILENT + non-blocking: acknowledge without feeding anything
                                    // back into the conversation, so the ack itself can't prompt
                                    // the model to keep talking. The real turn_complete signal to
                                    // the frontend still comes from serverContent.turnComplete below.
                                    geminiSession.sendToolResponse({
                                        functionResponses: {
                                            id: call.id,
                                            name: call.name,
                                            response: {},
                                            scheduling: 'SILENT'
                                        }
                                    });
                                }
                            }
                        }
                        const sc = message.serverContent;
                        if (!sc)
                            return;
                        if (sc.interrupted) {
                            orchestrator?.noteInterrupted();
                            ws.send(JSON.stringify({ type: 'interrupted' }));
                            return;
                        }
                        // Audio chunks from the model
                        if (sc.modelTurn?.parts) {
                            for (const part of sc.modelTurn.parts) {
                                if (part.inlineData?.data) {
                                    orchestrator?.noteAudioChunk();
                                    ws.send(JSON.stringify({
                                        type: 'audio',
                                        data: part.inlineData.data
                                    }));
                                }
                            }
                        }
                        // Streaming AI transcript chunk (accumulate on frontend)
                        if (sc.outputTranscription?.text) {
                            orchestrator?.noteAiTranscript(sc.outputTranscription.text);
                            ws.send(JSON.stringify({
                                type: 'transcript',
                                speaker: 'ai',
                                text: sc.outputTranscription.text
                            }));
                        }
                        // User transcript intentionally NOT handled: input
                        // transcription is disabled at the API config, so no
                        // student text arrives on the wire and no wrong words
                        // hit the UI.
                        // AI turn complete — tell frontend to finalize the bubble
                        if (sc.turnComplete) {
                            console.log('✅ AI turn complete');
                            orchestrator?.noteTurnComplete();
                            ws.send(JSON.stringify({ type: 'turn_complete' }));
                        }
                    }
                    catch (e) {
                        console.error("Error processing Gemini message:", e);
                    }
                },
                onError: (e) => {
                    console.error("🔴 Gemini error:", e?.message || e);
                    // Persist to the session log — onError/onClose were console-only,
                    // so post-mortems couldn't see WHY a session dropped (the logs
                    // just stopped). Now the jsonl carries the actual cause.
                    (0, memory_1.logSessionEvent)(currentSessionId, { type: 'gemini_error', message: e?.message || String(e) });
                    if (ws.readyState === ws_1.WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Gemini connection error' }));
                    }
                },
                onClose: (e) => {
                    console.log("🔴 Gemini closed:", e?.code, e?.reason);
                    (0, memory_1.logSessionEvent)(currentSessionId, { type: 'gemini_close', code: e?.code, reason: e?.reason });
                    if (ws.readyState === ws_1.WebSocket.OPEN) {
                        ws.close();
                    }
                }
            });
            console.log("🟢 Gemini session created — waiting for audio");
            // 🎼 The maestro: real clock + phase state + live directives
            orchestrator = new orchestrator_1.SessionOrchestrator({
                sessionId: currentSessionId,
                ws,
                geminiSession,
                student,
                mission,
                promptBuilder: builder,
                onForceEnd: (reason) => {
                    console.log(`⏰ Orchestrator force-ending session (${reason})`);
                    try {
                        geminiSession?.close();
                    }
                    catch { }
                    try {
                        ws.close();
                    }
                    catch { }
                },
                // Maestro is about to take the floor — close the child's open
                // audio turn cleanly on the wire first (only if one is actually
                // live), and tell the client to drop its mic so it stops
                // streaming into a just-closed turn.
                closeMicActivity: () => {
                    micOpen = false;
                    endActivity(); // no-op unless an activity is actually live
                    if (ws.readyState === ws_1.WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'mic_close' }));
                    }
                }
            });
            orchestrator.start();
            activeSessions.set(currentSessionId, { gemini: geminiSession, orchestrator });
            // 🔥 START TRIGGER — session is open after await, send immediately
            if (geminiSession && ws.readyState === ws_1.WebSocket.OPEN) {
                const motivationHint = motivation === 'gaming' ? "They love video games and want to talk to international players online."
                    : motivation === 'travel' ? "They dream of travelling and talking to people in airports and hotels."
                        : motivation === 'school' ? "They want to excel at English in school and impress their teachers."
                            : '';
                const memoryRecap = (0, memory_1.buildMemoryRecap)(student.id);
                const nameLine = studentName ? ` The student's name is ${studentName} — use it naturally when greeting them.` : '';
                const motivationLine = motivationHint ? ` ${motivationHint} Weave a subtle reference to this into your opening hook to make them feel seen.` : '';
                const memoryBlock = memoryRecap
                    ? `\n\n${memoryRecap}\n\nOpen with the hook you planned above — make the student feel remembered and that the story continues.`
                    : '';
                geminiSession.sendClientContent({
                    turns: [{
                            role: 'user',
                            parts: [{ text: `SESSION_START: The student has connected and is ready. Begin the opening NOW. Greet the student warmly — start in Arabic first for safety, then English. Do NOT wait for the student to speak first. You must initiate.${nameLine}${motivationLine}${memoryBlock}` }]
                        }],
                    turnComplete: true
                });
                console.log(`🚀 START trigger sent to Gemini${memoryRecap ? ' (with memory recap)' : ' (first session)'}`);
            }
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
                    if (parsed.sessionId && parsed.sessionId !== currentSessionId) {
                        // frontend used a different id than the URL — re-key the registry
                        const entry = activeSessions.get(currentSessionId);
                        activeSessions.delete(currentSessionId);
                        currentSessionId = parsed.sessionId;
                        if (entry)
                            activeSessions.set(currentSessionId, entry);
                    }
                    return;
                }
                if (parsed.type === 'audio' && parsed.data) {
                    // Only forward audio while the child's turn is open; the first
                    // frame lazily opens the Gemini activity (see forwardAudio).
                    forwardAudio(parsed.data, parsed.mimeType);
                    return;
                }
                // Manual VAD signals from the client (server-side VAD is disabled
                // so the captain can't be interrupted). The frontend fires these
                // when the student taps the mic to start/stop their turn.
                if (parsed.type === 'activity_start') {
                    // Mark intent only. The activityStart is forwarded to Gemini
                    // lazily on the first audio frame, so a silent turn never
                    // opens (and then has to close) an empty activity.
                    micOpen = true;
                    return;
                }
                if (parsed.type === 'activity_end') {
                    micOpen = false;
                    endActivity(); // no-op if nothing was ever streamed
                    // Only a genuine end-of-utterance (client silence-VAD) is a
                    // completed student turn. A 'captain-speaks' close just gates
                    // the mic shut so the captain can't be interrupted; counting
                    // it as a turn inflated completedExchanges and fired a phantom
                    // ✓/turn_feedback during pure narration.
                    if (parsed.reason !== 'captain-speaks')
                        orchestrator?.noteUserTurnEnd();
                    return;
                }
                // Pause / Resume — freezes the maestro's wall clock so the
                // hard cap and phase progression don't advance during a break.
                if (parsed.type === 'pause') {
                    orchestrator?.notePause();
                    return;
                }
                if (parsed.type === 'resume') {
                    orchestrator?.noteResume();
                    return;
                }
            }
            catch {
                // Not JSON — raw binary audio from frontend. Same lazy-open path
                // as the JSON audio branch.
                if (data.length > 0)
                    forwardAudio(data.toString('base64'));
            }
        });
        ws.on('close', () => {
            console.log("🔌 Client disconnected");
            activeSessions.delete(currentSessionId);
            // guaranteed cleanup — no leaked Gemini connections billing us
            try {
                geminiSession?.close();
            }
            catch { }
            if (orchestrator) {
                orchestrator.dispose();
                // fire-and-forget: summarize transcript → student memory file
                orchestrator.finalize().catch(e => console.error("memory finalize failed:", e?.message || e));
            }
        });
        ws.on('error', (e) => {
            console.error("WS error:", e.message);
        });
    });
}
exports.default = router;
//# sourceMappingURL=sessions.js.map
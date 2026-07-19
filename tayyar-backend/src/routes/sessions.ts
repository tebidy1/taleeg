import { Router } from 'express';
import { WebSocketServer, WebSocket } from 'ws';

const router = Router();

interface ActiveSession {
    gemini: any;
    orchestrator: SessionOrchestrator;
}
const activeSessions = new Map<string, ActiveSession>();

import { PromptBuilder } from '../engine/prompt_builder';
import { SessionOrchestrator } from '../engine/orchestrator';
import { getMockStudent, getMockMission, listMissions } from '../engine/mockData';

// List the free-trial missions (for the picker / testing)
router.get('/missions', async (_req, res) => {
    res.json({ missions: listMissions() });
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
    } else if (pressCount === 2) {
        instruction = "The student pressed the HELP button (2nd time). Give them the full answer: 'الجواب: [full answer]. كرّر معي:'";
    } else {
        instruction = "The student pressed the HELP button (3rd time). Say: 'ما عليك! ننتقل لسؤال أسهل.' and skip to the next exchange.";
    }

    try {
        entry.gemini.sendClientContent({
            turns: [{ role: 'user', parts: [{ text: `SYSTEM DIRECTIVE: ${instruction}` }] }],
            turnComplete: true
        });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: 'Failed to send instruction to Gemini' });
    }
});

router.get('/:sessionId/mode', async (req, res) => {
    const { sessionId } = req.params;
    const student = getMockStudent(); // مستقبلاً: من Supabase
    
    let mode: 'beginner' | 'standard' | 'advanced';
    let reason: string;
    
    if (student.total_sessions < 3) {
        mode = 'beginner';
        reason = `New student (${student.total_sessions} sessions)`;
    } else if (student.total_sessions >= 10) {
        mode = 'advanced';
        reason = `Experienced student (${student.total_sessions} sessions)`;
    } else {
        mode = 'standard';
        reason = `Regular student (${student.total_sessions} sessions)`;
    }
    
    res.json({ mode, reason });
});

export function setupSessionsWebSocket(wss: WebSocketServer) {
    wss.on('connection', async (ws: WebSocket, req) => {
        console.log(`✅ New WS connection: ${req.url}`);

        // URL: /ws/sessions/{id}/live?mission={missionId}
        const [pathPart, queryPart] = (req.url || '').split('?');
        const urlSessionId = pathPart.split('/').filter(Boolean)[2] || `sess_${Date.now()}`;
        const missionId = new URLSearchParams(queryPart || '').get('mission') || undefined;

        const builder = new PromptBuilder();
        const student = getMockStudent();
        const mission = getMockMission(missionId);
        console.log(`🎯 Mission: ${mission.id} (${mission.title_ar})`);
        const context = { student, mission, sessionStartTime: new Date() };
        const systemPrompt = builder.buildCorePrompt(context);
        console.log(`📝 Core prompt ready (${systemPrompt.length} chars — was ~26K monolith)`);

        let geminiSession: any = null;
        let orchestrator: SessionOrchestrator | null = null;
        let currentSessionId: string = urlSessionId;

        try {
            const { createGeminiSession } = await import('../services/gemini');
            
            geminiSession = await createGeminiSession(systemPrompt, {
                onOpen: () => {
                    console.log("🟢 Gemini Live session OPEN");
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'status', status: 'connected' }));
                    }
                },
                onMessage: (message: any) => {
                    if (ws.readyState !== WebSocket.OPEN) return;
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
                                    } else {
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
                        if (!sc) return;

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
                    } catch (e) {
                        console.error("Error processing Gemini message:", e);
                    }
                },
                onError: (e: any) => {
                    console.error("🔴 Gemini error:", e?.message || e);
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ type: 'error', message: 'Gemini connection error' }));
                    }
                },
                onClose: (e: any) => {
                    console.log("🔴 Gemini closed:", e?.code, e?.reason);
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.close();
                    }
                }
            });
            
            console.log("🟢 Gemini session created — waiting for audio");

            // 🎼 The maestro: real clock + phase state + live directives
            orchestrator = new SessionOrchestrator({
                sessionId: currentSessionId,
                ws,
                geminiSession,
                student,
                mission,
                promptBuilder: builder,
                onForceEnd: (reason: string) => {
                    console.log(`⏰ Orchestrator force-ending session (${reason})`);
                    try { geminiSession?.close(); } catch {}
                    try { ws.close(); } catch {}
                }
            });
            orchestrator.start();
            activeSessions.set(currentSessionId, { gemini: geminiSession, orchestrator });

            // 🔥 START TRIGGER — session is open after await, send immediately
            if (geminiSession && ws.readyState === WebSocket.OPEN) {
                geminiSession.sendClientContent({
                    turns: [{
                        role: 'user',
                        parts: [{ text: "SESSION_START: The student has connected and is ready. Begin the opening NOW. Greet the student warmly — start in Arabic first for safety, then English. Do NOT wait for the student to speak first. You must initiate." }]
                    }],
                    turnComplete: true
                });
                console.log("🚀 START trigger sent to Gemini");
            }

        } catch (e: any) {
            console.error("❌ Gemini connect failed:", e?.message || e);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                    type: 'error', 
                    message: `Gemini failed: ${e?.message || 'unknown'}` 
                }));
            }
        }

        // Handle messages from frontend
        ws.on('message', (data: Buffer) => {
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
                        if (entry) activeSessions.set(currentSessionId, entry);
                    }
                    return;
                }
                
                if (parsed.type === 'audio' && parsed.data && geminiSession) {
                    geminiSession.sendRealtimeInput({
                        audio: {
                            mimeType: parsed.mimeType || 'audio/pcm;rate=16000',
                            data: parsed.data  // base64 PCM data
                        }
                    });
                    return;
                }

                // Manual VAD signals from the client (server-side VAD is disabled
                // so the captain can't be interrupted). The frontend fires these
                // when the student taps the mic to start/stop their turn.
                if (parsed.type === 'activity_start' && geminiSession) {
                    geminiSession.sendRealtimeInput({ activityStart: {} });
                    return;
                }
                if (parsed.type === 'activity_end' && geminiSession) {
                    geminiSession.sendRealtimeInput({ activityEnd: {} });
                    // Only a genuine end-of-utterance (client silence-VAD) is a
                    // completed student turn. A 'captain-speaks' close just gates
                    // the mic shut so the captain can't be interrupted; counting
                    // it as a turn inflated completedExchanges and fired a phantom
                    // ✓/turn_feedback during pure narration.
                    if (parsed.reason !== 'captain-speaks') orchestrator?.noteUserTurnEnd();
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
            } catch {
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
            activeSessions.delete(currentSessionId);
            // guaranteed cleanup — no leaked Gemini connections billing us
            try { geminiSession?.close(); } catch {}
            if (orchestrator) {
                orchestrator.dispose();
                // fire-and-forget: summarize transcript → student memory file
                orchestrator.finalize().catch(e =>
                    console.error("memory finalize failed:", e?.message || e)
                );
            }
        });

        ws.on('error', (e) => {
            console.error("WS error:", e.message);
        });
    });
}

export default router;

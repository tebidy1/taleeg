"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGeminiSession = createGeminiSession;
const genai_1 = require("@google/genai");
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("⚠️  GEMINI_API_KEY is missing — Live audio will not work.");
}
const ai = new genai_1.GoogleGenAI({ apiKey: apiKey || '' });
async function createGeminiSession(systemPrompt, callbacks) {
    const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
            responseModalities: [genai_1.Modality.AUDIO],
            systemInstruction: systemPrompt,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Charon' }
                }
            },
            temperature: 0.8,
            realtimeInputConfig: {
                automaticActivityDetection: {
                    startOfSpeechSensitivity: genai_1.StartSensitivity.START_SENSITIVITY_HIGH,
                    endOfSpeechSensitivity: genai_1.EndSensitivity.END_SENSITIVITY_HIGH,
                    silenceDurationMs: 800,
                    prefixPaddingMs: 200,
                }
            },
        },
        callbacks: {
            onopen: callbacks.onOpen,
            onmessage: callbacks.onMessage,
            onerror: callbacks.onError,
            onclose: callbacks.onClose
        }
    });
    return session;
}
//# sourceMappingURL=gemini.js.map
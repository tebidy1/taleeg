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
const genai_1 = require("@google/genai");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
async function main() {
    console.log("🔧 Testing correct API methods...");
    const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
            responseModalities: [genai_1.Modality.AUDIO],
            systemInstruction: "You are a friendly English teacher. Say hello in one short sentence.",
            outputAudioTranscription: {},
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Charon' }
                }
            },
            temperature: 0.8,
        },
        callbacks: {
            onopen: () => console.log("✅ OPEN"),
            onmessage: (message) => {
                const sc = message.serverContent;
                if (!sc) {
                    console.log("📩 Setup:", JSON.stringify(message).substring(0, 100));
                    return;
                }
                if (sc.outputTranscription?.text)
                    console.log(`🤖 "${sc.outputTranscription.text}"`);
                if (sc.modelTurn?.parts) {
                    for (const p of sc.modelTurn.parts) {
                        if (p.inlineData?.data)
                            console.log(`🔊 Audio: ${p.inlineData.data.length} chars`);
                    }
                }
                if (sc.turnComplete)
                    console.log("✅ Turn complete");
            },
            onerror: (e) => console.error("🔴 ERROR:", e?.message || e),
            onclose: (e) => console.log("🔴 CLOSED:", e?.code, e?.reason)
        }
    });
    console.log("Session connected. Waiting 2s...");
    await new Promise(r => setTimeout(r, 2000));
    console.log("📤 Sending via sendClientContent...");
    session.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: "Hello! Please greet me warmly." }] }],
        turnComplete: true
    });
    console.log("📤 Sent! Waiting for response...");
    await new Promise(r => setTimeout(r, 15000));
    console.log("⏰ Done.");
    session.close();
    process.exit(0);
}
main().catch(e => { console.error("FATAL:", e); process.exit(1); });
//# sourceMappingURL=test_gemini_diag.js.map
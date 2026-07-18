import { GoogleGenAI, Modality } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function main() {
    console.log("🔧 Testing correct API methods...");

    const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
            responseModalities: [Modality.AUDIO],
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
            onmessage: (message: any) => {
                const sc = message.serverContent;
                if (!sc) { console.log("📩 Setup:", JSON.stringify(message).substring(0, 100)); return; }
                if (sc.outputTranscription?.text) console.log(`🤖 "${sc.outputTranscription.text}"`);
                if (sc.modelTurn?.parts) {
                    for (const p of sc.modelTurn.parts) {
                        if (p.inlineData?.data) console.log(`🔊 Audio: ${p.inlineData.data.length} chars`);
                    }
                }
                if (sc.turnComplete) console.log("✅ Turn complete");
            },
            onerror: (e: any) => console.error("🔴 ERROR:", e?.message || e),
            onclose: (e: any) => console.log("🔴 CLOSED:", e?.code, e?.reason)
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

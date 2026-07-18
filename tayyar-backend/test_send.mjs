import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: 'C:/FASEEH/tayyar-backend/.env' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function main() {
    const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview'
    });
    console.log("Connected");
    console.log("typeof session.send:", typeof session.send);
    console.log("typeof session.sendClientContent:", typeof session.sendClientContent);
    console.log("typeof session.sendRealtimeInput:", typeof session.sendRealtimeInput);
    
    session.send({
        clientContent: {
            turns: [{ role: 'user', parts: [{ text: "Hello" }] }],
            turnComplete: true
        }
    });
    console.log("Called session.send(...) successfully");
    process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });

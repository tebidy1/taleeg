import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config({ path: 'C:/FASEEH/tayyar-backend/.env' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function main() {
    const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview'
    });
    console.log(Object.keys(session));
    const proto = Object.getPrototypeOf(session);
    console.log(Object.getOwnPropertyNames(proto));
    
    session.send({
        clientContent: {
            turns: [{ role: 'user', parts: [{ text: "Hello" }] }],
            turnComplete: true
        }
    });
    console.log("Called session.send(...) successfully");
    process.exit(0);
}
main().catch(e => console.error(e));

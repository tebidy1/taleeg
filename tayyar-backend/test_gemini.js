"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const genai_1 = require("@google/genai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: 'C:/FASEEH/tayyar-backend/.env' });
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
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
//# sourceMappingURL=test_gemini.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Simulates exactly what MissionActive.tsx does
const ws_1 = __importDefault(require("ws"));
const sessionId = 'sess_test' + Math.random().toString(36).substr(2, 5);
const url = `ws://localhost:8080/ws/sessions/${sessionId}/live`;
console.log(`🔌 Connecting to ${url}...`);
const ws = new ws_1.default(url);
ws.on('open', () => {
    console.log('✅ Connected!');
    ws.send(JSON.stringify({
        type: 'start_session',
        studentId: 'student_123',
        sessionId
    }));
});
ws.on('message', (data) => {
    try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'audio') {
            console.log(`🔊 Audio chunk: ${msg.data.length} chars`);
        }
        else if (msg.type === 'transcript') {
            console.log(`${msg.speaker === 'ai' ? '🤖' : '🎤'} ${msg.speaker}: "${msg.text}"`);
        }
        else {
            console.log(`📩 ${msg.type}:`, JSON.stringify(msg).substring(0, 100));
        }
    }
    catch (e) {
        console.log('📩 Binary/unparseable data received');
    }
});
ws.on('error', (e) => {
    console.error('🔴 WS Error:', e.message);
});
ws.on('close', (code, reason) => {
    console.log(`🔌 WS Closed: code=${code} reason=${reason?.toString()}`);
    process.exit(0);
});
// Wait 30s for AI to greet, then close
setTimeout(() => {
    console.log('⏰ Timeout — closing');
    ws.close();
    process.exit(0);
}, 30000);
//# sourceMappingURL=test_ws_e2e.js.map
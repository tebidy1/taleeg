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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http = __importStar(require("http"));
const dotenv = __importStar(require("dotenv"));
const ws_1 = require("ws");
const sessions_1 = __importStar(require("./routes/sessions"));
const students_1 = __importDefault(require("./routes/students"));
const missions_1 = __importDefault(require("./routes/missions"));
dotenv.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// REST routes
app.use('/api/sessions', sessions_1.default);
app.use('/api/students', students_1.default);
app.use('/api/missions', missions_1.default);
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', model: 'gemini-3.1-flash-live-preview', timestamp: new Date().toISOString() });
});
const server = http.createServer(app);
// Single WebSocket server for all live sessions
const wss = new ws_1.WebSocketServer({ server });
(0, sessions_1.setupSessionsWebSocket)(wss);
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket ready at ws://localhost:${PORT}/ws/sessions`);
    console.log(`🔑 Gemini key: ${process.env.GEMINI_API_KEY ? '✅ Found' : '❌ MISSING'}`);
});
//# sourceMappingURL=index.js.map
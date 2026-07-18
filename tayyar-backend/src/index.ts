import express from 'express';
import cors from 'cors';
import * as http from 'http';
import * as dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import sessionsRouter, { setupSessionsWebSocket } from './routes/sessions';
import studentsRouter from './routes/students';
import missionsRouter from './routes/missions';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// REST routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/students', studentsRouter);
app.use('/api/missions', missionsRouter);

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', model: 'gemini-3.1-flash-live-preview', timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

// Single WebSocket server for all live sessions
const wss = new WebSocketServer({ server });
setupSessionsWebSocket(wss);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Backend running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket ready at ws://localhost:${PORT}/ws/sessions`);
    console.log(`🔑 Gemini key: ${process.env.GEMINI_API_KEY ? '✅ Found' : '❌ MISSING'}`);
});

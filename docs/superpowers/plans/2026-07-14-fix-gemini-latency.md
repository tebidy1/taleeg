# Fix Gemini Live Latency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce AI tutor response latency from up to 30 seconds to 1-3 seconds via four surgical changes — no new files, no refactoring.

**Architecture:** Two backend files (`gemini.ts`, `sessions.ts`, `index.ts`) and one frontend file (`MissionActive.tsx`). Each task is independent and testable on its own.

**Tech Stack:** Node.js + TypeScript, `@google/genai` v2.11.0, React 19, Web Audio API (`ScriptProcessorNode`)

---

## File Map

| File | Change | Expected Saving |
|------|--------|-----------------|
| `tayyar-backend/src/routes/sessions.ts` | Change `3000` → `300` in setTimeout | **−2.7s** on every first response |
| `tayyar-backend/src/services/gemini.ts` | Add `realtimeInputConfig` (VAD settings) | **−1 to −3s** per student turn |
| `tayyar-frontend/src/screens/Mission/MissionActive.tsx` | Lower silence threshold `0.005` → `0.002` | Fixes intermittent no-response |
| `tayyar-backend/src/index.ts` | Sync health endpoint model name | No latency impact — accuracy fix |

---

## Task 1: Reduce SESSION_START delay from 3s to 300ms

**Files:**
- Modify: `tayyar-backend/src/routes/sessions.ts:165`

**Root cause:** `setTimeout(..., 3000)` fires 3 seconds after `await ai.live.connect()` resolves. Since `await` already waits for the session to be open, this 3-second gap is wasted. 300ms is a sufficient safety buffer.

- [ ] **Step 1: Make the change**

In `tayyar-backend/src/routes/sessions.ts`, find this exact block (around line 163):
```typescript
    // 🔥 START TRIGGER — اجعل Gemini يبدأ الحوار تلقائياً
    setTimeout(() => {
        if (geminiSession && ws.readyState === WebSocket.OPEN) {
            geminiSession.sendClientContent({
                turns: [{ 
                    role: 'user', 
                    parts: [{ text: "SESSION_START: The student has connected and is ready. Begin the Ice Breaker phase NOW. Greet the student warmly — start in Arabic first for safety, then English. Do NOT wait for the student to speak first. You must initiate." }] 
                }],
                turnComplete: true
            });
            console.log("🚀 START trigger sent to Gemini");
        }
    }, 3000);
```

Replace **only** the `3000` with `300` and update the log:
```typescript
    // 🔥 START TRIGGER — session is already open after await, 300ms is safety only
    setTimeout(() => {
        if (geminiSession && ws.readyState === WebSocket.OPEN) {
            geminiSession.sendClientContent({
                turns: [{ 
                    role: 'user', 
                    parts: [{ text: "SESSION_START: The student has connected and is ready. Begin the Ice Breaker phase NOW. Greet the student warmly — start in Arabic first for safety, then English. Do NOT wait for the student to speak first. You must initiate." }] 
                }],
                turnComplete: true
            });
            console.log("🚀 START trigger sent to Gemini (300ms after open)");
        }
    }, 300);
```

- [ ] **Step 2: Verify**

Start the backend (`npm run dev` in `tayyar-backend/`), open the frontend, connect. Watch backend console for:
```
🟢 Gemini Live session OPEN
🟢 Gemini session created — waiting for audio
🚀 START trigger sent to Gemini (300ms after open)
```
Time from browser page load to first AI audio: should now be **3-6 seconds** instead of 6-20 seconds.

- [ ] **Step 3: Commit**
```bash
git add tayyar-backend/src/routes/sessions.ts
git commit -m "perf: reduce SESSION_START delay from 3000ms to 300ms

The await ai.live.connect() already waits for the session to be open.
The previous 3s delay was redundant, adding 2.7s to every first response."
```

---

## Task 2: Configure Gemini VAD (saves 1-3s per student turn)

**Files:**
- Modify: `tayyar-backend/src/services/gemini.ts`

**Root cause:** No `realtimeInputConfig` means Gemini uses its default `silenceDurationMs` (estimated 1500-3000ms). This is the time Gemini waits after the student stops speaking before generating a response. Setting it to 800ms cuts this wait by 700-2200ms on every single student turn.

- [ ] **Step 1: Add imports for EndSensitivity and StartSensitivity**

In `tayyar-backend/src/services/gemini.ts`, change line 1:
```typescript
// Before:
import { GoogleGenAI, Modality } from '@google/genai';

// After:
import { GoogleGenAI, Modality, EndSensitivity, StartSensitivity } from '@google/genai';
```

- [ ] **Step 2: Add realtimeInputConfig inside the session config**

In the same file, find the `config` block inside `ai.live.connect(...)`. It currently ends with `temperature: 0.8,`. Add `realtimeInputConfig` after it:

```typescript
// Before — config block ends at:
        config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: systemPrompt,
            outputAudioTranscription: {},
            inputAudioTranscription: {},
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Charon' }
                }
            },
            temperature: 0.8,
        },

// After:
        config: {
            responseModalities: [Modality.AUDIO],
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
                    startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
                    endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
                    silenceDurationMs: 800,
                    prefixPaddingMs: 200,
                }
            },
        },
```

**Why these values:**
- `silenceDurationMs: 800` — triggers response 800ms after student stops speaking (down from default ~1500-3000ms)
- `prefixPaddingMs: 200` — requires 200ms of speech before start-of-speech is committed (reduces false triggers from mouth sounds)
- `END_SENSITIVITY_HIGH` — more aggressively detects silence, further reducing wait time
- `START_SENSITIVITY_HIGH` — detects quiet voices (important for children and mobile mics)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd tayyar-backend
npx tsc --noEmit
```
Expected: no errors. If you get `EndSensitivity not exported`, check that `@google/genai` is v2.11.0+ (`cat node_modules/@google/genai/package.json | grep version`).

- [ ] **Step 4: Verify at runtime**

Restart the backend, open a session. Speak a sentence (3-5 words), then stop. The AI should start responding within **~1 second** of you finishing (instead of 2-4 seconds before this fix).

- [ ] **Step 5: Commit**
```bash
git add tayyar-backend/src/services/gemini.ts
git commit -m "perf: configure Gemini VAD with 800ms silence detection

Default silenceDurationMs was ~1500-3000ms, adding 1-3s after every
student turn. START_SENSITIVITY_HIGH ensures quiet children's voices
are detected. END_SENSITIVITY_HIGH reduces wait after speech ends."
```

---

## Task 3: Lower frontend silence threshold (fixes missed student speech)

**Files:**
- Modify: `tayyar-frontend/src/screens/Mission/MissionActive.tsx:344-348`

**Root cause:** The threshold `0.005` (0.5% of max amplitude) may filter out quiet speech from children or mobile microphones. When audio is filtered, zero data reaches Gemini, which cannot detect any voice activity and therefore never generates a response.

- [ ] **Step 1: Make the change**

In `tayyar-frontend/src/screens/Mission/MissionActive.tsx`, find:
```typescript
        // Skip silence
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
        if (sum / inputData.length < 0.005) return;
```

Replace with:
```typescript
        // Skip near-silence (0.002 = 0.2% of max, catches quiet voices)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
        if (sum / inputData.length < 0.002) return;
```

- [ ] **Step 2: Verify the threshold in browser**

Open the frontend. Open browser DevTools → Console. Temporarily add a log to confirm audio is being sent. Find the same block and add one line:

```typescript
        // Skip near-silence (0.002 = 0.2% of max, catches quiet voices)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
        const avg = sum / inputData.length;
        if (avg < 0.002) return;
        // TEMP DEBUG — remove after confirming:
        console.log('[mic] sending chunk, amplitude:', avg.toFixed(4));
```

Expected output while speaking normally: values between `0.010` and `0.150`. Expected output when silent: no logs (the filter is working). **Remove the debug log before committing.**

- [ ] **Step 3: Remove the debug log and commit**

Ensure the final code has NO `console.log('[mic]...)`:
```typescript
        // Skip near-silence (0.002 = 0.2% of max, catches quiet voices)
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += Math.abs(inputData[i]);
        if (sum / inputData.length < 0.002) return;
```

```bash
git add tayyar-frontend/src/screens/Mission/MissionActive.tsx
git commit -m "perf: lower silence filter threshold 0.005 → 0.002

0.5% of max amplitude was too conservative for children's voices
and mobile mics. 0.2% still filters dead silence while passing
quiet speech through to Gemini VAD."
```

---

## Task 4: Fix health endpoint model name (accuracy fix, no latency impact)

**Files:**
- Modify: `tayyar-backend/src/index.ts:21`

**Root cause:** The health endpoint hardcodes `gemini-2.0-flash-live-001` but the actual model in `gemini.ts` is `gemini-3.1-flash-live-preview`. This creates misleading monitoring output.

- [ ] **Step 1: Make the change**

In `tayyar-backend/src/index.ts`, find:
```typescript
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', model: 'gemini-2.0-flash-live-001', timestamp: new Date().toISOString() });
});
```

Replace with:
```typescript
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', model: 'gemini-3.1-flash-live-preview', timestamp: new Date().toISOString() });
});
```

- [ ] **Step 2: Verify**
```bash
curl http://localhost:8080/api/health
```
Expected:
```json
{"status":"ok","model":"gemini-3.1-flash-live-preview","timestamp":"..."}
```

- [ ] **Step 3: Commit**
```bash
git add tayyar-backend/src/index.ts
git commit -m "fix: sync health endpoint model name with actual Gemini model

Was gemini-2.0-flash-live-001, actual code uses gemini-3.1-flash-live-preview."
```

---

## Expected Result After All 4 Tasks

| Moment | Before | After |
|--------|--------|-------|
| First AI greeting | 6-28 seconds | 2-5 seconds |
| AI responds after student speaks | 2-5 seconds | 0.8-2 seconds |
| Quiet student gets no response | Intermittent | Fixed |

---

## Notes for Future Optimization (Out of Scope for This Plan)

- **System prompt size**: Layer 1 alone is 9,309 chars. Consider extracting static scaffolding into a shorter version or enabling `contextWindowCompression` in the SDK config to manage long-session history growth.
- **ScriptProcessorNode**: Deprecated API, runs on main thread. Migrating to `AudioWorkletNode` would improve audio stability on mobile but is a larger refactor.

import { GoogleGenAI, Modality, Type, Behavior } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.warn("⚠️  GEMINI_API_KEY is missing — Live audio will not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export interface GeminiCallbacks {
    onOpen: () => void;
    onMessage: (message: any) => void;
    onError: (error: any) => void;
    onClose: (event: any) => void;
}

export async function createGeminiSession(systemPrompt: string, callbacks: GeminiCallbacks) {
    const session = await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: systemPrompt,
            outputAudioTranscription: {},
            // inputAudioTranscription intentionally OMITTED:
            //   - Gemini's STT was often wrong on Arabic-accented English,
            //     and the wrong text on screen destroyed the child's trust.
            //   - It also costs tokens per audio second of the student.
            //   - We now show a silent ✓ pulse on the mic when speech is
            //     detected client-side instead.
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Charon' }
                }
            },
            // 0.6, down from 0.8: the captain also acts as a pronunciation
            // JUDGE, and high temperature made that judgment inconsistent —
            // the model would wave through a clearly wrong word. Still warm
            // enough for theatrical delivery, but far steadier at catching
            // errors it should catch.
            temperature: 0.6,
            tools: [{
                functionDeclarations: [{
                    name: 'yield_turn',
                    description: "Call this the INSTANT you reach a [WAIT] marker in the mission script or the end of a genuine question/repeat-request directed AT the student. Do NOT call it mid-narration, mid-story, or after a rhetorical question inside an explanation — story/scene-setting blocks in the script may span multiple sentences and MUST be delivered completely before yielding. The rule: only yield when the child is actually expected to answer NOW. Never write '[WAIT]' as text; never call this more than once per turn.",
                    parameters: { type: Type.OBJECT, properties: {} },
                    behavior: Behavior.NON_BLOCKING
                }, {
                    name: 'conclude_mission',
                    description: "Call this ONCE, immediately after you have said your final warm goodbye line in the Victory Close (after the hero word, celebration, and tomorrow's teaser). This is the ONLY way to actually end the lesson. Never call it before the goodbye line. Never call it more than once. If you find yourself repeating a farewell or a 'see you tomorrow' line again, that means you already should have called this — call it now instead of repeating yourself.",
                    parameters: { type: Type.OBJECT, properties: {} },
                    behavior: Behavior.NON_BLOCKING
                }]
            }],
            realtimeInputConfig: {
                // Disable automatic activity detection entirely — the captain
                // must never be interrupted by ambient noise, a cough, or the
                // student's own filler sounds. The child triggers a turn only
                // by tapping the mic (client-side VAD via analyser).
                automaticActivityDetection: { disabled: true },
            },
            // An 8-minute session with a system directive injected every ~30s
            // steadily grows the context. Without compression, long sessions can
            // hit the window limit and Gemini drops the connection mid-lesson
            // (a periodic "silent disconnect"). A sliding window keeps the live
            // context bounded so the session survives its full duration.
            contextWindowCompression: { slidingWindow: {} },
        },
        callbacks: {
            onopen:    callbacks.onOpen,
            onmessage: callbacks.onMessage,
            onerror:   callbacks.onError,
            onclose:   callbacks.onClose
        }
    });
    return session;
}

/**
 * Post-session summarization on a cheap TEXT model (not the expensive Live model).
 * The Live model is audio-only in this app, so asking it for a JSON assessment
 * never worked — this is the working replacement.
 */
const SUMMARY_MODEL = process.env.SUMMARY_MODEL || 'gemini-3.1-flash-lite';

export async function summarizeSessionTranscript(transcriptText: string): Promise<any | null> {
    if (!apiKey || !transcriptText.trim()) return null;
    const prompt = `You are analyzing a transcript of an English-speaking lesson between "Captain English" (AI coach) and an Arabic-speaking child. Return ONLY a JSON object (no markdown fences) with exactly these fields:
{
  "summary": "2-3 sentence Arabic summary of what happened",
  "personal_facts": ["any personal facts the child revealed (name, pets, hobbies, favorite things) — empty array if none"],
  "words_practiced": ["English words/patterns the child actually said"],
  "words_struggled": ["words the child mispronounced or needed hints for"],
  "best_moment": "one sentence in Arabic describing the child's best moment",
  "engagement": "high|medium|low",
  "recommended_next_focus": "one specific recommendation in Arabic",
  "cliffhanger_seed": "one sentence in Arabic the coach can use tomorrow to reconnect (reference something personal from today)"
}

TRANSCRIPT:
${transcriptText}`;

    try {
        const res = await ai.models.generateContent({
            model: SUMMARY_MODEL,
            contents: prompt,
        });
        const text = (res.text || '').replace(/^```json\s*/i, '').replace(/^```\s*/m, '').replace(/```\s*$/m, '').trim();
        return JSON.parse(text);
    } catch (e: any) {
        console.error('📝 Session summarization failed:', e?.message || e);
        return null;
    }
}

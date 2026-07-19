import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import captainImg from '../../assets/captain.png';
import { getPilotRank } from '../../lib/missionProgress';
import './MissionActive.css';

type SessionStatus = 'connecting' | 'listening' | 'speaking' | 'error';

// ── Audio helpers (outside component to avoid re-render loops) ────────────────

const float32ToInt16 = (float32: Float32Array): ArrayBuffer => {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return int16.buffer;
};

const downsample = (buffer: Float32Array, fromRate: number, toRate: number): Float32Array => {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    result[i] = buffer[Math.min(Math.round(i * ratio), buffer.length - 1)];
  }
  return result;
};

// Wrap the stressed word in a highlight span (the "music" cue) — case-insensitive.
const renderStressed = (phrase: string, stress: string | null): React.ReactNode => {
  if (!stress) return phrase;
  const i = phrase.toLowerCase().indexOf(stress.toLowerCase());
  if (i < 0) return phrase;
  return (<>
    {phrase.slice(0, i)}
    <span className="m-stress">{phrase.slice(i, i + stress.length)}</span>
    {phrase.slice(i + stress.length)}
  </>);
};

// ── Flight route (top-bar progress) ──────────────────────────────────────────
const ROUTE_STOPS = ['🛫', '📚', '🎯', '🌍', '🏆'];
const phaseToStop = (phase: string): number => {
  switch (phase) {
    case 'flash_open': case 'quick_review': return 0;
    case 'warmup': return 1;
    case 'mission': return 2;
    case 'multi_context': return 3;
    case 'victory_close': case 'end': return 4;
    default: return 0;
  }
};

// ── Component ─────────────────────────────────────────────────────────────────

export const MissionActive: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus]       = useState<SessionStatus>('connecting');
  const [timer, setTimer]         = useState(0);
  const [serverPhase, setServerPhase] = useState<string | null>(null);
  const [completedExchanges, setCompletedExchanges] = useState(0);

  // Theatre state
  const [phrase, setPhrase]       = useState<string | null>(null); // target English phrase on the card
  const [stress, setStress]       = useState<string | null>(null); // word to visually stress
  const [micActive, setMicActive] = useState(false);   // push-to-talk: true while student is taking a turn
  const [verdict, setVerdict] = useState<'correct' | 'retry' | null>(null); // captain's actual judgment of the attempt
  const [celebrating, setCelebrating] = useState(false);
  const [showBoarding, setShowBoarding] = useState(true);          // opening ritual overlay
  const [boardingFading, setBoardingFading] = useState(false);     // starts the boarding fade AFTER the deliberate hold
  const [canReplay, setCanReplay] = useState(false);               // last captain turn buffered
  const [paused, setPaused] = useState(false);                     // ⏸ overlay + freeze everything
  // Server-authoritative "is it the child's turn?" — the maestro reads the
  // captain's own words and tells us whether a turn was a real cue (open the
  // mic) or a dramatic narration beat (keep it closed, the captain resumes).
  // Starts false so the opening hook never flashes a phantom "your turn".
  const [expectInput, setExpectInput] = useState(false);

  const wsRef            = useRef<WebSocket | null>(null);
  const playbackCtxRef   = useRef<AudioContext | null>(null);
  const captureCtxRef    = useRef<AudioContext | null>(null);
  const processorRef     = useRef<ScriptProcessorNode | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const cleanedUpRef     = useRef(false);
  const isSpeakingRef    = useRef(false);
  const modelTurnActiveRef = useRef(false);
  const barsRef          = useRef<HTMLDivElement | null>(null);
  const rafRef           = useRef<number | null>(null);
  const sessionIdRef     = useRef(`sess_${Math.random().toString(36).substr(2, 9)}`);
  const missionIdRef     = useRef(new URLSearchParams(window.location.search).get('mission'));
  const studentProfile   = useRef((() => {
    try { return JSON.parse(localStorage.getItem('student_profile') || '{}'); }
    catch { return {}; }
  })());
  const studentName      = studentProfile.current?.name || 'البطل';
  const sessionStatsRef  = useRef({ completedExchanges: 0, durationSeconds: 0, studentSentences: 0, heroWord: null as string | null });
  const helpCountRef     = useRef(0);
  const sentenceCountRef = useRef(0);                 // local student-turn counter (no transcription anymore)
  const micActiveRef     = useRef(false);             // mirror of micActive for the audio processor callback
  const expectInputRef   = useRef(false);             // mirror of expectInput for the status effect
  const previousPhraseRef = useRef<string | null>(null); // last phrase shown — used to detect ADVANCE (new phrase → fire ✓)
  const verdictTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // clears the ✓/retry verdict
  const sessionEndedRef  = useRef(false);            // true once a clean session_end arrived (guards onclose)
  const curTurnBufsRef   = useRef<AudioBuffer[]>([]); // buffers of the turn currently playing
  const lastTurnBufsRef  = useRef<AudioBuffer[]>([]); // last completed captain turn (for replay)
  const sfxCtxRef        = useRef<AudioContext | null>(null);
  const celebratedRef    = useRef(false);
  const speakStartedAtRef = useRef(0);          // ms when child first crossed the voice threshold
  const lastVoiceAtRef    = useRef(0);          // ms of last frame above threshold
  const closeMicRef       = useRef<((reason: 'captain-speaks' | 'silence') => void) | null>(null);
  const pausedRef         = useRef(false);      // used by audio-processing callback
  const orbRef            = useRef<HTMLDivElement | null>(null);   // captain avatar (mouth via --talk)
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);   // taps the captain's OUTPUT audio
  const talkLevelRef      = useRef(0);          // smoothed output level driving the mouth

  const currentPhase = serverPhase ?? (completedExchanges <= 1 ? 'flash_open' : 'warmup');
  const currentStop = phaseToStop(currentPhase);

  useEffect(() => { micActiveRef.current = micActive; }, [micActive]);
  useEffect(() => { expectInputRef.current = expectInput; }, [expectInput]);

  // ── Timer (frozen while paused) ──
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [paused]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── SFX: synthesized on the fly (no asset files, CSP-safe) ──
  const playSfx = useCallback((kind: 'chime' | 'stamp' | 'whoosh') => {
    try {
      if (!sfxCtxRef.current) sfxCtxRef.current = new AudioContext();
      const ctx = sfxCtxRef.current;
      const now = ctx.currentTime;
      const beep = (freq: number, start: number, dur: number, gain = 0.16, type: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type; osc.frequency.value = freq;
        g.gain.setValueAtTime(0, now + start);
        g.gain.linearRampToValueAtTime(gain, now + start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(now + start); osc.stop(now + start + dur);
      };
      if (kind === 'chime') { beep(880, 0, 0.5); beep(1320, 0.12, 0.5); }        // boarding ding-dong
      else if (kind === 'stamp') { beep(180, 0, 0.14, 0.28, 'square'); beep(120, 0.02, 0.2, 0.2, 'square'); } // thud
      else { beep(520, 0, 0.18, 0.08); beep(760, 0.06, 0.22, 0.06); }            // soft whoosh
    } catch { /* audio may be blocked before first gesture */ }
  }, []);

  const buzz = (ms: number | number[]) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };

  // ── Audio playback (sequential, no overlap) ──
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef  = useRef(false);

  const scheduleNextChunk = useCallback(() => {
    if (!playbackCtxRef.current || audioQueueRef.current.length === 0) {
      if (audioQueueRef.current.length === 0) {
        isSpeakingRef.current = false;
        if (!modelTurnActiveRef.current) {
          setStatus(prev => prev === 'speaking' ? 'listening' : prev);
        }
      }
      isPlayingRef.current = false;
      return;
    }
    isPlayingRef.current = true;
    const buf = audioQueueRef.current.shift()!;
    const src = playbackCtxRef.current.createBufferSource();
    src.buffer = buf;
    src.connect(playbackAnalyserRef.current ?? playbackCtxRef.current.destination);
    src.onended = scheduleNextChunk;
    src.start();
  }, []);

  const playAudio = useCallback(async (base64Audio: string) => {
    if (!playbackCtxRef.current) {
      playbackCtxRef.current = new AudioContext({ sampleRate: 24000 });
      // Tap the captain's output through an analyser so the avatar's mouth
      // can move with the ACTUAL audio level (zero extra cost, pure client).
      const outAnalyser = playbackCtxRef.current.createAnalyser();
      outAnalyser.fftSize = 512;
      outAnalyser.connect(playbackCtxRef.current.destination);
      playbackAnalyserRef.current = outAnalyser;
    }
    try {
      const binaryString = window.atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768.0;
      const ctx = playbackCtxRef.current;
      const audioBuf = ctx.createBuffer(1, float32.length, 24000);
      audioBuf.copyToChannel(float32, 0);
      isSpeakingRef.current = true;
      setStatus('speaking');
      audioQueueRef.current.push(audioBuf);
      curTurnBufsRef.current.push(audioBuf);   // buffer this turn for replay
      if (!isPlayingRef.current) scheduleNextChunk();
    } catch (e) {
      console.error('Audio play error', e);
    }
  }, [scheduleNextChunk]);

  // ── Automatic mic gating (NO push-to-talk, NO interruption) ──
  // Rule: the mic is open ONLY between captain turns. When the captain speaks,
  // we send activity_end (silencing input) so the child can never interrupt.
  // When the captain finishes, we send activity_start and the mic streams
  // until the captain begins to speak again — and on END-of-utterance detected
  // client-side (~1.4s silence), we auto-close the turn so the model gets
  // its expected end-of-user-activity signal.
  const openMic = useCallback(() => {
    if (micActiveRef.current) return;
    micActiveRef.current = true;
    setMicActive(true);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'activity_start' }));
    }
  }, []);

  const closeMic = useCallback((reason: 'captain-speaks' | 'silence') => {
    if (!micActiveRef.current) return;
    micActiveRef.current = false;
    setMicActive(false);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Send the reason: only a real 'silence' end is a completed student turn.
      // A 'captain-speaks' close just gates the mic shut (no-interruption) and
      // must NOT be counted as an attempt — otherwise narration turns inflate
      // the exchange count and fire a phantom ✓.
      wsRef.current.send(JSON.stringify({ type: 'activity_end', reason }));
    }
    if (reason === 'silence') {
      // The child finished a turn — count it for stats. NO overlay icon here:
      // the mic itself grows + glows during the turn (see .m-mic-wrap.active
      // in the CSS), which is the honest "your turn" affordance. The ✓
      // verdict is reserved for advancing to a NEW phrase (see the
      // 'target_phrase' handler), so it doesn't fire on every shadowing
      // repetition of the same sentence.
      sentenceCountRef.current += 1;
    }
  }, []);
  closeMicRef.current = closeMic;

  // Auto-manage the mic based on captain's speaking state AND whether the
  // maestro says this beat is actually the child's turn.
  //   captain speaking → mic CLOSED (no interruption, no cost)
  //   captain silent + expectInput → mic OPEN (child can speak; silence-VAD closes it)
  //   captain silent + narration beat → mic CLOSED (captain will resume; no phantom turn)
  //   paused           → mic CLOSED (nothing streams while user is away)
  useEffect(() => {
    if (paused || status === 'speaking' || status === 'connecting' || status === 'error' || !expectInput) {
      closeMic('captain-speaks');
      speakStartedAtRef.current = 0;
      lastVoiceAtRef.current = 0;
    } else if (status === 'listening' && !celebrating) {
      openMic();
    }
  }, [status, celebrating, paused, expectInput, openMic, closeMic]);

  // Replay the last captain turn (buffered) — "say it again" for shadowing
  const replayLast = useCallback(() => {
    const ctx = playbackCtxRef.current;
    const bufs = lastTurnBufsRef.current;
    if (!ctx || bufs.length === 0 || isSpeakingRef.current) return;
    let t = ctx.currentTime;
    for (const b of bufs) {
      const src = ctx.createBufferSource();
      src.buffer = b; src.connect(playbackAnalyserRef.current ?? ctx.destination); src.start(t);
      t += b.duration;
    }
  }, []);

  // ── Per-frame meters (no re-render; write CSS vars) ──
  //   1) mic level → bars + client-side end-of-utterance VAD
  //   2) captain OUTPUT level → --talk on the orb (drives the avatar's mouth)
  const startMicMeter = useCallback(() => {
    const tick = () => {
      // Captain mouth: measure the real output level, smooth it (fast attack,
      // slower release so it reads as articulation, not flicker).
      const orb = orbRef.current;
      const outAnalyser = playbackAnalyserRef.current;
      if (orb) {
        let target = 0;
        if (outAnalyser && !pausedRef.current) {
          const od = new Uint8Array(outAnalyser.frequencyBinCount);
          outAnalyser.getByteTimeDomainData(od);
          let osum = 0;
          for (let i = 0; i < od.length; i++) {
            const v = (od[i] - 128) / 128;
            osum += v * v;
          }
          target = Math.min(1, Math.sqrt(osum / od.length) * 6.5);
        }
        const prev = talkLevelRef.current;
        const next = target > prev ? prev + (target - prev) * 0.55 : prev * 0.72;
        talkLevelRef.current = next;
        orb.style.setProperty('--talk', next < 0.02 ? '0' : next.toFixed(3));
      }

      const analyser = analyserRef.current;
      const bars = barsRef.current;
      if (analyser && bars) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);           // 0..~0.5
        const level = micActiveRef.current ? Math.min(1, rms * 3.2) : 0;
        bars.style.setProperty('--level', level.toFixed(3));

        // Client-side end-of-utterance detection — only while the mic is open.
        // A frame counts as "voice" if the RMS exceeds a small threshold well
        // above room-tone. Once we've heard 300ms of continuous voice, a
        // subsequent 1400ms of silence closes the turn (matches the server's
        // old silenceDurationMs so pacing feels the same).
        if (micActiveRef.current) {
          const now = performance.now();
          const isVoice = rms > 0.045;
          if (isVoice) {
            if (speakStartedAtRef.current === 0) speakStartedAtRef.current = now;
            lastVoiceAtRef.current = now;
          } else if (
            speakStartedAtRef.current > 0 &&
            now - speakStartedAtRef.current > 300 &&
            now - lastVoiceAtRef.current > 1400
          ) {
            speakStartedAtRef.current = 0;
            lastVoiceAtRef.current = 0;
            closeMicRef.current?.('silence');
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // ── Main connection effect ──
  useEffect(() => {
    cleanedUpRef.current = false;

    const missionParam  = missionIdRef.current;
    const name          = studentProfile.current?.name || '';
    const motivation    = studentProfile.current?.motivation || '';
    const params: Record<string, string> = {};
    if (missionParam) params.mission = missionParam;
    if (name)         params.name     = name;
    if (motivation)   params.motivation = motivation;
    const wsUrl = `ws://localhost:8080/ws/sessions/${sessionIdRef.current}/live`
      + `?${new URLSearchParams(params).toString()}`;

    let ws: WebSocket;              // closed in THIS run's cleanup (StrictMode-safe)
    let localCaptureCtx: AudioContext | null = null;
    let localStream: MediaStream | null = null;
    let demoTimeout: ReturnType<typeof setTimeout>;

    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      demoTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN && !cleanedUpRef.current) { setStatus('error'); setShowBoarding(false); }
      }, 4000);

      ws.onopen = () => {
        if (cleanedUpRef.current) return;
        clearTimeout(demoTimeout);
        ws.send(JSON.stringify({ type: 'start_session', studentId: 'student_123', sessionId: sessionIdRef.current }));
        setStatus('listening');
        // Boarding ritual: chime, then HOLD the pass fully opaque for 1.8s
        // (the deliberate moment that also masks connection latency), THEN
        // fade it out over 0.5s and unmount. Previously `.ready` was tied to
        // status===listening, so on localhost the pass faded the instant the
        // socket opened (~100ms) and just flashed. The fade is now driven by
        // an explicit timer, independent of how fast the socket connects.
        playSfx('chime'); buzz(30);
        setTimeout(() => { if (!cleanedUpRef.current) setBoardingFading(true); }, 1800);
        setTimeout(() => { if (!cleanedUpRef.current) setShowBoarding(false); }, 2350);
      };

      ws.onmessage = (event) => {
        if (cleanedUpRef.current || typeof event.data !== 'string') return;
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case 'status':
              if (msg.status === 'connected') setStatus('listening');
              break;
            case 'audio':
              modelTurnActiveRef.current = true;
              playAudio(msg.data);
              break;
            // 'transcript' from the server is no longer used — input
            // transcription is disabled and the ✓ pulse comes from local
            // taps, not from wire messages.
            case 'target_phrase': {
              // server-authoritative phrase for the card (phase-gated, accurate)
              const newPhrase: string | null = msg.phrase ?? null;
              setPhrase(newPhrase);
              setStress(msg.stress ?? null);
              // ✓ fires ONLY on ADVANCE — a new phrase replaces a previous one.
              // Not on the very first phrase (nothing has been drilled yet),
              // not on the same phrase repeating (shadowing rounds 2-5), and
              // not on a clear-to-null. This matches the child's mental model:
              // "check" = "we finished that sentence, moving on".
              if (newPhrase && previousPhraseRef.current && newPhrase !== previousPhraseRef.current) {
                setVerdict('correct');
                if (verdictTimeoutRef.current) clearTimeout(verdictTimeoutRef.current);
                verdictTimeoutRef.current = setTimeout(() => setVerdict(null), 1600);
              }
              if (newPhrase !== null) previousPhraseRef.current = newPhrase;
              break;
            }
            case 'turn_complete':
              modelTurnActiveRef.current = false;
              // freeze this turn's audio for the replay button
              if (curTurnBufsRef.current.length > 0) {
                lastTurnBufsRef.current = curTurnBufsRef.current;
                curTurnBufsRef.current = [];
                setCanReplay(true);
              }
              if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
                isSpeakingRef.current = false;
                setStatus(prev => prev === 'speaking' ? 'listening' : prev);
              }
              break;
            case 'progress':
              if (typeof msg.completedExchanges === 'number') {
                setCompletedExchanges(msg.completedExchanges);
                sessionStatsRef.current.completedExchanges = msg.completedExchanges;
              }
              break;
            case 'turn_feedback':
              // Server-derived signal from the captain's transcript. We now
              // ONLY surface 'retry' — a genuine correction the captain made
              // (تقصد / بنطق / ركّز). We deliberately DROP 'correct' here:
              // the captain says supportive words on nearly every turn (praise,
              // acknowledgement, next model) and firing ✓ on each one made it
              // pop during pure shadowing repetitions and even after coach
              // narration. The ✓ is now driven by phrase ADVANCE instead
              // (see 'target_phrase' above) — a much more honest milestone.
              if (msg.result === 'retry') {
                setVerdict('retry');
                if (verdictTimeoutRef.current) clearTimeout(verdictTimeoutRef.current);
                verdictTimeoutRef.current = setTimeout(() => setVerdict(null), 1600);
              }
              break;
            case 'phase':
              if (typeof msg.phase === 'string') {
                setServerPhase(prev => { if (prev && prev !== msg.phase) playSfx('whoosh'); return msg.phase; });
                // Entering victory_close no longer triggers the stamp. The stamp
                // is a full-screen takeover that hides the captain, and the
                // session doesn't actually end until conclude_mission / hard cap
                // — firing it here left the child staring at a frozen stamp for
                // up to two minutes while the captain was still saying goodbye
                // behind it. The celebration now fires ONLY on real session_end.
              }
              break;
            case 'session_end':
              sessionEndedRef.current = true;   // clean end — guards onclose from firing an error
              sessionStatsRef.current = {
                completedExchanges: msg.completedExchanges ?? sessionStatsRef.current.completedExchanges,
                studentSentences: msg.studentSentences ?? sentenceCountRef.current,
                durationSeconds: msg.durationSeconds ?? 0,
                heroWord: msg.heroWord ?? null,
              };
              // The stamp fires HERE — at the real end — not on entering
              // victory_close, so it never lingers longer than this handoff.
              if (!celebratedRef.current) { celebratedRef.current = true; setCelebrating(true); playSfx('stamp'); buzz([40, 60, 120]); }
              setTimeout(() => handleEndMissionRef.current(), 2600);
              break;
            case 'expect_input':
              // Maestro's verdict on the captain's last turn: real cue → the
              // mic may open on the next 'listening'; narration beat → stay
              // closed (the captain resumes on its own). See the mic effect.
              setExpectInput(msg.value === true);
              break;
            case 'mic_close':
              // Maestro is taking the floor (hint / narration resume) and has
              // already closed our turn on the wire. Drop the mic locally so we
              // stop streaming immediately — don't send another activity_end.
              closeMicRef.current?.('captain-speaks');
              break;
            case 'interrupted':
              audioQueueRef.current = [];
              isSpeakingRef.current = false;
              modelTurnActiveRef.current = false;
              setStatus('listening');
              break;
            case 'error':
              console.error('🔴 Server error:', msg.message);
              break;
          }
        } catch (e) {
          console.error('Message parse error:', e);
        }
      };

      ws.onerror = () => { if (!cleanedUpRef.current) { clearTimeout(demoTimeout); setStatus('error'); setShowBoarding(false); } };

      // Backend closed the socket. Without this handler the UI just froze
      // silently — captain stops, mic keeps streaming into a dead socket, no
      // error, no exit (the reported "انقطاع غير مفهوم"). Now we react:
      //   - clean end (session_end already scheduled navigation) → do nothing
      //   - unexpected drop (Gemini dropped, backend crash, network) → surface
      //     an honest disconnected state instead of a dead screen.
      ws.onclose = () => {
        if (cleanedUpRef.current) return;
        clearTimeout(demoTimeout);
        if (sessionEndedRef.current) return;
        setShowBoarding(false);
        setStatus('error');
      };
    } catch (e) {
      console.error('WebSocket creation failed:', e);
      setStatus('error');
    }

    // Start the per-frame meters immediately — the captain's mouth must move
    // even if the microphone permission is denied.
    startMicMeter();

    // ── Microphone: capture PCM 16k + analyser for the live bars ──
    navigator.mediaDevices.getUserMedia({
      audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    }).then(stream => {
      if (cleanedUpRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      localStream = stream;
      streamRef.current = stream;

      const captureCtx = new AudioContext({ sampleRate: 16000 });
      localCaptureCtx = captureCtx;
      captureCtxRef.current = captureCtx;

      const source = captureCtx.createMediaStreamSource(stream);
      const analyser = captureCtx.createAnalyser();
      analyser.fftSize = 512;
      analyserRef.current = analyser;
      source.connect(analyser);

      const processor = captureCtx.createScriptProcessor(1024, 1, 1);
      processorRef.current = processor;
      processor.onaudioprocess = (e) => {
        if (cleanedUpRef.current || pausedRef.current || !micActiveRef.current) return;  // audio only flows during a live student turn
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const pcm16k = downsample(e.inputBuffer.getChannelData(0), captureCtx.sampleRate, 16000);
        wsRef.current.send(float32ToInt16(pcm16k));
      };
      source.connect(processor);
      processor.connect(captureCtx.destination);
      setStatus(prev => prev === 'connecting' ? 'listening' : prev);
    }).catch(err => {
      console.warn('🎤 Microphone denied:', err.message);
      setStatus('listening');
    });

    return () => {
      cleanedUpRef.current = true;
      clearTimeout(demoTimeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (verdictTimeoutRef.current) clearTimeout(verdictTimeoutRef.current);
      processorRef.current?.disconnect();
      localCaptureCtx?.close().catch(() => {});
      localStream?.getTracks().forEach(t => t.stop());
      try { ws?.close(); } catch {}   // close THIS run's socket, always
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── End mission ──
  const handleEndMission = () => {
    cleanedUpRef.current = true;
    wsRef.current?.close();
    processorRef.current?.disconnect();
    streamRef.current?.getTracks().forEach(t => t.stop());
    const exchanges = Math.max(sessionStatsRef.current.completedExchanges, completedExchanges);
    const studentSentences = Math.max(sessionStatsRef.current.studentSentences, sentenceCountRef.current);
    const duration = sessionStatsRef.current.durationSeconds || timer;
    navigate('/post-mission', {
      state: {
        duration, points: studentSentences * 10, exchanges, studentSentences,
        badge: exchanges >= 4 ? 'First Flight 🛫' : null,
        missionId: missionIdRef.current,
        heroWord: sessionStatsRef.current.heroWord,
      },
    });
  };
  const handleEndMissionRef = useRef(handleEndMission);
  handleEndMissionRef.current = handleEndMission;

  // ── Pause / Resume ──
  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const togglePause = useCallback(() => {
    if (celebrating || status === 'error' || status === 'connecting') return;
    if (pausedRef.current) {
      setPaused(false);
      wsRef.current?.send(JSON.stringify({ type: 'resume' }));
      // captain audio resumes naturally on next chunk; suspended context revives
      playbackCtxRef.current?.resume().catch(() => {});
    } else {
      setPaused(true);
      // stop bothering the model with our audio, close our turn cleanly,
      // and mute any captain audio still playing
      closeMic('captain-speaks');
      audioQueueRef.current = [];
      isSpeakingRef.current = false;
      playbackCtxRef.current?.suspend().catch(() => {});
      wsRef.current?.send(JSON.stringify({ type: 'pause' }));
    }
  }, [celebrating, status, closeMic]);

  const sendHelp = async () => {
    if (helpCountRef.current >= 3) return;
    helpCountRef.current += 1;
    try {
      await fetch(`http://localhost:8080/api/sessions/${sessionIdRef.current}/help-press`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pressCount: helpCountRef.current }),
      });
    } catch (e) { console.error('help-press failed', e); }
  };

  // ── Derived view state ──
  // A real student turn requires the maestro's cue (expectInput). A 'listening'
  // status during a narration beat is NOT the child's turn — the captain is
  // just pausing for effect and will continue.
  const isStudentTurn = status === 'listening' && !celebrating && expectInput;
  const narrationBeat = status === 'listening' && !celebrating && !expectInput;
  const captainSpeaking = status === 'speaking';
  const timeWarn = timer >= 330;                 // 5:30 → wrap-up approaching

  const stageLabel = celebrating ? ''
    : status === 'connecting' ? 'الكابتن يشغّل المحركات...'
    : status === 'error' ? 'انقطع الاتصال — حاول مرة أخرى'
    : captainSpeaking ? 'الكابتن يتحدث...'
    : narrationBeat ? 'الكابتن يروي القصة...'
    : 'دورك — كرّرها 🎤';

  return (
    <div className="mission-screen">

      {/* ── Boarding-pass opening ritual (hides connection latency) ── */}
      {showBoarding && (
        <div className={`m-boarding ${boardingFading ? 'ready' : ''}`}>
          <div className="m-pass">
            <div className="m-pass-head">
              <span>طيران طيّار</span><span>✈️</span>
            </div>
            <div className="m-pass-avatar">
              <img src={captainImg} alt="" draggable={false} />
            </div>
            <div className="m-pass-route">RUH <span>✈</span> DXB</div>
            <div className="m-pass-name">البطل / {studentName}</div>
            <div className="m-pass-rank">{getPilotRank()}</div>
            <div className="m-pass-stamp">
              {status === 'connecting' ? 'جاري تشغيل المحركات...' : 'BOARDING ✓'}
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar (fixed) ── */}
      <header className="m-top">
        <button className="m-close" onClick={handleEndMission} aria-label="إنهاء المهمة">✕</button>
        <div className="m-title">✈️ رحلة دبي</div>
        <div className={`m-time ${timeWarn ? 'warn' : ''} ${paused ? 'paused' : ''}`}>{formatTime(timer)}</div>
      </header>

      {/* ── Pause overlay ── */}
      {paused && (
        <div className="m-paused-overlay" role="dialog" aria-label="الدرس متوقف">
          <div className="m-paused-card">
            <div className="m-paused-icon">⏸</div>
            <div className="m-paused-title">الدرس متوقف</div>
            <div className="m-paused-sub">الوقت والمايك مُجمَّدان — تابع متى ما كنت جاهزاً</div>
            <button className="m-paused-resume" onClick={togglePause}>▶ متابعة الدرس</button>
          </div>
        </div>
      )}
      <div className="m-route" role="progressbar" aria-valuenow={currentStop} aria-valuemax={4}>
        {ROUTE_STOPS.map((emoji, i) => (
          <React.Fragment key={i}>
            <div className={`m-stop ${i < currentStop ? 'done' : ''} ${i === currentStop ? 'here' : ''}`}>
              {i === currentStop ? emoji : ''}
            </div>
            {i < ROUTE_STOPS.length - 1 && <div className={`m-seg ${i < currentStop ? 'done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Stage (center) ── */}
      <main className={`m-stage ${celebrating ? 'celebrate' : ''}`}>
        {celebrating ? (
          <div className="m-victory">
            <div className="m-confetti">🎉 ✨ 🎊</div>
            <div className="m-stamp">
              <div className="m-stamp-emoji">🎫</div>
              <div className="m-stamp-city">DUBAI</div>
            </div>
            <div className="m-victory-text">ختم جديد في جوازك!</div>
          </div>
        ) : (
          <>
            <div ref={orbRef} className={`m-orb ${captainSpeaking ? 'speaking' : ''} ${isStudentTurn ? 'listening' : ''}`}>
              <span className="m-orb-ring" />
              <span className="m-orb-ring" />
              <span className="m-orb-ring" />
              <span className="m-orb-core">
                {/* The frame is scaled/offset once; the mouth is positioned in
                    the frame's own coordinates so zoom never breaks alignment. */}
                <span className="m-captain-frame">
                  <img className="m-captain" src={captainImg} alt="الكابتن" draggable={false} />
                  <span className="m-mouth" aria-hidden />
                </span>
              </span>
            </div>
            <div className={`m-stagelabel ${isStudentTurn ? 'yourturn' : ''}`}>{stageLabel}</div>

            {phrase && status !== 'connecting' && status !== 'error' ? (
              <div className={`m-phrase-card ${isStudentTurn ? 'active' : ''}`}>
                <div className="m-phrase">{renderStressed(phrase, stress)}</div>
                {canReplay && (
                  <button className="m-replay" onClick={replayLast} disabled={captainSpeaking}>
                    🔊 اسمعها مرة ثانية
                  </button>
                )}
              </div>
            ) : (
              status === 'connecting' && <div className="m-spinner" aria-hidden />
            )}

            {/* Verdict overlay: ✓ only when we ADVANCE to a new phrase, or a
                retry cue when the captain corrected something. "Heard you"
                is now expressed by the mic itself growing + glowing — no
                extra icon needed (which read as a pause/stop symbol). */}
            {verdict === 'correct' ? (
              <div className="m-verdict correct" key="ok">
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            ) : verdict === 'retry' ? (
              <div className="m-verdict retry" key="retry">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
                </svg>
                <span className="m-verdict-label">مرة ثانية</span>
              </div>
            ) : null}
          </>
        )}
      </main>

      {/* ── Control bar (fixed) ── */}
      <footer className="m-controls">
        <div className="m-mic-hint">
          {paused ? 'اضغط ▶ للمتابعة' : captainSpeaking ? 'الكابتن يتحدث...' : narrationBeat ? '' : micActive ? 'دورك — تكلّم' : 'استعد'}
        </div>
        <div className="m-dock">
          <button className="m-help" onClick={sendHelp} aria-label="مساعدة">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1h6c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>
            </svg>
          </button>

          {/* Mic — auto-managed indicator, doubles as pause/resume button.
              (Automatic mic gating still applies; tap is only for pause.) */}
          <div className={`m-mic-wrap ${micActive ? 'active' : ''} ${paused ? 'paused' : ''}`} ref={barsRef}>
            <span className="m-mic-ring" />
            <span className="m-mic-ring" />
            <button
              className={`m-mic ${paused ? 'paused' : micActive ? 'live' : 'dim'}`}
              onClick={togglePause}
              disabled={celebrating || status === 'error' || status === 'connecting'}
              aria-label={paused ? 'متابعة الدرس' : 'إيقاف مؤقت'}
            >
              {paused ? (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="7,4 20,12 7,20" />
                </svg>
              ) : (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="22"/>
                </svg>
              )}
            </button>
          </div>

          <div className="m-help-spacer" aria-hidden />
        </div>
      </footer>
    </div>
  );
};

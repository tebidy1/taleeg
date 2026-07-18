# دليل الاستخدام الصحيح لـ Gemini Live API
## للوكيل الـ Vibe Coding — اقرأ هذا قبل أي كود

---

## ⚠️ القواعد الأربع — لا تخالفها

1. **الموديل الصحيح:** `gemini-3.1-flash-live-preview` (وليس `gemini-3.1-flash-live` ولا `gemini-2.0-flash-live`)
2. **الـ API الصحيح:** `ai.live.connect()` مع callbacks (وليس `model.startChat()` ولا `model.generateContent()`)
3. **المفتاح:** يُقرأ تلقائياً من `GEMINI_API_KEY` في env — لا تمرره في الكود
4. **الصوت:** Input = PCM 16-bit **16kHz** | Output = PCM 16-bit **24kHz** — لا تخلط بينهما

---

## 1. التثبيت

```bash
npm install @google/genai
```

لا تثبّت `@google/generative-ai` — هذا الـ package القديم ولا يدعم Live API.

---

## 2. متغيرات البيئة (.env)

```bash
GEMINI_API_KEY=your_api_key_here
```

الـ SDK يقرأ `GEMINI_API_KEY` تلقائياً. لا تضعه في الكود أبداً.

---

## 3. الهيكل الصحيح للاتصال (Node.js / TypeScript)

```typescript
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai'

// GEMINI_API_KEY يُقرأ تلقائياً من env
const ai = new GoogleGenAI({})

const session = await ai.live.connect({
  model: 'gemini-3.1-flash-live-preview',
  config: {
    responseModalities: [Modality.AUDIO],
    systemInstruction: 'Your system prompt here',
    outputAudioTranscription: {},  // نص ما قاله الذكاء الصناعي
    inputAudioTranscription: {},   // نص ما قاله المستخدم
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: 'Charon' } // صوت بريطاني
      }
    }
  },
  callbacks: {
    onopen: () => {
      console.log('Connected to Gemini Live API')
    },
    onmessage: (message: LiveServerMessage) => {
      handleMessage(message)
    },
    onerror: (e: ErrorEvent) => {
      console.error('Error:', e.message)
    },
    onclose: (e: CloseEvent) => {
      console.log('Closed:', e.reason)
    }
  }
})
```

---

## 4. إرسال الصوت للـ API

```typescript
// data = Buffer من الـ microphone (PCM 16-bit 16kHz)
session.sendRealtimeInput({
  audio: {
    data: data.toString('base64'),   // يجب أن يكون base64
    mimeType: 'audio/pcm;rate=16000' // دائماً 16000
  }
})
```

---

## 5. استقبال الردود (onmessage callback)

```typescript
function handleMessage(message: LiveServerMessage) {
  const sc = message.serverContent
  if (!sc) return

  // حالة 1: المستخدم قاطع الذكاء الصناعي (Barge-in)
  if (sc.interrupted) {
    // أوقف تشغيل الصوت المتراكم فوراً
    audioQueue.length = 0
    return
  }

  // حالة 2: بيانات صوتية (PCM 16-bit 24kHz)
  if (sc.modelTurn?.parts) {
    for (const part of sc.modelTurn.parts) {
      if (part.inlineData?.data) {
        // هذا Buffer من base64 — أرسله للـ Flutter كـ binary
        const audioBuffer = Buffer.from(part.inlineData.data, 'base64')
        sendToClient(audioBuffer)
      }
    }
  }

  // حالة 3: transcript ما قاله الذكاء الصناعي
  if (sc.outputTranscription?.text) {
    sendToClient(JSON.stringify({
      type: 'transcript',
      speaker: 'ai',
      text: sc.outputTranscription.text
    }))
  }

  // حالة 4: transcript ما قاله المستخدم
  // (Affective Dialog: يكشف الثقة/التردد في الصوت تلقائياً)
  if (sc.inputTranscription?.text) {
    sendToClient(JSON.stringify({
      type: 'transcript',
      speaker: 'user',
      text: sc.inputTranscription.text
    }))
  }
}
```

---

## 6. إغلاق الجلسة

```typescript
session.close()
```

---

## 7. مثال كامل يعمل (Node.js command-line)

هذا المثال مأخوذ مباشرة من المستودع الرسمي — اختبره أولاً قبل البناء:

```bash
npm install @google/genai mic speaker
export GEMINI_API_KEY="your-key"
npx tsx main.mts
```

```typescript
// main.mts
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai'
import mic from 'mic'
import Speaker from 'speaker'

const ai = new GoogleGenAI({})

const session = await ai.live.connect({
  model: 'gemini-3.1-flash-live-preview',
  config: {
    responseModalities: [Modality.AUDIO],
    systemInstruction: 'You are a helpful assistant.',
    outputAudioTranscription: {},
    inputAudioTranscription: {},
  },
  callbacks: {
    onopen: () => console.log('Connected'),
    onmessage: (msg: LiveServerMessage) => {
      const sc = msg.serverContent
      if (!sc) return

      // طباعة transcript
      if (sc.outputTranscription?.text) process.stdout.write(sc.outputTranscription.text)

      // تشغيل الصوت (24kHz)
      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part.inlineData?.data) {
            const speaker = new Speaker({ channels: 1, bitDepth: 16, sampleRate: 24000 })
            speaker.write(Buffer.from(part.inlineData.data, 'base64'))
          }
        }
      }
    },
    onerror: (e) => console.error(e.message),
    onclose: (e) => console.log('Closed')
  }
})

// إرسال الصوت من الـ Mic (16kHz)
const micInstance = mic({ rate: '16000', bitwidth: '16', channels: '1' })
micInstance.getAudioStream().on('data', (data: Buffer) => {
  session.sendRealtimeInput({
    audio: { data: data.toString('base64'), mimeType: 'audio/pcm;rate=16000' }
  })
})
micInstance.start()
```

---

## 8. البنية في مشروع Kalam (Backend Proxy)

في Kalam، الـ Backend هو الوسيط بين Flutter والـ Gemini API:

```
Flutter App
    ↕ WebSocket (binary PCM + JSON)
Backend (Node.js)
    ↕ Gemini Live API (ai.live.connect)
Gemini 3.1 Flash Live
```

**السبب:** مفتاح Gemini لا يُرسل للـ Flutter أبداً — يبقى في الـ Backend فقط.

---

## 9. تشغيل الصوت الوارد في Flutter

الصوت الوارد من Gemini هو **PCM 16-bit 24kHz** — Flutter لا يشغّله مباشرة.

**الحل: إضافة WAV header قبل التشغيل**

```dart
// في audio_service.dart
Uint8List addWavHeader(Uint8List pcmData) {
  // sampleRate = 24000 (مخرجات Gemini)
  // channels = 1, bitsPerSample = 16
  final buffer = ByteData(44 + pcmData.length)
  // ... WAV header bytes ...
  return wavData
}
```

ثم شغّله عبر `audioplayers` أو `dart:html` AudioContext على Web.

---

## 10. الأصوات المتاحة

| الاسم | الطابع |
|-------|--------|
| **Charon** | بريطاني محترف (موصى به لـ Kalam) |
| Puck | خفيف وودود |
| Kore | نسائي هادئ |
| Fenrir | قوي وجذاب |
| Aoede | نسائي دافئ |

---

## 11. قائمة الأخطاء الشائعة

| الخطأ | السبب | الحل |
|-------|-------|------|
| `model not found` | اسم موديل خاطئ | استخدم `gemini-3.1-flash-live-preview` |
| `method not found` | استخدام `startChat()` | استخدم `ai.live.connect()` |
| `audio distorted` | Sample rate خاطئ | Input: 16000 — Output: 24000 |
| `no audio output` | `decodeAudioData` فاشل | أضف WAV header للـ PCM |
| `API key exposed` | مفتاح في frontend | المفتاح في Backend فقط |
| `connection refused` | HTTP بدل HTTPS | Gemini Live يرفض HTTP |

---

## 12. الـ Voices المتاحة + خيارات الـ Config الكاملة

```typescript
config: {
  // الاستجابة: صوت فقط، أو نص فقط، أو كليهما
  responseModalities: [Modality.AUDIO],           // صوت فقط
  // responseModalities: [Modality.TEXT],          // نص فقط
  // responseModalities: [Modality.AUDIO, Modality.TEXT], // كليهما

  // تعليمات النظام
  systemInstruction: 'You are Kai, a sales coach...',

  // Transcripts (اختياري لكن مفيد جداً)
  outputAudioTranscription: {},
  inputAudioTranscription: {},

  // الصوت
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: { voiceName: 'Charon' }
    }
  }
}
```

---

## ملخص سريع للـ Vibe Coding Agent

```
Package:    @google/genai
Model:      gemini-3.1-flash-live-preview
API Call:   ai.live.connect({ model, config, callbacks })
Send Audio: session.sendRealtimeInput({ audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } })
Get Audio:  message.serverContent.modelTurn.parts[i].inlineData.data (base64, 24kHz PCM)
Transcript: message.serverContent.outputTranscription.text
Barge-in:   message.serverContent.interrupted === true
Close:      session.close()
API Key:    GEMINI_API_KEY env var — never in code
```

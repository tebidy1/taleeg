# وثيقة الإصلاح الشاملة — تحليل المشاكل + الحلول
## بعد الاختبار الميداني الأول لـ «طيّار»

---

## 📋 جدول المشاكل المُكتشفة

| # | المشكلة | الخطورة | السبب الجذري |
|---|---|---|---|
| ١ | لا تصحيح مباشر ولحظي | 🔴 قاتلة | Layer 1 تمنع التصحيح المباشر تماماً |
| ٢ | لا توجد آلية Shadowing | 🔴 قاتلة | لم تُذكر في System Prompt كفعل |
| ٣ | لا استخدام للعربية في التعليم | 🟡 حرجة | Layer 1 يقيّد العربية لـ ٣ عبارات فقط |
| ٤ | AI لا يبدأ الحوار | 🟡 حرجة | Mission Flow يبدأ بسؤال للطالب |
| ٥ | لا Warm-up للمفردات | 🔴 قاتلة | لم تُبرمج كحالة منفصلة في State Machine |
| ٦ | لا مؤشر تقدم بصري | 🟡 حرجة | UX في DESIGN_SYSTEM لكن لم يُربط بالـ State |
| ٧ | لا الاستدعاء المتباعد ظاهراً | 🟡 متوسطة | SRS يعمل خلف الكواليس لكن الطفل لا يراه |
| ٨ | لا تكييف لطالب ضعيف | 🔴 قاتلة | Layer 4 تكتشف الإحباط لكن لا تُغير الأسلوب |
| ٩ | لا دروس تأسيسية (تقديم النفس) | 🟡 حرجة | المهمة ١ تبدأ بمستوى أعلى من اللازم |
| ١٠ | لا آلية طلب المساعدة | 🟡 حرجة | لم تُصمم كـ feature |
| ١١ | لا تكرار عبر سياقات | 🔴 قاتلة | مفهوم التلعيب طغى على التكرار التعليمي |

---

# الفصل الأول: تحليل المشاكل والحلول المحددة

## المشكلة ١ — لا تصحيح مباشر ولحظي

### تحليلي للخطأ:
في Layer 1، كتبت قاعدة صارمة: "NEVER correct directly — always RECAST". هذا خطأ للأطفال المبتدئين. الطفل الذي يقول "I GO SCHOOL" يحتاج أن يسمع الصواب بوضوح، لا أن يسمعها مدمجة في رد طويل قد لا يلتقطه.

### السبب الجذري:
نقلت قاعدة سيليكون فالي (مخصصة للمتقدمين) للأطفال (مبتدئين). الفرق:
- **متقدم**: يعرف القاعدة، يحتاج فقط نمذجة خفيفة
- **مبتدئ**: لا يعرف القاعدة، يحتاج توجيهاً واضحاً + تشجيعاً

### الحل — ثلاثة مستويات للتصحيح:

#### المستوى ١ — التصحيح اللطيف المباشر (Gentle Direct Correction)
يستخدم للأخطاء الجوهرية (قواعد، ترتيب كلمات):

```
الطفل: "I GO SCHOOL"
❌ Recast فقط: "Sure! So you go to school. Which school?"
   (الطفل قد لا يلتقط الفرق)

✅ التصحيح اللطيف:
AI: "تقصد: I go TO school! حرف 'to' صغير لكن مهم.
     كرّر معي: I go TO school."
الطفل: "I go to school"
AI: "ممتاز يابطل! الآن، Which school do you go to?"
```

#### المستوى ٢ — النمذجة المعززة (Enhanced Modeling)
يستخدم لأخطاء النطق:

```
الطفل: "I would like a wɪndow seat" (نطق خاطئ لـ /v/)
✅ AI: "أحسنت! (تسمع جيداً) - window - دعني أسمعها مرة أخرى:
       WIN-DOW. حرف الـ /v/ — أسناني على شفتي السفلى.
       جرّب: WIN-DOW"
الطفل: "window"
AI: "YES! ممتاز! Now, what would you like?"
```

#### المستوى ٣ — Recast الصامت
يستخدم للأخطاء البسيطة (مفرد/جمع، نهايات):

```
الطفل: "I have two bag"
✅ AI: "Great! So you have two bags. Window seat, two bags. 
       Here's your boarding pass!"
   (الطفل يسمع "two bags" بشكل طبيعي)
```

### التحديث المطلوب لـ Layer 1:

استبدل قسم "Rule 1: NEVER correct directly" بالتالي:

```markdown
## CORRECTION PHILOSOPHY (محدّث)

### Three Levels of Correction

#### Level 1 — Gentle Direct Correction (for major errors)
Use when student makes STRUCTURAL errors:
- Missing prepositions (I go school → I go TO school)
- Wrong word order
- Missing verbs
- Wrong tense (basic)

Format:
1. Acknowledge effort warmly (Arabic OK): "أحسنت! تقريباً صحيحة"
2. State the correct form clearly: "تقصد: I go TO school"
3. Brief reason (1 sentence, Arabic OK): "حرف 'to' مهم هنا"
4. Ask them to repeat: "كرّر معي: I go to school"
5. After they repeat, celebrate + continue: "ممتاز! Now, which school?"

#### Level 2 — Enhanced Modeling (for pronunciation errors)
Use when student mispronounces a word.

Format:
1. Praise what they did right: "Good sentence!"
2. Isolate the word: "Listen: WINDOW"
3. Give a tip (Arabic OK): "حرف v — أسناني على شفتي"
4. Have them repeat the word 2-3 times
5. Have them say the full sentence again
6. Celebrate: "YES! ممتاز يابطل!"

#### Level 3 — Silent Recast (for minor errors)
Use for small mistakes that don't impede communication:
- Singular/plural (two bag → two bags)
- Article usage (I want burger → I want A burger)
- Minor preposition issues

Format:
- Just use the correct form naturally in your next response
- Do NOT interrupt the flow
- The student will absorb it

### When to Use Which Level
- Structural error (level 1) > Pronunciation error (level 2) > Minor error (level 3)
- If multiple errors, fix the MOST important one only (don't overwhelm)
- Never correct more than 1 thing per exchange
```

---

## المشكلة ٢ — لا آلية Shadowing

### تحليلي للخطأ:
وصفت الـ Shadowing في `docs/engineering_prompts.md` كـ "تقنية"، لكن لم أجعلها **فعل إلزامي** في Layer 2 Mission Flow. لذا الوكيل المبرمج لم ينفذها.

### الحل — إضافة مرحلة Warm-up كحالة منفصلة:

الـ State Machine يجب أن يكون:
```
HOOK (45s) → WARMUP (90s) → MISSION (180s) → DEBRIEF (60s) → REWARD (45s)
```

### تصميم الـ Warm-up الفعلي:

```markdown
## WARMUP PHASE — "Gear Up" (90 seconds)

This phase has THREE sub-steps. All three must happen.

### Sub-step 1: Vocabulary Preview (30 seconds)
Show the student the words they will use today.

AI says (in Arabic): "قبل ما نبدأ، فيه 3 كلمات مهمة اليوم:"
AI pronounces each word 2 times, slowly:
  - "Window seat — كرسي بجوار النافذة"
  - "Window seat" (student should listen)
  - "Window seat" (student should listen)

AI: "كرّر معي: window seat"
Student: "window seat"
AI: "ممتاز! كلمة ثانية:"

Continue for 3-5 key words.

### Sub-step 2: Pattern Preview (30 seconds)
Show the sentence pattern they will use.

AI: "النهار بنستخدم جملة مهمة:
     I would like + [شيء]
     يعني: أريد [شيء]"

AI: "اسمع:
     I would like a window seat
     I would like a coffee
     I would like a burger"

AI: "الحين كرّر معي ببطء:
     I... would... like... a... window... seat"

Student repeats.

AI: "ممتاز! مرة ثانية أسرع شوية:
     I would like a window seat"

Student repeats.

### Sub-step 3: Quick Practice (30 seconds)
Give 2 quick substitution drills.

AI: "لو تبي قهوة بدل كرسي، شنو تقول؟
     I would like..."
Student: "I would like a coffee"
AI: "YES! ممتاز! ولو تبي برجر؟"
Student: "I would like a burger"
AI: "WOW! أنت بطل! الحين نبدأ المهمة الحقيقية."
```

### التحديث المطلوب لـ Layer 2 (كل ملف مهمة):

أضف هذا القسم قبل `## SCENARIO FLOW`:

```markdown
## WARMUP SEQUENCE (90 seconds — MANDATORY before Mission)

### Step 1: Vocabulary Preview (30s)
[Bạn 3-5 target vocabulary words with pronunciation]

### Step 2: Pattern Preview (30s)  
[Introduce the target sentence pattern with examples]

### Step 3: Quick Substitution Drill (30s)
[2-3 quick substitutions to lock the pattern]

DO NOT proceed to Mission until Warmup is complete.
The Mission scenario flow BEGINS AFTER Warmup.
```

---

## المشكلة ٣ — لا استخدام للعربية في التعليم

### تحليلي للخطأ:
في Layer 1، قيّدت العربية لـ ٣ عبارات كحد أقصى. هذا صحيح للمتقدمين، لكن يخلق "وحشة" للمبتدئين الذين يحتاجون توجيهاً واضحاً بلغتهم الأم.

### الحل — استراتيجية عربية متدرجة:

### مرحلة استخدام العربية حسب تقدم الطفل:

| المرحلة | نسبة العربية | متى |
|---|---|---|
| المرحلة ١ (مهمة ١-٢) | ٢٥-٣٥٪ | تعليم، تصحيح، تشجيع، شرح المهمة |
| المرحلة ٢ (مهمة ٣-٤) | ١٥-٢٠٪ | تصحيح + تشجيع فقط |
| المرحلة ٣ (مهمة ٥) | ٥-١٠٪ | تشجيع فقط |
| المستوى ٢ | < ٥٪ | نادراً جداً |

### متى يستخدم AI العربية (في المرحلة الأولى):

✅ **مسموح**:
- شرح القاعدة أو المفهوم (مرة واحدة)
- التصحيح اللطيف ("تقصد...")
- التشجيع ("ممتاز يابطل"، "رائع"، "أحسنت")
- إعطاء تلميح ("جرّب تقول...")
- بداية المهمة (شرح الموقف)
- التحقق من الفهم ("فهمت؟")

❌ **ممنوع**:
- المحادثة الإنجليزية الفعلية (الأسئلة والأجوبة)
- كلمات المهمة نفسها (يجب أن تُنطق بالإنجليزية)
- أكثر من جملتين عربيتين متتاليتين

### عبارات عربية معتمدة للتصحيح والتشجيع:

```markdown
## APPROVED ARABIC PHRASES (Phase 1)

### For Correction:
- "تقصد: [correct form]"
- "انتبه: [specific point]"
- "حرف [X] يُنطق [Y]"
- "كرّر معي: [word/sentence]"
- "أعد مرة ثانية:"
- "جرّب تقول: [hint]"
- "شوف الفرق: [wrong] vs [correct]"

### For Encouragement:
- "ممتاز يابطل!"
- "رائع!"
- "أحسنت!"
- "YES! كذا صح"
- "ما شاء الله، تقدمت كثير"
- "بطل! أنت تقدر"
- "حلو! استمر"

### For Instruction:
- "اسمع أول:"
- "الحين كرّر:"
- "ركز معي:"
- "لا تنسى [X]"
- "تذكر: [tip]"

### For Check-in:
- "فهمت؟"
- "محتاج مساعدة؟"
- "نكمل؟"
- "صعب؟ لا تخاف، نتعلم سوا"
```

### التحديث المطلوب لـ Layer 1:

استبدل قسم "When to use Arabic" بالتالي:

```markdown
## ARABIC USAGE POLICY (Phase 1 — Missions 1-2)

### Arabic is ALLOWED for:
1. **Teaching moments** — explaining a rule or pattern
2. **Corrections** — gentle direct corrections (Level 1)
3. **Encouragement** — praise and motivation
4. **Hints** — when student is stuck
5. **Mission setup** — explaining the scenario
6. **Comprehension check** — "فهمت؟"

### Arabic is FORBIDDEN for:
1. **The actual English conversation** — questions and answers stay English
2. **Target vocabulary** — must be pronounced in English
3. **More than 2 consecutive Arabic sentences** — breaks immersion

### Ratio Target:
- Phase 1 (Missions 1-2): 25-35% Arabic
- Phase 2 (Missions 3-4): 15-20% Arabic  
- Phase 3 (Mission 5): 5-10% Arabic
- Level 2: <5% Arabic

### Approved Arabic Phrases (use these, don't invent new ones)
[See full list in approved_phrases section above]
```

---

## المشكلة ٤ — AI لا يبدأ الحوار

### تحليلي للخطأ:
في Mission Flow، جعلت أول تبادل AI يسأل الطالب سؤالاً مباشراً: "Where are you flying today?". هذا يضع الطفل في موقف دفاعي منذ الثانية الأولى.

### الحل — AI يبدأ بـ "Ice-Breaker" ثم يشرح الموقف:

### هيكل بداية المهمة الصحيح:

```markdown
## MISSION OPENING (replaces current Exchange 1)

### Step 1: Ice-Breaker (10-15 seconds)
AI starts with a warm Arabic greeting + English intro:

AI: "أهلاً يا بطل! أنا خالد، موظف المطار.
     اليوم أول رحلة لك، صح؟
     
     Hi! I'm Khalid. I work at the airport.
     Are you ready for your first flight?"

Student responds (any way they can).

### Step 2: Scenario Setup (10-15 seconds)  
AI explains the situation in Arabic:

AI: "أنت رايح لدبي. عندي أسئلة بسيطة.
     ما تخاف، أنا أساعدك.
     
     You're flying to Dubai. I'll ask you some questions.
     Don't worry, I'll help you. OK?"

Student: "OK" / "Yes" / anything

### Step 3: First Real Question (warm)
NOW ask the first mission question:

AI: "Great! So, where are you flying today? 
     You can say: 'To Dubai'"
```

### لماذا هذا أفضل؟

| الطريقة القديمة | الطريقة الجديدة |
|---|---|
| سؤال مفاجئ → قلق | ترحيب → اطمئنان |
| الإنجليزية فقط → وحشة | عربي + إنجليزي → أمان |
| لا شرح للسياق → ارتباك | شرح واضح → استعداد |
| الطفل يدخل "بارداً" | الطفل يدخل "دافئاً" |

---

## المشكلة ٥ — لا Warm-up للمفردات

(تم حلها في المشكلة ٢ — انظر قسم WARMUP SEQUENCE)

---

## المشكلة ٦ — لا مؤشر تقدم بصري

### تحليلي للخطأ:
الـ DESIGN_SYSTEM.md يصف شريط التقدم (٦ دوائر)، لكن:
1. لم أربطه بحالات الـ State Machine
2. لم أحدد متى تتحول الدائرة لـ ✓
3. الوكيل المبرمج لم يعرف متى يُحدِّث الـ UI

### الحل — ربط الـ Progress Indicators بالـ State:

### مؤشرات التقدم المطلوبة (٤ مستويات):

#### المؤشر ١ — تقدم الجلسة الكلية (الوقت)
```
[████████░░░░░░░░] 4:30 / 7:00
```
- يُحدَّث كل ثانية
- يتغير لونه: أخضر (بداية) → أصفر (٤ دقائق) → أحمر (٦ دقائق)

#### المؤشر ٢ — تقدم المرحلة (Phase Indicator)
```
🔥 Warmup  ●━━━━━━━━━━━━━━━━━━━  Mission
           ✅        🔵(now)         ⬜
```
- ٥ مراحل: Hook → Warmup → Mission → Debrief → Reward
- المرحلة المكتملة: ✓ أخضر
- المرحلة الحالية: دائرة ذهبية نابضة
- المرحلة القادمة: رمادي

#### المؤشر ٣ — تقدم المهمة (Exchanges)
```
✓ ✓ 🔵 ▢ ▢ ▢    Exchange 3 of 6
```
- ٦ دوائر تمثل تبادلات المهمة
- ✓ أخضر = تبادل ناجح
- 🔵 ذهبي نابض = التبادل الحالي
- ▢ رمادي = لم يصل بعد

#### المؤشر ٤ — تقدم النطق (Pronunciation Score)
```
Pronunciation: ████████░░ 87%
```
- يُحدَّث بعد كل تبادل
- يُعرض فقط إذا كانت الدقة > ٥٠٪

### كود React المقترح:

```typescript
// src/components/ProgressIndicators.tsx

export function SessionProgress({ 
  timeElapsed, 
  totalTime, 
  currentPhase,
  currentExchange, 
  totalExchanges,
  completedExchanges,
  pronunciationScore 
}) {
  return (
    <div className="progress-container">
      {/* 1. Time Progress */}
      <TimeBar 
        elapsed={timeElapsed} 
        total={totalTime}
        warningAt="04:00"
        dangerAt="06:00"
      />
      
      {/* 2. Phase Progress */}
      <PhaseTracker 
        current={currentPhase}
        phases={['Hook', 'Warmup', 'Mission', 'Debrief', 'Reward']}
      />
      
      {/* 3. Exchange Progress */}
      <ExchangeTracker 
        current={currentExchange}
        total={totalExchanges}
        completed={completedExchanges}
      />
      
      {/* 4. Pronunciation (if > 50%) */}
      {pronunciationScore > 0.5 && (
        <PronunciationBar score={pronunciationScore} />
      )}
    </div>
  );
}
```

### متى تُحدَّث المؤشرات؟

| المؤشر | متى يُحدَّث |
|---|---|
| الوقت | كل ثانية (setInterval) |
| المرحلة | عند الانتقال بين Hook/Warmup/Mission/Debrief/Reward |
| التبادلات | عند إكمال كل تبادل (من JSON output من Gemini) |
| النطق | بعد كل تبادل (من pronunciation_scores في JSON) |

---

## المشكلة ٧ — الاستدعاء المتباعد غير ظاهر

### تحليلي للخطأ:
الـ SRS engine يعمل في الخلفية، لكن:
1. الطفل لا يرى المراجعات (لأنها مخفية في القصص)
2. الوكيل المبرمج قد لا يكون فعّل الـ `getReviewsForMission()`

### الحل — إظهار SRS للطالب بشكل لطيف:

### آلية "كلماتي" (My Words):

أضف شاشة/قسم يعرض للطفل كلماته التي يتعلمها:

```
📚 كلماتي (15 كلمة)

⭐ أتقنت (5):
window seat, passport, boarding pass, ...

🔄 أتعلم (7):
gate, aisle seat, ... 

🆕 جديدة (3):
the bill, delicious, menu
```

### آلية "مراجعة سريعة" أثناء المهمة:

قبل بدء المهمة الجديدة، إذا كانت هناك كلمات مستحقة للمراجعة:

```
🧠 مراجعة سريعة (30 ثانية)

قبل ما نبدأ، خلنا نراجع 3 كلمات تعلمناها:

١. "window seat" — كرّر: ________  ✓ ممتاز!
٢. "passport" — كرّر: ________  ✓ أحسنت!
٣. "gate" — كرّر: ________  ✓ رائع!

الحين نبدأ المهمة الجديدة! 🚀
```

### التحديث المطلوب للكود:

```typescript
// في بداية كل جلسة، تحقق من المراجعات المستحقة
async function startSession(studentId: string, missionId: string) {
  const student = await getStudent(studentId);
  const dueReviews = getReviewsForMission(student.vocabulary, 3);
  
  if (dueReviews.length > 0) {
    // اعرض شاشة "مراجعة سريعة" قبل المهمة
    return {
      phase: 'quick_review',
      reviewWords: dueReviews,
      nextPhase: 'mission'
    };
  }
  
  // ابدأ المهمة مباشرة
  return { phase: 'mission' };
}
```

### في Layer 4 Prompt:

```markdown
## SRS INJECTION (Real-time)

If student has due review items, BEFORE starting the mission:

1. Show "Quick Review" screen (30 seconds)
2. For each review word (max 3):
   - AI says the word in English
   - Student repeats
   - AI gives feedback
   - Move to next word
3. After review, transition to Warmup phase
4. During mission, NATURALLY use these reviewed words in context

Example injection:
- If "window seat" was reviewed
- During mission, AI asks: "Would you like a window seat?"
- Student has just practiced it → higher success rate → confidence boost
```

---

## المشكلة ٨ — لا تكييف لطالب ضعيف

### تحليلي للخطأ:
Layer 4 يكتشف الإحباط، لكن الاستجابة عامة ("COMFORT MODE"). لا توجد آلية لتغيير أسلوب التعليم نفسه.

### الحل — ثلاثة أوضاع تعليمية:

### الوضع ١ — Beginner Mode (للطالب الجديد أو الضعيف)

**متى يُفعّل؟**
- طالب جديد تماماً (أول ٣ جلسات)
- CEFR level = A1 (مبتدئ)
- أكثر من ٢ تلميح في آخر جلسة
- ٣+ محاولات فاشلة متتالية

**كيف يختلف؟**

```markdown
## BEGINNER MODE (Layer 4 addition)

When in Beginner Mode, apply these rules:

### Conversation Style
- Ask ONE question at a time (never compound questions)
- Use maximum 5-word sentences
- Provide the expected answer in the question:
  ❌ "Where are you flying?"
  ✅ "Are you flying to Dubai? Yes or no?"
- After their answer, ALWAYS repeat it correctly before moving on

### Vocabulary
- Use only words from today's Warmup
- If student doesn't know a word, immediately translate to Arabic
- Don't introduce more than 2 new words per exchange

### Correction Style
- Use Level 1 (Gentle Direct Correction) for ALL errors
- Always explain in Arabic WHY the correction
- Have them repeat the correct form 2-3 times before continuing

### Pacing
- Slower speech rate (50% slower)
- Longer pauses between sentences (1 second)
- After every exchange, check: "فهمت؟ نكمل؟"

### Help Offering
- After ANY hesitation > 2 seconds, offer: "تحب أساعدك؟"
- Always provide a model answer as a hint
- Use binary choices frequently: "A or B?"
```

### الوضع ٢ — Standard Mode (الافتراضي)

```markdown
## STANDARD MODE
- Normal pace
- Mix of Level 1, 2, 3 corrections
- Standard hint timing (3 seconds)
- 6 exchanges per mission
```

### الوضع ٣ — Advanced Mode (للطالب المتقدم)

```markdown
## ADVANCED MODE
When student shows mastery (3+ exchanges without hints):

- Faster pace
- Use Level 3 (Silent Recast) mostly
- Introduce small challenges ("Can you say it differently?")
- Less Arabic (5-10%)
- Open-ended questions
```

### كود اكتشاف الوضع:

```typescript
function detectMode(student: Student, sessionHistory: Session[]): 
  'beginner' | 'standard' | 'advanced' {
  
  // New student = beginner
  if (student.total_sessions < 3) return 'beginner';
  
  // Recent struggles = beginner
  const lastSession = sessionHistory[sessionHistory.length - 1];
  if (lastSession?.hints_used > 2 || lastSession?.frustration_detected) {
    return 'beginner';
  }
  
  // Recent mastery = advanced
  if (lastSession?.successful_exchanges === 6 && lastSession?.hints_used === 0) {
    return 'advanced';
  }
  
  return 'standard';
}
```

---

## المشكلة ٩ — لا دروس تأسيسية

### تحليلي للخطأ:
المهمة ١ (المطار) تبدأ بـ "Where are you flying?" — هذا فوق مستوى طفل لم ينطق جملة كاملة من قبل.

### الحل — إضافة "المهمة ٠" (Mission Zero):

```markdown
# MISSION 0 — "First Words" (تقديم النفس)
# Phase: 0 (Foundation) | CEFR: A0 → A1
# This mission is MANDATORY for all new students

## NARRATIVE SETUP

"🎯 مهمتك الأولى الأولى!

قبل ما نسافر، لازم نتعلم نسلم على الناس.
كل رحلة تبدأ بكلمة: 'Hello'!

أنا الكابتن، وراح أعلمك أول 3 جمل.
لا تخاف — نبدأ من الصفر، خطوة خطوة."

## AI CHARACTER
- Name: Captain (الكابتن نفسه)
- Role: Friendly guide
- Heavy Arabic use (50%) — this is the foundation

## WARMUP (90 seconds — extra long for Mission 0)

### Step 1: Single Word Preview (45 seconds)
AI: "أول كلمة: Hello — تعني 'مرحباً'
     اسمع: Hello... Hello...
     الحين كرّر: Hello"
Student: "Hello"
AI: "ممتاز! مرة ثانية: Hello"
Student: "Hello"
AI: "YES! حلو. كلمة ثانية: Hi — بعد تعني مرحباً
     كرّر: Hi"
Student: "Hi"
AI: "أحسنت! كلمة ثالثة: Bye — تعني 'مع السلامة'
     كرّر: Bye"
Student: "Bye"
AI: "WOW! أنت بطل! تعلمت 3 كلمات!"

### Step 2: Pattern Preview (30 seconds)
AI: "الحين جملة واحدة بس:
     'Hello, I am [your name]'
     يعني: مرحباً، أنا [اسمك]
     
     اسمع: Hello, I am Khalid
     مرة ثانية: Hello, I am Khalid
     
     الحين كرّر معي ببطء:
     Hello... I... am... [your name]"

### Step 3: Quick Practice (15 seconds)
AI: "لو اسمك أحمد، شنو تقول؟"
Student: "Hello, I am Ahmed"
AI: "YES! ممتاز يابطل!"

## MISSION SCENARIO (5 exchanges — shorter)

### Exchange 1 — First greeting
AI: "أهلاً! أنا الكابتن. 
     First, say hello to me! 
     قل: Hello"
Student: "Hello"
AI: "ممتاز! Hi also means hello. 
     Try: Hi!"
Student: "Hi"
AI: "YES! رائع يابطل!"

### Exchange 2 — Introduce yourself
AI: "الحين عرّفني بنفسك.
     قل: 'I am [your name]'
     مثلاً: I am Khalid"
Student: "I am [name]"
AI: "WOW! Nice to meet you, [name]!"

### Exchange 3 — Full greeting
AI: "الحين نجمعها:
     'Hello, I am [your name]'
     جرّب!"
Student: "Hello, I am [name]"
AI: "YES! ممتاز! كذا صح!"

### Exchange 4 — Saying goodbye
AI: "آخر كلمة: Bye — مع السلامة.
     قل: Bye"
Student: "Bye"
AI: "أحسنت! كذا ننهي المحادثة."

### Exchange 5 — Celebration
AI: "🎉 ما شاء الله! تعلمت:
     - Hello / Hi
     - I am [name]
     - Bye
     
     أنت جاهز للمهمة الأولى الحقيقية:
     المطار! 🛫"

## REWARDS
- 100 points (highest reward — first achievement)
- Badge: "First Words" — أول كلمات
- Unlock: Mission 1 (Airport)

## NO CLIFFHANGER
Instead, direct celebration:
"غداً: أول رحلة! المطار ينتظرك 🛫"
```

---

## المشكلة ١٠ — لا آلية طلب المساعدة

### الحل — زر "مساعدة" دائم:

### التصميم:

```
خلال المهمة، يوجد زر دائم في الأسفل:

┌────────────────────────┐
│  💡 مساعدة  |  ⏭️ تخطي   │
└────────────────────────┘
```

### سلوك زر المساعدة:

| الحالة | ما يحدث |
|---|---|
| الطفل يضغط "مساعدة" | AI: "تحب أساعدك؟ قل: [model answer]" |
| الطفل يضغط "مساعدة" مرة ٢ | AI: "الجواب هو: [answer]. كرّر معي:" |
| الطفل يضغط "مساعدة" مرة ٣ | AI: "لا بأس! ننتقل لسؤال أسهل." + skip |

### إضافة لـ Layer 4:

```markdown
## HELP REQUEST HANDLING

When student presses "Help" button:

### First press:
AI says (Arabic): "تحب أساعدك؟"
AI gives hint: "جرّب تقول: [first 2 words of expected answer]"

### Second press:
AI says: "الجواب كامل: [full answer]"
AI asks: "كرّر معي: [full answer]"

### Third press:
AI says: "لا بأس! سؤال أسهل."
Skip to next exchange with positive note: "ما عليك، نتعلم سوا."

Track help_presses_count in session data.
If help_presses > 3 in a session → switch to Beginner Mode.
```

---

## المشكلة ١١ — لا تكرار عبر سياقات

### تحليلي للخطأ:
هذه نقطة ذكية جداً منك. التلعيب (gamification) لا يُعلّم — التكرار المُتنوع يُعلّم. الطفل الذي يتعلم "Hello, how are you?" يجب أن يستخدمها في ٥ سياقات مختلفة قبل أن تُرسي في ذاكرته.

### الحل — آلية "تطبيق في سياقات متعددة" (Multi-Context Application):

### تصميم الدروس المتكررة عبر السياقات:

```markdown
## MULTI-CONTEXT APPLICATION DRILL

After learning a new pattern, AI gives 3-5 scenarios 
where the SAME pattern applies.

### Example: After learning "Hello, how are you?"

AI: "تعلمت: 'Hello, how are you?'
     الحين نستخدمها في 5 أماكن مختلفة!"

### Context 1 — School
AI: "🚪 دخلت المدرسة الصبح. شفت صديقك. شنو تقول؟"
Student: "Hello, how are you?"
AI: "YES! ممتاز!"

### Context 2 — Grocery store  
AI: "🛒 دخلت البقالة. شفت العم. شنو تقول؟"
Student: "Hello, how are you?"
AI: "أحسنت! العم راح يفرح فيك!"

### Context 3 — Family gathering
AI: "🏠 جتك عيال عمك. شنو تقول أول شي؟"
Student: "Hello, how are you?"
AI: "YES! كذا صح!"

### Context 4 — Doctor's office
AI: "🏥 دخلت عند الدكتور. شنو تقول؟"
Student: "Hello, how are you?"
AI: "ممتاز! مهذب!"

### Context 5 — New neighbor
AI: "👋 جارك الجديد. شنو تقول أول مرة تشوفه؟"
Student: "Hello, how are you?"
AI: "WOW! صرت بطل المحادثات!"

### Final reinforcement:
AI: "🎉 شفت؟ نفس الجملة تنفع في كل مكان!
     'Hello, how are you?' — جملة سحرية!
     بكرة نتعلم جملة ثانية تنفع في كل مكان."
```

### التحديث لكل مهمة:

أضف هذا القسم بعد الـ Mission، قبل الـ Debrief:

```markdown
## MULTI-CONTEXT APPLICATION (60 seconds — after Mission, before Debrief)

Take ONE pattern from today's mission and apply it in 3-5 different contexts.

### Format:
1. AI introduces: "الحين نستخدم [pattern] في أماكن مختلفة!"
2. For each context (3-5 contexts):
   - AI describes scenario (Arabic + emoji)
   - Student uses the pattern
   - AI celebrates
3. Final reinforcement: "نفس الجملة تنفع في كل مكان!"

### Contexts per pattern:
- "Hello, how are you?" → school, store, family, doctor, neighbor
- "I would like [X]" → restaurant, hotel, shop, airplane, cafe
- "Can I have [X]?" → restaurant, hotel, shop, library, office
- "How much is [X]?" → shop, market, online, taxi, restaurant
- "Where is [X]?" → airport, hotel, mall, school, hospital
```

### كود المقترح:

```typescript
// src/engine/multiContext.ts

interface ContextScenario {
  emoji: string;
  description_ar: string;
  expected_pattern: string;
}

const contextBank: Record<string, ContextScenario[]> = {
  'hello_how_are_you': [
    { emoji: '🚪', description_ar: 'دخلت المدرسة الصبح. شفت صديقك.', expected_pattern: 'Hello, how are you?' },
    { emoji: '🛒', description_ar: 'دخلت البقالة. شفت العم.', expected_pattern: 'Hello, how are you?' },
    { emoji: '🏠', description_ar: 'جاك عيال عمك.', expected_pattern: 'Hello, how are you?' },
    { emoji: '🏥', description_ar: 'دخلت عند الدكتور.', expected_pattern: 'Hello, how are you?' },
    { emoji: '👋', description_ar: 'شفت جارك الجديد.', expected_pattern: 'Hello, how are you?' },
  ],
  'i_would_like': [
    { emoji: '🍽️', description_ar: 'في المطعم. تبي تطلب.', expected_pattern: 'I would like...' },
    { emoji: '🏨', description_ar: 'في الفندق. تبي غرفة.', expected_pattern: 'I would like...' },
    { emoji: '🛍️', description_ar: 'في المحل. تبي قميص.', expected_pattern: 'I would like...' },
    { emoji: '✈️', description_ar: 'في الطائرة. تبي عصير.', expected_pattern: 'I would like...' },
    { emoji: '☕', description_ar: 'في الكافيه. تبي قهوة.', expected_pattern: 'I would like...' },
  ],
  // ... المزيد
};

export function generateMultiContextDrill(patternId: string): ContextScenario[] {
  return contextBank[patternId] || [];
}
```

---

# الفصل الثاني: الـ State Machine المُحدَّث

## الـ State Machine القديم (٥ حالات):
```
HOOK → WARMUP → MISSION → DEBRIEF → REWARD
```

## الـ State Machine الجديد (٨ حالات):
```
ICE_BREAK → QUICK_REVIEW → WARMUP → MISSION → MULTI_CONTEXT → DEBRIEF → REWARD → END
```

### تفاصيل كل حالة:

| الحالة | المدة | الوصف |
|---|---|---|
| ICE_BREAK | ٢٠s | AI يبدأ بترحيب دافئ + شرح الموقف |
| QUICK_REVIEW | ٣٠s (اختياري) | مراجعة كلمات مستحقة (SRS) |
| WARMUP | ٩٠s | معاينة المفردات + النمط + تمرين سريع |
| MISSION | ١٨٠s | المحادثة الرئيسية (٦ تبادلات) |
| MULTI_CONTEXT | ٦٠s | تطبيق النمط في ٣-٥ سياقات |
| DEBRIEF | ٤٥s | كلمة البطل + الشعور |
| REWARD | ٣٠s | نقاط + شارة + cliffhanger |
| END | - | إخراج JSON |

**الزمن الإجمالي**: ٧ دقائق (٤٢٠ ثانية)

---

# الفصل الثالث: تحديثات Layer 1 الحرجة

## التعديلات المطلوبة على `prompts/layer1_base_persona.md`:

### ١. استبدل قسم "Rule 1: NEVER correct directly"
بالـ "CORRECTION PHILOSOPHY" الجديد (٣ مستويات) — انظر المشكلة ١.

### ٢. استبدل قسم "When to use Arabic"
بالـ "ARABIC USAGE POLICY" الجديد — انظر المشكلة ٣.

### ٣. أضف قسم جديد: "BEGINNER MODE SUPPORT"
```markdown
## BEGINNER MODE SUPPORT

When student is in Beginner Mode (auto-detected), apply:

### Conversation Adjustments
- Maximum 5 words per AI sentence
- One question at a time
- Provide model answer in question: "Are you flying to Dubai? Yes or no?"
- After every student response, repeat it correctly before next question
- Check comprehension: "فهمت؟ نكمل؟" after each exchange

### Vocabulary Adjustments  
- Use only words from today's Warmup
- Translate any new word immediately to Arabic
- Max 2 new words per exchange

### Correction Adjustments
- Use Level 1 (Gentle Direct Correction) for ALL errors
- Always explain WHY in Arabic
- Have student repeat correct form 2-3 times

### Help Adjustments
- Lower hint threshold to 2 seconds (instead of 3)
- After 2 silences, offer help proactively
- Use binary choices frequently
```

### ٤. أضف قسم: "MULTI-CONTEXT APPLICATION"
```markdown
## MULTI-CONTEXT APPLICATION PHASE

After Mission, before Debrief, run Multi-Context drill:

1. Take ONE pattern from today's mission
2. Apply it in 3-5 different real-life scenarios
3. For each scenario:
   - Describe scenario in Arabic with emoji
   - Wait for student to use the pattern
   - Celebrate specifically
4. End with reinforcement: "نفس الجملة تنفع في كل مكان!"

This phase is CRITICAL for pattern internalization.
Without it, student memorizes but doesn't generalize.
```

### ٥. أضف قسم: "HELP REQUEST PROTOCOL"
```markdown
## HELP REQUEST PROTOCOL

When student presses Help button:

Press 1: "تحب أساعدك؟ جرّب: [first 2 words]"
Press 2: "الجواب: [full answer]. كرّر معي:"  
Press 3: "ما عليك! ننتقل لسؤال أسهل." + skip

Track help_presses. If > 3 per session, switch to Beginner Mode.
```

---

# الفصل الرابع: تحديثات Layer 2 الحرجة

## لكل ملف مهمة (mission_01 إلى mission_05):

### ١. أضف قسم WARMUP SEQUENCE مفصل
(انظر المشكلة ٢)

### ٢. أضف قسم MULTI-CONTEXT DRILL
(انظر المشكلة ١١)

### ٣. عدّل أول تبادل ليكون ICE_BREAK
(انظر المشكلة ٤)

### ٤. أضف Mission Zero
(انظر المشكلة ٩)

---

# الفصل الخامس: تحديثات Layer 4 الحرجة

## أضف الأقسام التالية لـ `layer4_realtime_template.md`:

### ١. Mode Detection (كل ٣٠ ثانية)
```markdown
## MODE DETECTION (every 30 seconds)

Auto-detect student mode based on:
- Total sessions completed
- Last session hints_used
- Current session hints_used
- Frustration indicators

Switch mode if needed:
- 3+ hints in current session → BEGINNER MODE
- 0 hints + 3+ successful exchanges → ADVANCED MODE
- Default → STANDARD MODE

Apply mode-specific rules from Layer 1.
```

### ٢. Help Press Tracking
```markdown
## HELP PRESS TRACKING

Track help_presses_count in real-time.
Update Layer 1 rules based on count:

0 presses: Standard help threshold (3s silence)
1 press: Lower to 2s, offer proactively
2 presses: Switch to BEGINNER MODE
3+ presses: End mission early with positive note
```

---

# الفصل السادس: تحديثات الـ Frontend

## إضافات مطلوبة في React:

### ١. مكون ProgressIndicators
(انظر المشكلة ٦)

### ٢. مكون HelpButton
```typescript
// src/components/HelpButton.tsx
export function HelpButton({ onPress, pressCount }) {
  return (
    <button 
      onClick={onPress}
      className={pressCount >= 2 ? 'help-button urgent' : 'help-button'}
    >
      💡 مساعدة
    </button>
  );
}
```

### ٣. شاشة QuickReview (قبل المهمة)
```typescript
// src/screens/QuickReview.tsx
export function QuickReview({ reviewWords, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  return (
    <div className="quick-review">
      <h2>🧠 مراجعة سريعة</h2>
      <p>قبل ما نبدأ، خلنا نراجع {reviewWords.length} كلمات</p>
      
      <WordCard 
        word={reviewWords[currentIndex]}
        onComplete={() => setCurrentIndex(i => i + 1)}
      />
      
      <ProgressTracker 
        current={currentIndex + 1}
        total={reviewWords.length}
      />
    </div>
  );
}
```

### ٤. شاشة MultiContext (بعد المهمة)
```typescript
// src/screens/MultiContext.tsx
export function MultiContext({ scenarios, pattern, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(0);
  
  return (
    <div className="multi-context">
      <h2>🎯 نستخدمها في أماكن مختلفة!</h2>
      
      <ContextCard 
        scenario={scenarios[currentIndex]}
        expectedPattern={pattern}
        onComplete={() => {
          setCompleted(c => c + 1);
          setCurrentIndex(i => i + 1);
        }}
      />
      
      <p>{completed} / {scenarios.length} سياقات</p>
    </div>
  );
}
```

### ٥. زر "مساعدة" دائم في شاشة المهمة
(انظر المشكلة ١٠)

---

# الفصل السابع: خطة التنفيذ للوكيل المبرمج

## الترتيب الموصى به للإصلاحات:

### الأولوية القصوى (افعلها أولاً):
١. ✅ تحديث Layer 1 (قسم التصحيح + قسم العربية + Beginner Mode)
٢. ✅ إضافة Mission Zero (تأسيس)
٣. ✅ إضافة Warmup Phase لكل مهمة
٤. ✅ تعديل أول تبادل ليكون Ice-Breaker
٥. ✅ إضافة Multi-Context Phase

### الأولوية العالية:
٦. ✅ إضافة Help Button + Protocol
٧. ✅ إضافة Progress Indicators (٤ مستويات)
٨. ✅ إضافة Quick Review Screen (SRS)
٩. ✅ إضافة Mode Detection في Layer 4

### الأولوية المتوسطة:
١٠. ✅ شاشة "كلماتي" (My Words)
١١. ✅ ربط الـ Progress Indicators بالـ State Machine

---

## كود تحديث الـ Prompt Builder:

```typescript
// engine/prompt_builder.ts (تحديث)

export class PromptBuilder {
  
  buildSessionPrompt(context: PromptBuildContext): string {
    const layer1 = this.loadLayer1(); // محدّث
    const layer2 = this.loadLayer2(context.mission.id); // محدّث
    const layer3 = this.generateLayer3(context); // محدّث
    const layer4 = this.generateLayer4(context); // محدّث
    
    // إضافة الأوامر الهندسية الجديدة
    const correctionRules = this.getCorrectionRules();
    const arabicPolicy = this.getArabicPolicy(context.student);
    const modeRules = this.getModeRules(context.student);
    const multiContextRules = this.getMultiContextRules();
    const helpProtocol = this.getHelpProtocol();
    
    return this.combineLayers([
      layer1,
      correctionRules,
      arabicPolicy,
      modeRules,
      layer2,
      layer3,
      layer4,
      multiContextRules,
      helpProtocol
    ]);
  }
  
  private getCorrectionRules(): string {
    return `
## CORRECTION PHILOSOPHY (3 Levels)

### Level 1 — Gentle Direct Correction (structural errors)
- Acknowledge effort (Arabic OK)
- State correct form: "تقصد: [correct]"
- Brief reason (Arabic): "حرف 'to' مهم"
- Have them repeat: "كرّر معي"
- Celebrate + continue

### Level 2 — Enhanced Modeling (pronunciation)
- Praise what's right
- Isolate word: "Listen: WINDOW"
- Tip (Arabic): "حرف v — أسناني على شفتي"
- Repeat 2-3 times
- Full sentence again
- Celebrate

### Level 3 — Silent Recast (minor errors)
- Just use correct form in next response
- Don't interrupt flow
`;
  }
  
  private getArabicPolicy(student: Student): string {
    const phase = student.current_phase;
    const ratio = phase === 1 ? '25-35%' : phase === 2 ? '15-20%' : '5-10%';
    
    return `
## ARABIC USAGE POLICY (Phase ${phase})
Target Arabic ratio: ${ratio}

ALLOWED for: teaching, correction, encouragement, hints, scenario setup, comprehension check
FORBIDDEN for: English conversation, target vocabulary, 2+ consecutive Arabic sentences
`;
  }
  
  // ... باقي الدوال
}
```

---

## كلمة أخيرة

أنت اكتشفت مشاكل حقيقية لأنك اختبرت بصدق. هذه المشاكل ليست أخطاء برمجية — هي **أخطاء في فهم سيكولوجية التعلم**:

### الأخطاء الجوهرية التي ارتكبتها:
1. **نقلت قواعد الكبار للأطفال** — التصحيح المباشر "محرج" للكبار، لكن ضروري للأطفال
2. **خفت العربية أكثر من اللازم** — الطفل المبتدئ يحتاج أمان لغته الأم
3. **ركزت على التلعيب على حساب التكرار** — التكرار المتنوع أقوى من النقاط
4. **لم أُفصّل الـ Warmup كفعل** — وصفته ك concept لكن لم أجعله إلزامياً
5. **بدأت بـ "أين تطير؟" بدل "مرحباً"** — قفزت للصعب قبل السهل

### المعادلة السحرية التي نسعى لها:
```
البساطة (Mission 0) 
+ التكرار المتنوع (Multi-Context) 
+ التصحيح اللطيف (3 Levels) 
+ العربية الداعمة (Phase-based) 
+ التكييف (Beginner Mode) 
+ المؤشرات البصرية (4 Indicators)
+ المساعدة المطلوبة (Help Protocol)
+ الاستدعاء المتباعد الظاهر (Quick Review)
=
تعلم عميق + إدمان صحي + ثقة متزايدة
```

**أعطِ هذه الوثيقة للوكيل المبرمج. كل مشكلة فيها حل محدد بكود و prompt. ابدأ بالأولويات القصوى.**
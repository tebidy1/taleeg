# 🚨 وثيقة الترقية الحرجة — V2 Implementation Guide
## للوكيل المبرمج: اقرأ هذا الملف أولاً وقم بتنفيذه فوراً

---

## ⚠️ تحذير صارم للوكيل المبرمج

أنت تتعامل مع **مشروع قيد التطوير النشط**. هناك ملفات محدثة (V2) يجب أن تستبدل بها الملفات القديمة. إذا تجاهلت هذه التعليمات، التطبيق سيبقى به مشاكل التعليم التي اكتشفناها بعد الاختبار الميداني.

**قبل أي شيء**، اقرأ هذه الوثيقة بالكامل. لا تقفز إلى الكود. لا تبدأ بـ "أعتقد أن...". اقرأ، افهم، ثم نفّذ بالترتيب المحدد.

---

## 📋 المشكلة التي نحلها

بعد الاختبار الميداني الأول، اكتشفنا ١١ مشكلة حرجة في التطبيق:

1. لا تصحيح مباشر ولحظي للأطفال
2. لا توجد آلية Shadowing (تكرار المفردات)
3. قلة استخدام العربية في التعليم (الطفل يشعر بالوحشة)
4. AI لا يبدأ الحوار (يبدأ بسؤال مفاجئ)
5. لا Warmup للمفردات قبل المهمة
6. لا مؤشر تقدم بصري واضح
7. الاستدعاء المتباعد (SRS) غير ظاهر للطفل
8. لا تكييف للطالب الضعيف (Beginner Mode)
9. لا دروس تأسيسية (Mission Zero)
10. لا آلية لطلب المساعدة
11. لا تكرار عبر سياقات متعددة (Multi-Context)

**هذه المشاكل قاتلة**. التطبيق في حالته الحالية لا يُعلّم — هو فقط يُجري محادثة. الهدف من V2 هو تحويله من "محادثة" إلى "تعلم فعّال".

---

## 📁 الملفات التي يجب أن تعمل بها

هذه هي الملفات الـ ٤ الحالية التي يجب أن تستخدمها. **لا تستخدم الإصدارات القديمة**:

### الملفات الأساسية للترقية:

```
1. docs/CRITICAL_FIXES.md
2. docs/V2_METHODOLOGY.md  
3. prompts/layer2_missions/v2/mission_00_first_words.md
4. prompts/layer2_missions/v2/mission_01_airport.md
5. prompts/layer2_missions/v2/mission_02_airplane.md
```

### الملفات الأساسية (لم تتغير — استمر في استخدامها):

```
- schema/types.ts                          (بنية البيانات)
- data/phonemes.json                       (الأصوات الخمسة)
- data/patterns.json                       (الأنماط — أضف pat_000_greeting)
- data/vocabulary.json                     (الكلمات)
- prompts/layer3_student_adaptation_template.md  (تكييف الطالب)
- prompts/layer4_realtime_template.md      (القواعد اللحظية)
- engine/srs.ts                            (محرك الاستدعاء المتباعد)
- engine/prompt_builder.ts                 (باني الـ Prompts)
- engine/progression.ts                    (محرك التقدم)
- reports/whatsapp_template.ts             (تقارير واتساب)
- design/DESIGN_SYSTEM.md                  (دليل التصميم)
```

### الملفات التي يجب أن تُحدَّث (محتواها يتغير):

```
- prompts/layer1_base_persona.md           (أعد قراءته وتطبيق التحديثات)
- prompts/layer2_missions/mission_01_airport.md (قديم — استخدم v2 بدلاً منه)
- prompts/layer2_missions/mission_02_airplane.md (قديم — استخدم v2 بدلاً منه)
```

---

## 🎯 خطة التنفيذ — بالترتيب الإلزامي

### المرحلة ١: فهم التغييرات (لا تبرمج بعد)

#### المهمة ١.١: اقرأ ملف CRITICAL_FIXES.md بالكامل
**الملف**: `docs/CRITICAL_FIXES.md`
**الهدف**: فهم الـ ١١ مشكلة وحلولها التفصيلية
**المدة المتوقعة**: ٣٠ دقيقة قراءة بتركيز

**ما يجب أن تفهم منه**:
- لماذا التصحيح المباشر ضروري للأطفال (عكس الكبار)
- ٣ مستويات للتصحيح (Gentle Direct / Enhanced Modeling / Silent Recast)
- استراتيجية العربية المتدرجة (٤٠٪ → ٣٠٪ → ٢٥٪ → ٥٪)
- Beginner Mode ومتى يُفعّل
- Multi-Context Application وكيفية تنفيذه
- Help Protocol (٣ مستويات)
- الـ State Machine الجديد (٨ حالات بدل ٥)

**تحذير**: لا تتجاهل هذه القراءة. كل تعديل لاحق يعتمد على فهمك لهذا الملف.

---

#### المهمة ١.٢: اقرأ ملف V2_METHODOLOGY.md
**الملف**: `docs/V2_METHODOLOGY.md`
**الهدف**: فهم منهجية التراكيب (Pattern-Based Teaching)
**المدة المتوقعة**: ١٥ دقيقة

**ما يجب أن تفهم منه**:
- لماذا القواعد تفشل مع الأطفال
- ما هو التعليم بالتراكيب
- ٥ مراحل الإتقان (Recognition → Substitution → Expansion → Production → Transformation)
- القاعدة الذهبية: "علم نمطاً واحداً، استخدمه في ٥ سياقات"
- تراكم التراكيب عبر الدروس الثلاثة الأولى

---

#### الم任务 ١.٣: اقرأ الدروس الثلاثة الجديدة
**الملفات**:
- `prompts/layer2_missions/v2/mission_00_first_words.md`
- `prompts/layer2_missions/v2/mission_01_airport.md`
- `prompts/layer2_missions/v2/mission_02_airplane.md`

**الهدف**: فهم الهيكل الجديد للدروس (٨ حالات بدل ٥)
**المدة المتوقعة**: ٤٥ دقيقة

**ما يجب أن تلاحظه في كل درس**:
- كل درس له **تركيب واحد فقط** (Pattern Focus)
- كل درس يبدأ بـ **Ice Breaker** (AI يبدأ، عربي أولاً)
- **Warmup Phase** بـ ٣ خطوات فرعية (معاينة مفردات + معاينة نمط + تمرين سريع)
- **Mission Phase** بـ ٥ تبادلات (لا ٦ — أبسط)
- **Multi-Context Phase** يطبّق النمط في ٤ سياقات
- **Debrief + Reward** بنفس الشكل
- **Cliffhanger** للدرس التالي

---

### المرحلة ٢: تحديث Layer 1 (الشخصية الأساسية)

#### المهمة ٢.١: افتح ملف Layer 1
**الملف**: `prompts/layer1_base_persona.md`

#### المهمة ٢.٢: استبدل قسم "Rule 1: NEVER correct directly"

**اقرأ قسم "Rule 1" الحالي** (يبدأ بـ "NEVER correct directly — always RECAST").

**استبدله بالكامل** بالقسم الجديد الموجود في `docs/CRITICAL_FIXES.md` تحت عنوان:
> "## CORRECTION PHILOSOPHY (محدّث) — Three Levels of Correction"

**كيف تجده**:
1. افتح `docs/CRITICAL_FIXES.md`
2. ابحث عن العنوان: `## CORRECTION PHILOSOPHY (محدّث)`
3. انسخ كل المحتوى من هذا العنوان حتى نهاية قسم "When to Use Which Level"
4. الصقه في `prompts/layer1_base_persona.md` بدلاً من القسم القديم

**السبب**: الطفل المبتدئ يحتاج تصحيحاً مباشراً لطيفاً، لا recast صامت فقط. القاعدة القديمة كانت مناسبة للكبار، لا للأطفال.

---

#### المهمة ٢.٣: استبدل قسم "When to use Arabic"

**اقرأ قسم "When to use Arabic" الحالي** (يقول: استخدم العربية في ٣ عبارات كحد أقصى).

**استبدله بالكامل** بالقسم الجديد الموجود في `docs/CRITICAL_FIXES.md` تحت عنوان:
> "## ARABIC USAGE POLICY (Phase 1 — Missions 1-2)"

**كيف تجده**:
1. في `docs/CRITICAL_FIXES.md`
2. ابحث عن: `## ARABIC USAGE POLICY (Phase 1 — Missions 1-2)`
3. انسخ كل المحتوى حتى نهاية قسم "Approved Arabic Phrases"
4. الصقه في `prompts/layer1_base_persona.md` بدلاً من القسم القديم

**السبب**: الطفل المبتدئ يحتاج ٣٠-٤٠٪ عربية ليشعر بالأمان. تحديد العربية بـ ٣ عبارات يخلق وحشة.

---

#### المهمة ٢.٤: أضف أقسام جديدة إلى Layer 1

**أضف هذه الأقسام في نهاية Layer 1** (قبل قسم "SESSION METADATA OUTPUT"):

**القسم ١**: Beginner Mode Support
- مصدره: `docs/CRITICAL_FIXES.md`، تحت عنوان "BEGINNER MODE SUPPORT"
- ابحث عن: `## BEGINNER MODE SUPPORT`
- انسخ القسم بالكامل

**القسم ٢**: Multi-Context Application Phase
- مصدره: `docs/CRITICAL_FIXES.md`، تحت عنوان "MULTI-CONTEXT APPLICATION PHASE"
- ابحث عن: `## MULTI-CONTEXT APPLICATION PHASE`
- انسخ القسم بالكامل

**القسم ٣**: Help Request Protocol
- مصدره: `docs/CRITICAL_FIXES.md`، تحت عنوان "HELP REQUEST PROTOCOL"
- ابحث عن: `## HELP REQUEST PROTOCOL`
- انسخ القسم بالكامل

**السبب**: هذه الأقسام الثلاثة تنفّذ الميزات الجديدة (Beginner Mode + Multi-Context + Help Button).

---

### المرحلة ٣: استبدال ملفات الدروس القديمة

#### المهمة ٣.١: استبدل mission_01 القديم

**القديم**: `prompts/layer2_missions/mission_01_airport.md`
**الجديد**: `prompts/layer2_missions/v2/mission_01_airport.md`

**الإجراء**:
1. احذف محتوى الملف القديم: `prompts/layer2_missions/mission_01_airport.md`
2. انسخ محتوى الملف الجديد من: `prompts/layer2_missions/v2/mission_01_airport.md`
3. الصقه في: `prompts/layer2_missions/mission_01_airport.md`

أو بدلاً من ذلك:
1. احذف الملف القديم
2. انسخ الملف الجديد إلى نفس موقع الملف القديم (بنفس الاسم)

**السبب**: الملف الجديد يحتوي على:
- Ice Breaker Phase
- Warmup Phase مفصّل (٣ خطوات)
- ٥ تبادلات بدل ٦
- Multi-Context Phase (٤ سياقات)
- نسبة عربية أعلى (٣٠٪)
- استراتيجية تشويق للدرس التالي

---

#### الم任务 ٣.٢: استبدل mission_02 القديم

**القديم**: `prompts/layer2_missions/mission_02_airplane.md`
**الجديد**: `prompts/layer2_missions/v2/mission_02_airplane.md`

**الإجراء**: نفس الإجراء في المهمة ٣.١

**السبب**: نفس الأسباب المذكورة في ٣.١

---

#### المهمة ٣.٣: أضف mission_00 الجديد

**الموقع الجديد**: `prompts/layer2_missions/mission_00_first_words.md`

**الإجراء**:
1. انسخ الملف من: `prompts/layer2_missions/v2/mission_00_first_words.md`
2. الصقه في: `prompts/layer2_missions/mission_00_first_words.md` (بدون v2)

**السبب**: Mission 0 (First Words) هي **درس تأسيسي جديد** لم يكن موجوداً من قبل. يجب أن يكون أول مهمة لكل طالب جديد. بدونها، الطفل يدخل Mission 1 غير مُهيّأ.

---

### المرحلة ٤: تحديث ملف الأنماط (patterns.json)

#### المهمة ٤.١: أضف النمط الجديد pat_000_greeting

**الملف**: `data/patterns.json`

**الإجراء**: أضف هذا الكائن في بداية مصفوفة `level_1_patterns`:

```json
{
  "id": "pat_000_greeting",
  "pattern": "Hello, I am {name}",
  "translation": "مرحباً، أنا {اسم}",
  "slots": [
    {
      "name": "name",
      "type": "noun",
      "examples": ["Ahmed", "Sara", "Mohammed", "Fatima"]
    }
  ],
  "variations": {
    "question": "Are you {name}?",
    "negative": "I am not {name}",
    "polite": "My name is {name}"
  },
  "cefr_level": "A0",
  "phase": 0,
  "related_patterns": ["pat_001"],
  "teaching_order": 0
}
```

**السبب**: Mission 0 تعلّم هذا النمط. يجب أن يكون في قاعدة البيانات ليستخدمه الـ Engine.

---

### المرحلة ٥: تحديث محرك التقدم (progression.ts)

#### الم任务 ٥.١: أضف Mission 0 إلى تسلسل المهام

**الملف**: `engine/progression.ts`

**الإجراء**: ابحث عن كل occurrence لـ `missionOrder` أو `MISSION_ORDER` (في الدوال: `getNextMission`, `canAccessMission`, `getCompletedMissions`).

**استبدل** مصفوفة المهام القديمة:
```typescript
const missionOrder = [
  "mission_01_airport",
  "mission_02_airplane",
  "mission_03_hotel",
  "mission_04_restaurant",
  "mission_05_shopping",
];
```

**بهذه المصفوفة الجديدة**:
```typescript
const missionOrder = [
  "mission_00_first_words",  // ← أضف هذا السطر
  "mission_01_airport",
  "mission_02_airplane",
  "mission_03_hotel",
  "mission_04_restaurant",
  "mission_05_shopping",
];
```

**في كل مكان تظهر فيه هذه المصفوفة** (٤ دوال على الأقل).

**السبب**: بدون هذا التحديث، Mission 0 لن تكون متاحة للطلاب الجدد.

---

#### المهمة ٥.٢: أضف Phase 0 إلى LEVEL_1_PROGRESSION

**في نفس الملف**: `engine/progression.ts`

**أضف** هذا القسم قبل `phase_1`:

```typescript
phase_0: {
  duration_days: 1, // Mission 0 takes 1 day
  missions: ["mission_00_first_words"],
  patterns_introduced: ["pat_000_greeting"],
  new_phonemes_focus: [], // No phoneme focus in Phase 0
  goal: "Build absolute foundation. Student can greet and introduce themselves.",
  success_criteria: {
    missions_completed: 1,
    patterns_used_without_hint: 1,
    engagement_level: "medium" as const,
    streak_days: 1,
  },
},
```

**السبب**: Phase 0 هي مرحلة تأسيس جديدة يجب أن يمر بها كل طالب.

---

### المرحلة ٦: تحديث باني الـ Prompts (prompt_builder.ts)

#### المهمة ٦.١: تحديث المنطق ليتعامل مع State Machine الجديد

**الملف**: `engine/prompt_builder.ts`

**السبب**: الـ State Machine تغيّر من ٥ حالات إلى ٨ حالات:

```
قديم: HOOK → WARMUP → MISSION → DEBRIEF → REWARD
جديد: ICE_BREAK → QUICK_REVIEW → WARMUP → MISSION → MULTI_CONTEXT → DEBRIEF → REWARD → END
```

**الإجراء**: في دالة `buildSessionPrompt`، أضف منطق للتعامل مع المراحل الجديدة:

```typescript
// أضف هذا التحقق قبل بناء Layer 2
const sessionPhases = [
  'ice_break',      // 20s
  'quick_review',   // 30s (optional - only if SRS due)
  'warmup',         // 90s
  'mission',        // 180s
  'multi_context',  // 60s
  'debrief',        // 30s
  'reward',         // 30s
];

// في Layer 4 (real-time)، أضف tracking للمرحلة الحالية
// الـ Frontend يحتاج أن يعرف المرحلة لعرض الـ Progress Indicator الصحيح
```

**تحديث `generateLayer4`**:
أضف منطق يحدد المرحلة الحالية بناءً على الوقت المنقضي:

```typescript
function detectCurrentPhase(timeElapsed: number): string {
  // timeElapsed in seconds
  if (timeElapsed < 20) return 'ice_break';
  if (timeElapsed < 50) return 'quick_review'; // أو warmup لو لا مراجعة
  if (timeElapsed < 140) return 'warmup'; // 90s
  if (timeElapsed < 320) return 'mission'; // 180s
  if (timeElapsed < 380) return 'multi_context'; // 60s
  if (timeElapsed < 410) return 'debrief'; // 30s
  if (timeElapsed < 440) return 'reward'; // 30s
  return 'end';
}
```

---

#### الم任务 ٦.٢: أضف Quick Review logic

**في نفس الملف**: `engine/prompt_builder.ts`

**أضف دالة جديدة**:

```typescript
private shouldShowQuickReview(student: Student): boolean {
  const dueReviews = getReviewsForMission(student.vocabulary, 3);
  return dueReviews.length > 0 && student.total_sessions > 0;
  // Mission 0 (first session) لا يظهر Quick Review
}

private generateQuickReviewPrompt(dueReviews: VocabularyItem[]): string {
  if (dueReviews.length === 0) return '';
  
  return `
--- QUICK REVIEW PHASE (30 seconds) ---

The student has ${dueReviews.length} words due for review.
Before starting Warmup, run a quick review:

For each word:
1. AI says the word in English
2. Student repeats
3. AI gives brief feedback
4. Move to next word

Words to review:
${dueReviews.map(item => `- "${item.word}"`).join('\n')}

After review, transition to Warmup phase.
--- END QUICK REVIEW ---
`;
}
```

**في `buildSessionPrompt`**: استدعِ هذه الدالة وأضفها بين Layer 2 و Layer 3:

```typescript
const quickReview = this.shouldShowQuickReview(context.student) 
  ? this.generateQuickReviewPrompt(getReviewsForMission(context.student.vocabulary, 3))
  : '';
```

---

### المرحلة ٧: تحديث Layer 4 (Real-time Rules)

#### المهمة ٧.١: أضف Mode Detection

**الملف**: `prompts/layer4_realtime_template.md`

**أضف هذا القسم** بعد قسم "CURRENT STUDENT STATE":

```markdown
## MODE DETECTION (every 30 seconds)

Auto-detect student mode based on:
- Total sessions completed (< 3 → BEGINNER MODE)
- Last session hints_used (> 2 → BEGINNER MODE)
- Current session hints_used (> 2 → BEGINNER MODE)
- Frustration indicators detected → BEGINNER MODE
- 0 hints + 3+ successful exchanges → ADVANCED MODE
- Default → STANDARD MODE

### BEGINNER MODE Rules:
- Maximum 5 words per AI sentence
- One question at a time
- Provide model answer in question: "Are you flying to Dubai? Yes or no?"
- Lower hint threshold to 2 seconds
- Arabic ratio: 40%
- Use binary choices frequently
- Check comprehension: "فهمت؟ نكمل؟" after each exchange
- Use Level 1 correction for ALL errors

### STANDARD MODE Rules:
- Normal pace
- Mix of Level 1, 2, 3 corrections
- Standard hint timing (3 seconds)
- Arabic ratio: 25-30%
- 5 exchanges per mission

### ADVANCED MODE Rules:
- Faster pace
- Use Level 3 (Silent Recast) mostly
- Less Arabic (10-15%)
- Open-ended questions
- Reduce hints
```

---

#### المهمة ٧.٢: أضف Help Press Tracking

**في نفس الملف**: `prompts/layer4_realtime_template.md`

**أضف هذا القسم**:

```markdown
## HELP PRESS TRACKING

Track help_presses_count in real-time (from Frontend button).

Update Layer 1 rules based on count:

0 presses: Standard help threshold (3s silence → hint)
1 press: Lower threshold to 2s, offer proactively
2 presses: Switch to BEGINNER MODE immediately
3+ presses: Consider ending mission early with positive note

Help Press Protocol (from Frontend):
- Press 1: AI says "تحب أساعدك؟ جرّب: [first 2 words]"
- Press 2: AI says "الجواب: [full answer]. كرّر معي:"
- Press 3: AI says "ما عليك! ننتقل لسؤال أسهل." + skip exchange
```

---

### المرحلة ٨: تحديث الـ Frontend (React)

#### المهمة ٨.١: إضافة مكون Progress Indicators

**أنشئ ملف جديد**: `src/components/ProgressIndicators.tsx`

**المحتوى**: استخدم الكود الموجود في `docs/CRITICAL_FIXES.md` تحت قسم "المؤشر ١ — تقدم الجلسة الكلية"

**السبب**: ٤ مستويات للمؤشرات (وقت + مرحلة + تبادلات + نطق) ضرورية لتجربة المستخدم.

---

#### المهمة ٨.٢: إضافة زر Help Button

**أنشئ ملف جديد**: `src/components/HelpButton.tsx`

**المحتوى**:

```typescript
import { useState } from 'react';

interface HelpButtonProps {
  onPress: (pressCount: number) => void;
  pressCount: number;
}

export function HelpButton({ onPress, pressCount }: HelpButtonProps) {
  const handleClick = () => {
    const newCount = pressCount + 1;
    onPress(newCount);
  };

  const getButtonStyle = () => {
    if (pressCount >= 2) return 'help-button urgent';
    if (pressCount === 1) return 'help-button warning';
    return 'help-button';
  };

  return (
    <button 
      onClick={handleClick}
      className={getButtonStyle()}
      aria-label="طلب مساعدة"
    >
      💡 مساعدة
    </button>
  );
}
```

**السبب**: زر المساعدة ضروري. الطفل الذي لا يستطيع الإجابة يجب أن يملك طريقاً واضحاً لطلب المساعدة.

---

#### المهمة ٨.٣: إضافة شاشة Quick Review

**أنشئ ملف جديد**: `src/screens/QuickReview.tsx`

**المحتوى**: اتبع التصميم الموجود في `docs/CRITICAL_FIXES.md` تحت قسم "المؤشر ٢ — تقدم المرحلة"

**السبب**: SRS يجب أن يكون ظاهراً للطفل، لا مخفياً. Quick Review تجعل المراجعة جزءاً مرئياً من التجربة.

---

#### المهمة ٨.٤: إضافة شاشة Multi-Context

**أنشئ ملف جديد**: `src/screens/MultiContext.tsx`

**المحتوى**:

```typescript
interface MultiContextProps {
  scenarios: ContextScenario[];
  pattern: string;
  onComplete: () => void;
}

export function MultiContext({ scenarios, pattern, onComplete }: MultiContextProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState(0);

  const handleScenarioComplete = () => {
    setCompleted(c => c + 1);
    if (currentIndex + 1 >= scenarios.length) {
      onComplete();
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  return (
    <div className="multi-context">
      <h2>🎯 نستخدمها في أماكن مختلفة!</h2>
      <p>الجملة: <strong>{pattern}</strong></p>
      
      <ContextCard 
        scenario={scenarios[currentIndex]}
        expectedPattern={pattern}
        onComplete={handleScenarioComplete}
      />
      
      <ProgressTracker 
        current={completed + 1}
        total={scenarios.length}
      />
    </div>
  );
}
```

**السبب**: Multi-Context Phase هي ما يحوّل الحفظ إلى إتقان. بدونها، الطفل يحفظ الجملة لكن لا يستطيع تعميمها.

---

#### المهمة ٨.٥: تحديث شاشة Mission Active

**الملف**: `src/screens/MissionActive.tsx` (موجود)

**التحديثات المطلوبة**:

١. **أضف Progress Indicators** في الأعلى:
```typescript
import { ProgressIndicators } from '../components/ProgressIndicators';

// في الـ render:
<ProgressIndicators
  timeElapsed={timeElapsed}
  totalTime={420}
  currentPhase={currentPhase}
  currentExchange={currentExchange}
  totalExchanges={5}
  completedExchanges={completedExchanges}
  pronunciationScore={pronunciationScore}
/>
```

٢. **أضف HelpButton**:
```typescript
import { HelpButton } from '../components/HelpButton';

const [helpPressCount, setHelpPressCount] = useState(0);

const handleHelpPress = (newCount: number) => {
  setHelpPressCount(newCount);
  // أرسل للـ Backend ليُحدّث الـ Prompt
  fetch(`/api/sessions/${sessionId}/help-press`, {
    method: 'POST',
    body: JSON.stringify({ pressCount: newCount })
  });
};

// في الـ render:
<HelpButton onPress={handleHelpPress} pressCount={helpPressCount} />
```

٣. **أضف Phase Tracking**:
```typescript
const [currentPhase, setCurrentPhase] = useState('ice_break');

useEffect(() => {
  const interval = setInterval(() => {
    // حدّد المرحلة بناءً على الوقت
    const elapsed = (Date.now() - sessionStart.getTime()) / 1000;
    if (elapsed < 20) setCurrentPhase('ice_break');
    else if (elapsed < 50) setCurrentPhase('quick_review');
    else if (elapsed < 140) setCurrentPhase('warmup');
    else if (elapsed < 320) setCurrentPhase('mission');
    else if (elapsed < 380) setCurrentPhase('multi_context');
    else if (elapsed < 410) setCurrentPhase('debrief');
    else if (elapsed < 440) setCurrentPhase('reward');
  }, 1000);
  
  return () => clearInterval(interval);
}, []);
```

---

### المرحلة ٩: تحديث الـ Backend APIs

#### المهمة ٩.١: إضافة Endpoint لـ Help Press

**أنشئ أو حدّث**: `backend/src/routes/sessions.ts`

```typescript
router.post('/sessions/:sessionId/help-press', async (req, res) => {
  const { sessionId } = req.params;
  const { pressCount } = req.body;
  
  // ١. احفظ في قاعدة البيانات
  await updateSessionHelpPress(sessionId, pressCount);
  
  // ٢. أرسل تحديث لـ Gemini عبر WebSocket
  websocketServer.sendToGemini(sessionId, {
    type: 'help_press',
    pressCount: pressCount,
    instruction: getHelpInstruction(pressCount)
  });
  
  res.json({ success: true });
});

function getHelpInstruction(pressCount: number): string {
  if (pressCount === 1) return "تحب أساعدك؟ جرّب: [first 2 words of expected answer]";
  if (pressCount === 2) return "الجواب: [full answer]. كرّر معي:";
  if (pressCount >= 3) return "ما عليك! ننتقل لسؤال أسهل.";
  return "";
}
```

---

#### الم任务 ٩.٢: إضافة Endpoint لـ Mode Detection

**في نفس الملف**:

```typescript
router.get('/sessions/:sessionId/mode', async (req, res) => {
  const { sessionId } = req.params;
  
  const session = await getSession(sessionId);
  const student = await getStudent(session.student_id);
  
  const mode = detectMode(student, session);
  
  res.json({ mode });
});

function detectMode(student: Student, currentSession: Session): 
  'beginner' | 'standard' | 'advanced' {
  
  // New student = beginner
  if (student.total_sessions < 3) return 'beginner';
  
  // Recent struggles = beginner
  if (currentSession.hints_used > 2 || currentSession.frustration_detected) {
    return 'beginner';
  }
  
  // Recent mastery = advanced
  if (currentSession.successful_exchanges === 5 && currentSession.hints_used === 0) {
    return 'advanced';
  }
  
  return 'standard';
}
```

---

### المرحلة ١٠: تحديث قاعدة البيانات

#### الم任务 ١٠.١: أضف عمود mission_00 إلى progression

**إن كان لديك migration file**، أضف:

```sql
-- Mission 0 يجب أن تكون أول مهمة لكل طالب جديد
UPDATE students 
SET current_mission_id = 'mission_00_first_words' 
WHERE current_mission_id IS NULL OR current_mission_id = '';

-- أضف Phase 0
ALTER TABLE students 
ALTER COLUMN current_phase SET DEFAULT 0;
```

#### الم任务 ١٠.٢: أضف pattern pat_000_greeting

```sql
INSERT INTO patterns (id, pattern, translation, slots, variations, cefr_level, phase, teaching_order)
VALUES (
  'pat_000_greeting',
  'Hello, I am {name}',
  'مرحباً، أنا {اسم}',
  '[{"name": "name", "type": "noun", "examples": ["Ahmed", "Sara"]}]'::jsonb,
  '{"question": "Are you {name}?", "negative": "I am not {name}"}'::jsonb,
  'A0',
  0,
  0
);
```

---

### المرحلة ١١: تحديث الـ Prompt Builder لـ Multi-Context

#### الم任务 ١١.١: أضف منطق Multi-Context

**في**: `engine/prompt_builder.ts`

**أضف دالة**:

```typescript
private generateMultiContextPrompt(mission: Mission): string {
  return `
--- MULTI-CONTEXT APPLICATION PHASE (60 seconds) ---

After Mission phase, before Debrief, run Multi-Context drill:

1. Take the main pattern from today's mission: ${mission.target_patterns[0]}
2. Apply it in 4 different real-life scenarios
3. For each scenario:
   - Describe scenario in Arabic with emoji
   - Wait for student to use the pattern
   - Celebrate specifically
4. End with reinforcement: "نفس الجملة تنفع في كل مكان!"

This phase is CRITICAL. Without it, student memorizes but doesn't generalize.
--- END MULTI-CONTEXT ---
`;
}
```

**أضفها إلى `buildSessionPrompt`** بعد Layer 2.

---

### المرحلة ١٢: الاختبار

#### الم任务 ١٢.١: اختبار Mission 0

**الإجراء**:
1. شغّل التطبيق محلياً
2. سجّل طالباً جديداً
3. تأكد أن Mission 0 هي أول مهمة (ليست Mission 1)
4. العب المهمة كاملة (٧-١٠ دقائق)
5. تحقق من:
   - [ ] AI يبدأ بـ Ice Breaker (عربي أولاً)
   - [ ] Warmup يحتوي على ٣ خطوات
   - [ ] ٥ تبادلات في المهمة (لا ٦)
   - [ ] Multi-Context يطبّق النمط في ٤ سياقات
   - [ ] Debrief يسأل عن كلمة البطل + الشعور
   - [ ] Reward يحتوي على Cliffhanger
   - [ ] نسبة العربية ~٤٠٪

#### الم任务 ١٢.٢: اختبار Mission 1

**الإجراء**: نفس ما سبق، لكن تحقق من:
   - [ ] AI يستخدم Ice Breaker ويراجع "Hello, I am..." من Mission 0
   - [ ] Warmup يعلّم "I would like [thing]"
   - [ ] التبادل الثالث هو التبادل المفتاحي (المقعد)
   - [ ] Multi-Context يطبّق "I would like" في ٤ سياقات
   - [ ] نسبة العربية ~٣٠٪

#### الم任务 ١٢.٣: اختبار زر المساعدة

**الإجراء**:
1. في أي مهمة، صمت ٥ ثوانٍ
2. اضغط زر المساعدة مرة واحدة → يجب أن يقول AI: "تحب أساعدك؟"
3. اضغط مرة ثانية → يجب أن يقول: "الجواب: [full]. كرّر معي:"
4. اضغط مرة ثالثة → يجب أن ينتقل لتبادل أسهل

#### الم任务 ١٢.٤: اختبار Beginner Mode

**الإجراء**:
1. العب Mission 0 بصعوبة (اخطئ عمداً)
2. في Mission 1، يجب أن يدخل الطالب Beginner Mode
3. تحقق من:
   - [ ] AI يستخدم جُملاً أقصر (٥ كلمات كحد أقصى)
   - [ ] نسبة العربية أعلى (~٤٠٪)
   - [ ] خيارات ثنائية ("A or B?")
   - [ ] "فهمت؟ نكمل؟" بعد كل تبادل

---

## ✅ قائمة التحقق النهائية

بعد تنفيذ كل التعديلات، تحقق من:

### الملفات:
- [ ] `prompts/layer1_base_persona.md` محدّث (٣ مستويات تصحيح + العربية + Beginner Mode + Multi-Context + Help Protocol)
- [ ] `prompts/layer2_missions/mission_00_first_words.md` موجود (من v2)
- [ ] `prompts/layer2_missions/mission_01_airport.md` محدّث (من v2)
- [ ] `prompts/layer2_missions/mission_02_airplane.md` محدّث (من v2)
- [ ] `data/patterns.json` يحتوي على pat_000_greeting
- [ ] `engine/progression.ts` محدّث (Phase 0 + mission_00 في missionOrder)
- [ ] `engine/prompt_builder.ts` محدّث (Quick Review + Multi-Context + Phase detection)
- [ ] `prompts/layer4_realtime_template.md` محدّث (Mode Detection + Help Press Tracking)

### الـ Frontend:
- [ ] `src/components/ProgressIndicators.tsx` موجود
- [ ] `src/components/HelpButton.tsx` موجود
- [ ] `src/screens/QuickReview.tsx` موجود
- [ ] `src/screens/MultiContext.tsx` موجود
- [ ] `src/screens/MissionActive.tsx` محدّث (يستخدم Progress Indicators + HelpButton + Phase Tracking)

### الـ Backend:
- [ ] `/sessions/:sessionId/help-press` endpoint موجود
- [ ] `/sessions/:sessionId/mode` endpoint موجود

### قاعدة البيانات:
- [ ] pattern pat_000_greeting مُدرج
- [ ] students.current_phase default = 0

### الاختبار:
- [ ] Mission 0 تعمل كاملة
- [ ] Mission 1 محدّثة وتعمل
- [ ] Mission 2 محدّثة وتعمل
- [ ] زر المساعدة يعمل (٣ مستويات)
- [ ] Beginner Mode يُفعّل تلقائياً
- [ ] Progress Indicators تظهر في كل مرحلة
- [ ] Multi-Context Phase تعمل بعد المهمة
- [ ] Quick Review تظهر قبل Warmup (لو SRS مستحق)

---

## 🚨 أخطاء شائعة يجب تجنبها

### ١. عدم قراءة CRITICAL_FIXES.md بالكامل
**العاقبة**: ستفهم نصف الحل فقط، وستنفّذ نصف التنفيذ.
**الحل**: اقرأه كاملاً قبل أي كود.

### ٢. عدم استبدال ملفات الدروس القديمة
**العاقبة**: التطبيق سيستخدم الدروس القديمة بلا Warmup ولا Multi-Context.
**الحل**: استبدل الملفات الثلاثة كما هو موضّح في المرحلة ٣.

### ٣. نسيان تحديث missionOrder في progression.ts
**العاقبة**: Mission 0 لن تكون متاحة للطلاب الجدد.
**الحل**: ابحث عن كل occurrence لـ missionOrder وحدّثها.

### ٤. عدم إضافة Quick Review logic للـ Prompt Builder
**العاقبة**: SRS لن يكون ظاهراً للطفل.
**الحل**: اتبع المهمة ٦.٢ بدقة.

### ٥. عدم إضافة Multi-Context Phase للـ Frontend
**العاقبة**: الطفل سيكمل المهمة دون تطبيق النمط في سياقات أخرى.
**الحل**: أنشئ شاشة MultiContext.tsx كما في المهمة ٨.٤.

### ٦. نسيان Help Button في Mission Active
**العاقبة**: الطفل الذي يخطئ لن يملك طريقة لطلب المساعدة.
**الحل**: أضف HelpButton في MissionActive.tsx كما في المهمة ٨.٥.

### ٧. عدم تحديث Layer 4 (Real-time)
**العاقبة**: الـ Mode Detection و Help Press Tracking لن يعملا.
**الحل**: اتبع المرحلة ٧ بالكامل.

---

## 📞 ماذا تفعل إذا واجهت مشكلة

### إذا لم تجد ملفاً:
تحقق من المسار الكامل. الملفات موجودة في:
```
/home/z/my-project/download/ai-speaking-tutor/
├── docs/
│   ├── CRITICAL_FIXES.md       ← اقرأ أولاً
│   ├── V2_METHODOLOGY.md       ← اقرأ ثانياً
│   └── engineering_prompts.md  (قديم — لا تغير)
├── prompts/
│   ├── layer1_base_persona.md   ← حدّثه
│   ├── layer2_missions/
│   │   ├── mission_00_first_words.md  ← جديد (من v2)
│   │   ├── mission_01_airport.md      ← استبدل (من v2)
│   │   ├── mission_02_airplane.md     ← استبدل (من v2)
│   │   ├── mission_03_hotel.md        ← لا تغير
│   │   ├── mission_04_restaurant.md   ← لا تغير
│   │   ├── mission_05_shopping.md     ← لا تغير
│   │   └── v2/  (الملفات المصدرية للنسخ الجديدة)
│   ├── layer3_student_adaptation_template.md  ← لا تغير
│   └── layer4_realtime_template.md            ← حدّثه
├── engine/
│   ├── srs.ts                   ← لا تغير
│   ├── prompt_builder.ts        ← حدّثه
│   └── progression.ts           ← حدّثه
└── data/
    ├── patterns.json            ← أضف pat_000_greeting
    ├── phonemes.json            ← لا تغير
    └── vocabulary.json          ← لا تغير
```

### إذا لم تفهم تعليماً:
**لا تخمّن**. اقرأ ملف `CRITICAL_FIXES.md` مرة أخرى. كل تعليمات هذه الوثيقة مُفصّلة هناك.

### إذا اختلف الكود الحالي عما هو متوقع:
التطبيق قد تم بناؤه بناءً على V1. التحديثات في هذه الوثيقة تحوّله إلى V2. اتبع التعليمات حتى لو اختلف الكود الحالي.

---

## 🎯 خلاصة التنفيذ بالترتيب

```
١. اقرأ CRITICAL_FIXES.md كاملًا
٢. اقرأ V2_METHODOLOGY.md كاملًا
٣. اقرأ v2/mission_00_first_words.md
٤. اقرأ v2/mission_01_airport.md
٥. اقرأ v2/mission_02_airplane.md
٦. حدّث prompts/layer1_base_persona.md
٧. استبدل prompts/layer2_missions/mission_01_airport.md بـ v2
٨. استبدل prompts/layer2_missions/mission_02_airplane.md بـ v2
٩. انسخ v2/mission_00_first_words.md إلى prompts/layer2_missions/
١٠. أضف pat_000_greeting إلى data/patterns.json
١١. حدّث engine/progression.ts (Phase 0 + missionOrder)
١٢. حدّث engine/prompt_builder.ts (Quick Review + Multi-Context + Phase detection)
١٣. حدّث prompts/layer4_realtime_template.md (Mode Detection + Help Press)
١٤. أنشئ src/components/ProgressIndicators.tsx
١٥. أنشئ src/components/HelpButton.tsx
١٦. أنشئ src/screens/QuickReview.tsx
١٧. أنشئ src/screens/MultiContext.tsx
١٨. حدّث src/screens/MissionActive.tsx
١٩. أضف Backend endpoints (help-press + mode)
٢٠. حدّث قاعدة البيانات (Phase 0 + pat_000_greeting)
٢١. اختبر Mission 0
٢٢. اختبر Mission 1
٢٣. اختبر زر المساعدة
٢٤. اختبر Beginner Mode
٢٥. تحقق من قائمة التحقق النهائية
```

**لا تتجاوز أي خطوة. لا تخمّن. لا تبتكر حلولاً غير موثقة. اتبع التعليمات بدقة.**

---

## ⚠️ كلمة أخيرة

أنت لا تُصلح أخطاء برمجية. أنت تُصلح أخطاء تعليمية.

التطبيق في حالته الحالية لا يُعلّم — هو فقط يُجري محادثة. التحديثات في هذه الوثيقة تحوّله من "محادثة" إلى "تعلم فعّال".

كل تعديل هنا له سبب:
- التصحيح المباشر ← الطفل يحتاج أن يعرف الصواب
- العربية المتدرجة ← الطفل يحتاج أمان لغته الأم
- Warmup ← الطفل يحتاج تهيئة قبل التحدي
- Multi-Context ← الطفل يحتاج تعميم النمط لا حفظه
- Beginner Mode ← الطفل الضعيف يحتاج دعماً مختلفاً
- Help Button ← الطفل العالق يحتاج مخرجاً
- Mission 0 ← الطفل الجديد يحتاج تأسيساً قبل المطارات

**نفّذ بدقة. اختبر بصدق. أبلغ عن النتائج.**

بعد التنفيذ، اختبر مع طفل حقيقي وبلّغ عن:
- هل التحية تبدأ عربي أولاً؟
- هل Warmup يظهر؟
- هل Multi-Context يطبّق النمط في سياقات؟
- هل زر المساعدة يعمل؟
- هل Beginner Mode يُفعّل للطالب الضعيف؟

**النجاح لا يقاس بالكود الذي كتبته. يقاس بالطفل الذي تعلّم.**

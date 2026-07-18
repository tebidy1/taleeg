# الوثيقة الشاملة للفريق المبرمج
## AI Speaking Tutor — «طيّار»
### دليل بناء التطبيق للوكلاء البرمجيين (AI Coding Agents)

---

## 📋 نبذة عن المشروع

**اسم التطبيق**: طيّار (Tayyar)
**الفئة**: تعلم المحادثة الإنجليزية للأطفال (١١-١٥ سنة) في السعودية والخليج
**التقنية الأساسية**: Gemini 3.1 Flash Live (محادثة صوتية ثنائية الاتجاه)
**الهدف**: تطبيق PWA يُمكّن الطفل من التحدث بالإنجليزية ٧ دقائق يومياً عبر سيناريوهات سفر واقعية (مطار، طائرة، فندق، مطعم، تسوق) مع مدرب AI ذكي يتكيف مع مستواه ومشاعره.

### لماذا هذا التطبيق مختلف؟
- **ليس تطبيق محادثة عام** — هو رحلة سفر تعليمية متدرجة
- **ليس AI وحده** — نموذج هجين (AI + معلم بشري يقدم تقارير أسبوعية)
- **ليس للأطفال الصغار** — مستهدف المتوسط والثانوي (١١-١٥ سنة)
- **ليس مترجماً من سيليكون فالي** — مصمم للسوق السعودي/الخليجي من الأساس

### نموذج العمل:
- اشتراك شهري ٧٥-١٠٠ ريال
- ٧ دقائق يومياً = مهمة واحدة
- المستوى الأول = ٥ مهام × ٣ أسابيع = ٢١ يوماً
- تقرير يومي لولي الأمر عبر واتساب
- مكالمة شهرية مع معلم بشري (Hybrid Model)

---

## 🏗️ التقنيات المستخدمة

```
Frontend:  React + TypeScript (PWA — المرحلة الأولى)
Backend:   Node.js + Express + TypeScript
Database:  PostgreSQL (Supabase للنسخة الأولى)
AI:        Gemini 3.1 Flash Live (محادثة صوتية)
Storage:   Supabase Storage (للتسجيلات الصوتية)
Hosting:   Vercel (Frontend) + Railway (Backend)
```

### لماذا Gemini 3.1 Flash Live؟
- **محادثة صوتية ثنائية الاتجاه** (Audio-to-Audio) — لا حاجة لـ STT + LLM + TTS منفصلة
- **زمن استجابة منخفض** (< ٨٠٠ms) — مناسب لمحادثة طبيعية
- **تكلفة منخفضة**: $٠.٠٠٥/دقيقة إدخال + $٠.٠١٨/دقيقة إخراج = ~$٥-٧ شهرياً لكل مستخدم
- **يدعم الـ System Prompts المعقدة** — ضروري للبنية الـ ٤ طبقات
- **يُعيد JSON** — يمكن تحليل أداء الطفل برمجياً

### لماذا PWA أولاً؟
- **اختبار سريع**: لا حاجة لموافقات App Store / Play Store
- **توزيع أسهل**: رابط واحد يفتحه أي طفل على أي جوال
- **تكلفة أقل**: لا رسوم مطور ($٩٩/سنة Apple + $٢٥ Google)
- **تحديثات فورية**: لا انتظار مراجعة
- **الهدف**: التحقق من الـ Engagement قبل الاستثمار في Native Apps

---

## 📁 خريطة الملفات الـ ١٨

```
ai-speaking-tutor/
│
├── 📄 README.md                              ← ابدأ هنا (نظرة شاملة)
│
├── 📁 schema/ (١ ملف — بنية البيانات)
│   └── types.ts                              ← كل الـ TypeScript interfaces
│
├── 📁 data/ (٣ ملفات — البيانات الثابتة)
│   ├── phonemes.json                         ← ٥ أصوات شائعة الخطأ
│   ├── patterns.json                         ← ٥ أنماط لغوية
│   └── vocabulary.json                       ← ٢٤ كلمة موزعة
│
├── 📁 prompts/ (٦ ملفات — الـ AI Prompts)
│   ├── layer1_base_persona.md                ← الشخصية الثابتة
│   ├── layer2_missions/                      ← ٥ مهام
│   │   ├── mission_01_airport.md
│   │   ├── mission_02_airplane.md
│   │   ├── mission_03_hotel.md
│   │   ├── mission_04_restaurant.md
│   │   └── mission_05_shopping.md
│   ├── layer3_student_adaptation_template.md ← تكييف الطالب
│   └── layer4_realtime_template.md           ← القواعد اللحظية
│
├── 📁 engine/ (٣ ملفات — المنطق البرمجي)
│   ├── srs.ts                                ← محرك الاستدعاء المتباعد
│   ├── prompt_builder.ts                     ← باني الـ Prompts
│   └── progression.ts                        ← محرك التقدم
│
├── 📁 reports/ (١ ملف — التقارير)
│   └── whatsapp_template.ts                  ← تقارير واتساب
│
├── 📁 design/ (١ ملف — التصميم)
│   └── DESIGN_SYSTEM.md                      ← دليل التصميم الكامل
│
└── 📁 docs/ (١ ملف — التوثيق التقني)
    └── engineering_prompts.md                ← الأوامر الهندسية
```

**العدد الإجمالي**: ١٨ ملفاً (١٤ ملفاً أساسياً + ٤ ملفات supporting)

---

## 🗺️ ترتيب القراءة الموصى به

اقرأ الملفات بهذا الترتيب بالضبط. كل ملف يبني على ما قبله:

### المرحلة ١ — الفهم (اقرأ أولاً، لا تبرمج)
| الترتيب | الملف | الهدف |
|---|---|---|
| ١ | `README.md` | نظرة شاملة على المشروع |
| ٢ | `design/DESIGN_SYSTEM.md` | فهم التجربة البصرية والبراند |
| ٣ | `docs/engineering_prompts.md` | فهم الأوامر الهندسية وتسلسل البساطة |

### المرحلة ٢ — البيانات والبنية
| الترتيب | الملف | الهدف |
|---|---|---|
| ٤ | `schema/types.ts` | بنية البيانات الكاملة (TypeScript) |
| ٥ | `data/phonemes.json` | الأصوات الخمسة المستهدفة |
| ٦ | `data/patterns.json` | الأنماط اللغوية الخمسة |
| ٧ | `data/vocabulary.json` | الكلمات الـ ٢٤ |

### المرحلة ٣ — الـ Prompts
| الترتيب | الملف | الهدف |
|---|---|---|
| ٨ | `prompts/layer1_base_persona.md` | شخصية "Captain English" |
| ٩ | `prompts/layer2_missions/mission_01_airport.md` | أول مهمة كمثال |
| ١٠ | `prompts/layer2_missions/mission_02_airplane.md` | المهمة الثانية |
| ١١ | `prompts/layer2_missions/mission_03_hotel.md` | المهمة الثالثة |
| ١٢ | `prompts/layer2_missions/mission_04_restaurant.md` | المهمة الرابعة |
| ١٣ | `prompts/layer2_missions/mission_05_shopping.md` | المهمة الخامسة |
| ١٤ | `prompts/layer3_student_adaptation_template.md` | قالب تكييف الطالب |
| ١٥ | `prompts/layer4_realtime_template.md` | قالب القواعد اللحظية |

### المرحلة ٤ — المنطق البرمجي
| الترتيب | الملف | الهدف |
|---|---|---|
| ١٦ | `engine/srs.ts` | خوارزمية الاستدعاء المتباعد |
| ١٧ | `engine/prompt_builder.ts` | باني الـ Prompts الأربعة |
| ١٨ | `engine/progression.ts` | محرك التقدم بين المهام |

### المرحلة ٥ — المخرجات
| الترتيب | الملف | الهدف |
|---|---|---|
| ١٩ | `reports/whatsapp_template.ts` | قوالب تقارير واتساب |

---

## 🔧 شرح كل ملف وكيفية استخدامه

### ١. `README.md` — نقطة البداية
**الهدف**: نظرة شاملة على المشروع، الفلسفة، والمعايير.
**كيفية الاستخدام**: اقرأه أولاً لتفهم الصورة الكبيرة قبل الغوص في التفاصيل.

---

### ٢. `design/DESIGN_SYSTEM.md` — دليل التصميم
**الهدف**: المواصفات الكاملة للهوية البصرية، الحركات، الأصوات، الـ Haptic.
**كيفية الاستخدام**:
- استخرج منه **Design Tokens** (الألوان، الخطوط، المسافات) → ضعها في `src/styles/tokens.css` أو `tailwind.config.js`
- استخرج منه **Animation Keyframes** → ضعها في `src/styles/animations.css`
- استخدم **تخطيطات الشاشات (ASCII layouts)** كمرجع لبناء مكونات React
- **لا تبتكر تصميماً جديداً** — كل شيء محدد هنا

**الاستخراجات المباشرة**:
```css
/* من DESIGN_SYSTEM.md → tokens.css */
:root {
  --color-primary: #1E5BA8;
  --color-gold: #F5A623;
  --font-arabic: 'Tajawal', sans-serif;
  --font-english: 'Inter', sans-serif;
  --radius-card: 16px;
  --shadow-card: 0 2px 8px rgba(0,0,0,0.06);
}
```

---

### ٣. `docs/engineering_prompts.md` — الأوامر الهندسية
**الهدف**: ٦ أوامر هندسية إضافية تُحقن في Gemini للتحكم التقني + تسلسل البساطة.
**كيفية الاستخدام**:
- الـ Prompts الستة تُضاف لكل استدعاء Gemini (بعد الطبقات الأربع)
- **الأهم**: قسم "تسلسل البساطة" — يحدد كيف تتدرج المهام
- اقرأ قسم "الأمر الهندسي #١" بتمعن — هو الذي يضمن إخراج JSON قابل للتحليل

---

### ٤. `schema/types.ts` — بنية البيانات
**الهدف**: كل الـ TypeScript interfaces للمشروع.
**كيفية الاستخدام**:
- انسخه كاملاً إلى `src/types/index.ts` (أو `shared/types.ts` لو Backend + Frontend)
- **لا تعدّل الـ interfaces** — أضف حقولاً جديدة فقط إذا كان ضرورياً
- استخدمها في كل مكان (Frontend + Backend + Database schema)

**بنية البيانات الأساسية**:
```typescript
Student          // ملف الطفل
VocabularyItem   // كلمة + بيانات SRS
SentencePattern  // نمط لغوي
PronunciationMap // خريطة النطق
Mission          // مهمة
Session          // جلسة
Badge            // شارة
```

---

### ٥. `data/phonemes.json` — الأصوات الخمسة
**الهدف**: الأصوات الإنجليزية الصعبة على الناطقين بالعربية.
**المحتوى**: /p/, /v/, /θ/, /r/, /ŋ/ — مع أمثلة، تلميحات، وأزواج minimally.
**كيفية الاستخدام**:
- حمّله في قاعدة البيانات كـ seed data
- استخدمه في `engine/prompt_builder.ts` لتحديد **صوت التركيز** لكل جلسة
- استخدمه في `reports/whatsapp_template.ts` لتوليد نصائح النطق لولي الأمر

---

### ٦. `data/patterns.json` — الأنماط الخمسة
**الهدف**: الأنماط اللغوية للمستوى الأول.
**المحتوى**:
1. `I am {name}` — تعريف بالنفس
2. `I would like {noun}` — طلب مهذب
3. `Can I have {noun}?` — سؤال طلب
4. `How much is {item}?` — سؤال السعر
5. `Where is {place}?` — سؤال المكان

**كيفية الاستخدام**:
- حمّله في قاعدة البيانات
- كل نمط له `teaching_order` (١ = الأول)
- استخدمه في `engine/progression.ts` لتحديد متى يُقدَّم كل نمط

---

### ٧. `data/vocabulary.json` — الكلمات الـ ٢٤
**الهدف**: مفردات المستوى الأول موزعة على المهام الخمس.
**كيفية الاستخدام**:
- حمّله في قاعدة البيانات
- كل كلمة مربوطة بـ `pattern_id` و `phoneme_focus` و `missions` (أي مهام تستخدمها)
- استخدمه في `engine/srs.ts` كنقطة انطلاق لكل طفل جديد

---

### ٨. `prompts/layer1_base_persona.md` — الشخصية الثابتة
**الهدف**: شخصية "Captain English" — ثابتة لكل الجلسات.
**المحتوى**: القواعد الذهبية (Recast, قاعدة ٣ ثوانٍ, Safety), نبرة الصوت, الـ JSON output schema.
**كيفية الاستخدام**:
- يُحمّل مرة واحدة عند بدء الجلسة
- **لا يُعدّل ديناميكياً** — ثابت دائماً
- يُخزَّن كملف `.md` ويُقرأ في الـ Backend
- يُرسَل كـ System Prompt الأول لـ Gemini

**ملاحظة تقنية حرجة**: الـ JSON output schema في نهاية الملف هو ما يُمكّن تطبيقك من تحليل أداء الطفل. لا تتجاهله.

---

### ٩-١٣. `prompts/layer2_missions/*.md` — المهام الخمس
**الهدف**: سياق كل مهمة (القصة، الشخصية، السيناريو، الأهداف).
**كيفية الاستخدام**:
- كل ملف = مهمة كاملة
- يُحمَّل ديناميكياً حسب `mission_id`
- يحتوي على `SCENARIO FLOW` — تبادلات AI المتوقعة
- يحتوي على `ADAPTATION RULES` — متى يُبسَّط، متى يُعطى تلميح
- يحتوي على `CLIFFHANGER` — معاينة المهمة التالية

**ترتيب المهام (إلزامي)**:
```
1. airport   ← أبسط مهمة (نمط واحد جديد)
2. airplane  ← نمط جديد + مراجعة
3. hotel     ← نمطان جديدان (الأصعب)
4. restaurant ← مراجعة شاملة (لا جديد)
5. shopping  ← اختبار التخرج (كل الأنماط)
```

**لا تسمح للطفل بالوصول لمهمة قبل إكمال سابقتها** — هذا مضمون في `engine/progression.ts`.

---

### ١٤. `prompts/layer3_student_adaptation_template.md` — تكييف الطالب
**الهدف**: قالب يُملأ ديناميكياً ببيانات الطفل.
**كيفية الاستخدام**:
- هذا **قالب**، لا يُرسل كما هو
- `engine/prompt_builder.ts` يأخذ هذا القالب + بيانات الطفل من DB → يولّد Layer 3 الفعلي
- يحتوي على placeholders مثل `{student_name}`, `{weaknesses}`, `{due_reviews}`
- الـ Prompt Builder يستبدلها بالقيم الفعلية

**الحقن الديناميكي**:
- نقاط القوة/الضعف (من `PronunciationMap` و `PatternMastery`)
- المراجعات المستحقة (من `engine/srs.ts`)
- تكييف الـ Engagement (من `EngagementProfile`)
- ملخص آخر جلسة

---

### ١٥. `prompts/layer4_realtime_template.md` — القواعد اللحظية
**الهدف**: قواعد تتغير كل ٣٠ ثانية أثناء الجلسة.
**كيفية الاستخدام**:
- يُحدَّث كل ٣٠ ثانية أثناء الجلسة
- يحلل: الوقت المنقضي، التبادلات المكتملة، التلميحات المستخدمة، الحالة العاطفية
- يُولِّد أوامر للـ AI: COMFORT MODE, SUPPORT MODE, CHALLENGE MODE, CELEBRATION MODE

**كيف تُكتشف الحالة العاطفية؟**
- حجم الصوت (volume)
- سرعة الكلام (speech rate)
- التردد (hesitation)
- الصمت المطول (silence)
- هذه تُحلل من الـ audio stream قبل إرساله لـ Gemini

---

### ١٦. `engine/srs.ts` — محرك الاستدعاء المتباعد
**الهدف**: خوارزمية SM-2 معدّلة للأطفال.
**كيفية الاستخدام**:
- انسخه إلى `src/engine/srs.ts` (أو `backend/src/engine/srs.ts`)
- الدوال الأساسية:
  - `reviewVocabularyItem()` — تحديث كلمة بعد مراجعتها
  - `getDueReviews()` — الكلمات المستحقة للمراجعة اليوم
  - `getReviewsForMission()` — الكلمات التي ستُحقن في المهمة القادمة
  - `getStudentProgress()` — ملخص تقدم الطفل

**الخوارزمية**:
```
نطق صحيح (≥٨٥٪) → interval × ease_factor, ease +0.1
نطق متوسط (٥٠-٨٥٪) → interval × 0.8, ease -0.15
نطق خاطئ (<٥٠٪) → interval = 1, ease -0.3
```

---

### ١٧. `engine/prompt_builder.ts` — باني الـ Prompts
**الهدف**: يجمع الطبقات الأربع + يولّد Layer 3 و 4 ديناميكياً.
**كيفية الاستخدام**:
- انسخه إلى `backend/src/engine/prompt_builder.ts`
- الاستخدام الأساسي:

```typescript
import { PromptBuilder } from './engine/prompt_builder';

const builder = new PromptBuilder();

const sessionPrompt = builder.buildSessionPrompt({
  student: studentFromDB,
  mission: missionFromDB,
  sessionStartTime: new Date()
});

// أرسل sessionPrompt إلى Gemini Flash Live
```

**العناصر المُدمجة**:
- Layer 1: من ملف `layer1_base_persona.md`
- Layer 2: من ملف `layer2_missions/{mission_id}.md`
- Layer 3: مولّد ديناميكياً من بيانات الطفل
- Layer 4: مولّد ديناميكياً من حالة الجلسة

**تحديث Layer 4 أثناء الجلسة**:
```typescript
// كل ٣٠ ثانية:
const update = builder.buildRealTimeUpdate(context, currentState);
// أرسل update لـ Gemini كـ System Prompt update
```

---

### ١٨. `engine/progression.ts` — محرك التقدم
**الهدف**: يضمن التسلسل الصحيح للمهام والانتقال بين المراحل.
**كيفية الاستخدام**:
- انسخه إلى `backend/src/engine/progression.ts`
- الدوال الأساسية:
  - `getNextMission(student)` — المهمة التالية للطفل
  - `canAccessMission(student, missionId)` — هل يُسمح بالوصول؟
  - `shouldAdvancePhase(student)` — هل ينتقل للمرحلة التالية؟
  - `checkLevel2Readiness(student)` — هل جاهز للمستوى الثاني؟
  - `planNextSession(student)` — ما نوع الجلسة القادمة؟ (جديدة/مراجعة/احتفال)

**معايير الانتقال**:
- المرحلة ١ → ٢: إكمال مهمتين + ٣ أيام streak
- المرحلة ٢ → ٣: إكمال ٤ مهام + ٧ أيام streak
- المرحلة ٣ → المستوى ٢: إكمال ٥ مهام + ١٤ يوم streak + ٧٠٪ نطق + ٤ أنماط بلا تلميحات

---

### ١٩. `reports/whatsapp_template.ts` — تقارير واتساب
**الهدف**: توليد تقارير يومية وأسبوعية لولي الأمر.
**كيفية الاستخدام**:
- انسخه إلى `backend/src/reports/whatsapp_template.ts`
- الدوال الأساسية:
  - `generateDailyReport(student, session)` — تقرير بعد كل جلسة
  - `generateWeeklyReport(student, weekSessions)` — تقرير كل جمعة
  - `generateCelebrationMessage(student, achievement)` — رسائل احتفال
  - `generateReengagementMessage(student, daysMissed)` — رسائل إعادة التفاعل

**التكامل مع WhatsApp**:
- استخدم WhatsApp Business API (أو Twilio) لإرسال الرسائل
- الرسائل = نص عادي + emojis (لا HTML)
- أرفق رابط التسجيل الصوتي (من Supabase Storage)

---

## 🚀 خطة التنفيذ — PWA أولاً

### المرحلة ١: الإعداد (اليوم ١-٢)

#### ١.١ إعداد المشروع
```bash
# Frontend (React PWA)
npx create-react-app tayyar --template typescript
cd tayyar
npm install workbox-cli # للـ PWA
npm install @google/generative-ai # Gemini SDK

# Backend (Node.js)
mkdir backend && cd backend
npm init -y
npm install express cors dotenv @google/generative-ai
npm install @supabase/supabase-js
npm install typescript ts-node @types/node @types/express
```

#### ١.٢ نقل الملفات الـ ١٨
```
src/
├── types/
│   └── index.ts                    ← من schema/types.ts
├── data/
│   ├── phonemes.json               ← من data/phonemes.json
│   ├── patterns.json               ← من data/patterns.json
│   └── vocabulary.json             ← من data/vocabulary.json
├── prompts/
│   ├── layer1_base_persona.md      ← من prompts/
│   ├── layer2_missions/            ← من prompts/layer2_missions/
│   ├── layer3_template.md          ← من prompts/
│   └── layer4_template.md          ← من prompts/
├── engine/
│   ├── srs.ts                      ← من engine/srs.ts
│   ├── prompt_builder.ts           ← من engine/prompt_builder.ts
│   └── progression.ts              ← من engine/progression.ts
└── reports/
    └── whatsapp_template.ts        ← من reports/whatsapp_template.ts

backend/src/
├── types/                          ← نسخة من src/types/
├── engine/                         ← نسخة من src/engine/ (المنطق في الـ Backend)
├── routes/
│   ├── sessions.ts                 ← إدارة الجلسات
│   ├── students.ts                 ← إدارة الطلاب
│   └── reports.ts                  ← توليد التقارير
└── services/
    ├── gemini.ts                   ← تكامل Gemini Flash Live
    ├── supabase.ts                 ← تكامل قاعدة البيانات
    └── whatsapp.ts                 ← إرسال واتساب
```

---

### المرحلة ٢: قاعدة البيانات (اليوم ٣-٤)

#### ٢.١ إنشاء الـ Schema في Supabase

استخرج الـ schema من `schema/types.ts` وحوّله إلى SQL:

```sql
-- من types.ts → Student interface
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  cefr_level TEXT DEFAULT 'A1',
  current_phase INTEGER DEFAULT 1,
  total_sessions INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_minutes_spoken INTEGER DEFAULT 0,
  total_words_spoken INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  badges TEXT[] DEFAULT '{}',
  current_mission_id TEXT,
  last_session_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- من types.ts → VocabularyItem interface
CREATE TABLE vocabulary (
  id TEXT PRIMARY KEY,
  word TEXT NOT NULL,
  translation TEXT,
  pattern_id TEXT,
  phoneme_focus TEXT[],
  context_examples TEXT[],
  cefr_level TEXT,
  missions TEXT[]
);

CREATE TABLE student_vocabulary (
  student_id UUID REFERENCES students(id),
  vocabulary_id TEXT REFERENCES vocabulary(id),
  first_learned TIMESTAMPTZ,
  last_reviewed TIMESTAMPTZ,
  next_review TIMESTAMPTZ,
  interval_days INTEGER DEFAULT 1,
  ease_factor FLOAT DEFAULT 2.5,
  review_count INTEGER DEFAULT 0,
  mastery_level INTEGER DEFAULT 0,
  pronunciation_accuracy FLOAT DEFAULT 0,
  production_accuracy FLOAT DEFAULT 0,
  PRIMARY KEY (student_id, vocabulary_id)
);

-- أكمل باقي الجداول بنفس النمط...
```

#### ٢.٢ تحميل الـ Seed Data

```typescript
// backend/src/scripts/seed.ts
import phonemes from '../data/phonemes.json';
import patterns from '../data/patterns.json';
import vocabulary from '../data/vocabulary.json';

// أدخل البيانات في Supabase
await supabase.from('phonemes').insert(phonemes.level_1_phonemes);
await supabase.from('patterns').insert(patterns.level_1_patterns);
await supabase.from('vocabulary').insert(vocabulary.level_1_vocabulary);
```

---

### المرحلة ٣: تكامل Gemini Flash Live (اليوم ٥-٦)

#### ٣.١ إعداد Gemini

```typescript
// backend/src/services/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function startSession(prompt: string) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.1-flash-live', // أو الاسم الرسمي الحالي
    systemInstruction: prompt,
  });

  // ابدأ محادثة صوتية ثنائية الاتجاه
  const session = await model.startLiveSession({
    // إعدادات الصوت
    inputAudioFormat: 'audio/webm',
    outputAudioFormat: 'audio/webm',
    // إعدادات الاستجابة
    responseModalities: ['AUDIO', 'TEXT'],
  });

  return session;
}
```

#### ٣.٢ بناء الـ Prompt الكامل

```typescript
// backend/src/routes/sessions.ts
import { PromptBuilder } from '../engine/prompt_builder';
import { startSession } from '../services/gemini';

const builder = new PromptBuilder();

router.post('/sessions/start', async (req, res) => {
  const { studentId } = req.body;
  
  // ١. اجلب بيانات الطفل والمهمة من DB
  const student = await getStudent(studentId);
  const mission = await getMission(student.current_mission_id);
  
  // ٢. ابنِ الـ Prompt الكامل (٤ طبقات)
  const fullPrompt = builder.buildSessionPrompt({
    student,
    mission,
    sessionStartTime: new Date()
  });
  
  // ٣. ابدأ جلسة Gemini
  const geminiSession = await startSession(fullPrompt);
  
  // ٤. احفظ الجلسة في DB
  const session = await createSession({
    student_id: studentId,
    mission_id: mission.id,
    start_time: new Date(),
  });
  
  // ٥. أعد معرف الجلسة للـ Frontend
  res.json({ sessionId: session.id, geminiSessionId: geminiSession.id });
});
```

#### ٣.٣ معالجة الصوت في الـ Frontend

```typescript
// src/hooks/useGeminiLive.ts
import { useEffect, useRef } from 'react';

export function useGeminiLive(sessionId: string) {
  const audioContextRef = useRef<AudioContext>();
  const streamRef = useRef<MediaStream>();
  
  useEffect(() => {
    // ١. اطلب إذن الميكروفون
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream;
        
        // ٢. ابدأ WebSocket مع الـ Backend
        const ws = new WebSocket(`wss://api.tayyar.app/sessions/${sessionId}/live`);
        
        // ٣. أرسل صوت الطفل لـ Gemini (عبر Backend)
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          ws.send(e.data);
        };
        recorder.start(100); // أرسل كل ١٠٠ms
        
        // ٤. استقبل صوت AI واشغله
        ws.onmessage = (event) => {
          const audioBlob = new Blob([event.data], { type: 'audio/webm' });
          playAudio(audioBlob);
        };
      });
    
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [sessionId]);
}
```

---

### المرحلة ٤: واجهة الـ PWA (اليوم ٧-١٠)

#### ٤.١ بناء الشاشات الأساسية

اتبِع `design/DESIGN_SYSTEM.md` حرفياً. شاشات المرحلة الأولى:

```
✅ Onboarding (3 شاشات)
✅ Home (الشاشة الرئيسية)
✅ Pre-Mission (مقدمة المهمة)
✅ Mission Active (المهمة الجارية — الأهم)
✅ Post-Mission (ملخص المهمة)
⏳ Journey Map (يُمكن تأخيرها للنسخة ٢)
⏳ Badges (يُمكن تأخيرها للنسخة ٢)
```

#### ٤.٢ مكتبة المكونات

```typescript
// src/components/ui/
├── Button.tsx          // ٤ أنواع + ٥ حالات (من DESIGN_SYSTEM.md)
├── Card.tsx            // ٤ أنواع
├── ProgressBar.tsx
├── Avatar.tsx          // شخصيات AI الخمسة
├── Toast.tsx
└── BottomSheet.tsx
```

#### ٤.٣ شاشة المهمة الجارية (الأهم)

```typescript
// src/screens/MissionActive.tsx
import { useGeminiLive } from '../hooks/useGeminiLive';
import { useEffect, useState } from 'react';

export function MissionActive({ sessionId }: { sessionId: string }) {
  const [currentExchange, setCurrentExchange] = useState(0);
  const [points, setPoints] = useState(0);
  const [aiMessage, setAiMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const gemini = useGeminiLive(sessionId);
  
  // 每 ٣٠ ثانية، اطلب تحديث Layer 4
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`/api/sessions/${sessionId}/realtime-update`, {
        method: 'POST',
        body: JSON.stringify({
          timeElapsed: getTimeElapsed(),
          currentExchange,
          points,
          // ... باقي الحالة
        })
      });
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="mission-active">
      {/* Header: وقت + خروج */}
      <Header timeLeft={timeLeft} onExit={handleExit} />
      
      {/* شريط التقدم: ٦ دوائر */}
      <ProgressTrack current={currentExchange} total={6} points={points} />
      
      {/* رسالة AI */}
      <AIMessage text={aiMessage} character="khalid" />
      
      {/* مؤشر الميكروفون */}
      <MicrophoneIndicator isActive={isListening} />
      
      {/* أزرار المساعدة */}
      <HelpButtons onHint={() => requestHint()} onSkip={() => skipExchange()} />
    </div>
  );
}
```

#### ٤.٤ الـ PWA Manifest

```json
// public/manifest.json
{
  "name": "طيّار — AI Speaking Tutor",
  "short_name": "طيّار",
  "description": "تعلّم المحادثة الإنجليزية بـ AI",
  "lang": "ar",
  "dir": "rtl",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#1E5BA8",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### ٤.٥ Service Worker

```javascript
// public/sw.js
const CACHE_NAME = 'tayyar-v1';
const urlsToCache = [
  '/',
  '/static/js/main.js',
  '/static/css/main.css',
  '/icons/icon-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // لا تخزن الـ API calls (محادثات Gemini)
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
```

---

### المرحلة ٥: الـ Backend APIs (اليوم ١١-١٣)

#### ٥.١ الـ Routes الأساسية

```typescript
// backend/src/routes/
├── auth.ts           // تسجيل دخول الطفل
├── students.ts       // CRUD للطلاب
├── missions.ts       // عرض المهام + التحقق من الوصول
├── sessions.ts       // بدء/إنهاء الجلسات + تحليلها
├── progression.ts    // التقدم بين المهام
└── reports.ts        // توليد + إرسال تقارير واتساب
```

#### ٥.٢ WebSocket للجلسة الحية

```typescript
// backend/src/routes/sessions.ts
import { WebSocketServer } from 'ws';
import { PromptBuilder } from '../engine/prompt_builder';

const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  const sessionId = req.url.split('/').pop();
  
  ws.on('message', async (data) => {
    // ١. استقبل صوت الطفل
    // ٢. أرسله لـ Gemini Flash Live
    // ٣. استقبل رد Gemini (صوت + JSON)
    // ٤. أعد صوت AI للطفل
    ws.send(aiAudioData);
    
    // ٥. حفظ التحليل في DB (من JSON output)
    await saveSessionAnalysis(sessionId, geminiAnalysis);
  });
});
```

---

### المرحلة ٦: الاختبار (اليوم ١٤-١٥)

#### ٦.١ اختبار ذاتي
- اختبر كل مهمة بنفسك (العب دور الطفل)
- تحقق من:
  - الـ Prompts تُبنى بشكل صحيح (اطبعها في console)
  - Gemini يُعيد JSON صالح
  - الـ SRS يحدّث البيانات
  - التقارير تُولَّد بشكل صحيح

#### ٦.٢ اختبار مع ٥ أطفال
- وزّع رابط PWA على ٥ أطفال من معارفك
- اجمع البيانات لـ ١٤ يوماً
- راجع الـ Kill Signals:

| المقياس | العتبة |
|---|---|
| إكمال الجلسة الأولى | > ٧٠٪ |
| العودة في اليوم الثاني | > ٥٠٪ |
| العودة في اليوم السابع | > ٢٥٪ |
| فتح تقرير واتساب | > ٦٠٪ |
| الاستعداد للدفع | > ٣٠٪ |

---

## ⚠️ تحذيرات تقنية حرجة

### ١. إدارة الـ Prompts
- **لا تُرسل الـ ٤ طبقات + ٦ أوامر هندسية معاً** — ستتجاوز حد الـ tokens
- **الحل**: Layer 1 + Layer 2 + Layer 3 = الـ System Prompt الأساسي
- Layer 4 + Engineering Prompts = تُرسل كـ updates كل ٣٠ ثانية

### ٢. الصوت والـ Latency
- استخدم **WebSocket** لا HTTP polling
- اضبط **buffer size** للصوت (١٠٠ms chunks)
- اختبر على شبكات ٣G/4G (لا تفترض WiFi دائماً)
- أضف **fallback**: لو فشل Gemini Live، أظهر رسالة "حاول مرة أخرى"

### ٣. الأمان (Children's Data)
- **لا تخزّن تسجيلات الأطفال على سيرفرات خارج السعودية** (متطلب SDAIA محتمل)
- استخدم Supabase في منطقة ME (Middle East) إن توفر
- احصل على إذن ولي الأمر كتابياً قبل تسجيل أي صوت
- لا تنشر أي بيانات شخصية للطفل لأطراف ثالثة

### ٤. الـ JSON Parsing
- Gemini قد يُعيد JSON غير صالح أحياناً
- استخدم `try-catch` عند الـ parsing
- لو فشل الـ parsing، احفظ الـ raw response وسجّله للمراجعة

### ٥. الـ Streak
- الـ Streak يُحسب بـ **التاريخ المحلي للطفل** لا UTC
- استخدم timezone Asia/Riyadh بشكل صريح
- احفظ `last_session_date` كـ timestamp مع timezone

---

## 📋 قائمة التحقق النهائية قبل الإطلاق

### Frontend (React PWA):
- [ ] الـ PWA تعمل offline (Service Worker)
- [ ] الميكروفون يطلب الإذن بشكل صحيح
- [ ] الصوت يُشغَّل تلقائياً (بعد تفاعل المستخدم — متصفح Policy)
- [ ] RTL يعمل في كل الشاشات
- [ ] الخطوط (Tajawal + Inter) محمّلة
- [ ] الأيقونات (192px + 512px) موجودة
- [ ] manifest.json صحيح

### Backend (Node.js):
- [ ] Gemini API key محمي (environment variable)
- [ ] WebSocket مستقر (لا انقطاع كل دقيقة)
- [ ] قاعدة البيانات (Supabase) متصلة
- [ ] الـ SRS يعمل (اختبر بـ review cycle كامل)
- [ ] التقارير تُولَّد وتُرسل (اختبر واتساب)
- [ ] Logs مسجّلة (للـ debugging)

### المنطق التعليمي:
- [ ] الـ Prompts تُبنى بشكل صحيح (اطبعها وتحقق)
- [ ] التسلسل بين المهام يعمل (لا وصول لمهمة قبل سابقتها)
- [ ] الـ SRS يحقن المراجعات في المهمات
- [ ] الـ JSON output من Gemini يُحلَّل ويُحفظ
- [ ] التقارير تحتوي على بيانات صحيحة

### الاختبار:
- [ ] اختبر المهمة ١ كاملة (٧ دقائق)
- [ ] اختبر الانتقال من مهمة ١ إلى ٢
- [ ] اختبر الـ Streak (افتح التطبيق يومين متتاليين)
- [ ] اختبر تقرير واتساب (أرسل لنفسك)
- [ ] اختبر على iOS Safari + Android Chrome

---

## 🎯 الأولويات للنسخة الأولى (PWA MVP)

### افعله الآن:
✅ مهمة واحدة فقط (المطار) كاملة وجاهزة
✅ محادثة Gemini Live تعمل بـ WebSocket
✅ حفظ بيانات الجلسة + JSON analysis
✅ تقرير واتساب يومي
✅ Streak + نقاط + شارة واحدة

### لا تفعله الآن (للنسخة ٢):
❌ نظام معلمين
❌ لوحة ولي الأمر المتقدمة
❌ كل المهام الخمس (ابدأ بواحدة)
❌ الإشعارات Push (الـ PWA تدعمها محدوداً)
❌ نظام الدفع (استخدم رابط STC Pay يدوي)
❌ الـ Leaderboard الاجتماعي

---

## 📞 موارد إضافية

### Gemini 3.1 Flash Live:
- الوثائق: https://ai.google.dev/gemini-api/docs
- الـ SDK: `@google/generative-ai`
- الـ Pricing: $٠.٠٠٥/دقيقة input + $٠.٠١٨/دقيقة output

### Supabase:
- الوثائق: https://supabase.com/docs
- الـ SDK: `@supabase/supabase-js`
- الـ Free tier: كافٍ لـ ٥٠٠ مستخدم

### WhatsApp Business API:
- عبر Twilio: https://www.twilio.com/whatsapp
- أو عبر WhatsApp Direct: https://business.whatsapp.com/

---

## 🚀 خلاصة: كيف تبدأ اليوم

```
اليوم ١: اقرأ كل الـ ١٨ ملفاً (بالترتيب الموصى به)
اليوم ٢: اضبط البيئة + انسخ الملفات
اليوم ٣-٤: قاعدة البيانات + Seed data
اليوم ٥-٦: تكامل Gemini Flash Live
اليوم ٧-١٠: واجهة الـ PWA (٤ شاشات أساسية)
اليوم ١١-١٣: الـ Backend APIs + WebSocket
اليوم ١٤-١٥: الاختبار الذاتي + إصلاح الأخطاء
اليوم ١٦+: اختبار مع ٥ أطفال
```

**تذكر**: الهدف من النسخة الأولى هو **التحقق من الـ Engagement**، لا بناء منتج كامل. ابدأ صغيراً، اختبر بصدق، وسع بناءً على البيانات.

**النواة جاهزة. الملفات الـ ١٨ كاملة. الفلسفة واضحة. ابدأ البناء.**

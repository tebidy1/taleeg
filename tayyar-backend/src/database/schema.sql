-- schema.sql
-- Tayyar App Supabase PostgreSQL Schema

-- 1. Students Table
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

-- 2. Vocabulary Table (Seed Data)
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

-- 3. Patterns Table (Seed Data)
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  pattern TEXT NOT NULL,
  translation TEXT,
  cefr_level TEXT,
  phase INTEGER,
  teaching_order INTEGER
);

-- 4. Phonemes Table (Seed Data)
CREATE TABLE phonemes (
  id TEXT PRIMARY KEY,
  phoneme TEXT NOT NULL,
  arabic_confusion TEXT,
  hint TEXT
);

-- 5. Student Vocabulary (SRS Data)
CREATE TABLE student_vocabulary (
  student_id UUID REFERENCES students(id),
  vocabulary_id TEXT REFERENCES vocabulary(id),
  first_learned TIMESTAMPTZ DEFAULT NOW(),
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

-- 6. Student Patterns
CREATE TABLE student_patterns (
  student_id UUID REFERENCES students(id),
  pattern_id TEXT REFERENCES patterns(id),
  recognition_level INTEGER DEFAULT 0,
  substitution_level INTEGER DEFAULT 0,
  expansion_level INTEGER DEFAULT 0,
  production_level INTEGER DEFAULT 0,
  transformation_level INTEGER DEFAULT 0,
  times_used_correctly INTEGER DEFAULT 0,
  times_used_incorrectly INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  PRIMARY KEY (student_id, pattern_id)
);

-- 7. Sessions Table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  mission_id TEXT,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  badge_earned TEXT,
  engagement_level TEXT,
  frustration_detected BOOLEAN DEFAULT FALSE,
  hero_word TEXT,
  mood_emoji TEXT,
  audio_recording_url TEXT,
  transcript TEXT
);

-- 8. Session Exchanges
CREATE TABLE session_exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  exchange_number INTEGER,
  ai_message TEXT,
  student_message TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  duration_seconds INTEGER,
  hint_used BOOLEAN DEFAULT FALSE,
  pronunciation_score FLOAT,
  pattern_used TEXT,
  success BOOLEAN
);

-- ==========================================
-- V2 MIGRATIONS
-- ==========================================

ALTER TABLE students 
ALTER COLUMN current_phase SET DEFAULT 0;

-- تعيين Mission 0 للطلاب الجدد أو الذين ليس لديهم مهمة
UPDATE students 
SET current_mission_id = 'mission_00_first_words' 
WHERE current_mission_id IS NULL OR current_mission_id = '';

-- إضافة نمط التحية 000
INSERT INTO patterns (id, pattern, translation, cefr_level, phase, teaching_order) 
VALUES ('pat_000_greeting', 'Hello, I am {name}', 'مرحباً، أنا {اسم}', 'A0', 0, 0)
ON CONFLICT (id) DO NOTHING;

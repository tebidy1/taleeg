import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
  console.log("Seeding data...");

  // Load JSON files
  const dataPath = path.join(__dirname, '../../frontend/src/data'); // Assuming data was copied there
  const phonemesData = JSON.parse(fs.readFileSync(path.join(dataPath, 'phonemes.json'), 'utf-8'));
  const patternsData = JSON.parse(fs.readFileSync(path.join(dataPath, 'patterns.json'), 'utf-8'));
  const vocabularyData = JSON.parse(fs.readFileSync(path.join(dataPath, 'vocabulary.json'), 'utf-8'));

  // Insert Phonemes
  if (phonemesData.level_1_phonemes) {
      const phonemes = Object.keys(phonemesData.level_1_phonemes).map(key => ({
          id: key,
          phoneme: phonemesData.level_1_phonemes[key].phoneme,
          arabic_confusion: phonemesData.level_1_phonemes[key].arabic_confusion,
          hint: phonemesData.level_1_phonemes[key].hint
      }));
      const { error } = await supabase.from('phonemes').upsert(phonemes);
      if (error) console.error("Error inserting phonemes", error);
      else console.log("Phonemes inserted");
  }

  // Insert Patterns
  if (patternsData.level_1_patterns) {
      const patterns = patternsData.level_1_patterns.map((p: any) => ({
          id: p.id,
          pattern: p.pattern,
          translation: p.translation,
          cefr_level: p.cefr_level,
          phase: p.phase,
          teaching_order: p.teaching_order
      }));
      const { error } = await supabase.from('patterns').upsert(patterns);
      if (error) console.error("Error inserting patterns", error);
      else console.log("Patterns inserted");
  }

  // Insert Vocabulary
  if (vocabularyData.level_1_vocabulary) {
      const vocab = vocabularyData.level_1_vocabulary.map((v: any) => ({
          id: v.id,
          word: v.word,
          translation: v.translation,
          pattern_id: v.pattern_id,
          phoneme_focus: v.phoneme_focus,
          context_examples: v.context_examples,
          cefr_level: v.cefr_level,
          missions: v.missions
      }));
      const { error } = await supabase.from('vocabulary').upsert(vocab);
      if (error) console.error("Error inserting vocabulary", error);
      else console.log("Vocabulary inserted");
  }

  console.log("Seeding complete.");
}

seedData();

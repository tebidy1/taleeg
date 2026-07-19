// Lightweight client-side progress tracking for the free-trial mission arc.
// No account system yet — localStorage is the source of truth for "what has
// this device completed", mirrored against the backend's mission registry.
import { API_BASE } from '../config';

const STORAGE_KEY   = 'tayyar_completed_missions';
const POINTS_KEY    = 'tayyar_points';
const SESSIONS_KEY  = 'tayyar_session_dates'; // YYYY-MM-DD strings

export interface MissionListItem {
  id: string;
  title_ar: string;
  order: number;
  teaser_ar?: string;
}

export interface DayProgress {
  day: string;   // Arabic day name
  done: boolean;
  isToday: boolean;
}

export async function fetchMissions(): Promise<MissionListItem[]> {
  const res = await fetch(`${API_BASE}/api/sessions/missions`);
  if (!res.ok) throw new Error(`missions fetch failed: ${res.status}`);
  const data = await res.json();
  return (data.missions as MissionListItem[]).sort((a, b) => a.order - b.order);
}

export function getCompletedMissionIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function markMissionCompleted(missionId: string): void {
  const done = new Set(getCompletedMissionIds());
  done.add(missionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]));
}

/** First mission not yet completed, or null if the whole arc is done. */
export function getNextMissionId(missions: MissionListItem[]): string | null {
  const done = new Set(getCompletedMissionIds());
  const next = missions.find(m => !done.has(m.id));
  return next?.id ?? null;
}

// ── Points ────────────────────────────────────────────────────────────────────

export function getTotalPoints(): number {
  return parseInt(localStorage.getItem(POINTS_KEY) || '0', 10);
}

export function addPoints(n: number): void {
  localStorage.setItem(POINTS_KEY, String(getTotalPoints() + n));
}

// ── Session dates + streak ────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getSessionDates(): string[] {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); }
  catch { return []; }
}

export function recordTodaySession(): void {
  const today = todayStr();
  const dates = getSessionDates();
  if (!dates.includes(today)) {
    dates.push(today);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(dates));
  }
}

export function getCurrentStreak(): number {
  const dates = getSessionDates();
  if (dates.length === 0) return 0;

  const sorted = [...new Set(dates)].sort().reverse(); // unique, newest first
  const today = todayStr();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

  // If most recent session is older than yesterday, streak is broken
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  let ref = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const prevDay = new Date(ref);
    prevDay.setDate(prevDay.getDate() - 1);
    const expected = prevDay.toISOString().split('T')[0];
    if (sorted[i] === expected) { streak++; ref = sorted[i]; }
    else break;
  }
  return streak;
}

export function isTodayDone(): boolean {
  return getSessionDates().includes(todayStr());
}

// ── Best session (for "Quick Speaker" badge) ─────────────────────────────────
const BEST_SENTENCES_KEY = 'tayyar_best_sentences';

export function getBestSessionSentences(): number {
  return parseInt(localStorage.getItem(BEST_SENTENCES_KEY) || '0', 10);
}

export function recordBestSessionSentences(n: number): void {
  if (n > getBestSessionSentences()) localStorage.setItem(BEST_SENTENCES_KEY, String(n));
}

// ── Pilot rank ────────────────────────────────────────────────────────────────
export function getPilotRank(): string {
  const completed = getCompletedMissionIds().length;
  if (completed >= 5) return 'كابتن 🎖️';
  if (completed >= 3) return 'طيار محترف 🛩️';
  if (completed >= 1) return 'طيار مبتدئ ✈️';
  return 'طالب طيران 🧑‍🎓';
}

// ── Badges ────────────────────────────────────────────────────────────────────
export interface BadgeDef {
  id: string;
  icon: string;
  name_ar: string;
  desc_ar: string;
  earned: boolean;
}

export function getBadges(): BadgeDef[] {
  const completed = getCompletedMissionIds().length;
  const streak    = getCurrentStreak();
  const best      = getBestSessionSentences();
  return [
    { id: 'first_flight',   icon: '🛫', name_ar: 'الإقلاع الأول',     desc_ar: 'أكمل مهمتك الأولى',              earned: completed >= 1  },
    { id: 'explorer',       icon: '🌍', name_ar: 'المستكشف',           desc_ar: 'أكمل 3 مهام مختلفة',            earned: completed >= 3  },
    { id: 'sky_captain',    icon: '👨‍✈️', name_ar: 'كابتن السماء',      desc_ar: 'أكمل رحلتك كاملة (5 مهام)',    earned: completed >= 5  },
    { id: 'streak_3',       icon: '🔥', name_ar: 'ثلاثة أيام نار',     desc_ar: 'سلسلة 3 أيام متتالية',          earned: streak >= 3     },
    { id: 'week_warrior',   icon: '🗓️', name_ar: 'محارب الأسبوع',      desc_ar: 'سلسلة 5 أيام متتالية',          earned: streak >= 5     },
    { id: 'legend',         icon: '⭐', name_ar: 'أسطورة الأسبوع',     desc_ar: 'سلسلة 7 أيام متتالية',          earned: streak >= 7     },
    { id: 'quick_speaker',  icon: '🎤', name_ar: 'المتحدث السريع',      desc_ar: 'قل 10 جمل في جلسة واحدة',      earned: best >= 10      },
    { id: 'super_speaker',  icon: '🎙️', name_ar: 'المتحدث الخارق',     desc_ar: 'قل 20 جملة في جلسة واحدة',     earned: best >= 20      },
  ];
}

// ── Saudi school week: Sunday (0) → Thursday (4) ─────────────────────────────
const SCHOOL_DAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس'];

export function getWeekProgress(): DayProgress[] {
  const dateSet = new Set(getSessionDates());
  const today = new Date();
  const todayIso = todayStr();

  // Find the most recent Sunday (start of current school week)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - ((today.getDay() + 7) % 7)); // Sun of this week

  return SCHOOL_DAYS_AR.map((day, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i); // Sun=+0, Mon=+1, ... Thu=+4
    const iso = d.toISOString().split('T')[0];
    return { day, done: dateSet.has(iso), isToday: iso === todayIso };
  });
}

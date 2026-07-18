// Lightweight client-side progress tracking for the free-trial mission arc.
// No account system yet — localStorage is the source of truth for "what has
// this device completed", mirrored against the backend's mission registry.

const STORAGE_KEY = 'tayyar_completed_missions';

export interface MissionListItem {
  id: string;
  title_ar: string;
  order: number;
}

export async function fetchMissions(): Promise<MissionListItem[]> {
  const res = await fetch('http://localhost:8080/api/sessions/missions');
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

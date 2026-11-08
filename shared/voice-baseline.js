// One-minute voice check-in. The audio stays in the browser; only these summary numbers are saved.
// The numbers describe speaking pace, not identity or emotion, and a change is never a diagnosis.
export const VOICE_PROMPTS = Object.freeze([
  {id: 'breakfast', text: 'What did you have for breakfast today?'},
  {id: 'grandchild', text: 'What is your first memory of your grandchild?', memory: true, ask: 'What is your first memory of us together?'},
  {id: 'home', text: 'Describe the street where you grew up.', memory: true, ask: 'What was the street I grew up on like?'},
  {id: 'weekend', text: 'What do you enjoy doing on a weekend?'},
]);
export const CHECKIN_SECONDS = 60;
export const PROMPT_SECONDS = CHECKIN_SECONDS / VOICE_PROMPTS.length;
export const FRAME_MS = 100;
const MIN_PAUSE_MS = 700;

// levels: one RMS loudness value (0–1) per FRAME_MS. The speech threshold adapts to the room's noise floor.
export function summarizeLevels(levels = [], {frameMs = FRAME_MS, words = null} = {}) {
  const durationSec = Math.round(levels.length * frameMs / 100) / 10;
  if (!levels.length) return {durationSec: 0, speechRatio: 0, pausesPerMin: 0, wordsPerMin: null};
  const sorted = [...levels].sort((a, b) => a - b);
  // Some people barely pause, so the noise floor comes from the quietest few frames,
  // and the threshold is clamped to typical microphone speech levels.
  const floor = sorted[Math.floor(sorted.length * 0.02)];
  const threshold = Math.min(0.05, Math.max(0.015, floor * 3));
  const speaking = levels.map((v) => v >= threshold);
  const spoken = speaking.filter(Boolean).length;
  let pauses = 0, silent = 0, started = false;
  for (const on of speaking) {
    if (on) { if (started && silent * frameMs >= MIN_PAUSE_MS) pauses++; started = true; silent = 0; } else silent++;
  }
  const minutes = levels.length * frameMs / 60000;
  const speakingMinutes = spoken * frameMs / 60000;
  return {
    durationSec,
    speechRatio: Math.round(spoken / levels.length * 100) / 100,
    pausesPerMin: Math.round(pauses / minutes * 10) / 10,
    wordsPerMin: Number.isFinite(words) && speakingMinutes > 0.1 ? Math.round(words / speakingMinutes) : null,
  };
}

export const validCheckin = (summary) => summary.durationSec >= 20 && summary.speechRatio >= 0.15;

// Compares a new check-in with the saved baseline. Large changes suggest, never decide.
export function compareToBaseline(baseline, current) {
  if (!baseline || !current) return {changed: false, notes: []};
  const notes = [];
  const drop = (a, b) => a > 0 ? (a - b) / a : 0;
  if (drop(baseline.speechRatio, current.speechRatio) > 0.3) notes.push('You spoke for noticeably less of the minute than in your baseline.');
  if (baseline.pausesPerMin > 0 && current.pausesPerMin > baseline.pausesPerMin * 1.5 && current.pausesPerMin - baseline.pausesPerMin >= 3) notes.push('There were more long pauses than in your baseline.');
  if (baseline.wordsPerMin && current.wordsPerMin && drop(baseline.wordsPerMin, current.wordsPerMin) > 0.25) notes.push('You spoke more slowly than in your baseline.');
  return {changed: notes.length > 0, notes};
}

// Memory questions from the check-in become verification questions for callers who claim to be family.
export const memoryQuestions = (baseline) => VOICE_PROMPTS.filter((p) => p.memory && baseline?.prompts?.includes(p.id)).map((p) => p.ask);

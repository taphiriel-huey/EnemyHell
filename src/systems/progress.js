const STORAGE_KEY = "blackhaven.enemyhell.progress.v1";

const DEFAULT_PROGRESS = {
  totalRuns: 0,
  totalGold: 0,
  lastRun: null,
  bestRun: null,
  bestVictory: null,
};

export function loadProgress() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

export function recordRunProgress(summary) {
  const progress = loadProgress();
  const next = {
    ...progress,
    totalRuns: progress.totalRuns + 1,
    totalGold: progress.totalGold + summary.gold,
    lastRun: summary,
    bestRun: isBetterRun(summary, progress.bestRun) ? summary : progress.bestRun,
    bestVictory: summary.result === "victory" && isBetterRun(summary, progress.bestVictory) ? summary : progress.bestVictory,
  };
  saveProgress(next);
  return next;
}

export function formatRunTime(time) {
  const seconds = Math.max(0, Math.floor(time));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function saveProgress(progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Local storage can fail in private or restricted browser contexts.
  }
}

function isBetterRun(candidate, current) {
  if (!current) return true;
  if (candidate.result === "victory" && current.result !== "victory") return true;
  if (candidate.result !== "victory" && current.result === "victory") return false;
  if (candidate.wave !== current.wave) return candidate.wave > current.wave;
  if (candidate.score !== current.score) return candidate.score > current.score;
  if (candidate.kills !== current.kills) return candidate.kills > current.kills;
  return candidate.time > current.time;
}

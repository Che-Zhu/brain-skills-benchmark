function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Local clock time for display, e.g. `11:02`. */
export function formatLocalClock(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Local date + clock for CSV rows, e.g. `2026-06-04 11:02`. */
export function formatLocalTimestamp(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const mo = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${mo}-${day} ${formatLocalClock(d)}`;
}

/** Elapsed time for CSV, e.g. `17:13` (minutes:seconds). */
export function formatDurationMinutesSeconds(ms) {
  const totalSec = Math.max(0, Math.round(Number(ms) / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${pad2(seconds)}`;
}

/** Filesystem-safe local run id, e.g. `2026-06-04_11-02-33`. */
export function createBenchmarkRunId(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const mo = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const h = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const s = pad2(d.getSeconds());
  return `${y}-${mo}-${day}_${h}-${mi}-${s}`;
}

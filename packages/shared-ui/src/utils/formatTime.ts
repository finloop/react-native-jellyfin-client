/**
 * Format a duration in seconds as a clock string.
 * Returns `H:MM:SS` when the value is at least an hour, otherwise `M:SS`.
 * Minutes/seconds are zero-padded; negative/NaN inputs floor to 0.
 */
export function formatTime(seconds: number): string {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(secs)}`
    : `${minutes}:${pad(secs)}`;
}

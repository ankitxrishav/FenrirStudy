export function calculateUserLevel(allTimeSeconds: number = 0, allTimeSessions: number = 0): number {
  const allTimeMins = Math.floor(allTimeSeconds / 60);
  const xp = (allTimeMins * 10) + (allTimeSessions * 50);
  return Math.max(1, Math.floor(Math.sqrt(xp) / 5)); // adjusted curve for quicker early levels
}

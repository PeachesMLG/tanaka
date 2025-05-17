export function executeAtDate(dateTime: Date, callback: () => void): void {
  const now = Date.now();
  const target = dateTime.getTime();
  const dayInMs = 24 * 60 * 60 * 1000;

  if (now >= target) {
    callback();
    return;
  }

  const timeUntilTarget = target - now;
  const timeoutDuration = Math.min(timeUntilTarget, dayInMs);

  setTimeout(() => {
    executeAtDate(dateTime, callback);
  }, timeoutDuration);
}

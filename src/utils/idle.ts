export function runWhenIdle(task: () => void, timeoutMs = 1500): void {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => task(), { timeout: timeoutMs });
    return;
  }

  setTimeout(task, 0);
}

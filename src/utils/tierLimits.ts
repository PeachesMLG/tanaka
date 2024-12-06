export function getTierLimits(tier: string): number {
  const tierValues: { [key: string]: number } = {
    C: 2000,
    R: 750,
    SR: 250,
    SSR: 100,
    UR: 50,
    EX: 10,
  };

  return tierValues[tier] ?? 0;
}

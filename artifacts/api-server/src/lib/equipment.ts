// Equipment fits — we let users see anything they could plausibly do at their
// equipment level. A home user can do home only; a dumbbells_only user can do
// home + dumbbells; a machines_only user can do home + machines; full_gym sees
// everything.
export function visibleEquipmentFor(level: string): string[] {
  switch (level) {
    case "full_gym":
      return ["full_gym", "machines_only", "dumbbells_only", "home"];
    case "machines_only":
      return ["machines_only", "home"];
    case "dumbbells_only":
      return ["dumbbells_only", "home"];
    case "home":
      return ["home"];
    default:
      return ["full_gym", "machines_only", "dumbbells_only", "home"];
  }
}

export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

export function estimateCalories(volumeKg: number, durationSec: number): number {
  // Light heuristic — 5 cal/min base + 0.045 cal per kg of volume.
  const minutes = Math.max(1, Math.round(durationSec / 60));
  const fromTime = minutes * 5;
  const fromVolume = Math.round(volumeKg * 0.045);
  return Math.max(50, fromTime + fromVolume);
}

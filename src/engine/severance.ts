import type { Range, Section14 } from "./types";

/**
 * Severance top-up the employer would owe on termination.
 * - Section 14 applies: pension contributions replace severance → no top-up.
 * - Section 14 does not apply: tenure (years) × last monthly gross salary (PRD §6.1).
 * - Unknown: anything between the two, so it is shown as a range and a clarifying
 *   question is raised.
 * This is an estimate, not legal advice.
 */
export function severanceTopUp(
  section14: Section14,
  tenureYears: number | undefined,
  lastGross: Range,
): Range {
  const tenure = Math.max(0, tenureYears ?? 0);
  if (section14 === "yes") return { min: 0, max: 0 };
  const full = { min: tenure * lastGross.min, max: tenure * lastGross.max };
  if (section14 === "no") return full;
  return { min: 0, max: full.max };
}

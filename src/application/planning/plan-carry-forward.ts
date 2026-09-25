import {
  planCarryForward,
  type CarryForwardAction,
  type CarryForwardCandidate,
} from "@/domain/planning";

import { weeklyPeriodInputSchema, type WeeklyPeriodInput } from "@/validation/planning";

/** Pure use-case boundary; persistence can later load candidates and save the
 * selected decision within a single database transaction. */
export function planNextWeekCarryForward(
  pendingItems: readonly CarryForwardCandidate[],
): CarryForwardAction {
  return planCarryForward(pendingItems);
}

/** Validate untrusted form/API input before handing it to a domain workflow. */
export function validateWeeklyPeriodInput(input: unknown): WeeklyPeriodInput {
  const parsed = weeklyPeriodInputSchema.parse(input);
  try {
    new Intl.DateTimeFormat("en", { timeZone: parsed.timezoneName });
  } catch {
    throw new Error("Timezone must be a valid IANA timezone name.");
  }
  return parsed;
}

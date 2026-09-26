export const progressStatuses = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;
export type ProgressStatus = (typeof progressStatuses)[number];

export type ProgressDates = {
  status: ProgressStatus;
  startedOn: Date | null;
  completedOn: Date | null;
};

export function validateProgressDates(value: ProgressDates): boolean {
  return !(value.startedOn && value.completedOn && value.completedOn < value.startedOn);
}

export function prerequisiteIsValid(learningItemId: string, prerequisiteItemId: string): boolean {
  // Prerequisites describe relationships only. They never gate learning or completion.
  return learningItemId !== prerequisiteItemId;
}

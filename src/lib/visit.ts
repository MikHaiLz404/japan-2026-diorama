import { compareDateKeys } from "./dates";
import type { VisitStatus } from "../data/types";

export function statusForDate(dateKey: string, today: string): VisitStatus {
  const cmp = compareDateKeys(dateKey, today);
  if (cmp < 0) return "visited";
  if (cmp === 0) return "today";
  return "upcoming";
}

export function rollupStatus(dates: string[], today: string): VisitStatus {
  if (dates.length === 0) return "upcoming";
  const statuses = dates.map((date) => statusForDate(date, today));
  if (statuses.includes("today")) return "today";
  if (statuses.includes("visited")) return "visited";
  return "upcoming";
}

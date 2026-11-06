import { format, formatDistanceToNowStrict } from "date-fns";
import type { SeverityCounts } from "@/lib/types";

export function formatDateTime(iso: string): string {
  return format(new Date(iso), "d MMM yyyy, HH:mm");
}

export function formatDate(iso: string): string {
  return format(new Date(iso), "d MMM yyyy");
}

export function formatRelative(iso: string): string {
  return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
}

/** Human risk level derived from the severity counts of an analysis. */
export function riskLevel(counts: SeverityCounts): "Critical" | "High" | "Medium" | "Low" {
  if (counts.critical > 0) return "Critical";
  if (counts.high > 0) return "High";
  if (counts.medium > 0) return "Medium";
  return "Low";
}

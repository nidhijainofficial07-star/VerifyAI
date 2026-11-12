import type { ConfidenceLabel, ReviewStatus, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

const severityStyles: Record<Severity, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/25",
  high: "bg-warning/15 text-warning-foreground border-warning/40",
  medium: "bg-info/10 text-info border-info/25",
  low: "bg-muted text-muted-foreground border-border",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize",
        severityStyles[severity],
      )}
    >
      {severity}
    </span>
  );
}

const confidenceStyles: Record<ConfidenceLabel, string> = {
  "Confirmed Mismatch": "bg-destructive/10 text-destructive border-destructive/25",
  "Needs Human Review": "bg-warning/15 text-warning-foreground border-warning/40",
  "Potential Violation": "bg-info/10 text-info border-info/25",
};

export function ConfidenceBadge({ label }: { label: ConfidenceLabel }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium leading-relaxed",
        confidenceStyles[label],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function ComplianceBadge({ status }: { status: "compliant" | "issues_found" }) {
  const compliant = status === "compliant";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        compliant
          ? "bg-success/15 text-accent-foreground border-success/40"
          : "bg-destructive/10 text-destructive border-destructive/25",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {compliant ? "Compliant" : "Issues Found"}
    </span>
  );
}

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  pending_review: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
  changes_requested: "Changes Requested",
};

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  const styles: Record<ReviewStatus, string> = {
    pending_review: "bg-warning/15 text-warning-foreground border-warning/40",
    approved: "bg-success/15 text-accent-foreground border-success/40",
    rejected: "bg-destructive/10 text-destructive border-destructive/25",
    changes_requested: "bg-info/10 text-info border-info/25",
  };
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-medium leading-relaxed",
        styles[status],
      )}
    >
      {REVIEW_STATUS_LABEL[status]}
    </span>
  );
}

export function ResolutionBadge({
  resolution,
}: {
  resolution: "pending" | "accepted" | "rejected" | "edited";
}) {
  const styles = {
    pending: "bg-muted text-muted-foreground border-border",
    accepted: "bg-success/15 text-accent-foreground border-success/40",
    rejected: "bg-destructive/10 text-destructive border-destructive/25",
    edited: "bg-info/10 text-info border-info/25",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs font-medium leading-relaxed capitalize",
        styles[resolution],
      )}
    >
      {resolution === "edited" ? "Edited by reviewer" : resolution}
    </span>
  );
}

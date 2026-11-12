import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Pencil, Quote, X } from "lucide-react";
import type { Issue } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ConfidenceBadge, ResolutionBadge, SeverityBadge } from "@/components/status-badges";

const CATEGORY_LABEL: Record<Issue["category"], string> = {
  pricing: "Pricing",
  "product-name": "Product Name",
  "restricted-term": "Terminology",
  "unsupported-claim": "Promotional Claim",
  tone: "Tone & Messaging",
};

export function IssueCard({
  issue,
  interactive = true,
  onAccept,
  onReject,
  onEdit,
}: {
  issue: Issue;
  interactive?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  onEdit?: (editedText: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(issue.suggestedCorrection ?? "");

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  const resolved = issue.resolution !== "pending";

  return (
    <article className="rounded-xl border bg-card p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="break-words text-sm font-semibold md:text-base">
  {issue.title}
</h4>
            <SeverityBadge severity={issue.severity} />
            <ConfidenceBadge label={issue.confidence} />
            <ResolutionBadge resolution={issue.resolution} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Category: {CATEGORY_LABEL[issue.category]}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            <Quote className="h-3 w-3" /> Original content
          </p>
          <p className="rounded-lg border-l-4 border-destructive/60 bg-destructive/5 px-3 py-2 font-mono text-sm break-words">
            “{issue.originalText}”
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-muted/60 px-3 py-2.5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Why it is an issue
            </p>
            <p className="mt-1 break-words text-sm leading-relaxed">
  {issue.explanation}
</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2.5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Approved information
            </p>
            <p className="mt-1 break-words text-sm leading-relaxed">
  {issue.approvedValue}
</p>
          </div>
        </div>

        <p className="break-words text-xs leading-relaxed text-muted-foreground">
          Evidence / source: <span className="font-medium text-foreground">{issue.evidenceSource}</span>
        </p>

        {issue.suggestedCorrection ? (
          <div className="rounded-lg border border-success/40 bg-success/10 px-3 py-2.5">
            <p className="text-xs font-semibold tracking-wide text-accent-foreground uppercase">
              Suggested correction
            </p>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 break-words font-mono text-sm leading-relaxed">
  “{issue.suggestedCorrection}”
</p>
              <Button variant="ghost" size="sm" onClick={() => copy(issue.suggestedCorrection!)}>
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          </div>
        ) : issue.suggestedAction ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2.5">
            <p className="text-xs font-semibold tracking-wide text-warning-foreground uppercase">
              Suggested action (no automatic rewrite available)
            </p>
            <p className="mt-1 text-sm">{issue.suggestedAction}</p>
          </div>
        ) : null}

        {editing && (
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Edit the correction
            </p>
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  onEdit?.(draft);
                  setEditing(false);
                }}
                disabled={!draft.trim()}
              >
                <Check className="h-4 w-4" /> Save correction
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {interactive && !resolved && !editing && (
          <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
            {issue.suggestedCorrection && (
              <>
                <Button size="sm" onClick={onAccept}>
                  <Check className="h-4 w-4" /> Accept correction
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setDraft(issue.suggestedCorrection ?? "");
                    setEditing(true);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={onReject}>
              <X className="h-4 w-4" /> Reject
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

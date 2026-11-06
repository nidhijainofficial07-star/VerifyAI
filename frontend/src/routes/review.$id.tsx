import { useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import { submitReviewViaApi } from "@/lib/api";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  MessageSquare,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { reopenReview, submitReview, useAppState } from "@/lib/store";
import { formatDateTime, riskLevel } from "@/lib/format";
import type { Submission } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ComplianceBadge, ReviewBadge } from "@/components/status-badges";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/review/$id")({
  head: () => ({
    meta: [
      { title: "VerityAI — Content Review" },
      {
        name: "description",
        content: "Human review of flagged content with evidence, suggestions and final decision.",
      },
      { property: "og:title", content: "VerityAI — Content Review" },
      {
        property: "og:description",
        content: "Human review of flagged content with evidence, suggestions and final decision.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewDetailPage,
});

function ReviewDetailPage() {
  const { id } = useParams({ from: Route.id });
  const state = useAppState();
  const submission = state.submissions.find((s) => s.id === id);
  const [comment, setComment] = useState("");

  if (!submission) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={FileWarning}
          title="Submission not found"
          description="This review item may have been removed or the link is outdated."
          action={
            <Button asChild>
              <Link to="/review">Back to Review Center</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const record = async (
  decision: "approved" | "rejected" | "changes_requested"
) => {
  if (!comment.trim()) {
    toast.error("Please add a reviewer comment with your decision.");
    return;
  }

  try {
    await submitReviewViaApi(
      submission.id,
      decision,
      comment.trim()
    );

    // Save locally only after backend confirms success.
    submitReview(submission.id, decision, comment.trim());

    setComment("");

    toast.success(
      decision === "approved"
        ? "Content approved and recorded."
        : decision === "rejected"
          ? "Content rejected and recorded."
          : "Changes requested and recorded."
    );
  } catch (error) {
    toast.error(
      error instanceof Error
        ? error.message
        : "Could not save the review decision."
    );
  }
};

  return <ReviewBody submission={submission} comment={comment} setComment={setComment} record={record} />;
}


function ReviewBody({
  submission,
  comment,
  setComment,
  record,
}: {
  submission: Submission;
  comment: string;
  setComment: (v: string) => void;
  record: (decision: "approved" | "rejected" | "changes_requested") => void;
}) {
  const a = submission.analysis;
  const state = useAppState();
  const pendingIssues = a.issues.filter(
    (i) => i.resolution === "pending"
  ).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/review">
            <ArrowLeft className="h-4 w-4" /> Review Center
          </Link>
        </Button>

        <Button asChild variant="outline" size="sm">
          <Link to="/reports/$id" params={{ id: submission.id }}>
            <ClipboardCheck className="h-4 w-4" /> Full compliance report
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          {submission.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Submitted {formatDateTime(submission.createdAt)} ·{" "}
          {submission.contentType} · {a.issues.length} issues · Risk level{" "}
          {riskLevel(a.counts)}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ComplianceBadge status={a.status} />
          <ReviewBadge status={submission.reviewStatus} />
          <Badge variant="outline">
            {pendingIssues} corrections awaiting decision
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Issues requiring your attention
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review the flagged items below. Open the full compliance report
            to inspect supporting evidence and suggested corrections.
          </p>
        </CardHeader>

        <CardContent>
          {a.issues.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No issues flagged"
              description="The analyzer did not detect any compliance issues."
            />
          ) : (
            <div className="space-y-3">
              {submission.analysis.issues.map((issue) => (
  <div
    key={issue.id}
    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
  >
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold">
        {issue.category.replace(/-/g, " ")}
      </p>

      <p className="mt-1 text-sm text-muted-foreground">
        {issue.explanation}
      </p>
    </div>

    <div className="flex items-center gap-2 text-sm">
      <span>{issue.severity}</span>
      <span>•</span>
      <span>{issue.resolution.replace(/_/g, " ")}</span>
    </div>
  </div>
))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Final reviewer decision
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Make the final decision for this content submission.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {submission.review && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Previous decision:{" "}
                {submission.review.decision.replace(/_/g, " ")}
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                "{submission.review.comment}"
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                — {submission.review.reviewer},{" "}
                {formatDateTime(submission.review.at)}
              </p>

              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  reopenReview(submission.id);
                  toast.success("Review reopened");
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reopen review
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="review-comment">
              Reviewer comment (required)
            </Label>
            <Textarea
              id="review-comment"
              rows={3}
              placeholder="Explain your decision for the audit trail..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => record("approved")}>
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>

            <Button
              variant="outline"
              onClick={() => record("changes_requested")}
            >
              <MessageSquare className="h-4 w-4" />
              Request Changes
            </Button>

            <Button
              variant="destructive"
              onClick={() => record("rejected")}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Correction decisions and final content approval are separate.
            Your reviewer name ({state.user.name}) and decision timestamp
            are recorded in History.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

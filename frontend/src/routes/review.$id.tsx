import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  getSubmissionViaApi,
  submitReviewViaApi,
} from "@/lib/api";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileWarning,
  MessageSquare,
  XCircle,
} from "lucide-react";
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

const [submission, setSubmission] = useState<Submission | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [comment, setComment] = useState("");

useEffect(() => {
  async function loadSubmission() {
    setLoading(true);
    setError("");

    try {
      const data = await getSubmissionViaApi(id);
      setSubmission(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load this submission."
      );
    } finally {
      setLoading(false);
    }
  }

  void loadSubmission();
}, [id]);
if (loading) {
  return (
    <div className="mx-auto max-w-3xl py-10 text-center">
      <p className="text-sm text-muted-foreground">
        Loading submission...
      </p>
    </div>
  );
}

if (error) {
  return (
    <div className="mx-auto max-w-3xl">
      <EmptyState
        icon={FileWarning}
        title="Could not load submission"
        description={error}
        action={
          <Button asChild>
            <Link to="/review">Back to Review Center</Link>
          </Button>
        }
      />
    </div>
  );
}

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

    const updatedSubmission = await getSubmissionViaApi(submission.id);
setSubmission(updatedSubmission);

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
  const pendingIssues = a.issues.filter(
    (i) => i.resolution === "pending"
  ).length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 sm:space-y-6">
      {/* Navigation */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-full sm:w-fit">
          <Link to="/review">
            <ArrowLeft className="h-4 w-4" />
            Review Center
          </Link>
        </Button>

        <Button asChild variant="outline" size="sm" className="w-full sm:w-fit">
          <Link to="/reports/$id" params={{ id: submission.id }}>
            <ClipboardCheck className="h-4 w-4" />
            Full compliance report
          </Link>
        </Button>
      </div>

      {/* Submission details */}
      <div className="min-w-0">
        <h2 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">
          {submission.title}
        </h2>

        <p className="mt-2 break-words text-xs text-muted-foreground sm:text-sm">
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

      {/* Issues */}
      <Card>
        <CardHeader className="space-y-2">
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
              {a.issues.map((issue) => (
                <div
                  key={issue.id}
                  className="min-w-0 rounded-lg border p-3 sm:p-4"
                >
                  <p className="break-words text-sm font-semibold capitalize">
                    {issue.category.replace(/-/g, " ")}
                  </p>

                  <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">
                    {issue.explanation}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs">
                    <Badge variant="outline">
                      {issue.severity}
                    </Badge>
                    <Badge variant="secondary">
                      {issue.resolution.replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Final reviewer decision */}
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">
            Final reviewer decision
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Make the final decision for this content submission.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {submission.review && (
            <div className="break-words rounded-lg border bg-muted/40 p-3 sm:p-4">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                Previous decision:{" "}
                {submission.review.decision.replace(/_/g, " ")}
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                "{submission.review.comment}"
              </p>

              <p className="mt-2 text-xs text-muted-foreground">
                — {submission.review.reviewer},{" "}
                {formatDateTime(submission.review.at)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="review-comment">
              Reviewer comment (required)
            </Label>
            <Textarea
              id="review-comment"
              rows={4}
              placeholder="Explain your decision for the audit trail..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-24 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              className="w-full"
              onClick={() => record("approved")}
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve
            </Button>

            <Button
              className="w-full"
              variant="outline"
              onClick={() => record("changes_requested")}
            >
              <MessageSquare className="h-4 w-4" />
              Request Changes
            </Button>

            <Button
              className="w-full"
              variant="destructive"
              onClick={() => record("rejected")}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Correction decisions and final content approval are separate.
            Your decision and comment are saved to the report's review record.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
